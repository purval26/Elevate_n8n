/**
 * Comprehensive Empirical Stress & Contract Compatibility Harness
 * Executed by challenger_m1_2 for Milestone 1 Review.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GenerateContentRequestSchema,
  CarouselPackageSchema,
  BaseCarouselPackageSchema,
  SlideSchema,
  SlideTypeSchema,
  CarouselTopicSchema,
  ContentPillarSchema,
  ContentToneSchema,
  ApiErrorResponseSchema,
  StructuredApiErrorSchema,
  ErrorCodeSchema,
  ERROR_CODES,
  type TopicRecord,
  type PostRecord,
  type SlideRecord,
  type SourceRecord,
  type PostWithRelations,
  type GenerateContentRequest,
  type CarouselPackage,
  type Slide,
} from '../packages/types/src/index.ts';

import {
  createValidCarouselFixture,
  createDNSScenarioFixture,
  createJWTScenarioFixture,
  createDockerScenarioFixture,
  createReactScenarioFixture,
  createKafkaScenarioFixture,
} from './e2e/mocks/fixtures.ts';

import { createMockSupabase } from './e2e/mocks/supabase.mock.ts';
import { createMockOpenAI } from './e2e/mocks/openai.mock.ts';
import { createTestHarness } from './e2e/harness.ts';

test('Empirical Challenger: Contract Compatibility & Stress Test Suite', async (t) => {
  // =========================================================================
  // Section 1: Strict Contract Compatibility with All Fixtures
  // =========================================================================
  await t.test('1.1 All standard E2E fixtures strictly satisfy CarouselPackageSchema', () => {
    const fixtures = [
      createDNSScenarioFixture(),
      createJWTScenarioFixture(),
      createDockerScenarioFixture(),
      createReactScenarioFixture(),
      createKafkaScenarioFixture(),
      createValidCarouselFixture({ slideCount: 5 }),
      createValidCarouselFixture({ slideCount: 6 }),
      createValidCarouselFixture({ slideCount: 7 }),
      createValidCarouselFixture({ slideCount: 8 }),
    ];

    for (let i = 0; i < fixtures.length; i++) {
      const f = fixtures[i];
      const result = CarouselPackageSchema.safeParse(f);
      assert.ok(
        result.success,
        `Fixture #${i} failed schema validation: ${result.error?.message}`,
      );
    }
  });

  await t.test('1.2 CarouselPackageSchema rejects corrupted slide sequences in fixtures', () => {
    // Non-sequential: 1, 3, 2, 4, 5
    const corruptedFixture = createValidCarouselFixture({ slideCount: 5 });
    corruptedFixture.slides[1].slideNumber = 3;
    corruptedFixture.slides[2].slideNumber = 2;

    const result = CarouselPackageSchema.safeParse(corruptedFixture);
    assert.equal(result.success, false, 'Should reject non-sequential slide numbers');
    assert.ok(
      result.error?.issues.some((i) => i.message.includes('sequential')),
      'Error message must mention sequential requirement',
    );
  });

  await t.test('1.3 BaseCarouselPackageSchema permits non-sequential for Tier 1 OpenAI extraction', () => {
    // Base schema is unrefined for OpenAI zodResponseFormat compatibility
    const nonSeq = createValidCarouselFixture({ slideCount: 5 });
    nonSeq.slides[1].slideNumber = 3;
    nonSeq.slides[2].slideNumber = 2; // [1, 3, 2, 4, 5]

    const baseResult = BaseCarouselPackageSchema.safeParse(nonSeq);
    assert.equal(baseResult.success, true, 'BaseCarouselPackageSchema must accept without refinement error');

    const fullResult = CarouselPackageSchema.safeParse(nonSeq);
    assert.equal(fullResult.success, false, 'CarouselPackageSchema must reject non-sequential');
  });

  await t.test('1.4 MockSupabase data structures conform to database TypeScript types', () => {
    const db = createMockSupabase();
    
    // Insert topic
    const topic: TopicRecord = {
      id: 'a0000000-0000-0000-0000-000000000001',
      title: 'Distributed Systems',
      pillar: 'tech_explained',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const post: PostRecord = {
      id: 'b0000000-0000-0000-0000-000000000001',
      topic_id: topic.id,
      hook: 'Stateless vs Stateful',
      caption: 'Complete breakdown of distributed systems architecture.',
      cta: 'Follow @ElevateWeb',
      hashtags: ['#DistributedSystems'],
      tone: 'educational',
      slide_count: 5,
      status: 'generated',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const slide: SlideRecord = {
      id: 'c0000000-0000-0000-0000-000000000001',
      post_id: post.id,
      slide_number: 1,
      type: 'hook',
      headline: 'Hook Headline',
      body: 'Body text content here.',
      visual_suggestion: 'Visual illustration',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const source: SourceRecord = {
      id: 'd0000000-0000-0000-0000-000000000001',
      post_id: post.id,
      url: 'https://ietf.org/rfc/rfc1035.txt',
      source_text: 'RFC 1035',
      created_at: new Date().toISOString(),
    };

    const postWithRelations: PostWithRelations = {
      ...post,
      topic,
      slides: [slide],
      sources: [source],
    };

    assert.equal(postWithRelations.slides.length, 1);
    assert.equal(postWithRelations.sources[0].url, 'https://ietf.org/rfc/rfc1035.txt');
  });

  await t.test('1.5 ApiErrorResponseSchema validates all error shapes generated by TestHarness', async () => {
    const harness = await createTestHarness();

    // 400 Validation Error
    const res400 = await harness.generateContent({ topic: 'ab' });
    assert.equal(res400.statusCode, 400);
    const parsed400 = ApiErrorResponseSchema.safeParse(res400.body);
    assert.ok(parsed400.success, `400 response failed error schema: ${parsed400.error?.message}`);

    // 500 Generation Error
    harness.openai.setMode('malformed_json');
    const res500 = await harness.generateContent({ topic: 'Valid Topic Here', pillar: 'tech_explained' });
    assert.equal(res500.statusCode, 500);
    const parsed500 = ApiErrorResponseSchema.safeParse(res500.body);
    assert.ok(parsed500.success, `500 response failed error schema: ${parsed500.error?.message}`);

    // 500 Database Error
    harness.openai.setMode('success');
    harness.supabase.setFailureMode('fail_connection');
    const resDb = await harness.generateContent({ topic: 'Valid Topic Here', pillar: 'tech_explained' });
    assert.equal(resDb.statusCode, 500);
    const parsedDb = ApiErrorResponseSchema.safeParse(resDb.body);
    assert.ok(parsedDb.success, `DB error response failed error schema: ${parsedDb.error?.message}`);

    await harness.teardown();
  });

  // =========================================================================
  // Section 2: Adversarial Edge Cases & Boundary Mining
  // =========================================================================
  await t.test('2.1 Prototype pollution attack keys in request body', () => {
    // Testing __proto__, constructor, prototype injection
    const maliciousPayload = JSON.parse(
      '{"topic":"Valid Topic","pillar":"tech_explained","__proto__":{"polluted":true},"constructor":{"prototype":{"injected":true}}}',
    );
    const result = GenerateContentRequestSchema.safeParse(maliciousPayload);
    // .strict() must reject unrecognized keys
    assert.equal(result.success, false, 'Should reject prototype pollution / extra properties');
    // Verify object prototype was NOT polluted
    assert.equal((Object.prototype as any).polluted, undefined);
  });

  await t.test('2.2 ReDoS Resistance on hashtag regex pattern', () => {
    // Regex in schema: /^#?[a-zA-Z0-9_]+$/
    // Test with long strings to ensure polynomial/linear evaluation without stalling
    const longValidHashtag = '#' + 'Tech'.repeat(5000);
    const longInvalidHashtag = '#' + 'Tech'.repeat(5000) + '!';

    const startValid = performance.now();
    const fixture = createValidCarouselFixture();
    fixture.hashtags = [longValidHashtag];
    const resValid = CarouselPackageSchema.safeParse(fixture);
    const durationValid = performance.now() - startValid;

    assert.ok(durationValid < 50, `Valid hashtag evaluation took ${durationValid}ms (expected < 50ms)`);
    assert.ok(resValid.success);

    const startInvalid = performance.now();
    fixture.hashtags = [longInvalidHashtag];
    const resInvalid = CarouselPackageSchema.safeParse(fixture);
    const durationInvalid = performance.now() - startInvalid;

    assert.ok(durationInvalid < 50, `Invalid hashtag evaluation took ${durationInvalid}ms (expected < 50ms)`);
    assert.equal(resInvalid.success, false);
  });

  await t.test('2.3 Numerical float precision boundaries for slideCount', () => {
    // 5.0 is integer in JS (Number.isInteger(5.0) === true)
    const res5Int = GenerateContentRequestSchema.safeParse({
      topic: 'Valid Topic',
      pillar: 'tech_explained',
      slideCount: 5.0,
    });
    assert.ok(res5Int.success);

    // 5.000000000000001 is a float (Number.isInteger is false)
    const resFloat = GenerateContentRequestSchema.safeParse({
      topic: 'Valid Topic',
      pillar: 'tech_explained',
      slideCount: 5.000000000000001,
    });
    assert.equal(resFloat.success, false);

    // Special numbers
    assert.equal(
      GenerateContentRequestSchema.safeParse({
        topic: 'Valid Topic',
        pillar: 'tech_explained',
        slideCount: NaN,
      }).success,
      false,
    );
    assert.equal(
      GenerateContentRequestSchema.safeParse({
        topic: 'Valid Topic',
        pillar: 'tech_explained',
        slideCount: Infinity,
      }).success,
      false,
    );
    assert.equal(
      GenerateContentRequestSchema.safeParse({
        topic: 'Valid Topic',
        pillar: 'tech_explained',
        slideCount: -Infinity,
      }).success,
      false,
    );
  });

  await t.test('2.4 Unicode whitespace handling in topic and pillar', () => {
    // Standard spaces
    const resTrim = GenerateContentRequestSchema.safeParse({
      topic: '   Clean Topic   ',
      pillar: '   tech_explained   ',
    });
    assert.ok(resTrim.success);
    if (resTrim.success) {
      assert.equal(resTrim.data.topic, 'Clean Topic');
      assert.equal(resTrim.data.pillar, 'tech_explained');
    }

    // Only whitespace
    const resWhitespaceOnly = GenerateContentRequestSchema.safeParse({
      topic: '      ',
      pillar: 'tech_explained',
    });
    assert.equal(resWhitespaceOnly.success, false);
  });

  // =========================================================================
  // Section 3: High-Volume Stress Test & Memory Leak Audit
  // =========================================================================
  await t.test('3.1 5,000 Schema Parse Iterations (Throughput & Timing)', () => {
    const validRequest = {
      topic: 'Understanding Modern Event Loops and Asynchronous Execution in JavaScript',
      pillar: 'tech_explained',
      tone: 'educational',
      slideCount: 6,
    };

    const validCarousel = createValidCarouselFixture({ slideCount: 6 });

    const startTime = performance.now();
    const iterations = 5000;

    for (let i = 0; i < iterations; i++) {
      const rReq = GenerateContentRequestSchema.safeParse(validRequest);
      const rCar = CarouselPackageSchema.safeParse(validCarousel);
      if (!rReq.success || !rCar.success) {
        throw new Error(`Parse failed at iteration ${i}`);
      }
    }

    const totalDuration = performance.now() - startTime;
    const avgPerIteration = totalDuration / iterations;

    assert.ok(
      avgPerIteration < 0.5,
      `Average parse time per iteration (${avgPerIteration.toFixed(3)}ms) exceeds threshold of 0.5ms`,
    );
  });

  await t.test('3.2 Memory Leak & Garbage Collection Stability over 10,000 Iterations', () => {
    if (typeof global.gc === 'function') {
      global.gc();
    }
    const initialHeap = process.memoryUsage().heapUsed;

    const validCarousel = createValidCarouselFixture({ slideCount: 8 });

    for (let i = 0; i < 10000; i++) {
      const res = CarouselPackageSchema.safeParse(validCarousel);
      assert.ok(res.success);
    }

    if (typeof global.gc === 'function') {
      global.gc();
    }
    const finalHeap = process.memoryUsage().heapUsed;
    const heapGrowthMB = (finalHeap - initialHeap) / (1024 * 1024);

    // Heap growth should be minimal (< 35 MB) for 10,000 parses
    assert.ok(
      heapGrowthMB < 35,
      `Heap grew by ${heapGrowthMB.toFixed(2)} MB over 10,000 parses; potential memory accumulation`,
    );
  });

  await t.test('3.3 500 Concurrent Schema Validations via Promise.all (No Unhandled Rejections)', async () => {
    const testCases = Array.from({ length: 500 }, (_, i) => {
      const isInvalid = i % 5 === 0;
      return {
        topic: isInvalid ? 'x' : `Concurrent Test Topic ${i}`,
        pillar: 'tech_explained',
        slideCount: 6,
      };
    });

    let rejectionCount = 0;
    process.on('unhandledRejection', () => {
      rejectionCount++;
    });

    const results = await Promise.all(
      testCases.map(async (tc) => {
        return GenerateContentRequestSchema.safeParse(tc);
      }),
    );

    assert.equal(results.length, 500);
    assert.equal(rejectionCount, 0, 'Must have zero unhandled promise rejections');
    
    // Check distribution
    const validCount = results.filter((r) => r.success).length;
    const invalidCount = results.filter((r) => !r.success).length;
    assert.equal(invalidCount, 100);
    assert.equal(validCount, 400);
  });
});
