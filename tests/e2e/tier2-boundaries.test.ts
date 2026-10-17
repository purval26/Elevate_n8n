import test from 'node:test';
import assert from 'node:assert/strict';
import { createTestHarness, TestHarness } from './harness.ts';

test('Tier 2: Boundary & Corner Cases Suite', async (t) => {
  let harness: TestHarness;

  t.beforeEach(async () => {
    harness = await createTestHarness();
  });

  t.afterEach(async () => {
    await harness.teardown();
  });

  // =========================================================================
  // Feature 2.1: slideCount Boundary & Corner Cases (>=5 test cases)
  // =========================================================================
  await t.test('2.1.1 slideCount: 4 (below minimum 5) is rejected with HTTP 400 VALIDATION_ERROR', async () => {
    const res = await harness.generateContent({
      topic: 'How DNS Works',
      pillar: 'tech_explained',
      slideCount: 4,
    });

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
    assert.ok(
      res.body.error.details.some((d: any) => d.path === 'slideCount' || d.field === 'slideCount'),
      'Must report slideCount validation error',
    );
  });

  await t.test('2.1.2 slideCount: 5 (exact minimum boundary) succeeds with HTTP 200', async () => {
    const res = await harness.generateContent({
      topic: 'How DNS Works',
      pillar: 'tech_explained',
      slideCount: 5,
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.slides.length, 5);
  });

  await t.test('2.1.3 slideCount: 8 (exact maximum boundary) succeeds with HTTP 200', async () => {
    const res = await harness.generateContent({
      topic: 'How DNS Works',
      pillar: 'tech_explained',
      slideCount: 8,
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.slides.length, 8);
  });

  await t.test('2.1.4 slideCount: 9 (above maximum 8) is rejected with HTTP 400 VALIDATION_ERROR', async () => {
    const res = await harness.generateContent({
      topic: 'How DNS Works',
      pillar: 'tech_explained',
      slideCount: 9,
    });

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
    assert.ok(
      res.body.error.details.some((d: any) => d.path === 'slideCount' || d.field === 'slideCount'),
      'Must report slideCount validation error',
    );
  });

  await t.test('2.1.5 slideCount: 6.5 (floating point number) is rejected with integer error', async () => {
    const res = await harness.generateContent({
      topic: 'How DNS Works',
      pillar: 'tech_explained',
      slideCount: 6.5,
    });

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  });

  await t.test('2.1.6 slideCount: -1 (negative integer) is rejected with HTTP 400', async () => {
    const res = await harness.generateContent({
      topic: 'How DNS Works',
      pillar: 'tech_explained',
      slideCount: -1,
    });

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  });

  await t.test('2.1.7 slideCount: "6" (string representation of integer) is rejected with type error', async () => {
    const res = await harness.generateContent({
      topic: 'How DNS Works',
      pillar: 'tech_explained',
      slideCount: '6',
    });

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  });

  // =========================================================================
  // Feature 2.2: topic String Boundaries & Whitespace (>=5 test cases)
  // =========================================================================
  await t.test('2.2.1 Empty string topic "" is rejected with HTTP 400', async () => {
    const res = await harness.generateContent({
      topic: '',
      pillar: 'tech_explained',
    });

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  });

  await t.test('2.2.2 Whitespace-only topic "   " is rejected with HTTP 400', async () => {
    const res = await harness.generateContent({
      topic: '     ',
      pillar: 'tech_explained',
    });

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  });

  await t.test('2.2.3 Topic with 2 characters (below min 3) "Go" is rejected with length error', async () => {
    const res = await harness.generateContent({
      topic: 'Go',
      pillar: 'tech_explained',
    });

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  });

  await t.test('2.2.4 Topic with 3 characters (exact min boundary) "CSS" succeeds with HTTP 200', async () => {
    const res = await harness.generateContent({
      topic: 'CSS',
      pillar: 'tech_explained',
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.topic.title, 'CSS');
  });

  await t.test('2.2.5 Topic with 200 characters (exact max boundary) succeeds with HTTP 200', async () => {
    const longTopic = 'A'.repeat(200);
    const res = await harness.generateContent({
      topic: longTopic,
      pillar: 'tech_explained',
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.topic.title, longTopic);
  });

  await t.test('2.2.6 Topic with 201 characters (above max 200) is rejected with length error', async () => {
    const tooLongTopic = 'A'.repeat(201);
    const res = await harness.generateContent({
      topic: tooLongTopic,
      pillar: 'tech_explained',
    });

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  });

  await t.test('2.2.7 Topic with leading/trailing whitespace is trimmed and accepted', async () => {
    const res = await harness.generateContent({
      topic: '   Docker Container Internals   ',
      pillar: 'tech_explained',
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.topic.title, 'Docker Container Internals');
  });

  // =========================================================================
  // Feature 2.3: Character Encoding & Unicode Robustness (>=5 test cases)
  // =========================================================================
  await t.test('2.3.1 Topic with emojis is handled cleanly without corruption', async () => {
    const res = await harness.generateContent({
      topic: 'Kubernetes ☸️: Pod Lifecycle & Scheduling 🚀',
      pillar: 'tech_explained',
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.topic.title, 'Kubernetes ☸️: Pod Lifecycle & Scheduling 🚀');
  });

  await t.test('2.3.2 Topic with multi-byte CJK characters succeeds', async () => {
    const res = await harness.generateContent({
      topic: 'WebAssembly 与 Rust 高性能系统架构设计',
      pillar: 'tech_explained',
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.topic.title, 'WebAssembly 与 Rust 高性能系统架构设计');
  });

  await t.test('2.3.3 Topic with accented and diacritical characters succeeds', async () => {
    const res = await harness.generateContent({
      topic: 'Précis of HTTP/3 & QUIC Protocol Spécifications',
      pillar: 'tech_explained',
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.topic.title, 'Précis of HTTP/3 & QUIC Protocol Spécifications');
  });

  await t.test('2.3.4 Topic with math notation and programming punctuation succeeds', async () => {
    const res = await harness.generateContent({
      topic: 'O(log N) vs O(1): B-Trees, LSM-Trees & Hash Maps',
      pillar: 'tech_explained',
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.topic.title, 'O(log N) vs O(1): B-Trees, LSM-Trees & Hash Maps');
  });

  await t.test('2.3.5 Topic containing HTML/Script markup is sanitized as text without executing', async () => {
    const res = await harness.generateContent({
      topic: '<script>alert("xss")</script> Next.js SSR Security',
      pillar: 'security',
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.topic.title, '<script>alert("xss")</script> Next.js SSR Security');
  });

  // =========================================================================
  // Feature 2.4: Malformed Request Envelopes & Body Formats (>=5 test cases)
  // =========================================================================
  await t.test('2.4.1 Broken JSON syntax in request body returns HTTP 400 Bad Request', async () => {
    const res = await harness.generateContent('{"topic": "Broken JSON without close');

    assert.equal(res.statusCode, 400);
  });

  await t.test('2.4.2 Content-Type text/plain returns HTTP 415 or 400', async () => {
    const res = await harness.generateContent('topic=DNS&pillar=tech', {
      'content-type': 'text/plain',
    });

    assert.ok([400, 415].includes(res.statusCode), 'Should return 400 or 415 for non-JSON content-type');
  });

  await t.test('2.4.3 Array instead of JSON object as body returns HTTP 400 VALIDATION_ERROR', async () => {
    const res = await harness.generateContent([
      { topic: 'How DNS Works', pillar: 'tech_explained' },
    ]);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  });

  await t.test('2.4.4 Null values for required fields return HTTP 400 VALIDATION_ERROR', async () => {
    const res = await harness.generateContent({
      topic: null,
      pillar: null,
    });

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  });

  await t.test('2.4.5 Primitive boolean true as body returns HTTP 400 VALIDATION_ERROR', async () => {
    const res = await harness.generateContent(true);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  });

  // =========================================================================
  // Feature 2.5: Pillar & Tone Boundaries (>=5 test cases)
  // =========================================================================
  await t.test('2.5.1 Empty string pillar "" returns HTTP 400 VALIDATION_ERROR', async () => {
    const res = await harness.generateContent({
      topic: 'How DNS Works',
      pillar: '',
    });

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  });

  await t.test('2.5.2 Whitespace-only pillar "   " returns HTTP 400 VALIDATION_ERROR', async () => {
    const res = await harness.generateContent({
      topic: 'How DNS Works',
      pillar: '    ',
    });

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  });

  await t.test('2.5.3 Custom non-standard pillar string succeeds when non-empty', async () => {
    const res = await harness.generateContent({
      topic: 'How DNS Works',
      pillar: 'cloud_infrastructure',
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.topic.pillar, 'cloud_infrastructure');
  });

  await t.test('2.5.4 Empty string tone "" returns HTTP 400 VALIDATION_ERROR', async () => {
    const res = await harness.generateContent({
      topic: 'How DNS Works',
      pillar: 'tech_explained',
      tone: '',
    });

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  });

  await t.test('2.5.5 Long tone string is accepted and persisted cleanly', async () => {
    const detailedTone = 'highly-technical-concise-system-architecture-focus';
    const res = await harness.generateContent({
      topic: 'How DNS Works',
      pillar: 'tech_explained',
      tone: detailedTone,
    });

    assert.equal(res.statusCode, 200);
    const postRecord = Array.from(harness.supabase.posts.values())[0];
    assert.equal(postRecord.tone, detailedTone);
  });
});
