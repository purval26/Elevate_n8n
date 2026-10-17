import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BRAND_NAME,
  BRAND_HANDLE,
  BRAND_PILLARS,
  BRAND_VOICE_ATTRIBUTES,
  FORBIDDEN_CLICKBAIT_PHRASES,
  FORBIDDEN_AI_CLICHES,
  BRAND_GUARDRAILS,
  DEFAULT_ELEVATE_CTA,
  BRAND_VOICE_RULES,
  ELEVATE_SYSTEM_PROMPT,
  getSystemPrompt,
  buildCarouselPrompt,
  buildUserPrompt,
} from '../src/index.ts';

test('Brand Voice & Guardrails Constants', async (t) => {
  await t.test('brand identity constants are defined', () => {
    assert.equal(BRAND_NAME, 'ElevateWeb');
    assert.equal(BRAND_HANDLE, '@ElevateWeb');
    assert.ok(DEFAULT_ELEVATE_CTA.includes('@ElevateWeb'));
  });

  await t.test('brand pillars contain core technology domains', () => {
    assert.ok(BRAND_PILLARS.includes('tech_explained'));
    assert.ok(BRAND_PILLARS.includes('web_architecture'));
    assert.ok(BRAND_PILLARS.includes('developer_tools'));
  });

  await t.test('brand voice attributes include essential traits', () => {
    assert.ok(BRAND_VOICE_ATTRIBUTES.includes('modern'));
    assert.ok(BRAND_VOICE_ATTRIBUTES.includes('technical'));
    assert.ok(BRAND_VOICE_ATTRIBUTES.includes('educational'));
    assert.ok(BRAND_VOICE_ATTRIBUTES.includes('concise'));
  });

  await t.test('forbidden clickbait list includes prohibited patterns', () => {
    assert.ok(FORBIDDEN_CLICKBAIT_PHRASES.includes("You won't believe"));
    assert.ok(FORBIDDEN_CLICKBAIT_PHRASES.includes('Mind-blowing trick'));
    assert.ok(FORBIDDEN_CLICKBAIT_PHRASES.includes('Stop scrolling right now'));
  });

  await t.test('forbidden AI cliches include overused phrases', () => {
    assert.ok(FORBIDDEN_AI_CLICHES.includes("In today's fast-paced digital world"));
    assert.ok(FORBIDDEN_AI_CLICHES.includes('Delve into the realm'));
    assert.ok(FORBIDDEN_AI_CLICHES.includes('A tapestry of'));
  });

  await t.test('guardrail limits match specification bounds', () => {
    assert.equal(BRAND_GUARDRAILS.minSlides, 5);
    assert.equal(BRAND_GUARDRAILS.maxSlides, 8);
    assert.equal(BRAND_GUARDRAILS.allowHeadlineEmojis, false);
    assert.equal(BRAND_GUARDRAILS.prohibitFakeStatistics, true);
  });

  await t.test('brand voice rules text contains editorial standards', () => {
    assert.match(BRAND_VOICE_RULES, /ElevateWeb Editorial & Brand Rules/);
    assert.match(BRAND_VOICE_RULES, /ZERO TOLERANCE/);
    assert.match(BRAND_VOICE_RULES, /visualSuggestion/);
    assert.match(BRAND_VOICE_RULES, /sequential/i);
  });
});

test('System Prompt Engine', async (t) => {
  await t.test('ELEVATE_SYSTEM_PROMPT defines Lead Content Engineer persona', () => {
    assert.match(ELEVATE_SYSTEM_PROMPT, /Lead Content Engineer/);
    assert.match(ELEVATE_SYSTEM_PROMPT, /ElevateWeb/);
    assert.match(ELEVATE_SYSTEM_PROMPT, /distributed systems architect/);
  });

  await t.test('getSystemPrompt() returns default prompt without arguments', () => {
    const prompt = getSystemPrompt();
    assert.equal(prompt, ELEVATE_SYSTEM_PROMPT);
  });

  await t.test('getSystemPrompt() appends custom directives when provided', () => {
    const custom = 'Emphasize HTTP/3 and QUIC transport protocol subtleties.';
    const prompt = getSystemPrompt(custom);
    assert.ok(prompt.includes(ELEVATE_SYSTEM_PROMPT));
    assert.ok(prompt.includes(custom));
    assert.match(prompt, /Additional Directives/);
  });
});

test('Dynamic Carousel Prompt Compiler', async (t) => {
  await t.test('buildCarouselPrompt returns both systemPrompt and userPrompt', () => {
    const compiled = buildCarouselPrompt({
      topic: 'How DNS Works',
      pillar: 'tech_explained',
    });

    assert.ok(compiled.systemPrompt);
    assert.ok(compiled.userPrompt);
    assert.equal(compiled.systemPrompt, ELEVATE_SYSTEM_PROMPT);
  });

  await t.test('buildUserPrompt applies default 6 slides and educational tone', () => {
    const prompt = buildUserPrompt({
      topic: 'How DNS Works',
      pillar: 'tech_explained',
    });

    assert.match(prompt, /6 slides on the topic: "How DNS Works"/);
    assert.match(prompt, /Content Pillar: "tech_explained"/);
    assert.match(prompt, /Editorial Tone: "educational"/);
    assert.match(prompt, /numbered sequentially from 1 to 6/);
    assert.match(prompt, /Slide 1:/);
    assert.match(prompt, /Slide 6:/);
  });

  await t.test('buildUserPrompt supports custom slide count: 5', () => {
    const prompt = buildUserPrompt({
      topic: 'Event Loops in Node.js',
      pillar: 'developer_tools',
      slideCount: 5,
      tone: 'technical',
    });

    assert.match(prompt, /5 slides on the topic: "Event Loops in Node\.js"/);
    assert.match(prompt, /Target Slide Count: 5 slides/);
    assert.match(prompt, /numbered sequentially from 1 to 5/);
    assert.match(prompt, /Slide 5:/);
    assert.match(prompt, /Editorial Tone: "technical"/);
  });

  await t.test('buildUserPrompt supports custom slide count: 8', () => {
    const prompt = buildUserPrompt({
      topic: 'Distributed Consensus with Raft',
      pillar: 'web_architecture',
      slideCount: 8,
      tone: 'deep_dive',
    });

    assert.match(prompt, /8 slides on the topic: "Distributed Consensus with Raft"/);
    assert.match(prompt, /Target Slide Count: 8 slides/);
    assert.match(prompt, /numbered sequentially from 1 to 8/);
    assert.match(prompt, /Slide 8:/);
    assert.match(prompt, /Editorial Tone: "deep_dive"/);
  });

  await t.test('prompt enforces hook on slide 1 and takeaway on final slide', () => {
    const prompt = buildUserPrompt({
      topic: 'Database Sharding Strategies',
      pillar: 'web_architecture',
      slideCount: 7,
    });

    assert.match(prompt, /Slide 1:[\s\S]*?Type: "hook"/);
    assert.match(prompt, /Slide 7:[\s\S]*?Type: "takeaway" or "cta"/);
    assert.match(prompt, /visualSuggestion/i);
    assert.match(prompt, /Follow @ElevateWeb/i);
  });
});
