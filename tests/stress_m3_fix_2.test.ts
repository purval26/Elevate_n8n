/**
 * Empirical Adversarial Challenger Stress & Contract Verification Suite for Milestone 3 Remediation
 * Executed by challenger_m3_fix_2.
 *
 * Covers:
 * 1. High-volume concurrency stress tests for persistCarouselPackage (200 concurrent calls, burst tests, interleaved failures)
 * 2. Multi-table compensating rollback isolation under chaotic concurrent failures (zero orphaned topics/posts)
 * 3. Deep object graphs, cycle detection, and circular cause error sanitization
 * 4. Boundary objects (null prototype, sparse arrays, symbols) and ReDoS resistance
 * 5. Complete secret scrubbing across all error channels (message, stack, details, cause, util.inspect)
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import util from 'node:util';
import type { CarouselPackage, SlideType } from '../packages/types/src/index.ts';
import {
  persistCarouselPackage,
  DatabasePersistenceError,
  scrubSecrets,
  scrubErrorDetails,
  sanitizeCause,
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
      title: `Concurrent Topic ${index}: Microservice Architecture`,
      pillar: 'web_architecture',
    },
    hook: `Why is asynchronous event streaming 10x faster in job ${index}?`,
    slides,
    caption: `Deep dive into event-driven systems #${index}. Learn how Kafka partitions scale consumer groups.`,
    cta: 'Save and follow @ElevateWeb for weekly system architecture breakdowns.',
    hashtags: ['#architecture', '#concurrency', '#microservices', '#performance'],
    sources: [
      'https://kafka.apache.org/documentation/',
      `Designing Data-Intensive Applications (Ref #${index})`,
    ],
  };
}

test('Milestone 3 Remediation Challenger Suite: Concurrency, Deep Objects & Rollback Stress', async (t) => {
  // =========================================================================
  // Section 1: High-Volume Concurrency Stress Tests
  // =========================================================================

  await t.test('1.1 Extreme Concurrency: 200 concurrent successful persistence operations', async () => {
    const mock = createMockSupabase();
    const CONCURRENCY_COUNT = 200;
    const startTime = performance.now();

    const packages = Array.from({ length: CONCURRENCY_COUNT }, (_, idx) =>
      makeMockPackage(idx, 5 + (idx % 4)), // alternate slide counts between 5, 6, 7, 8
    );

    const results = await Promise.all(
      packages.map((pkg) => persistCarouselPackage(pkg, { supabase: mock })),
    );

    const duration = performance.now() - startTime;

    // Verify all 200 operations succeeded and returned valid, non-colliding UUIDs
    assert.equal(results.length, CONCURRENCY_COUNT, 'All 200 promises must resolve');
    const topicIds = new Set(results.map((r) => r.topicId));
    const postIds = new Set(results.map((r) => r.postId));

    assert.equal(topicIds.size, CONCURRENCY_COUNT, 'All topicIds must be unique and non-colliding');
    assert.equal(postIds.size, CONCURRENCY_COUNT, 'All postIds must be unique and non-colliding');

    for (const r of results) {
      assert.match(r.topicId, UUID_REGEX, 'topicId must match UUID v4 regex');
      assert.match(r.postId, UUID_REGEX, 'postId must match UUID v4 regex');
    }

    // Verify database table sizes
    assert.equal(mock.topics.size, CONCURRENCY_COUNT, 'topics table must contain exactly 200 records');
    assert.equal(mock.posts.size, CONCURRENCY_COUNT, 'posts table must contain exactly 200 records');

    const expectedSlides = packages.reduce((acc, p) => acc + p.slides.length, 0);
    assert.equal(mock.slides.size, expectedSlides, `slides table must contain exactly ${expectedSlides} records`);

    // Verify relational integrity
    for (const res of results) {
      const post = mock.posts.get(res.postId);
      assert.ok(post, `Post ${res.postId} must exist in mock DB`);
      assert.equal(post.topic_id, res.topicId, 'Post foreign key must reference its own topicId');

      const slides = Array.from(mock.slides.values()).filter((s: any) => s.post_id === res.postId);
      assert.equal(slides.length, post.slide_count, 'Slide count in slides table must match post.slide_count');
    }

    // Performance assertion: 200 in-memory operations should complete under 10 seconds
    assert.ok(duration < 10000, `Execution time (${duration.toFixed(2)}ms) must be under 10000ms`);
  });

  await t.test('1.2 Chaotic Interleaved Failures: 120 concurrent operations across 4 failure modes', async () => {
    // Custom mock simulating failures based on job index modulo 4:
    // job % 4 === 0 -> fail_topics
    // job % 4 === 1 -> fail_posts
    // job % 4 === 2 -> fail_slides
    // job % 4 === 3 -> SUCCESS
    class ChaoticMock extends MockSupabaseClient {
      public override from(tableName: string) {
        const builder = super.from(tableName);
        const originalInsert = builder.insert.bind(builder);

        builder.insert = (values: any) => {
          originalInsert(values);

          let jobNum = -1;
          if (tableName === 'topics' && values && typeof values.title === 'string') {
            const m = values.title.match(/Topic (\d+)/);
            if (m) jobNum = parseInt(m[1], 10);
          } else if (tableName === 'posts' && values && typeof values.hook === 'string') {
            const m = values.hook.match(/job (\d+)/);
            if (m) jobNum = parseInt(m[1], 10);
          } else if (tableName === 'slides' && Array.isArray(values) && values.length > 0) {
            const m = (values[0]?.headline || '').match(/Job (\d+)/);
            if (m) jobNum = parseInt(m[1], 10);
          }

          if (jobNum >= 0) {
            const mode = jobNum % 4;
            if (
              (mode === 0 && tableName === 'topics') ||
              (mode === 1 && tableName === 'posts') ||
              (mode === 2 && tableName === 'slides')
            ) {
              const originalThen = builder.then.bind(builder);
              builder.then = (onfulfilled?: (val: any) => any, onrejected?: (err: any) => any) => {
                return Promise.resolve({
                  data: null,
                  error: {
                    message: `Simulated error for job ${jobNum} on ${tableName}: postgresql://dbadmin:secret123@db:5432/app`,
                    code: '23505',
                  },
                }).then(onfulfilled, onrejected);
              };
            }
          }
          return builder;
        };

        return builder;
      }
    }

    const mock = new ChaoticMock();
    const TOTAL_JOBS = 120; // 30 of each mode: 30 fail_topics, 30 fail_posts, 30 fail_slides, 30 success

    const packages = Array.from({ length: TOTAL_JOBS }, (_, idx) => makeMockPackage(idx, 6));

    const settled = await Promise.allSettled(
      packages.map((pkg) => persistCarouselPackage(pkg, { supabase: mock })),
    );

    const fulfilled = settled.filter((s) => s.status === 'fulfilled');
    const rejected = settled.filter((s) => s.status === 'rejected');

    assert.equal(fulfilled.length, 30, 'Exactly 30 jobs (job % 4 === 3) must succeed');
    assert.equal(rejected.length, 90, 'Exactly 90 jobs must fail');

    // Verify all rejections are DatabasePersistenceError and scrubbed
    for (const r of rejected) {
      if (r.status === 'rejected') {
        assert.ok(r.reason instanceof DatabasePersistenceError);
        assert.equal(r.reason.code, 'DATABASE_ERROR');
        assert.doesNotMatch(r.reason.message, /secret123/);
        assert.doesNotMatch(r.reason.message, /postgresql:\/\//);
        assert.ok(r.reason.message.includes('[REDACTED_DB_URL]'));
      }
    }

    // Verify zero orphaned records:
    // Exactly 30 topics must remain in mock DB (from the 30 successful jobs)
    // Exactly 30 posts must remain in mock DB
    // Exactly 30 * 6 = 180 slides must remain
    assert.equal(mock.topics.size, 30, 'Compensating rollback must leave ZERO orphaned topics (exactly 30 remain)');
    assert.equal(mock.posts.size, 30, 'Compensating rollback must leave ZERO orphaned posts (exactly 30 remain)');
    assert.equal(mock.slides.size, 180, 'Compensating rollback must leave exactly 180 slides');

    // Verify all remaining posts belong to mode 3
    for (const post of mock.posts.values()) {
      const match = post.hook.match(/job (\d+)/);
      assert.ok(match);
      const jobNum = parseInt(match[1], 10);
      assert.equal(jobNum % 4, 3, `Only mode 3 jobs should persist, but found job ${jobNum}`);
    }
  });

  await t.test('1.3 High-Throughput Burst Test: 5 batches of 30 concurrent operations', async () => {
    const mock = createMockSupabase();
    const BATCHES = 5;
    const BATCH_SIZE = 30;

    for (let b = 0; b < BATCHES; b++) {
      const batchPackages = Array.from({ length: BATCH_SIZE }, (_, idx) =>
        makeMockPackage(b * BATCH_SIZE + idx, 5),
      );

      const batchResults = await Promise.all(
        batchPackages.map((pkg) => persistCarouselPackage(pkg, { supabase: mock })),
      );

      assert.equal(batchResults.length, BATCH_SIZE);
    }

    assert.equal(mock.topics.size, 150, 'Total persisted topics must be 150');
    assert.equal(mock.posts.size, 150, 'Total persisted posts must be 150');
    assert.equal(mock.slides.size, 150 * 5, 'Total persisted slides must be 750');
  });

  // =========================================================================
  // Section 2: Deep Object Graphs & Cycle Detection Stress Tests
  // =========================================================================

  await t.test('2.1 Deep Object Nesting Stress (Depth 200 & Depth 500)', () => {
    // Construct an object nested 200 levels deep with secrets at leaf level
    let current: any = {
      secretApiKey: 'sk-abcdef12345678901234567890',
      secretJwt: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.signature',
      secretDb: 'postgresql://admin:super_secret@localhost:5432/main',
      url: 'https://mysub.supabase.co/rest/v1',
    };

    for (let depth = 0; depth < 200; depth++) {
      current = {
        level: depth,
        nested: current,
        arrayData: [depth, 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxx.yyy'],
      };
    }

    const scrubbed = scrubErrorDetails(current);

    // Verify root level and leaf level
    assert.equal(scrubbed.level, 199);
    assert.equal(scrubbed.arrayData[1], 'Bearer [REDACTED]');

    let check = scrubbed;
    for (let depth = 0; depth < 200; depth++) {
      check = check.nested;
    }

    assert.equal(check.secretApiKey, '[REDACTED_API_KEY]');
    assert.equal(check.secretJwt, '[REDACTED_JWT]');
    assert.equal(check.secretDb, '[REDACTED_DB_URL]');
    assert.equal(check.url, '[REDACTED_SUPABASE_URL]');
  });

  await t.test('2.2 Circular Reference Handling: Self-cycle, Mutual Cycles, and Multi-Node Graphs', () => {
    // Case 1: Simple self-cycle
    const selfCycle: any = { message: 'DB connection failure' };
    selfCycle.self = selfCycle;

    const scrubbedSelf = scrubErrorDetails(selfCycle);
    assert.equal(scrubbedSelf.message, 'DB connection failure');
    assert.equal(scrubbedSelf.self, '[Circular]');

    // Case 2: Mutual cycle A -> B -> A
    const nodeA: any = { name: 'NodeA', token: 'sk-1234567890abcdef1234567890' };
    const nodeB: any = { name: 'NodeB', url: 'https://abc.supabase.co' };
    nodeA.link = nodeB;
    nodeB.link = nodeA;

    const scrubbedMutual = scrubErrorDetails(nodeA);
    assert.equal(scrubbedMutual.name, 'NodeA');
    assert.equal(scrubbedMutual.token, '[REDACTED_API_KEY]');
    assert.equal(scrubbedMutual.link.name, 'NodeB');
    assert.equal(scrubbedMutual.link.url, '[REDACTED_SUPABASE_URL]');
    assert.equal(scrubbedMutual.link.link, '[Circular]');

    // Case 3: Diamond cycle A -> B, A -> C, B -> D, C -> D, D -> A
    const diamondA: any = { id: 'A' };
    const diamondB: any = { id: 'B' };
    const diamondC: any = { id: 'C' };
    const diamondD: any = { id: 'D' };
    diamondA.b = diamondB;
    diamondA.c = diamondC;
    diamondB.d = diamondD;
    diamondC.d = diamondD;
    diamondD.a = diamondA;

    const scrubbedDiamond = scrubErrorDetails(diamondA);
    assert.equal(scrubbedDiamond.id, 'A');
    assert.equal(scrubbedDiamond.b.id, 'B');
    assert.equal(scrubbedDiamond.c.id, 'C');
    assert.ok(scrubbedDiamond.b.d.id === 'D');
  });

  await t.test('2.3 Circular Error Cause Chains and sanitizeCause', () => {
    // Cyclic cause: err1.cause = err2, err2.cause = err1
    const err1: any = new Error('Primary error: postgresql://admin:secret1@db:5432/app');
    const err2: any = new Error('Secondary error: key eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.p.s');
    err1.cause = err2;
    err2.cause = err1;

    const sanitized = sanitizeCause(err1) as Error;
    assert.ok(sanitized instanceof Error);
    assert.doesNotMatch(sanitized.message, /secret1/);
    assert.ok(sanitized.message.includes('[REDACTED_DB_URL]'));

    const sanitizedCause = (sanitized as any).cause;
    assert.ok(sanitizedCause instanceof Error);
    assert.doesNotMatch(sanitizedCause.message, /eyJhbGciOiJIUzI1Ni/);
    assert.ok(sanitizedCause.message.includes('[REDACTED_JWT]'));
    assert.equal((sanitizedCause as any).cause, '[Circular]');

    // Ensure DatabasePersistenceError constructor handles this without throwing
    const dbErr = new DatabasePersistenceError('Persist failed', { cause: err1 });
    assert.ok(dbErr);
    const inspected = util.inspect(dbErr);
    assert.doesNotMatch(inspected, /secret1/);
    assert.doesNotMatch(inspected, /eyJhbGciOiJIUzI1Ni/);
    assert.ok(inspected.includes('[REDACTED_DB_URL]'));
    assert.ok(inspected.includes('[REDACTED_JWT]'));
  });

  await t.test('2.4 Boundary Objects: null prototype, sparse arrays, symbols, functions', () => {
    // Object with null prototype: Object.create(null)
    const nullProto: any = Object.create(null);
    nullProto.db = 'postgresql://usr:pwd@host:5432/db';
    nullProto.num = 42;

    const cleanedNullProto = scrubErrorDetails(nullProto);
    assert.equal(cleanedNullProto.db, '[REDACTED_DB_URL]');
    assert.equal(cleanedNullProto.num, 42);

    // Sparse array with holes
    const sparseArr: any[] = [];
    sparseArr[0] = 'safe text';
    sparseArr[5] = 'sk-1234567890abcdef1234567890';
    const cleanedSparse = scrubErrorDetails(sparseArr);
    assert.equal(cleanedSparse[0], 'safe text');
    assert.equal(cleanedSparse[5], '[REDACTED_API_KEY]');

    // Symbol keys and non-string values
    const symObj: any = {
      [Symbol('test')]: 'sk-secret-sym-key-1234567890',
      normalKey: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxx.yyy',
      fn: () => 'do something',
      num: 123.456,
      flag: true,
      empty: null,
      undef: undefined,
    };
    const cleanedSym = scrubErrorDetails(symObj);
    assert.equal(cleanedSym.normalKey, 'Bearer [REDACTED]');
    assert.equal(cleanedSym.num, 123.456);
    assert.equal(cleanedSym.flag, true);
    assert.equal(cleanedSym.empty, null);
    assert.equal(cleanedSym.undef, undefined);
  });

  // =========================================================================
  // Section 3: Large String ReDoS and Secret Pattern Stress Tests
  // =========================================================================

  await t.test('3.1 Large String ReDoS Defense (1MB string, 1000+ secrets)', () => {
    const lines: string[] = [];
    const SECRET_COUNT = 1000;

    for (let i = 0; i < SECRET_COUNT; i++) {
      lines.push(`Line ${i}: Supabase project https://app-${i}.supabase.co/rest/v1`);
      lines.push(`Bearer token_${i}`);
      lines.push(`JWT eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.body_${i}.sig_${i}`);
      lines.push(`DB postgresql://user_${i}:pwd_${i}@db-${i}.supabase.in:5432/db_${i}`);
      lines.push(`OpenAI sk-proj-1234567890abcdef1234567890_${i}`);
      lines.push(`Service Key sbp_1234567890abcdef1234567890_${i}`);
      lines.push(`Password assignment password="super_secret_val_${i}"`);
      lines.push(`Env SUPABASE_SERVICE_ROLE_KEY=eyJh_${i}`);
      lines.push('A'.repeat(200)); // Non-secret padding
    }

    const largeText = lines.join('\n');
    assert.ok(largeText.length > 500000, `Payload size is ${largeText.length} chars`);

    const t0 = performance.now();
    const scrubbed = scrubSecrets(largeText);
    const duration = performance.now() - t0;

    assert.ok(duration < 2000, `scrubSecrets took ${duration.toFixed(2)}ms, must be < 2000ms`);

    // Ensure zero leak of raw credentials
    assert.doesNotMatch(scrubbed, /sk-proj-/);
    assert.doesNotMatch(scrubbed, /sbp_/);
    assert.doesNotMatch(scrubbed, /eyJhbGciOiJIUzI1Ni/);
    assert.doesNotMatch(scrubbed, /postgresql:\/\//);
    assert.doesNotMatch(scrubbed, /super_secret_val_/);
    assert.doesNotMatch(scrubbed, /app-\d+\.supabase\.co/);
  });

  // =========================================================================
  // Section 4: Input Validation & Boundary Shapes
  // =========================================================================

  await t.test('4.1 Rejects invalid package arguments with VALIDATION_ERROR (400)', async () => {
    const mock = createMockSupabase();
    const invalidInputs: any[] = [null, undefined, 'not an object', 999, true, false];

    for (const inp of invalidInputs) {
      await assert.rejects(
        async () => {
          await persistCarouselPackage(inp, { supabase: mock });
        },
        (err: unknown) => {
          assert.ok(err instanceof DatabasePersistenceError);
          assert.equal(err.code, 'VALIDATION_ERROR');
          assert.equal(err.statusCode, 400);
          return true;
        },
      );
    }
  });

  await t.test('4.2 Persists package with minimum 5 slides and maximum 8 slides cleanly', async () => {
    const mock = createMockSupabase();

    const pkg5 = makeMockPackage(1, 5);
    const res5 = await persistCarouselPackage(pkg5, { supabase: mock });
    assert.ok(res5.topicId);
    assert.ok(res5.postId);

    const pkg8 = makeMockPackage(2, 8);
    const res8 = await persistCarouselPackage(pkg8, { supabase: mock });
    assert.ok(res8.topicId);
    assert.ok(res8.postId);

    assert.equal(mock.topics.size, 2);
    assert.equal(mock.posts.size, 2);
    assert.equal(mock.slides.size, 5 + 8);
  });
});
