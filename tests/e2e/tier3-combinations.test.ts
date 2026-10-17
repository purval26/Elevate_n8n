import test from 'node:test';
import assert from 'node:assert/strict';
import { createTestHarness, TestHarness } from './harness.ts';

test('Tier 3: Cross-Feature Combinations Suite', async (t) => {
  let harness: TestHarness;

  t.beforeEach(async () => {
    harness = await createTestHarness();
  });

  t.afterEach(async () => {
    await harness.teardown();
  });

  // =========================================================================
  // Pairwise Matrix: Pillars x Tones x SlideCounts
  // =========================================================================
  await t.test('3.1 Pairwise: tech_explained + educational + 5 slides', async () => {
    const res = await harness.generateContent({
      topic: 'How Browser Rendering Engines Work',
      pillar: 'tech_explained',
      tone: 'educational',
      slideCount: 5,
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.slides.length, 5);
    assert.equal(res.body.topic.pillar, 'tech_explained');
    const postRecord = Array.from(harness.supabase.posts.values())[0];
    assert.equal(postRecord.tone, 'educational');
    assert.equal(postRecord.slide_count, 5);
  });

  await t.test('3.2 Pairwise: web_architecture + technical + 6 slides', async () => {
    const res = await harness.generateContent({
      topic: 'Event-Driven Microservices with Apache Kafka',
      pillar: 'web_architecture',
      tone: 'technical',
      slideCount: 6,
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.slides.length, 6);
    assert.equal(res.body.topic.pillar, 'web_architecture');
    const postRecord = Array.from(harness.supabase.posts.values())[0];
    assert.equal(postRecord.tone, 'technical');
  });

  await t.test('3.3 Pairwise: developer_tools + practical + 7 slides', async () => {
    const res = await harness.generateContent({
      topic: 'Git Internals: Blobs, Trees & Commits',
      pillar: 'developer_tools',
      tone: 'practical',
      slideCount: 7,
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.slides.length, 7);
    assert.equal(res.body.topic.pillar, 'developer_tools');
    const postRecord = Array.from(harness.supabase.posts.values())[0];
    assert.equal(postRecord.tone, 'practical');
    assert.equal(postRecord.slide_count, 7);
  });

  await t.test('3.4 Pairwise: performance + concise + 8 slides', async () => {
    const res = await harness.generateContent({
      topic: 'Database Indexing Strategies: B-Trees vs Hash Indexes',
      pillar: 'performance',
      tone: 'concise',
      slideCount: 8,
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.slides.length, 8);
    assert.equal(res.body.topic.pillar, 'performance');
    const postRecord = Array.from(harness.supabase.posts.values())[0];
    assert.equal(postRecord.tone, 'concise');
    assert.equal(postRecord.slide_count, 8);
  });

  await t.test('3.5 Pairwise: security + authoritative + 6 slides', async () => {
    const res = await harness.generateContent({
      topic: 'Zero Trust Network Architecture for Modern Web Apps',
      pillar: 'security',
      tone: 'authoritative',
      slideCount: 6,
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.slides.length, 6);
    assert.equal(res.body.topic.pillar, 'security');
    const postRecord = Array.from(harness.supabase.posts.values())[0];
    assert.equal(postRecord.tone, 'authoritative');
  });

  await t.test('3.6 Default combinations: Omitted tone and slideCount apply system defaults', async () => {
    const res = await harness.generateContent({
      topic: 'Understanding CSS Subgrid Layouts',
      pillar: 'tech_explained',
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.slides.length, 6, 'Default slide count should be 6');
    const postRecord = Array.from(harness.supabase.posts.values())[0];
    assert.equal(postRecord.tone, 'educational', 'Default tone should be educational');
  });

  await t.test('3.7 Boundary Combination: Max topic length (200 chars) + Min slide count (5) + tech_explained', async () => {
    const maxTopic = 'A'.repeat(200);
    const res = await harness.generateContent({
      topic: maxTopic,
      pillar: 'tech_explained',
      slideCount: 5,
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.slides.length, 5);
    assert.equal(res.body.topic.title, maxTopic);
  });

  await t.test('3.8 Boundary Combination: Min topic length (3 chars) + Max slide count (8) + performance', async () => {
    const res = await harness.generateContent({
      topic: 'SQL',
      pillar: 'performance',
      slideCount: 8,
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.slides.length, 8);
    assert.equal(res.body.topic.title, 'SQL');
  });

  await t.test('3.9 Multi-Error Cascade: Multiple invalid fields report all errors simultaneously', async () => {
    const res = await harness.generateContent({
      topic: 'No', // Too short (<3)
      pillar: '', // Empty pillar
      slideCount: 4, // Below min (<5)
      tone: '', // Empty tone
    });

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
    const details = res.body.error.details || [];
    assert.ok(details.length >= 3, `Expected at least 3 validation errors, got ${details.length}`);
  });

  await t.test('3.10 Combined Error: Strict schema rejects extra fields alongside valid inputs', async () => {
    const res = await harness.generateContent({
      topic: 'Docker Container Runtime',
      pillar: 'developer_tools',
      tone: 'technical',
      slideCount: 6,
      hackerProp: 'malicious_injection',
      adminAccess: true,
    });

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  });

  await t.test('3.11 Upstream Failure Recovery: OpenAI timeout with complex combination payload', async () => {
    harness.openai.setMode('timeout');
    const res = await harness.generateContent({
      topic: 'Distributed Transactions & 2-Phase Commit',
      pillar: 'web_architecture',
      tone: 'technical',
      slideCount: 7,
    });

    assert.equal(res.statusCode, 500);
    assert.ok(['UPSTREAM_TIMEOUT', 'GENERATION_ERROR'].includes(res.body.error.code));
    assert.equal(harness.supabase.topics.size, 0, 'No DB records should be created if OpenAI fails');
  });

  await t.test('3.12 Database Failure Recovery: Supabase connection failure with valid payload', async () => {
    harness.supabase.setFailureMode('fail_connection');
    const res = await harness.generateContent({
      topic: 'WebSocket vs Server-Sent Events',
      pillar: 'web_architecture',
    });

    assert.equal(res.statusCode, 500);
    assert.equal(res.body.error.code, 'DATABASE_ERROR');
    assert.doesNotMatch(res.rawBody, /service_role/i, 'Must not leak database credentials');
  });

  await t.test('3.13 Cascading Persistence & Rollback: Failure on post insert leaves no orphaned topic', async () => {
    harness.supabase.setFailureMode('fail_posts');
    const res = await harness.generateContent({
      topic: 'PostgreSQL WAL Internals',
      pillar: 'performance',
    });

    assert.equal(res.statusCode, 500);
    assert.equal(res.body.error.code, 'DATABASE_ERROR');
    assert.equal(harness.supabase.posts.size, 0);
  });
});
