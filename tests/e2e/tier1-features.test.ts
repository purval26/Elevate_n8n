import test from 'node:test';
import assert from 'node:assert/strict';
import { createTestHarness, TestHarness } from './harness.ts';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

test('Tier 1: Feature Coverage Suite', async (t) => {
  let harness: TestHarness;

  t.beforeEach(async () => {
    harness = await createTestHarness();
  });

  t.afterEach(async () => {
    await harness.teardown();
  });

  // =========================================================================
  // Feature 1: GET /health Endpoint (>=5 test cases)
  // =========================================================================
  await t.test('1.1 GET /health returns HTTP 200 with application/json content-type', async () => {
    const res = await harness.getHealth();
    assert.equal(res.statusCode, 200);
    assert.match(res.headers['content-type'] || '', /application\/json/i);
  });

  await t.test('1.2 GET /health returns exact service identity and status', async () => {
    const res = await harness.getHealth();
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, {
      status: 'ok',
      service: 'elevate-content-engine-api',
    });
  });

  await t.test('1.3 GET /health handles query parameters idempotently', async () => {
    const res = await harness.getHealth({ probe: 'kubernetes-liveness', timestamp: '1729094400' });
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.status, 'ok');
    assert.equal(res.body.service, 'elevate-content-engine-api');
  });

  await t.test('1.4 GET /health responds fast without calling external services', async () => {
    const start = performance.now();
    const res = await harness.getHealth();
    const duration = performance.now() - start;

    assert.equal(res.statusCode, 200);
    assert.ok(duration < 200, `Health check duration ${duration}ms should be < 200ms`);
    assert.equal(harness.openai.calls.length, 0, 'OpenAI client should not be called');
    assert.equal(harness.supabase.calls.length, 0, 'Supabase client should not be called');
  });

  await t.test('1.5 GET /health rejects unsupported HTTP methods', async () => {
    const resPost = await harness.request({ method: 'POST', url: '/health' });
    assert.ok([404, 405].includes(resPost.statusCode), 'POST /health should return 404 or 405');

    const resDelete = await harness.request({ method: 'DELETE', url: '/health' });
    assert.ok([404, 405].includes(resDelete.statusCode), 'DELETE /health should return 404 or 405');
  });

  // =========================================================================
  // Feature 2: POST /api/content/generate Primary Flow (>=5 test cases)
  // =========================================================================
  await t.test('2.1 POST /api/content/generate with minimal payload succeeds with default 6 slides', async () => {
    const res = await harness.generateContent({
      topic: 'How DNS Works',
      pillar: 'tech_explained',
    });

    assert.equal(res.statusCode, 200);
    assert.ok(res.body.slides);
    assert.equal(res.body.slides.length, 6);
    assert.equal(res.body.topic.pillar, 'tech_explained');
  });

  await t.test('2.2 POST /api/content/generate with explicit slideCount: 5 produces exactly 5 slides', async () => {
    const res = await harness.generateContent({
      topic: 'How DNS Works',
      pillar: 'tech_explained',
      slideCount: 5,
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.slides.length, 5);
    assert.equal(res.body.slides[0].slideNumber, 1);
    assert.equal(res.body.slides[4].slideNumber, 5);
  });

  await t.test('2.3 POST /api/content/generate with explicit slideCount: 8 produces exactly 8 slides', async () => {
    const res = await harness.generateContent({
      topic: 'How DNS Works',
      pillar: 'tech_explained',
      slideCount: 8,
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.slides.length, 8);
    assert.equal(res.body.slides[7].slideNumber, 8);
  });

  await t.test('2.4 POST /api/content/generate with explicit tone persists requested tone', async () => {
    const res = await harness.generateContent({
      topic: 'How DNS Works',
      pillar: 'tech_explained',
      tone: 'technical',
    });

    assert.equal(res.statusCode, 200);
    const postRecord = Array.from(harness.supabase.posts.values())[0];
    assert.ok(postRecord);
    assert.equal(postRecord.tone, 'technical');
  });

  await t.test('2.5 POST /api/content/generate returns complete structured carousel package conforming to contract', async () => {
    const res = await harness.generateContent({
      topic: 'How DNS Works',
      pillar: 'tech_explained',
    });

    assert.equal(res.statusCode, 200);
    const pkg = res.body;

    // Check topic
    assert.ok(pkg.topic);
    assert.equal(typeof pkg.topic.title, 'string');
    assert.equal(typeof pkg.topic.pillar, 'string');

    // Check hook
    assert.ok(pkg.hook);
    assert.ok(pkg.hook.length >= 5);

    // Check slides
    assert.ok(Array.isArray(pkg.slides));
    assert.ok(pkg.slides.length >= 5 && pkg.slides.length <= 8);
    pkg.slides.forEach((slide: any, idx: number) => {
      assert.equal(slide.slideNumber, idx + 1);
      assert.ok(slide.headline);
      assert.ok(slide.body);
      assert.ok(slide.visualSuggestion);
    });

    // Check caption, cta, hashtags, sources
    assert.ok(pkg.caption && pkg.caption.length >= 10);
    assert.ok(pkg.cta && pkg.cta.length >= 3);
    assert.ok(Array.isArray(pkg.hashtags) && pkg.hashtags.length > 0);
    assert.ok(Array.isArray(pkg.sources));
  });

  // =========================================================================
  // Feature 3: Zod Request Validation (>=5 test cases)
  // =========================================================================
  await t.test('3.1 Missing required topic field returns HTTP 400 with VALIDATION_ERROR', async () => {
    const res = await harness.generateContent({
      pillar: 'tech_explained',
    });

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
    assert.ok(
      res.body.error.details.some((d: any) => d.path === 'topic' || d.field === 'topic'),
      'Details must indicate topic error',
    );
  });

  await t.test('3.2 Missing required pillar field returns HTTP 400 with VALIDATION_ERROR', async () => {
    const res = await harness.generateContent({
      topic: 'How DNS Works',
    });

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
    assert.ok(
      res.body.error.details.some((d: any) => d.path === 'pillar' || d.field === 'pillar'),
      'Details must indicate pillar error',
    );
  });

  await t.test('3.3 Empty request body object returns HTTP 400 with multiple field errors', async () => {
    const res = await harness.generateContent({});

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
    assert.ok(res.body.error.details.length >= 2, 'Should report errors for both topic and pillar');
  });

  await t.test('3.4 Extra unknown keys rejected under strict schema validation', async () => {
    const res = await harness.generateContent({
      topic: 'How DNS Works',
      pillar: 'tech_explained',
      unexpectedProp: 'injected_value',
    });

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
    assert.ok(
      res.body.error.details.some((d: any) => d.path === 'unexpectedProp' || d.field === 'unexpectedProp'),
      'Details must indicate unrecognized key',
    );
  });

  await t.test('3.5 Non-string topic returns HTTP 400 with type error', async () => {
    const res = await harness.generateContent({
      topic: 123456,
      pillar: 'tech_explained',
    });

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  });

  // =========================================================================
  // Feature 4: OpenAI Structured Outputs & Error Handling (>=5 test cases)
  // =========================================================================
  await t.test('4.1 OpenAI structured output correctly parsed into carousel package', async () => {
    harness.openai.setMode('success');
    const res = await harness.generateContent({
      topic: 'How DNS Works',
      pillar: 'tech_explained',
    });

    assert.equal(res.statusCode, 200);
    assert.equal(harness.openai.calls.length, 1);
  });

  await t.test('4.2 OpenAI 429 Rate Limit error caught and returns HTTP 500 without leaking API key', async () => {
    harness.openai.setMode('rate_limit');
    const res = await harness.generateContent({
      topic: 'How DNS Works',
      pillar: 'tech_explained',
    });

    assert.equal(res.statusCode, 500);
    assert.equal(res.body.error.code, 'GENERATION_ERROR');
    assert.doesNotMatch(res.rawBody, /sk-[a-zA-Z0-9_-]{20,}/i, 'Must not leak OpenAI secret keys');
  });

  await t.test('4.3 OpenAI timeout error returns HTTP 500 / UPSTREAM_TIMEOUT without leaking secrets', async () => {
    harness.openai.setMode('timeout');
    const res = await harness.generateContent({
      topic: 'How DNS Works',
      pillar: 'tech_explained',
    });

    assert.equal(res.statusCode, 500);
    assert.ok(['UPSTREAM_TIMEOUT', 'GENERATION_ERROR'].includes(res.body.error.code));
    assert.doesNotMatch(res.rawBody, /OPENAI_API_KEY/);
  });

  await t.test('4.4 OpenAI malformed non-JSON output caught and returns HTTP 500 GENERATION_ERROR', async () => {
    harness.openai.setMode('malformed_json');
    const res = await harness.generateContent({
      topic: 'How DNS Works',
      pillar: 'tech_explained',
    });

    assert.equal(res.statusCode, 500);
    assert.equal(res.body.error.code, 'GENERATION_ERROR');
  });

  await t.test('4.5 OpenAI response missing visualSuggestion caught by Tier 2 validation', async () => {
    harness.openai.setMode('schema_violation_missing_fields');
    const res = await harness.generateContent({
      topic: 'How DNS Works',
      pillar: 'tech_explained',
    });

    assert.equal(res.statusCode, 500);
    assert.equal(res.body.error.code, 'GENERATION_ERROR');
  });

  // =========================================================================
  // Feature 5: Supabase Persistence & Migrations (>=5 test cases)
  // =========================================================================
  await t.test('5.1 Idempotent PostgreSQL migration file defines required tables', async (tCase) => {
    const migrationPath = resolve(
      process.cwd(),
      'supabase/migrations/20261016000000_create_content_engine_tables.sql',
    );
    if (!existsSync(migrationPath)) {
      tCase.skip('Milestone 3 (Supabase Migrations) pending execution by worker_m3');
      return;
    }

    const sqlContent = readFileSync(migrationPath, 'utf8');
    assert.match(sqlContent, /CREATE TABLE IF NOT EXISTS topics/i, 'Must declare topics table idempotently');
    assert.match(sqlContent, /CREATE TABLE IF NOT EXISTS posts/i, 'Must declare posts table idempotently');
    assert.match(sqlContent, /CREATE TABLE IF NOT EXISTS slides/i, 'Must declare slides table idempotently');
    assert.match(sqlContent, /CREATE TABLE IF NOT EXISTS sources/i, 'Must declare sources table idempotently');
    assert.match(sqlContent, /gen_random_uuid\(\)/i, 'Must use UUID primary keys');
  });

  await t.test('5.2 Successful generation persists topic with UUID primary key and timestamps', async () => {
    const res = await harness.generateContent({
      topic: 'How DNS Works',
      pillar: 'tech_explained',
    });

    assert.equal(res.statusCode, 200);
    assert.equal(harness.supabase.topics.size, 1);
    const topicRecord = Array.from(harness.supabase.topics.values())[0];
    assert.ok(topicRecord.id);
    assert.match(
      topicRecord.id,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      'Topic ID must be a valid UUID',
    );
    assert.ok(topicRecord.created_at);
  });

  await t.test('5.3 Successful generation persists post with foreign key referencing topic', async () => {
    const res = await harness.generateContent({
      topic: 'How DNS Works',
      pillar: 'tech_explained',
    });

    assert.equal(res.statusCode, 200);
    assert.equal(harness.supabase.posts.size, 1);
    const topicRecord = Array.from(harness.supabase.topics.values())[0];
    const postRecord = Array.from(harness.supabase.posts.values())[0];

    assert.ok(postRecord.id);
    assert.equal(postRecord.topic_id, topicRecord.id);
    assert.equal(postRecord.slide_count, res.body.slides.length);
  });

  await t.test('5.4 Successful generation persists ordered slides linked to post', async () => {
    const res = await harness.generateContent({
      topic: 'How DNS Works',
      pillar: 'tech_explained',
      slideCount: 6,
    });

    assert.equal(res.statusCode, 200);
    const postRecord = Array.from(harness.supabase.posts.values())[0];
    assert.equal(harness.supabase.slides.size, 6);

    const slideList = Array.from(harness.supabase.slides.values()).sort(
      (a: any, b: any) => a.slide_number - b.slide_number,
    );

    slideList.forEach((slide: any, index: number) => {
      assert.equal(slide.post_id, postRecord.id);
      assert.equal(slide.slide_number, index + 1);
      assert.ok(slide.headline);
      assert.ok(slide.body);
      assert.ok(slide.visual_suggestion);
    });
  });

  await t.test('5.5 Compensating rollback deletes post record if slide insertion fails', async () => {
    harness.supabase.setFailureMode('fail_slides');

    const res = await harness.generateContent({
      topic: 'How DNS Works',
      pillar: 'tech_explained',
    });

    assert.equal(res.statusCode, 500);
    assert.equal(res.body.error.code, 'DATABASE_ERROR');
    // Verify that the post record was cleaned up via compensating delete
    assert.equal(harness.supabase.posts.size, 0, 'Post record must be deleted upon slide insertion failure');
    assert.equal(harness.supabase.slides.size, 0, 'No orphaned slides should remain');
  });
});
