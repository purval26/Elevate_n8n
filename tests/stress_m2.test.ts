/**
 * Empirical Adversarial Challenger Stress & Contract Verification Suite for Milestone 2
 * Executed by challenger_m2_2.
 *
 * Covers:
 * 1. Interface contracts between packages/types, packages/prompts, and packages/content
 * 2. High-volume random and pathological payloads for validateCarouselOutput
 * 3. Secret sanitization stress, ReDoS defense, large strings, and recursive structures
 * 4. High-volume throughput and memory stability under adversarial load
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GenerateContentRequestSchema,
  CarouselPackageSchema,
  BaseCarouselPackageSchema,
  SlideSchema,
  SlideTypeSchema,
  TopicSchema,
  SourceSchema,
  ApiErrorResponseSchema,
  type GenerateContentRequest,
  type CarouselPackage,
  type Slide,
} from '../packages/types/src/index.ts';

import {
  buildCarouselPrompt,
  buildUserPrompt,
  getSystemPrompt,
  ELEVATE_SYSTEM_PROMPT,
  BRAND_NAME,
  BRAND_HANDLE,
  FORBIDDEN_CLICKBAIT_PHRASES,
  FORBIDDEN_AI_CLICHES,
} from '../packages/prompts/src/index.ts';

import {
  validateCarouselOutput,
  sanitizeSecrets,
  sanitizeErrorDetails,
  ContentGenerationError,
  ContentValidationError,
  generateCarousel,
  createOpenAIClient,
} from '../packages/content/src/index.ts';

import { createValidCarouselFixture } from './e2e/mocks/fixtures.ts';

test('Milestone 2 Challenger Suite: Contract Verification & Adversarial Stress Tests', async (t) => {
  // =========================================================================
  // Section 1: Interface Contract Validation
  // =========================================================================

  await t.test('1.1 Interface Contract: packages/types exports all required schemas & types', () => {
    assert.ok(GenerateContentRequestSchema, 'GenerateContentRequestSchema must be exported');
    assert.ok(CarouselPackageSchema, 'CarouselPackageSchema must be exported');
    assert.ok(BaseCarouselPackageSchema, 'BaseCarouselPackageSchema must be exported');
    assert.ok(SlideSchema, 'SlideSchema must be exported');
    assert.ok(SlideTypeSchema, 'SlideTypeSchema must be exported');
    assert.ok(TopicSchema, 'TopicSchema must be exported');
    assert.ok(SourceSchema, 'SourceSchema must be exported');
    assert.ok(ApiErrorResponseSchema, 'ApiErrorResponseSchema must be exported');

    // Test TopicSchema contract
    const validTopic = TopicSchema.safeParse({ title: 'TypeScript 5.7', pillar: 'tech_explained' });
    assert.ok(validTopic.success, 'TopicSchema must accept valid topic');

    // Test SourceSchema contract
    const validSource = SourceSchema.safeParse('https://nodejs.org');
    assert.ok(validSource.success, 'SourceSchema must accept valid source URL');
    const invalidSource = SourceSchema.safeParse('');
    assert.equal(invalidSource.success, false, 'SourceSchema must reject empty string');
  });

  await t.test('1.2 Interface Contract: packages/prompts compiles valid prompts from GenerateContentRequest', () => {
    const validRequest: GenerateContentRequest = {
      topic: 'Vector Databases in Production',
      pillar: 'web_architecture',
      tone: 'technical',
      slideCount: 7,
    };

    const compiled = buildCarouselPrompt(validRequest);
    assert.equal(typeof compiled.systemPrompt, 'string');
    assert.equal(typeof compiled.userPrompt, 'string');
    assert.ok(compiled.systemPrompt.length > 100);
    assert.ok(compiled.userPrompt.length > 100);

    // Verify prompt reflects request parameters
    assert.ok(compiled.userPrompt.includes('Vector Databases in Production'));
    assert.ok(compiled.userPrompt.includes('web_architecture'));
    assert.ok(compiled.userPrompt.includes('technical'));
    assert.ok(compiled.userPrompt.includes('7 slides'));

    // Verify brand voice traits and guardrails
    assert.ok(compiled.systemPrompt.includes(BRAND_NAME));
    assert.ok(compiled.systemPrompt.includes(BRAND_HANDLE));
    assert.ok(FORBIDDEN_CLICKBAIT_PHRASES.length >= 3);
    assert.ok(FORBIDDEN_AI_CLICHES.length >= 3);
  });

  await t.test('1.3 Interface Contract: packages/content re-exports generator, validator, and client', () => {
    assert.equal(typeof generateCarousel, 'function');
    assert.equal(typeof validateCarouselOutput, 'function');
    assert.equal(typeof sanitizeSecrets, 'function');
    assert.equal(typeof sanitizeErrorDetails, 'function');
    assert.equal(typeof createOpenAIClient, 'function');
    assert.ok(ContentGenerationError.prototype instanceof Error);
    assert.ok(ContentValidationError.prototype instanceof ContentGenerationError);
  });

  // =========================================================================
  // Section 2: validateCarouselOutput Adversarial Stress Testing
  // =========================================================================

  await t.test('2.1 Non-object and primitive inputs reject with ContentValidationError', () => {
    const primitives = [null, undefined, 42, 'string', true, false, NaN, Infinity, Symbol('bad')];

    for (const prim of primitives) {
      assert.throws(
        () => validateCarouselOutput(prim),
        (err: unknown) => {
          assert.ok(err instanceof ContentValidationError);
          assert.equal(err.code, 'GENERATION_ERROR');
          assert.equal(err.statusCode, 500);
          return true;
        },
        `Expected primitive ${String(prim)} to throw ContentValidationError`,
      );
    }
  });

  await t.test('2.2 Array inputs reject with ContentValidationError', () => {
    assert.throws(
      () => validateCarouselOutput([1, 2, 3]),
      (err: unknown) => {
        assert.ok(err instanceof ContentValidationError);
        return true;
      },
    );
  });

  await t.test('2.3 Exact boundary testing for slideCount (4, 5, 6, 7, 8, 9)', () => {
    for (const count of [5, 6, 7, 8]) {
      const valid = createValidCarouselFixture({ slideCount: count });
      const validated = validateCarouselOutput(valid);
      assert.equal(validated.slides.length, count);
    }

    // 4 slides (below minimum 5)
    const under = createValidCarouselFixture({ slideCount: 5 });
    under.slides = under.slides.slice(0, 4);
    under.slideCount = 4;
    assert.throws(
      () => validateCarouselOutput(under),
      (err: unknown) => {
        assert.ok(err instanceof ContentValidationError);
        assert.ok(err.message.includes('5'));
        return true;
      },
    );

    // 9 slides (above maximum 8)
    const over = createValidCarouselFixture({ slideCount: 8 });
    const extraSlide: Slide = {
      slideNumber: 9,
      type: 'cta',
      headline: 'Slide 9',
      body: 'Extra slide body',
      visualSuggestion: 'Extra slide visual',
    };
    over.slides.push(extraSlide);
    over.slideCount = 9;
    assert.throws(
      () => validateCarouselOutput(over),
      (err: unknown) => {
        assert.ok(err instanceof ContentValidationError);
        assert.ok(err.message.includes('8'));
        return true;
      },
    );
  });

  await t.test('2.4 Strict sequential slide numbering permutations', () => {
    const valid = createValidCarouselFixture({ slideCount: 5 });

    // Permutation 1: zero-indexed [0, 1, 2, 3, 4]
    const zeroIndexed = JSON.parse(JSON.stringify(valid));
    zeroIndexed.slides.forEach((s: Slide, i: number) => {
      s.slideNumber = i;
    });
    assert.throws(() => validateCarouselOutput(zeroIndexed), ContentValidationError);

    // Permutation 2: duplicate numbers [1, 2, 2, 4, 5]
    const duplicate = JSON.parse(JSON.stringify(valid));
    duplicate.slides[2].slideNumber = 2;
    assert.throws(() => validateCarouselOutput(duplicate), ContentValidationError);

    // Permutation 3: out of order [1, 3, 2, 4, 5]
    const outOfOrder = JSON.parse(JSON.stringify(valid));
    outOfOrder.slides[1].slideNumber = 3;
    outOfOrder.slides[2].slideNumber = 2;
    assert.throws(() => validateCarouselOutput(outOfOrder), ContentValidationError);

    // Permutation 4: offset numbers [2, 3, 4, 5, 6]
    const offset = JSON.parse(JSON.stringify(valid));
    offset.slides.forEach((s: Slide, i: number) => {
      s.slideNumber = i + 2;
    });
    assert.throws(() => validateCarouselOutput(offset), ContentValidationError);
  });

  await t.test('2.5 Missing or empty mandatory slide fields', () => {
    const valid = createValidCarouselFixture({ slideCount: 5 });

    // Missing visualSuggestion
    const missingVisual = JSON.parse(JSON.stringify(valid));
    delete missingVisual.slides[0].visualSuggestion;
    assert.throws(() => validateCarouselOutput(missingVisual), ContentValidationError);

    // Empty visualSuggestion
    const emptyVisual = JSON.parse(JSON.stringify(valid));
    emptyVisual.slides[0].visualSuggestion = '   ';
    assert.throws(() => validateCarouselOutput(emptyVisual), ContentValidationError);

    // Missing headline
    const missingHeadline = JSON.parse(JSON.stringify(valid));
    delete missingHeadline.slides[1].headline;
    assert.throws(() => validateCarouselOutput(missingHeadline), ContentValidationError);

    // Empty headline
    const emptyHeadline = JSON.parse(JSON.stringify(valid));
    emptyHeadline.slides[1].headline = '';
    assert.throws(() => validateCarouselOutput(emptyHeadline), ContentValidationError);

    // Headline exceeding 150 characters (schema max is 150)
    const longHeadline = JSON.parse(JSON.stringify(valid));
    longHeadline.slides[0].headline = 'A'.repeat(151);
    assert.throws(() => validateCarouselOutput(longHeadline), ContentValidationError);

    // Missing body
    const missingBody = JSON.parse(JSON.stringify(valid));
    delete missingBody.slides[2].body;
    assert.throws(() => validateCarouselOutput(missingBody), ContentValidationError);

    // Body exceeding 1000 characters (schema max is 1000)
    const longBody = JSON.parse(JSON.stringify(valid));
    longBody.slides[0].body = 'B'.repeat(1001);
    assert.throws(() => validateCarouselOutput(longBody), ContentValidationError);
  });

  await t.test('2.6 Slide type enum validations and invalid types', () => {
    const valid = createValidCarouselFixture({ slideCount: 5 });

    const invalidTypes = ['intro', 'summary', 'outro', 'random', '', 'HOOK', 'codeSnippet'];
    for (const invalidType of invalidTypes) {
      const copy = JSON.parse(JSON.stringify(valid));
      copy.slides[1].type = invalidType;
      assert.throws(
        () => validateCarouselOutput(copy),
        ContentValidationError,
        `Should reject invalid slide type: ${invalidType}`,
      );
    }
  });

  await t.test('2.7 1,000 High-Volume Fuzzed Payloads to validateCarouselOutput', () => {
    // Fuzzer generates randomized mutated objects and validates graceful rejection
    const keys = ['topic', 'slides', 'hook', 'caption', 'cta', 'hashtags', 'sources', 'slideCount'];
    let rejectedCount = 0;

    for (let i = 0; i < 1000; i++) {
      const payload: Record<string, unknown> = {};
      const numKeys = Math.floor(Math.random() * keys.length);

      for (let k = 0; k < numKeys; k++) {
        const key = keys[k];
        const valType = Math.floor(Math.random() * 6);
        if (valType === 0) payload[key] = Math.random() > 0.5 ? 'random string' : '';
        else if (valType === 1) payload[key] = Math.floor(Math.random() * 20) - 5;
        else if (valType === 2) payload[key] = Math.random() > 0.5;
        else if (valType === 3) payload[key] = null;
        else if (valType === 4) payload[key] = [];
        else payload[key] = { nested: 'val' };
      }

      try {
        validateCarouselOutput(payload);
      } catch (err: unknown) {
        assert.ok(err instanceof ContentValidationError);
        rejectedCount++;
      }
    }

    assert.equal(rejectedCount, 1000, 'All 1,000 fuzzed random payloads must be safely rejected');
  });

  // =========================================================================
  // Section 3: sanitizeSecrets & sanitizeErrorDetails Stress Testing
  // =========================================================================

  await t.test('3.1 Regex sanitization of all secret patterns', () => {
    const raw = [
      'Failed with sk-proj-1234567890abcdef1234567890 in OpenAI response',
      'Header: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
      'Standalone JWT: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
      'Database: postgresql://postgres:SuperSecretPassword123@db.supabase.co:5432/postgres?sslmode=require',
      'Config: OPENAI_API_KEY=sk-test1234567890abcdef123456 and SUPABASE_SERVICE_ROLE_KEY=ey12345678.90abcdef.1234567890 and SUPABASE_URL=https://xyz.supabase.co',
    ].join('\n');

    const sanitized = sanitizeSecrets(raw);

    assert.equal(sanitized.includes('sk-proj-'), false);
    assert.equal(sanitized.includes('SuperSecretPassword123'), false);
    assert.equal(sanitized.includes('eyJhbGci'), false);
    assert.equal(sanitized.includes('ey12345678'), false);
    assert.ok(sanitized.includes('[REDACTED_API_KEY]'));
    assert.ok(sanitized.includes('[REDACTED_DB_URL]'));
    assert.ok(sanitized.includes('[REDACTED_JWT]'));
    assert.ok(sanitized.includes('OPENAI_API_KEY=[REDACTED]'));
    assert.ok(sanitized.includes('SUPABASE_SERVICE_ROLE_KEY=[REDACTED]'));
    assert.ok(sanitized.includes('SUPABASE_URL=[REDACTED]'));
  });

  await t.test('3.2 Large string stress test (1MB string with embedded secrets)', () => {
    const filler = 'The quick brown fox jumps over the lazy dog. '.repeat(20000); // ~900KB
    const secret = 'sk-proj-supersecretkey12345678901234567890';
    const largeText = `${filler} ERROR: ${secret} ${filler}`;

    const start = performance.now();
    const result = sanitizeSecrets(largeText);
    const duration = performance.now() - start;

    assert.equal(result.includes(secret), false);
    assert.ok(result.includes('[REDACTED_API_KEY]'));
    assert.ok(duration < 250, `Sanitization of ~1.8MB took ${duration.toFixed(2)}ms (expected < 250ms)`);
  });

  await t.test('3.3 10,000 high-volume iterations of sanitizeSecrets', () => {
    const secretMsg = 'Error sk-live_1234567890abcdef12345 occurred while calling Bearer token_secret_123';
    const start = performance.now();

    for (let i = 0; i < 10000; i++) {
      const sanitized = sanitizeSecrets(secretMsg);
      assert.equal(sanitized.includes('sk-live_'), false);
    }

    const duration = performance.now() - start;
    const avg = duration / 10000;
    assert.ok(avg < 0.05, `Average sanitization took ${avg.toFixed(4)}ms (expected < 0.05ms)`);
  });

  await t.test('3.4 Deep recursion handling in sanitizeErrorDetails (depth 50)', () => {
    let deepObj: any = {
      secret: 'sk-deep-secret-123456789012345',
      bearer: 'Bearer secret_token_abc123',
    };

    for (let depth = 0; depth < 50; depth++) {
      deepObj = {
        level: depth,
        nested: deepObj,
        array: [deepObj.secret],
      };
    }

    const sanitized = sanitizeErrorDetails(deepObj);

    // Traverse down to deepest level to verify sanitization
    let curr = sanitized;
    while (curr.nested && curr.nested.nested) {
      curr = curr.nested;
    }

    const leaf = curr.nested;
    assert.equal(leaf.secret, '[REDACTED_API_KEY]');
    assert.equal(leaf.bearer, 'Bearer [REDACTED]');
  });

  await t.test('3.5 sanitizeErrorDetails handles arrays, primitives, null, and empty objects', () => {
    assert.equal(sanitizeErrorDetails(null), null);
    assert.equal(sanitizeErrorDetails(undefined), undefined);
    assert.equal(sanitizeErrorDetails(12345), 12345);
    assert.equal(sanitizeErrorDetails(true), true);
    assert.deepEqual(sanitizeErrorDetails([]), []);
    assert.deepEqual(sanitizeErrorDetails({}), {});

    const complexArray = [
      'sk-test-123456789012345',
      { key: 'Bearer token_secret_xyz' },
      [123, 'postgres://user:pass@localhost:5432/db'],
    ];

    const cleaned = sanitizeErrorDetails(complexArray);
    assert.equal(cleaned[0], '[REDACTED_API_KEY]');
    assert.equal((cleaned[1] as any).key, 'Bearer [REDACTED]');
    assert.equal((cleaned[2] as any)[1], '[REDACTED_DB_URL]');
  });

  // =========================================================================
  // Section 4: ContentGenerationError & ContentValidationError Integrity
  // =========================================================================

  await t.test('4.1 ContentGenerationError scrubs secrets in message and details', () => {
    const secretKey = 'sk-live-9999999999999999999999';
    const err = new ContentGenerationError(`API request failed with key ${secretKey}`, {
      code: 'OPENAI_ERROR',
      statusCode: 500,
      details: {
        rawUrl: 'https://api.openai.com/v1/chat',
        apiKey: secretKey,
        bearer: 'Bearer live_token_xyz',
      },
    });

    assert.equal(err.message.includes(secretKey), false);
    assert.ok(err.message.includes('[REDACTED_API_KEY]'));
    assert.equal((err.details as any).apiKey, '[REDACTED_API_KEY]');
    assert.equal((err.details as any).bearer, 'Bearer [REDACTED]');
    assert.equal(err.code, 'OPENAI_ERROR');
    assert.equal(err.statusCode, 500);
  });

  await t.test('4.2 ContentValidationError formats and scrubs error issues', () => {
    const secretInPath = 'sk-param-123456789012345';
    const issues = [
      { path: `slides.0.${secretInPath}`, message: `Failed for key ${secretInPath}`, code: 'custom' },
    ];

    const valErr = new ContentValidationError('Validation error occurred', issues);
    assert.equal(valErr.errors[0].path.includes(secretInPath), false);
    assert.equal(valErr.errors[0].message.includes(secretInPath), false);
    assert.ok(valErr.errors[0].message.includes('[REDACTED_API_KEY]'));
    assert.ok(valErr instanceof ContentGenerationError);
  });

  // =========================================================================
  // Section 5: High-Volume End-to-End Carousel Validation Stress
  // =========================================================================

  await t.test('5.1 5,000 Iterations of validateCarouselOutput (Throughput & Timing)', () => {
    const valid = createValidCarouselFixture({ slideCount: 6 });
    const start = performance.now();
    const iterations = 5000;

    for (let i = 0; i < iterations; i++) {
      const result = validateCarouselOutput(valid);
      assert.equal(result.slides.length, 6);
    }

    const duration = performance.now() - start;
    const avg = duration / iterations;

    assert.ok(
      avg < 0.6,
      `Average validateCarouselOutput duration (${avg.toFixed(3)}ms) exceeds threshold of 0.6ms`,
    );
  });
});
