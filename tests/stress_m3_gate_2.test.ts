/**
 * Gate 2 Empirical Challenger Stress & Verification Suite for Milestone 3
 * Executed by challenger_m3_gate_2.
 *
 * Covers:
 * 1. High-Volume Concurrency Stress Tests (300 concurrent operations, burst batches, interleaved failure cascades)
 * 2. Compensating Rollback Integrity under high-concurrency partial failures (Zero orphaned topics, posts, slides, sources)
 * 3. Deep Object Graphs, Extreme Recursion, and Complex Multi-Topology Cycle Detection
 * 4. AggregateError, Nested Cause Chains, and Plain Object Error Cause Preservation
 * 5. Secret Scrubbing Exhaustiveness across all error channels and process.env injections
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
      headline: `Gate 2 Slide ${i} for Task ${index}`,
      body: `Detailed technical description ${i} for task ${index} in high-concurrency gate suite.`,
      visualSuggestion: `Architecture diagram ${i} for task ${index}.`,
    });
  }

  return {
    topic: {
      title: `Gate 2 Topic ${index}: High Throughput Microservices`,
      pillar: 'web_architecture',
    },
    hook: `Why concurrency safety matters in distributed task ${index}?`,
    slides,
    caption: `Deep dive into transactional integrity #${index}. Learn how compensating rollbacks prevent database state pollution.`,
    cta: 'Save and follow @ElevateWeb for weekly system architecture breakdowns.',
    hashtags: ['#architecture', '#concurrency', '#microservices', '#performance'],
    sources: [
      'https://microservices.io/patterns/data/saga.html',
      `Enterprise Integration Patterns (Ref #${index})`,
    ],
  };
}

test('Milestone 3 Gate 2 Challenger Suite: Concurrency, Deep Objects & Cycle Delegation Stress', async (t) => {
  // =========================================================================
  // Section 1: High-Volume Concurrency Stress Tests (300 concurrent ops)
  // =========================================================================

  await t.test('1.1 Extreme Concurrency: 300 concurrent successful persistence operations', async () => {
    const mock = createMockSupabase();
    const CONCURRENCY_COUNT = 300;
    const startTime = performance.now();

    const packages = Array.from({ length: CONCURRENCY_COUNT }, (_, idx) =>
      makeMockPackage(idx, 5 + (idx % 4)), // cycle between 5, 6, 7, 8 slides
    );

    const results = await Promise.all(
      packages.map((pkg) => persistCarouselPackage(pkg, { supabase: mock })),
    );

    const duration = performance.now() - startTime;

    // Verify all 300 operations resolved
    assert.equal(results.length, CONCURRENCY_COUNT, 'All 300 operations must succeed');
    const topicIds = new Set(results.map((r) => r.topicId));
    const postIds = new Set(results.map((r) => r.postId));

    assert.equal(topicIds.size, CONCURRENCY_COUNT, 'All 300 topicIds must be unique and non-colliding');
    assert.equal(postIds.size, CONCURRENCY_COUNT, 'All 300 postIds must be unique and non-colliding');

    for (const r of results) {
      assert.match(r.topicId, UUID_REGEX, 'topicId must match UUID format');
      assert.match(r.postId, UUID_REGEX, 'postId must match UUID format');
    }

    // Verify database counts
    assert.equal(mock.topics.size, CONCURRENCY_COUNT, 'topics table must contain exactly 300 records');
    assert.equal(mock.posts.size, CONCURRENCY_COUNT, 'posts table must contain exactly 300 records');

    const expectedSlides = packages.reduce((acc, p) => acc + p.slides.length, 0);
    assert.equal(mock.slides.size, expectedSlides, `slides table must contain exactly ${expectedSlides} records`);

    const expectedSources = packages.reduce((acc, p) => acc + (p.sources?.length ?? 0), 0);
    assert.equal(mock.sources.size, expectedSources, `sources table must contain exactly ${expectedSources} records`);

    // Verify relational integrity
    for (const res of results) {
      const post = mock.posts.get(res.postId);
      assert.ok(post, `Post ${res.postId} must exist in mock DB`);
      assert.equal(post.topic_id, res.topicId, 'Post foreign key must match topicId');

      const slides = Array.from(mock.slides.values()).filter((s: any) => s.post_id === res.postId);
      assert.equal(slides.length, post.slide_count, 'Slide count must match post.slide_count');
    }

    // Throughput check
    assert.ok(duration < 15000, `Execution took ${duration.toFixed(2)}ms, must be < 15000ms`);
  });

  await t.test('1.2 Chaotic Interleaved Failures: 160 operations across 5 failure patterns with zero orphan records', async () => {
    // Mode modulo 5:
    // 0 -> fail_topics
    // 1 -> fail_posts
    // 2 -> fail_slides
    // 3 -> fail_sources
    // 4 -> SUCCESS
    class ChaoticMultiModeMock extends MockSupabaseClient {
      public override from(tableName: string) {
        const builder = super.from(tableName);
        const originalInsert = builder.insert.bind(builder);

        builder.insert = (values: any) => {
          originalInsert(values);

          let taskNum = -1;
          if (tableName === 'topics' && values?.title) {
            const m = values.title.match(/Topic (\d+)/);
            if (m) taskNum = parseInt(m[1], 10);
          } else if (tableName === 'posts' && values?.hook) {
            const m = values.hook.match(/task (\d+)/);
            if (m) taskNum = parseInt(m[1], 10);
          } else if (tableName === 'slides' && Array.isArray(values) && values.length > 0) {
            const m = (values[0]?.headline || '').match(/Task (\d+)/);
            if (m) taskNum = parseInt(m[1], 10);
          } else if (tableName === 'sources' && Array.isArray(values) && values.length > 0) {
            const m = (values[1]?.source_text || '').match(/Ref #(\d+)/);
            if (m) taskNum = parseInt(m[1], 10);
          }

          if (taskNum >= 0) {
            const mode = taskNum % 5;
            if (
              (mode === 0 && tableName === 'topics') ||
              (mode === 1 && tableName === 'posts') ||
              (mode === 2 && tableName === 'slides') ||
              (mode === 3 && tableName === 'sources')
            ) {
              const originalThen = builder.then.bind(builder);
              builder.then = (onfulfilled?: (val: any) => any, onrejected?: (err: any) => any) => {
                return Promise.resolve({
                  data: null,
                  error: {
                    message: `Simulated failure on ${tableName} for task ${taskNum}: postgresql://usr:pwd@db:5432/app with key sk-1234567890abcdef1234567890`,
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

    const mock = new ChaoticMultiModeMock();
    const TOTAL_TASKS = 160; // 32 tasks per mode: 32 fail_topics, 32 fail_posts, 32 fail_slides, 32 fail_sources, 32 success

    const packages = Array.from({ length: TOTAL_TASKS }, (_, idx) => makeMockPackage(idx, 6));

    const settled = await Promise.allSettled(
      packages.map((pkg) => persistCarouselPackage(pkg, { supabase: mock })),
    );

    const fulfilled = settled.filter((s) => s.status === 'fulfilled');
    const rejected = settled.filter((s) => s.status === 'rejected');

    assert.equal(fulfilled.length, 32, 'Exactly 32 tasks (task % 5 === 4) must succeed');
    assert.equal(rejected.length, 128, 'Exactly 128 tasks must fail and rollback');

    // Verify all rejections are clean DatabasePersistenceError with scrubbed secrets
    for (const r of rejected) {
      if (r.status === 'rejected') {
        assert.ok(r.reason instanceof DatabasePersistenceError);
        assert.equal(r.reason.code, 'DATABASE_ERROR');
        assert.equal(r.reason.statusCode, 500);
        assert.doesNotMatch(r.reason.message, /sk-1234567890abcdef/);
        assert.doesNotMatch(r.reason.message, /usr:pwd/);
        assert.ok(r.reason.message.includes('[REDACTED_API_KEY]'));
        assert.ok(r.reason.message.includes('[REDACTED_DB_URL]'));
      }
    }

    // Verify zero orphaned records:
    // Only the 32 successful tasks may remain in the database
    assert.equal(mock.topics.size, 32, 'Must have exactly 32 topics (zero orphans from failed tasks)');
    assert.equal(mock.posts.size, 32, 'Must have exactly 32 posts (zero orphans from failed tasks)');
    assert.equal(mock.slides.size, 32 * 6, 'Must have exactly 192 slides');
    assert.equal(mock.sources.size, 32 * 2, 'Must have exactly 64 sources');

    // Verify every single post remaining is from mode 4
    for (const post of mock.posts.values()) {
      const match = post.hook.match(/task (\d+)/);
      assert.ok(match);
      const taskNum = parseInt(match[1], 10);
      assert.equal(taskNum % 5, 4, `Only mode 4 tasks should persist, but found task ${taskNum}`);
    }
  });

  // =========================================================================
  // Section 2: Deep Object Graphs & Advanced Cycle Topologies
  // =========================================================================

  await t.test('2.1 Deep Object Nesting Stress (Depth 600)', () => {
    let current: any = {
      leafKey: 'sk-proj-leaf-secret-key-1234567890',
      databaseUrl: 'postgresql://dbuser:supersecretpass@postgres.supabase.co:5432/main',
      token: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.sig',
    };

    for (let depth = 0; depth < 600; depth++) {
      current = {
        level: depth,
        child: current,
        tags: [`item_${depth}`, 'sk-proj-array-secret-1234567890'],
      };
    }

    const scrubbed = scrubErrorDetails(current);

    // Root check
    assert.equal(scrubbed.level, 599);
    assert.equal(scrubbed.tags[1], '[REDACTED_API_KEY]');

    // Navigate to leaf
    let walker = scrubbed;
    for (let depth = 0; depth < 600; depth++) {
      walker = walker.child;
    }

    assert.equal(walker.leafKey, '[REDACTED_API_KEY]');
    assert.equal(walker.databaseUrl, '[REDACTED_DB_URL]');
    assert.equal(walker.token, 'Bearer [REDACTED]');
  });

  await t.test('2.2 Deep Error Cause Chain (50 Chained Errors)', () => {
    // Construct err50 -> cause: err49 -> cause: ... -> cause: err1
    let rootErr: Error = new Error('Leaf error 0: sk-leaf-secret-1234567890');
    for (let i = 1; i <= 50; i++) {
      const parentErr = new Error(`Chain level ${i}: postgresql://user_${i}:pass_${i}@db:5432/db`);
      (parentErr as any).cause = rootErr;
      rootErr = parentErr;
    }

    const sanitized = sanitizeCause(rootErr) as Error;
    assert.ok(sanitized instanceof Error);

    let current: any = sanitized;
    let depth = 0;
    while (current && current instanceof Error) {
      assert.doesNotMatch(current.message, /pass_\d+/);
      assert.doesNotMatch(current.message, /sk-leaf-secret/);
      if (current.cause && current.cause instanceof Error) {
        depth++;
        current = current.cause;
      } else {
        break;
      }
    }

    assert.equal(depth, 50, 'Must preserve all 50 levels of the error cause chain');
    assert.ok(current.message.includes('[REDACTED_API_KEY]'));
  });

  await t.test('2.3 Complex Multi-Topology Cycle Detection', () => {
    // Topology 1: Error referencing array containing the Error itself
    const errA: any = new Error('Topology A');
    const arr = [errA, { nested: errA }];
    errA.details = arr;

    const sanitizedA = sanitizeCause(errA) as any;
    assert.ok(sanitizedA instanceof Error);
    assert.equal(sanitizedA.details[0], '[Circular]');
    assert.equal(sanitizedA.details[1].nested, '[Circular]');

    // Topology 2: Disjoint cycles in the same object
    const cycle1: any = { id: 1 };
    cycle1.self = cycle1;
    const cycle2: any = { id: 2 };
    cycle2.self = cycle2;
    const container = { first: cycle1, second: cycle2, apiKey: 'sk-1234567890abcdef1234567890' };

    const scrubbedContainer = scrubErrorDetails(container);
    assert.equal(scrubbedContainer.apiKey, '[REDACTED_API_KEY]');
    assert.equal(scrubbedContainer.first.id, 1);
    assert.equal(scrubbedContainer.first.self, '[Circular]');
    assert.equal(scrubbedContainer.second.id, 2);
    assert.equal(scrubbedContainer.second.self, '[Circular]');

    // Topology 3: Self-referencing cause (err.cause = err)
    const selfCauseErr: any = new Error('Self cause error');
    selfCauseErr.cause = selfCauseErr;

    const sanitizedSelfCause = sanitizeCause(selfCauseErr) as any;
    assert.ok(sanitizedSelfCause instanceof Error);
    assert.equal(sanitizedSelfCause.cause, '[Circular]');
  });

  await t.test('2.4 AggregateError Secret Redaction and util.inspect safety', () => {
    const subError1 = new Error('Worker 1 failed: sk-api-key-sub-error-1234567890');
    const subError2 = new Error('Worker 2 DB failed: postgresql://postgres:pw123@db:5432/app');
    const aggError = new AggregateError(
      [subError1, subError2],
      'Batch transaction failed: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy.sig with password=aggpass',
    );

    const sanitized = sanitizeCause(aggError) as any;
    assert.ok(sanitized instanceof Error);
    assert.doesNotMatch(sanitized.message, /eyJhbGciOiJIUzI1Ni/);
    assert.doesNotMatch(sanitized.message, /aggpass/);
    assert.ok(sanitized.message.includes('Bearer [REDACTED]'));
    assert.ok(sanitized.message.includes('password=[REDACTED]'));

    const inspected = util.inspect(sanitized, { depth: null });
    assert.doesNotMatch(inspected, /sk-api-key-sub-error/);
    assert.doesNotMatch(inspected, /pw123/);
    assert.doesNotMatch(inspected, /aggpass/);
  });

  await t.test('2.5 Plain Object Cause Delegations (Supabase PostgrestError & Custom Shapes)', () => {
    // 1. PostgrestError with non-standard properties
    const postgrestErr = {
      code: '42P01',
      details: 'table "public.posts" does not exist at postgresql://user:pass@host/db',
      hint: 'Run migration scripts with key eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.s.p',
      message: 'relation does not exist',
      customContext: {
        query: 'SELECT * FROM posts',
        apiKey: 'sk-proj-0987654321fedcba0987654321',
      },
    };

    const sanitized = sanitizeCause(postgrestErr) as any;
    assert.notEqual(sanitized, '[Circular]', 'Must not evaluate to [Circular]');
    assert.equal(sanitized.code, '42P01');
    assert.equal(sanitized.message, 'relation does not exist');
    assert.doesNotMatch(sanitized.details, /user:pass/);
    assert.ok(sanitized.details.includes('[REDACTED_DB_URL]'));
    assert.doesNotMatch(sanitized.hint, /eyJhbGciOiJIUzI1Ni/);
    assert.ok(sanitized.hint.includes('[REDACTED_JWT]'));
    assert.equal(sanitized.customContext.apiKey, '[REDACTED_API_KEY]');

    // 2. DatabasePersistenceError with plain object cause
    const dbErr = new DatabasePersistenceError('Failed postgrest query', {
      cause: postgrestErr,
    });
    assert.notEqual(dbErr.cause, '[Circular]');
    const causeObj = dbErr.cause as any;
    assert.equal(causeObj.code, '42P01');
    assert.equal(causeObj.customContext.apiKey, '[REDACTED_API_KEY]');

    const inspected = util.inspect(dbErr);
    assert.doesNotMatch(inspected, /user:pass/);
    assert.doesNotMatch(inspected, /sk-proj-0987654321/);
    assert.doesNotMatch(inspected, /\[Circular\]/);
  });

  // =========================================================================
  // Section 3: Secret Scrubbing with Environment Variable Injections
  // =========================================================================

  await t.test('3.1 Environmental Secret Scrubbing (SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL, OPENAI_API_KEY)', () => {
    const originalEnv = { ...process.env };
    try {
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'custom_mock_supabase_secret_service_key_99999';
      process.env.SUPABASE_URL = 'https://custom-project-id.supabase.co';
      process.env.OPENAI_API_KEY = 'custom_mock_openai_secret_key_88888';

      const errorText = `Failed at ${process.env.SUPABASE_URL}/rest/v1 with service key ${process.env.SUPABASE_SERVICE_ROLE_KEY} and openai ${process.env.OPENAI_API_KEY}`;
      const scrubbed = scrubSecrets(errorText);

      assert.doesNotMatch(scrubbed, /custom_mock_supabase_secret_service_key_99999/);
      assert.doesNotMatch(scrubbed, /custom_mock_openai_secret_key_88888/);
      assert.doesNotMatch(scrubbed, /custom-project-id\.supabase\.co/);
      assert.ok(scrubbed.includes('[REDACTED_KEY]') || scrubbed.includes('[REDACTED_SUPABASE_URL]'));
    } finally {
      process.env = originalEnv;
    }
  });

  // =========================================================================
  // Section 4: Boundary Shapes & Non-Standard Error Invocations
  // =========================================================================

  await t.test('4.1 sanitizeCause and scrubErrorDetails with unusual primitive inputs', () => {
    assert.equal(sanitizeCause(null), undefined);
    assert.equal(sanitizeCause(undefined), undefined);
    assert.equal(sanitizeCause(0), 0);
    assert.equal(sanitizeCause(false), false);
    assert.equal(sanitizeCause(''), '');
    assert.equal(sanitizeCause(123n), 123n);

    assert.equal(scrubErrorDetails(null), null);
    assert.equal(scrubErrorDetails(undefined), undefined);
    assert.equal(scrubErrorDetails(0), 0);
    assert.equal(scrubErrorDetails(false), false);
    assert.equal(scrubErrorDetails(''), '');
    assert.equal(scrubErrorDetails(999), 999);
  });

  await t.test('4.2 persistCarouselPackage with non-string sources recovers with compensating rollback', async () => {
    const mock = createMockSupabase();
    const pkg = makeMockPackage(1, 5);
    // Adversarial injection: sources contains non-string object
    (pkg as any).sources = [12345, { bad: 'source' }];

    await assert.rejects(
      async () => {
        await persistCarouselPackage(pkg, { supabase: mock });
      },
      (err: unknown) => {
        assert.ok(err instanceof DatabasePersistenceError);
        assert.equal(err.code, 'DATABASE_ERROR');
        return true;
      },
    );

    // Rollback must have cleaned up the created topic and post
    assert.equal(mock.topics.size, 0, 'Compensating rollback must delete topic on child failure');
    assert.equal(mock.posts.size, 0, 'Compensating rollback must delete post on child failure');
    assert.equal(mock.slides.size, 0, 'Compensating rollback must leave no orphaned slides');
  });
});
