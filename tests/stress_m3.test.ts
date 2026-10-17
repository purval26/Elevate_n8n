/**
 * Empirical Adversarial Challenger Stress & Contract Verification Suite for Milestone 3
 * Executed by challenger_m3_2_rep.
 *
 * Covers:
 * 1. High-volume concurrency stress tests for persistCarouselPackage (100 concurrent calls, race conditions, interleaved failures)
 * 2. Adversarial deep object, large payload, and secret scrubbing stress tests for scrubSecrets and scrubErrorDetails
 * 3. Database persistence boundary cases, input validation, and compensating rollback resilience
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import type { CarouselPackage, SlideType } from '../packages/types/src/index.ts';
import {
  persistCarouselPackage,
  DatabasePersistenceError,
  scrubSecrets,
  scrubErrorDetails,
} from '../packages/content/src/index.ts';
import { createMockSupabase, MockSupabaseClient } from './e2e/mocks/supabase.mock.ts';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function makeMockPackage(index: number, slideCount = 6): CarouselPackage {
  const slides = [];
  for (let i = 1; i <= slideCount; i++) {
    slides.push({
      slideNumber: i,
      type: (i === 1 ? 'hook' : i === slideCount ? 'takeaway' : 'breakdown') as SlideType,
      headline: `Concurrent Slide ${i} for Job ${index}`,
      body: `Detailed technical description ${i} for job ${index} in high-throughput pipeline.`,
      visualSuggestion: `Architecture diagram ${i} for job ${index}.`,
    });
  }

  return {
    topic: {
      title: `Concurrent Topic ${index}: Microservice Choreography`,
      pillar: 'web_architecture',
    },
    hook: `Why is event choreography faster than orchestration in job ${index}?`,
    slides,
    caption: `Deep dive into event-driven patterns #${index}. Learn why asynchronous message brokers outperform synchronous REST.`,
    cta: 'Save and follow @ElevateWeb for weekly system architecture breakdowns.',
    hashtags: ['#architecture', '#concurrency', '#microservices', '#performance'],
    sources: [
      'https://microservices.io/patterns/data/saga.html',
      `Designing Data-Intensive Applications (Ref #${index})`,
    ],
  };
}

test('Milestone 3 Challenger Suite: Database Persistence & Secret Scrubbing Stress Tests', async (t) => {
  // =========================================================================
  // Section 1: High-Volume Concurrency Stress Tests for persistCarouselPackage
  // =========================================================================

  await t.test('1.1 High-Volume Concurrency: 100 concurrent successful persistence operations', async () => {
    const mock = createMockSupabase();
    const CONCURRENCY_COUNT = 100;
    const startTime = performance.now();

    const packages = Array.from({ length: CONCURRENCY_COUNT }, (_, idx) =>
      makeMockPackage(idx, 5 + (idx % 4)), // alternate slide counts between 5, 6, 7, 8
    );

    const results = await Promise.all(
      packages.map((pkg) => persistCarouselPackage(pkg, { supabase: mock })),
    );

    const duration = performance.now() - startTime;

    // Verify all 100 operations succeeded and returned valid UUIDs
    assert.equal(results.length, CONCURRENCY_COUNT, 'All 100 promises must resolve');
    const topicIds = new Set(results.map((r) => r.topicId));
    const postIds = new Set(results.map((r) => r.postId));

    assert.equal(topicIds.size, CONCURRENCY_COUNT, 'All topicIds must be unique and non-colliding');
    assert.equal(postIds.size, CONCURRENCY_COUNT, 'All postIds must be unique and non-colliding');

    for (const r of results) {
      assert.match(r.topicId, UUID_REGEX, 'topicId must match UUID v4 regex');
      assert.match(r.postId, UUID_REGEX, 'postId must match UUID v4 regex');
    }

    // Verify database table sizes
    assert.equal(mock.topics.size, CONCURRENCY_COUNT, 'topics table must contain exactly 100 records');
    assert.equal(mock.posts.size, CONCURRENCY_COUNT, 'posts table must contain exactly 100 records');

    // Calculate total expected slides
    const expectedSlides = packages.reduce((acc, p) => acc + p.slides.length, 0);
    assert.equal(mock.slides.size, expectedSlides, `slides table must contain exactly ${expectedSlides} records`);

    // Verify relational integrity for all 100 posts
    for (const res of results) {
      const post = mock.posts.get(res.postId);
      assert.ok(post, `Post ${res.postId} must exist in mock DB`);
      assert.equal(post.topic_id, res.topicId, 'Post foreign key must reference its own topicId');

      const slides = Array.from(mock.slides.values()).filter((s: any) => s.post_id === res.postId);
      assert.equal(slides.length, post.slide_count, 'Slide count in slides table must match post.slide_count');
    }

    // Performance assertion: 100 operations in-memory should easily complete under 5 seconds
    assert.ok(duration < 5000, `Execution time (${duration.toFixed(2)}ms) must be under 5000ms`);
  });

  await t.test('1.2 High-Volume Concurrency with Interleaved Failures & Rollback Isolation', async () => {
    // Custom mock that fails specifically for even-numbered jobs on slide insertion
    class InterleavedFailingMock extends MockSupabaseClient {
      public override from(tableName: string) {
        const builder = super.from(tableName);
        const originalInsert = builder.insert.bind(builder);

        builder.insert = (values: any) => {
          originalInsert(values);
          // If inserting into slides for an even job, inject constraint violation
          if (tableName === 'slides' && Array.isArray(values) && values.length > 0) {
            const firstHeadline = values[0]?.headline || '';
            const match = firstHeadline.match(/Job (\d+)/);
            if (match) {
              const jobNum = parseInt(match[1], 10);
              if (jobNum % 2 === 0) {
                // Return builder that triggers failure on execution
                const originalThen = builder.then.bind(builder);
                builder.then = (onfulfilled?: (val: any) => any, onrejected?: (err: any) => any) => {
                  return Promise.resolve({
                    data: null,
                    error: {
                      message: `Simulated slide insertion constraint error for job ${jobNum}`,
                      code: '23505',
                    },
                  }).then(onfulfilled, onrejected);
                };
              }
            }
          }
          return builder;
        };

        return builder;
      }
    }

    const mock = new InterleavedFailingMock();
    const TOTAL_OPERATIONS = 60; // 30 evens (failing), 30 odds (succeeding)

    const packages = Array.from({ length: TOTAL_OPERATIONS }, (_, idx) => makeMockPackage(idx, 6));

    const settled = await Promise.allSettled(
      packages.map((pkg) => persistCarouselPackage(pkg, { supabase: mock })),
    );

    const fulfilled = settled.filter((s) => s.status === 'fulfilled');
    const rejected = settled.filter((s) => s.status === 'rejected');

    assert.equal(fulfilled.length, 30, 'Exactly 30 odd-numbered jobs must succeed');
    assert.equal(rejected.length, 30, 'Exactly 30 even-numbered jobs must fail');

    // Verify all rejections are DatabasePersistenceError
    for (const r of rejected) {
      if (r.status === 'rejected') {
        assert.ok(r.reason instanceof DatabasePersistenceError);
        assert.equal(r.reason.code, 'DATABASE_ERROR');
        assert.match(r.reason.message, /Slide insert error/);
      }
    }

    // Verify compensating rollback: only 30 posts must remain in database
    assert.equal(mock.posts.size, 30, 'Exactly 30 posts must remain in database (even jobs rolled back)');
    assert.equal(mock.slides.size, 30 * 6, 'Exactly 180 slides must remain in database');

    // Verify no orphaned posts from failing even jobs
    for (const post of mock.posts.values()) {
      const match = post.hook.match(/job (\d+)/);
      if (match) {
        const jobNum = parseInt(match[1], 10);
        assert.equal(jobNum % 2, 1, `Post ${post.id} must be an odd-numbered job, but found ${jobNum}`);
      }
    }
  });

  await t.test('1.3 High-Throughput Burst Test: Sequential rapid batches', async () => {
    const mock = createMockSupabase();
    const BATCHES = 4;
    const BATCH_SIZE = 25;

    for (let b = 0; b < BATCHES; b++) {
      const batchPackages = Array.from({ length: BATCH_SIZE }, (_, idx) =>
        makeMockPackage(b * BATCH_SIZE + idx, 5),
      );

      const batchResults = await Promise.all(
        batchPackages.map((pkg) => persistCarouselPackage(pkg, { supabase: mock })),
      );

      assert.equal(batchResults.length, BATCH_SIZE);
    }

    assert.equal(mock.posts.size, BATCHES * BATCH_SIZE, 'Total persisted posts must be 100');
    assert.equal(mock.slides.size, BATCHES * BATCH_SIZE * 5, 'Total persisted slides must be 500');
  });

  // =========================================================================
  // Section 2: Adversarial Stress Tests for scrubSecrets and scrubErrorDetails
  // =========================================================================

  await t.test('2.1 Large Payload String Stress & ReDoS Defense', () => {
    // Generate a large payload containing thousands of lines and secret tokens
    const lines: string[] = [];
    const SECRET_COUNT = 500;

    for (let i = 0; i < SECRET_COUNT; i++) {
      lines.push(`Log entry ${i}: user accessed https://project-${i}.supabase.co/rest/v1/data`);
      lines.push(`Header: Bearer token_string_${i}`);
      lines.push(`Standalone JWT: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload_${i}.signature_${i}`);
      lines.push(`Connection: postgresql://postgres_${i}:secret_password_${i}@db-${i}.supabase.co:5432/postgres`);
      lines.push(`OpenAI auth: sk-proj-1234567890abcdef1234567890_${i}`);
      lines.push(`Supabase service key: sbp_1234567890abcdef1234567890_${i}`);
      lines.push(`Random padding: ${'A'.repeat(500)}`);
    }

    const largePayload = lines.join('\n');
    assert.ok(largePayload.length > 250000, `Payload size must be substantial (${largePayload.length} chars)`);

    const startTime = performance.now();
    const scrubbed = scrubSecrets(largePayload);
    const duration = performance.now() - startTime;

    // Must finish quickly without exponential ReDoS backtracking
    assert.ok(duration < 1500, `Large payload scrubbing took ${duration.toFixed(2)}ms, must be < 1500ms`);

    // Must not contain any raw secrets
    assert.doesNotMatch(scrubbed, /sk-proj-/);
    assert.doesNotMatch(scrubbed, /sbp_/);
    assert.doesNotMatch(scrubbed, /eyJhbGciOiJIUzI1Ni/);
    assert.doesNotMatch(scrubbed, /postgresql:\/\//);
    assert.doesNotMatch(scrubbed, /secret_password_/);
    assert.doesNotMatch(scrubbed, /project-\d+\.supabase\.co/);

    // Must contain redactions
    assert.ok(scrubbed.includes('[REDACTED_API_KEY]'));
    assert.ok(scrubbed.includes('[REDACTED_JWT]'));
    assert.ok(scrubbed.includes('[REDACTED_DB_URL]'));
    assert.ok(scrubbed.includes('[REDACTED_SUPABASE_URL]'));
    assert.ok(scrubbed.includes('Bearer [REDACTED]'));
  });

  await t.test('2.2 Deep Object Nesting Stress (Depth 100)', () => {
    // Construct an object nested 100 levels deep with secrets at leaf level
    let current: any = {
      secretApiKey: 'sk-abcdef12345678901234567890',
      secretJwt: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.signature',
      secretDb: 'postgresql://admin:super_secret@localhost:5432/main',
      url: 'https://mysub.supabase.co/rest/v1',
    };

    for (let depth = 0; depth < 100; depth++) {
      current = {
        level: depth,
        nested: current,
        arrayData: [depth, 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxx.yyy'],
      };
    }

    const scrubbed = scrubErrorDetails(current);

    // Traverse down 100 levels and verify leaf values are scrubbed
    let check = scrubbed;
    for (let depth = 0; depth < 100; depth++) {
      assert.equal(check.level, 99 - depth);
      assert.equal(check.arrayData[1], 'Bearer [REDACTED]');
      check = check.nested;
    }

    assert.equal(check.secretApiKey, '[REDACTED_API_KEY]');
    assert.equal(check.secretJwt, '[REDACTED_JWT]');
    assert.equal(check.secretDb, '[REDACTED_DB_URL]');
    assert.equal(check.url, '[REDACTED_SUPABASE_URL]');
  });

  await t.test('2.3 scrubErrorDetails Circular Reference Handling (Remediated)', () => {
    // Construct cyclic object reference
    const cyclicObj: any = { message: 'DB connection failure' };
    cyclicObj.self = cyclicObj;

    // scrubErrorDetails tracks visited references with WeakSet, returning '[Circular]'
    const cleaned: any = scrubErrorDetails(cyclicObj);
    assert.equal(cleaned.message, 'DB connection failure');
    assert.equal(cleaned.self, '[Circular]');
  });

  await t.test('2.4 scrubErrorDetails Type Polymorphism & Boundary Objects', () => {
    // Test with primitive types, null, undefined, arrays, functions, and symbols
    assert.equal(scrubErrorDetails(null), null);
    assert.equal(scrubErrorDetails(undefined), undefined);
    assert.equal(scrubErrorDetails(42), 42);
    assert.equal(scrubErrorDetails(true), true);
    assert.equal(scrubErrorDetails(false), false);

    const arr = [
      'sk-12345678901234567890',
      123,
      null,
      [
        'postgresql://usr:pwd@host:5432/db',
        { token: 'Bearer token_abc_123' },
      ],
    ];

    const scrubbedArr: any = scrubErrorDetails(arr);
    assert.equal(scrubbedArr[0], '[REDACTED_API_KEY]');
    assert.equal(scrubbedArr[1], 123);
    assert.equal(scrubbedArr[2], null);
    assert.equal(scrubbedArr[3][0], '[REDACTED_DB_URL]');
    assert.equal(scrubbedArr[3][1].token, 'Bearer [REDACTED]');
  });

  await t.test('2.5 Prototype Safety and Object Mutation Isolation', () => {
    const original = {
      info: 'Clean string',
      sensitive: 'sk-12345678901234567890',
      nested: {
        key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.foo.bar',
      },
    };

    const cleaned = scrubErrorDetails(original);

    // Verify original object is not mutated
    assert.equal(original.sensitive, 'sk-12345678901234567890');
    assert.equal(cleaned.sensitive, '[REDACTED_API_KEY]');
    assert.notEqual(cleaned, original, 'Must return a fresh object clone');
    assert.notEqual(cleaned.nested, original.nested, 'Must clone nested objects');
  });

  // =========================================================================
  // Section 3: Database Persistence Boundary & Edge Cases
  // =========================================================================

  await t.test('3.1 Input Validation Boundary: Primitives vs Array Bypassing', async () => {
    const mock = createMockSupabase();

    // 1. Primitive invalid inputs throw 400 VALIDATION_ERROR
    const primitiveInvalidInputs: any[] = [
      null,
      undefined,
      'string input',
      12345,
      true,
    ];

    for (const input of primitiveInvalidInputs) {
      await assert.rejects(
        async () => {
          await persistCarouselPackage(input, { supabase: mock });
        },
        (err: unknown) => {
          assert.ok(err instanceof DatabasePersistenceError);
          assert.equal(err.code, 'VALIDATION_ERROR');
          assert.equal(err.statusCode, 400);
          return true;
        },
      );
    }

    // 2. Empirical finding: Array input [] bypasses typeof === 'object' check
    // and throws 500 DATABASE_ERROR instead of 400 VALIDATION_ERROR
    await assert.rejects(
      async () => {
        await persistCarouselPackage([] as any, { supabase: mock });
      },
      (err: unknown) => {
        assert.ok(err instanceof DatabasePersistenceError);
        assert.equal(err.code, 'DATABASE_ERROR');
        assert.equal(err.statusCode, 500);
        return true;
      },
    );
  });

  await t.test('3.2 Handling packages with special characters, unicode, and emojis', async () => {
    const mock = createMockSupabase();
    const pkg: CarouselPackage = {
      topic: {
        title: '🔥 WebAssembly vs JavaScript: 10x 🚀',
        pillar: 'performance',
      },
      hook: 'Can WebAssembly outperform JS in V8? ⚡',
      slides: [
        { slideNumber: 1, type: 'hook', headline: '🚀 WASM vs JS', body: 'Unicode: \u00A0\u200B\u200D', visualSuggestion: 'Icon 📊' },
        { slideNumber: 2, type: 'problem', headline: 'Slow JIT', body: 'Garbage collection overhead 🗑️', visualSuggestion: 'Chart 📉' },
        { slideNumber: 3, type: 'concept', headline: 'Linear Memory', body: 'Direct memory buffers 0x00FF', visualSuggestion: 'Memory map' },
        { slideNumber: 4, type: 'breakdown', headline: 'Benchmarks', body: 'SIMD 128-bit operations', visualSuggestion: 'CPU graph' },
        { slideNumber: 5, type: 'takeaway', headline: 'Key Rule', body: 'Use WASM for compute-heavy workloads', visualSuggestion: 'Takeaway box' },
      ],
      caption: 'WASM performance analysis 🔥 #wasm #javascript',
      cta: 'Follow @ElevateWeb 💡',
      hashtags: ['#wasm', '#performance', '#javascript'],
      sources: [
        'https://webassembly.org/specs/',
        'V8 Engine Blog: High Performance WASM',
      ],
    };

    const res = await persistCarouselPackage(pkg, { supabase: mock });
    assert.ok(res.topicId);
    assert.ok(res.postId);

    const post = mock.posts.get(res.postId);
    assert.equal(post.hook, 'Can WebAssembly outperform JS in V8? ⚡');
    assert.equal(mock.slides.size, 5);
  });

  await t.test('3.3 DatabasePersistenceError serializes cleanly to JSON without leaking secrets', () => {
    const rawError = new DatabasePersistenceError(
      'Failed connecting to postgresql://admin:super_secret_pw@db.supabase.co:5432/prod with key eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.sig',
      {
        code: 'CONNECTION_FAILED',
        statusCode: 500,
        details: {
          upstream: 'https://myproject.supabase.co',
          token: 'sk-proj-abcdef123456789012345',
        },
      },
    );

    const json = JSON.stringify({
      message: rawError.message,
      code: rawError.code,
      statusCode: rawError.statusCode,
      details: rawError.details,
    });

    assert.doesNotMatch(json, /super_secret_pw/);
    assert.doesNotMatch(json, /postgresql:\/\//);
    assert.doesNotMatch(json, /eyJhbGciOiJIUzI1Ni/);
    assert.doesNotMatch(json, /myproject\.supabase\.co/);
    assert.doesNotMatch(json, /sk-proj-/);

    assert.ok(json.includes('[REDACTED_DB_URL]'));
    assert.ok(json.includes('[REDACTED_JWT]'));
    assert.ok(json.includes('[REDACTED_SUPABASE_URL]'));
    assert.ok(json.includes('[REDACTED_API_KEY]'));
  });
});
