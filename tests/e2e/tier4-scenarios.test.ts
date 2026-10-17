import test from 'node:test';
import assert from 'node:assert/strict';
import { createTestHarness, TestHarness } from './harness.ts';
import {
  createDNSScenarioFixture,
  createJWTScenarioFixture,
  createDockerScenarioFixture,
  createReactScenarioFixture,
  createKafkaScenarioFixture,
} from './mocks/fixtures.ts';

test('Tier 4: Real-World Application Scenarios Suite', async (t) => {
  let harness: TestHarness;

  t.beforeEach(async () => {
    harness = await createTestHarness();
  });

  t.afterEach(async () => {
    await harness.teardown();
  });

  // =========================================================================
  // Scenario 1: How DNS Works: From URL to IP Address
  // =========================================================================
  await t.test('4.1 Scenario 1: "How DNS Works" (Pillar: tech_explained, Tone: educational, 6 slides)', async () => {
    const fixture = createDNSScenarioFixture();
    harness.openai.setMode('success', fixture);

    const res = await harness.generateContent({
      topic: 'How DNS Works: From URL to IP Address',
      pillar: 'tech_explained',
      tone: 'educational',
      slideCount: 6,
    });

    assert.equal(res.statusCode, 200);
    const carousel = res.body;

    // Verify Brand Standards & Content Quality
    assert.equal(carousel.topic.title, 'How DNS Works: From URL to IP Address');
    assert.equal(carousel.topic.pillar, 'tech_explained');
    assert.ok(carousel.hook.includes('DNS'));
    assert.equal(carousel.slides.length, 6);

    // Slide 1: Strong Hook
    assert.equal(carousel.slides[0].slideNumber, 1);
    assert.equal(carousel.slides[0].type, 'hook');
    assert.ok(carousel.slides[0].headline.length > 5);
    assert.ok(carousel.slides[0].visualSuggestion.length > 5);

    // Middle slides: Recursive resolver, Root, TLD, TTL
    assert.equal(carousel.slides[1].type, 'concept');
    assert.equal(carousel.slides[2].type, 'architecture');
    assert.equal(carousel.slides[3].type, 'breakdown');

    // Final Slide: CTA
    assert.equal(carousel.slides[5].slideNumber, 6);
    assert.equal(carousel.slides[5].type, 'cta');
    assert.match(carousel.slides[5].body, /@ElevateWeb/i);

    // Hashtags & Sources
    assert.ok(carousel.hashtags.includes('#DNS'));
    assert.ok(carousel.sources.length >= 1);
    assert.ok(carousel.sources.some((s: string) => s.includes('RFC 1035')));

    // Database Relational Persistence Check
    assert.equal(harness.supabase.topics.size, 1);
    assert.equal(harness.supabase.posts.size, 1);
    assert.equal(harness.supabase.slides.size, 6);
    assert.equal(harness.supabase.sources.size, carousel.sources.length);

    const topicRecord = Array.from(harness.supabase.topics.values())[0];
    const postRecord = Array.from(harness.supabase.posts.values())[0];
    assert.equal(postRecord.topic_id, topicRecord.id);

    // No secret leakage
    assert.doesNotMatch(res.rawBody, /sk-[a-zA-Z0-9_-]{20,}/i);
    assert.doesNotMatch(res.rawBody, /service_role/i);
  });

  // =========================================================================
  // Scenario 2: JWT vs Session Cookies: Authentication Deep Dive
  // =========================================================================
  await t.test('4.2 Scenario 2: "JWT vs Sessions" (Pillar: web_architecture, Tone: technical, 7 slides)', async () => {
    const fixture = createJWTScenarioFixture();
    harness.openai.setMode('success', fixture);

    const res = await harness.generateContent({
      topic: 'JWT vs Session Cookies: Authentication Deep Dive',
      pillar: 'web_architecture',
      tone: 'technical',
      slideCount: 7,
    });

    assert.equal(res.statusCode, 200);
    const carousel = res.body;

    assert.equal(carousel.slides.length, 7);
    assert.equal(carousel.slides[0].type, 'hook');
    assert.equal(carousel.slides[3].type, 'comparison');
    assert.equal(carousel.slides[6].type, 'cta');

    // Verify comparison content & security
    assert.ok(carousel.slides[3].headline.includes('Revocation'));
    assert.ok(carousel.caption.includes('JWT'));
    assert.ok(carousel.hashtags.includes('#Authentication'));
    assert.ok(carousel.sources.some((s: string) => s.includes('OWASP')));

    // DB verification
    assert.equal(harness.supabase.slides.size, 7);
    const post = Array.from(harness.supabase.posts.values())[0];
    assert.equal(post.slide_count, 7);
    assert.equal(post.tone, 'technical');
  });

  // =========================================================================
  // Scenario 3: Docker Containers Under the Hood: Namespaces & Cgroups
  // =========================================================================
  await t.test('4.3 Scenario 3: "Docker Containers" (Pillar: developer_tools, Tone: technical, 8 slides)', async () => {
    const fixture = createDockerScenarioFixture();
    harness.openai.setMode('success', fixture);

    const res = await harness.generateContent({
      topic: 'Docker Containers Under the Hood: Namespaces & Cgroups',
      pillar: 'developer_tools',
      tone: 'technical',
      slideCount: 8,
    });

    assert.equal(res.statusCode, 200);
    const carousel = res.body;

    assert.equal(carousel.slides.length, 8);
    assert.equal(carousel.slides[0].slideNumber, 1);
    assert.equal(carousel.slides[7].slideNumber, 8);

    // Check deep technical kernel topics in slides
    const headlines = carousel.slides.map((s: any) => s.headline).join(' ');
    assert.match(headlines, /Namespaces/i);
    assert.match(headlines, /Cgroups/i);
    assert.match(headlines, /OverlayFS/i);

    // Verify persistence
    assert.equal(harness.supabase.slides.size, 8);
    assert.equal(harness.supabase.topics.size, 1);
  });

  // =========================================================================
  // Scenario 4: React 19 Reconciliation: Fiber Tree & Concurrent Mode
  // =========================================================================
  await t.test('4.4 Scenario 4: "React 19 Reconciliation" (Pillar: performance, Tone: educational, 5 slides)', async () => {
    const fixture = createReactScenarioFixture();
    harness.openai.setMode('success', fixture);

    const res = await harness.generateContent({
      topic: 'React 19 Reconciliation: Fiber Tree & Concurrent Mode',
      pillar: 'performance',
      tone: 'educational',
      slideCount: 5,
    });

    assert.equal(res.statusCode, 200);
    const carousel = res.body;

    assert.equal(carousel.slides.length, 5);
    assert.equal(carousel.topic.pillar, 'performance');
    assert.ok(carousel.hashtags.includes('#ReactJS'));

    // Check concise educational slides
    carousel.slides.forEach((slide: any) => {
      assert.ok(slide.headline.length > 5);
      assert.ok(slide.body.length > 10);
      assert.ok(slide.visualSuggestion.length > 5);
    });

    // DB verification
    assert.equal(harness.supabase.slides.size, 5);
  });

  // =========================================================================
  // Scenario 5: Kafka vs RabbitMQ: Event Streaming vs Message Queues
  // =========================================================================
  await t.test('4.5 Scenario 5: "Kafka vs RabbitMQ" (Pillar: web_architecture, Tone: practical, 6 slides)', async () => {
    const fixture = createKafkaScenarioFixture();
    harness.openai.setMode('success', fixture);

    const res = await harness.generateContent({
      topic: 'Kafka vs RabbitMQ: Event Streaming vs Message Queues',
      pillar: 'web_architecture',
      tone: 'practical',
      slideCount: 6,
    });

    assert.equal(res.statusCode, 200);
    const carousel = res.body;

    assert.equal(carousel.slides.length, 6);
    assert.ok(carousel.sources.some((s: string) => s.includes('Kleppmann')));
    assert.ok(carousel.hashtags.includes('#SystemDesign'));

    // DB verification
    assert.equal(harness.supabase.slides.size, 6);
    const post = Array.from(harness.supabase.posts.values())[0];
    assert.equal(post.tone, 'practical');
    assert.equal(post.slide_count, 6);
  });
});
