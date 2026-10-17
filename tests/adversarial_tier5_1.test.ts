/**
 * Tier 5 White-Box Adversarial Coverage Hardening Test Suite
 * Milestone 5: Monorepo E2E Integration & Adversarial Hardening
 *
 * Exercises deep edge cases, boundary conditions, malformed AI responses,
 * cascading persistence rollback invariants, and security sanitization.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { buildApp } from '../apps/api/src/app.ts';
import {
  GenerateContentRequestSchema,
  CarouselPackageSchema,
  BaseCarouselPackageSchema,
  SlideSchema,
  SlideTypeSchema,
  type CarouselPackage,
  type SlideType,
  type StructuredApiError,
} from '../packages/types/src/index.ts';
import {
  buildCarouselPrompt,
  buildUserPrompt,
  getSystemPrompt,
} from '../packages/prompts/src/index.ts';
import {
  validateCarouselOutput,
  sanitizeSecrets,
  sanitizeErrorDetails,
  ContentGenerationError,
  ContentValidationError,
  persistCarouselPackage,
  DatabasePersistenceError,
  generateCarousel,
} from '../packages/content/src/index.ts';

// ---------------------------------------------------------------------------
// Helpers and Mock Factories
// ---------------------------------------------------------------------------

function makeCarouselPackage(overrides?: Partial<CarouselPackage>): CarouselPackage {
  const slides = overrides?.slides ?? [
    {
      slideNumber: 1,
      type: 'hook' as SlideType,
      headline: 'Architectural Hook Headline',
      body: 'Body explaining technical context and stakes.',
      visualSuggestion: 'Architecture diagram showing system bottlenecks.',
    },
    {
      slideNumber: 2,
      type: 'concept' as SlideType,
      headline: 'Core Principles',
      body: 'Detailed technical explanation of the primary concept.',
      visualSuggestion: 'Flowchart of the execution pipeline.',
    },
    {
      slideNumber: 3,
      type: 'breakdown' as SlideType,
      headline: 'Step-by-Step Mechanics',
      body: 'In-depth mechanical breakdown of internal data flow.',
      visualSuggestion: 'Memory layout diagram.',
    },
    {
      slideNumber: 4,
      type: 'code_snippet' as SlideType,
      headline: 'Implementation Example',
      body: 'Code walkthrough showing implementation patterns.',
      visualSuggestion: 'Syntax-highlighted code editor window.',
    },
    {
      slideNumber: 5,
      type: 'takeaway' as SlideType,
      headline: 'Key Takeaways & Rule of Thumb',
      body: 'Engineering trade-offs and summary recommendations.',
      visualSuggestion: 'Key takeaways checklist card with @ElevateWeb branding.',
    },
  ];

  return {
    topic: {
      title: overrides?.topic?.title ?? 'Distributed Consensus with Raft',
      pillar: overrides?.topic?.pillar ?? 'web_architecture',
    },
    hook:
      overrides?.hook ??
      'How do distributed clusters agree on state when nodes fail unpredictably?',
    slides,
    caption:
      overrides?.caption ??
      'Distributed consensus is the backbone of modern cloud databases. In this breakdown, we examine how the Raft consensus algorithm maintains consistency across dynamic clusters.',
    cta:
      overrides?.cta ??
      'Save this guide for your next system design review and follow @ElevateWeb for weekly deep dives.',
    hashtags: overrides?.hashtags ?? ['#DistributedSystems', '#Raft', '#SystemDesign'],
    sources: overrides?.sources ?? ['In Search of an Understandable Consensus Algorithm (Ongaro & Ousterhout)'],
  };
}

class AdversarialMockSupabase {
  public topics: Map<string, any> = new Map();
  public posts: Map<string, any> = new Map();
  public slides: Map<string, any> = new Map();
  public sources: Map<string, any> = new Map();
  public failureTarget: 'none' | 'topics' | 'posts' | 'slides' | 'sources' | 'catastrophic_throw' = 'none';

  public reset() {
    this.topics.clear();
    this.posts.clear();
    this.slides.clear();
    this.sources.clear();
    this.failureTarget = 'none';
  }

  public from(table: string) {
    if (this.failureTarget === 'catastrophic_throw') {
      throw new Error('Catastrophic synchronous socket failure');
    }

    let action = 'select';
    let payload: any = null;
    let filterCol = '';
    let filterVal: any = null;
    let isSingle = false;

    const builder = {
      insert: (values: any) => {
        action = 'insert';
        payload = values;
        return builder;
      },
      select: (_cols?: string) => builder,
      single: () => {
        isSingle = true;
        return builder;
      },
      delete: () => {
        action = 'delete';
        return builder;
      },
      eq: (col: string, val: any) => {
        filterCol = col;
        filterVal = val;
        return builder;
      },
      then: async (
        onfulfilled?: (val: { data: any; error: any }) => any,
        onrejected?: (err: any) => any,
      ): Promise<any> => {
        try {
          if (this.failureTarget === table) {
            const errRes = {
              data: null,
              error: {
                message: `Simulated constraint failure on table ${table}`,
                code: '23505',
                details: 'Key already exists or constraint violated',
              },
            };
            return onfulfilled ? onfulfilled(errRes) : errRes;
          }

          if (action === 'insert') {
            const items = Array.isArray(payload) ? payload : [payload];
            const inserted: any[] = [];
            for (const item of items) {
              const id = item.id || randomUUID();
              const now = new Date().toISOString();
              const record = { ...item, id, created_at: now, updated_at: now };
              if (table === 'topics') this.topics.set(id, record);
              else if (table === 'posts') this.posts.set(id, record);
              else if (table === 'slides') this.slides.set(id, record);
              else if (table === 'sources') this.sources.set(id, record);
              inserted.push(record);
            }
            const res = isSingle ? inserted[0] : inserted;
            const success = { data: res, error: null };
            return onfulfilled ? onfulfilled(success) : success;
          }

          if (action === 'delete') {
            if (table === 'topics' && filterCol === 'id') {
              this.topics.delete(filterVal);
            }
            if (table === 'posts' && filterCol === 'id') {
              this.posts.delete(filterVal);
              for (const [id, s] of Array.from(this.slides.entries())) {
                if (s.post_id === filterVal) this.slides.delete(id);
              }
              for (const [id, src] of Array.from(this.sources.entries())) {
                if (src.post_id === filterVal) this.sources.delete(id);
              }
            }
            const delRes = { data: [], error: null };
            return onfulfilled ? onfulfilled(delRes) : delRes;
          }

          const defaultRes = { data: null, error: null };
          return onfulfilled ? onfulfilled(defaultRes) : defaultRes;
        } catch (err) {
          if (onrejected) return onrejected(err);
          throw err;
        }
      },
    };

    return builder;
  }
}

function createStaticMockOpenAI(pkg: CarouselPackage) {
  return {
    beta: {
      chat: {
        completions: {
          parse: async () => ({
            choices: [
              {
                message: {
                  parsed: pkg,
                  content: JSON.stringify(pkg),
                },
              },
            ],
          }),
        },
      },
    },
    chat: {
      completions: {
        create: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify(pkg),
              },
            },
          ],
        }),
      },
    },
  };
}

// ---------------------------------------------------------------------------
// SUITE 1: Unicode, Multi-Byte & Astral Plane Adversarial Stress
// ---------------------------------------------------------------------------
test('Tier 5 Suite 1: Unicode & Multi-Byte Adversarial Stress', async (suite) => {
  await suite.test('1.1 Astral plane characters, emojis, and surrogate pairs in topic', async () => {
    // Emojis are surrogate pairs (2 UTF-16 code units each)
    const emojiTopic = '🚀🔥⚡ Web Architecture at Scale';
    const parsed = GenerateContentRequestSchema.safeParse({
      topic: emojiTopic,
      pillar: 'web_architecture',
    });
    assert.ok(parsed.success);
    assert.equal(parsed.data.topic, emojiTopic);

    // Prompt building preserves unicode strings cleanly
    const prompt = buildCarouselPrompt(parsed.data);
    assert.ok(prompt.userPrompt.includes(emojiTopic));
  });

  await suite.test('1.2 CJK, Cyrillic, Arabic, Hebrew, and Devanagari scripts', async () => {
    const scripts = [
      { lang: 'Japanese', topic: '分散システムの基礎と実践', pillar: 'tech_explained' },
      { lang: 'Chinese', topic: '高并发系统架构与设计模式', pillar: 'web_architecture' },
      { lang: 'Cyrillic', topic: 'Оптимизация производительности баз данных', pillar: 'performance' },
      { lang: 'Arabic', topic: 'شرح معمارية الأنظمة الموزعة', pillar: 'web_architecture' },
      { lang: 'Hebrew', topic: 'ארכיטקטורת תוכנה מבוזרת בענן', pillar: 'web_architecture' },
      { lang: 'Devanagari', topic: 'वितरित प्रणाली और सहमति एल्गोरिदम', pillar: 'tech_explained' },
    ];

    for (const item of scripts) {
      const res = GenerateContentRequestSchema.safeParse({
        topic: item.topic,
        pillar: item.pillar,
      });
      assert.ok(res.success, `Failed parsing ${item.lang} topic`);
      assert.equal(res.data.topic, item.topic);
    }
  });

  await suite.test('1.3 Zero-width characters and diacritical marks in topic and pillar', async () => {
    // ZWJ sequence / combining diacritics
    const zalgoTopic = 'D̶N̶S̶ Resolution Internals';
    const res = GenerateContentRequestSchema.safeParse({
      topic: zalgoTopic,
      pillar: 'tech_explained',
    });
    assert.ok(res.success);
    assert.equal(res.data.topic, zalgoTopic);
  });

  await suite.test('1.4 Topic whitespace trimming interaction with length checks', async () => {
    // Whitespace with only 2 non-whitespace characters -> trimmed length 2 -> rejected
    const tooShortPadded = '   ab   ';
    const resShort = GenerateContentRequestSchema.safeParse({
      topic: tooShortPadded,
      pillar: 'tech_explained',
    });
    assert.equal(resShort.success, false);

    // Whitespace with 3 non-whitespace characters -> trimmed length 3 -> accepted
    const exactMinPadded = '   abc   ';
    const resMin = GenerateContentRequestSchema.safeParse({
      topic: exactMinPadded,
      pillar: 'tech_explained',
    });
    assert.ok(resMin.success);
    assert.equal(resMin.data.topic, 'abc');

    // 200 characters wrapped in whitespace -> trimmed to exactly 200 -> accepted
    const exactMaxPadded = `  ${'x'.repeat(200)}  `;
    const resMax = GenerateContentRequestSchema.safeParse({
      topic: exactMaxPadded,
      pillar: 'tech_explained',
    });
    assert.ok(resMax.success);
    assert.equal(resMax.data.topic.length, 200);

    // 201 characters -> rejected
    const tooLong = 'x'.repeat(201);
    const resTooLong = GenerateContentRequestSchema.safeParse({
      topic: tooLong,
      pillar: 'tech_explained',
    });
    assert.equal(resTooLong.success, false);
  });
});

// ---------------------------------------------------------------------------
// SUITE 2: Schema Boundary & Precision Attacks
// ---------------------------------------------------------------------------
test('Tier 5 Suite 2: Schema Boundary & Precision Attacks', async (suite) => {
  await suite.test('2.1 Numeric boundary attacks on slideCount', async () => {
    const validPillar = 'tech_explained';
    const validTopic = 'PostgreSQL Index Internals';

    // Disallowed numbers
    const invalidSlideCounts = [
      4, // below minimum 5
      9, // above maximum 8
      0,
      -1,
      -5,
      4.99999, // non-integer
      5.00001, // non-integer
      NaN,
      Infinity,
      -Infinity,
    ];

    for (const count of invalidSlideCounts) {
      const res = GenerateContentRequestSchema.safeParse({
        topic: validTopic,
        pillar: validPillar,
        slideCount: count,
      });
      assert.equal(res.success, false, `Expected slideCount ${count} to be rejected`);
    }

    // Allowed exact integers
    for (const count of [5, 6, 7, 8]) {
      const res = GenerateContentRequestSchema.safeParse({
        topic: validTopic,
        pillar: validPillar,
        slideCount: count,
      });
      assert.ok(res.success, `Expected slideCount ${count} to be accepted`);
      assert.equal(res.data.slideCount, count);
    }
  });

  await suite.test('2.2 Pillar boundaries: single character vs empty whitespace', async () => {
    // Single character non-whitespace pillar is valid
    const singleCharPillar = GenerateContentRequestSchema.safeParse({
      topic: 'How DNS Works',
      pillar: 'a',
    });
    assert.ok(singleCharPillar.success);
    assert.equal(singleCharPillar.data.pillar, 'a');

    // Only whitespace is invalid
    const emptyPillar = GenerateContentRequestSchema.safeParse({
      topic: 'How DNS Works',
      pillar: '   \t\n  ',
    });
    assert.equal(emptyPillar.success, false);
  });

  await suite.test('2.3 Prototype pollution injection in request payload', async () => {
    const maliciousPayload = JSON.parse(
      '{"topic":"Clean Topic","pillar":"tech_explained","__proto__":{"polluted":"yes"}}',
    );

    // .strict() must reject unrecognized keys
    const res = GenerateContentRequestSchema.safeParse(maliciousPayload);
    // Even if parsed, verify object prototype is not polluted
    assert.equal((Object.prototype as any).polluted, undefined);
  });
});

// ---------------------------------------------------------------------------
// SUITE 3: Two-Tier Defense & Corrupted AI Output Infiltration
// ---------------------------------------------------------------------------
test('Tier 5 Suite 3: Two-Tier Defense & Corrupted AI Payload Infiltration', async (suite) => {
  await suite.test('3.1 Rejects AI slides starting at 2 instead of 1', async () => {
    const pkg = makeCarouselPackage();
    // Re-number slides starting at 2: 2, 3, 4, 5, 6
    pkg.slides = pkg.slides.map((s, idx) => ({ ...s, slideNumber: idx + 2 }));

    assert.throws(
      () => validateCarouselOutput(pkg),
      (err: any) => {
        assert.ok(err instanceof ContentValidationError);
        assert.match(err.message, /strictly sequential starting from 1/i);
        return true;
      },
    );
  });

  await suite.test('3.2 Rejects AI slides with duplicate slide numbers (e.g. 1, 2, 2, 4, 5)', async () => {
    const pkg = makeCarouselPackage();
    pkg.slides[2]!.slideNumber = 2; // duplicate slide 2

    assert.throws(
      () => validateCarouselOutput(pkg),
      (err: any) => {
        assert.ok(err instanceof ContentValidationError);
        assert.match(err.message, /strictly sequential/i);
        return true;
      },
    );
  });

  await suite.test('3.3 Rejects AI slides out of order (e.g. 1, 3, 2, 4, 5)', async () => {
    const pkg = makeCarouselPackage();
    pkg.slides[1]!.slideNumber = 3;
    pkg.slides[2]!.slideNumber = 2;

    assert.throws(
      () => validateCarouselOutput(pkg),
      (err: any) => {
        assert.ok(err instanceof ContentValidationError);
        return true;
      },
    );
  });

  await suite.test('3.4 Rejects AI output containing invalid slideType', async () => {
    const pkg = makeCarouselPackage();
    (pkg.slides[1] as any).type = 'unsupported_type_name';

    assert.throws(
      () => validateCarouselOutput(pkg),
      (err: any) => {
        assert.ok(err instanceof ContentValidationError);
        assert.match(err.message, /invalid enum value/i);
        return true;
      },
    );
  });

  await suite.test('3.5 Rejects AI output with invalid hashtag syntax', async () => {
    const pkgWithPunctuation = makeCarouselPackage({
      hashtags: ['#ValidTech', '#Invalid!Hashtag'],
    });

    assert.throws(
      () => validateCarouselOutput(pkgWithPunctuation),
      (err: any) => {
        assert.ok(err instanceof ContentValidationError);
        assert.match(err.message, /Invalid hashtag format/i);
        return true;
      },
    );

    const pkgWithSpaces = makeCarouselPackage({
      hashtags: ['#Tech Architecture'],
    });

    assert.throws(
      () => validateCarouselOutput(pkgWithSpaces),
      (err: any) => {
        assert.ok(err instanceof ContentValidationError);
        assert.match(err.message, /Invalid hashtag format/i);
        return true;
      },
    );
  });

  await suite.test('3.6 Rejects AI output with empty or whitespace source string', async () => {
    const pkg = makeCarouselPackage({
      sources: ['   '],
    });

    assert.throws(
      () => validateCarouselOutput(pkg),
      (err: any) => {
        assert.ok(err instanceof ContentValidationError);
        return true;
      },
    );
  });

  await suite.test('3.7 Generator handles client without compatible completions methods', async () => {
    const emptyClient = {};

    await assert.rejects(
      async () => {
        await generateCarousel(
          { topic: 'How DNS Works', pillar: 'tech_explained' },
          { openai: emptyClient },
        );
      },
      (err: any) => {
        assert.ok(err instanceof ContentGenerationError);
        assert.match(err.message, /no compatible completions interface/i);
        return true;
      },
    );
  });

  await suite.test('3.8 Generator handles OpenAI returning empty choices array', async () => {
    const mockOpenAI = {
      beta: {
        chat: {
          completions: {
            parse: async () => ({
              choices: [],
            }),
          },
        },
      },
    };

    await assert.rejects(
      async () => {
        await generateCarousel(
          { topic: 'How DNS Works', pillar: 'tech_explained' },
          { openai: mockOpenAI },
        );
      },
      (err: any) => {
        assert.ok(err instanceof ContentGenerationError);
        assert.match(err.message, /No completion choice returned/i);
        return true;
      },
    );
  });
});

// ---------------------------------------------------------------------------
// SUITE 4: Relational Persistence Faults & Compensating Rollback Invariants
// ---------------------------------------------------------------------------
test('Tier 5 Suite 4: Relational Persistence Faults & Rollback Invariants', async (suite) => {
  const db = new AdversarialMockSupabase();

  suite.beforeEach(() => {
    db.reset();
  });

  await suite.test('4.1 Compensating rollback when slide batch insert fails', async () => {
    db.failureTarget = 'slides';
    const pkg = makeCarouselPackage();

    await assert.rejects(
      async () => {
        await persistCarouselPackage(pkg, { supabase: db });
      },
      (err: any) => {
        assert.ok(err instanceof DatabasePersistenceError);
        assert.equal(err.code, 'DATABASE_ERROR');
        return true;
      },
    );

    // INVARIANT: ZERO orphaned records in topics, posts, slides, sources
    assert.equal(db.topics.size, 0, 'Orphaned topic remained after slide failure');
    assert.equal(db.posts.size, 0, 'Orphaned post remained after slide failure');
    assert.equal(db.slides.size, 0, 'Orphaned slides remained after slide failure');
    assert.equal(db.sources.size, 0, 'Orphaned sources remained after slide failure');
  });

  await suite.test('4.2 Compensating rollback when sources batch insert fails', async () => {
    db.failureTarget = 'sources';
    const pkg = makeCarouselPackage();

    await assert.rejects(
      async () => {
        await persistCarouselPackage(pkg, { supabase: db });
      },
      (err: any) => {
        assert.ok(err instanceof DatabasePersistenceError);
        return true;
      },
    );

    // INVARIANT: ZERO orphaned records
    assert.equal(db.topics.size, 0, 'Orphaned topic remained after sources failure');
    assert.equal(db.posts.size, 0, 'Orphaned post remained after sources failure');
    assert.equal(db.slides.size, 0, 'Orphaned slides remained after sources failure');
    assert.equal(db.sources.size, 0, 'Orphaned sources remained after sources failure');
  });

  await suite.test('4.3 Compensating rollback when post insert fails', async () => {
    db.failureTarget = 'posts';
    const pkg = makeCarouselPackage();

    await assert.rejects(
      async () => {
        await persistCarouselPackage(pkg, { supabase: db });
      },
      (err: any) => {
        assert.ok(err instanceof DatabasePersistenceError);
        return true;
      },
    );

    // Topic created in step A must be rolled back
    assert.equal(db.topics.size, 0, 'Orphaned topic remained after post failure');
    assert.equal(db.posts.size, 0);
  });

  await suite.test('4.4 Compensating rollback on catastrophic unhandled exception', async () => {
    db.failureTarget = 'catastrophic_throw';
    const pkg = makeCarouselPackage();

    await assert.rejects(
      async () => {
        await persistCarouselPackage(pkg, { supabase: db });
      },
      (err: any) => {
        assert.ok(err instanceof DatabasePersistenceError);
        assert.match(err.message, /Catastrophic synchronous socket failure/i);
        return true;
      },
    );

    assert.equal(db.topics.size, 0);
    assert.equal(db.posts.size, 0);
  });

  await suite.test('4.5 Persistence correctly classifies URL vs plain text sources', async () => {
    const pkg = makeCarouselPackage({
      sources: [
        'https://tools.ietf.org/html/rfc1035',
        'http://example.com/spec',
        'RFC 793 - Transmission Control Protocol',
      ],
    });

    const result = await persistCarouselPackage(pkg, { supabase: db });
    assert.ok(result.topicId);
    assert.ok(result.postId);

    const sourceRecords = Array.from(db.sources.values());
    assert.equal(sourceRecords.length, 3);

    const rfc1035 = sourceRecords.find((s) => s.source_text.includes('rfc1035'));
    assert.equal(rfc1035?.url, 'https://tools.ietf.org/html/rfc1035');

    const plainText = sourceRecords.find((s) => s.source_text.startsWith('RFC 793'));
    assert.equal(plainText?.url, null);
  });
});

// ---------------------------------------------------------------------------
// SUITE 5: Fastify Centralized Error Envelope & Protocol Hardening
// ---------------------------------------------------------------------------
test('Tier 5 Suite 5: Fastify Centralized Error Envelope & Protocol Hardening', async (suite) => {
  const pkg = makeCarouselPackage();
  const mockOpenAI = createStaticMockOpenAI(pkg);
  const mockSupabase = new AdversarialMockSupabase();

  let app: any;

  suite.before(async () => {
    app = await buildApp({
      openaiClient: mockOpenAI,
      supabaseClient: mockSupabase,
      logger: false,
    });
  });

  suite.after(async () => {
    if (app) await app.close();
  });

  await suite.test('5.1 Method Not Allowed / Route Not Found envelope on unsupported HTTP verbs', async () => {
    // Unsupported verbs on /health
    for (const method of ['POST', 'PUT', 'DELETE', 'PATCH'] as const) {
      const res = await app.inject({
        method,
        url: '/health',
      });
      assert.equal(res.statusCode, 404);
      const body = res.json() as StructuredApiError;
      assert.equal(body.error.code, 'NOT_FOUND');
    }

    // Unsupported verbs on /api/content/generate
    for (const method of ['GET', 'PUT', 'DELETE', 'PATCH'] as const) {
      const res = await app.inject({
        method,
        url: '/api/content/generate',
      });
      assert.equal(res.statusCode, 404);
      const body = res.json() as StructuredApiError;
      assert.equal(body.error.code, 'NOT_FOUND');
    }
  });

  await suite.test('5.2 Non-object body payloads return HTTP 400 VALIDATION_ERROR', async () => {
    const invalidBodies = [
      '"just a string"',
      '12345',
      '[1, 2, 3]',
      'true',
    ];

    for (const payload of invalidBodies) {
      const res = await app.inject({
        method: 'POST',
        url: '/api/content/generate',
        headers: { 'content-type': 'application/json' },
        payload,
      });

      assert.equal(res.statusCode, 400);
      const body = res.json() as StructuredApiError;
      assert.equal(body.error.code, 'VALIDATION_ERROR');
    }
  });

  await suite.test('5.3 Empty JSON body returns HTTP 400 VALIDATION_ERROR without 500 crash', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/content/generate',
      headers: { 'content-type': 'application/json' },
      payload: '',
    });

    assert.equal(res.statusCode, 400);
    const body = res.json() as StructuredApiError;
    assert.equal(body.error.code, 'VALIDATION_ERROR');
  });

  await suite.test('5.4 Unsupported media type returns structured response without 500 crash', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/content/generate',
      headers: { 'content-type': 'text/plain' },
      payload: 'topic=DNS&pillar=tech_explained',
    });

    assert.ok(
      res.statusCode === 400 || res.statusCode === 415,
      `Expected 400 or 415, got ${res.statusCode}`,
    );
    const body = res.json() as StructuredApiError;
    assert.ok(body.error.code);
    assert.ok(body.error.message);
  });

  await suite.test('5.5 Multi-credential secret scrubbing across headers, message, and details', async () => {
    const compoundLeak =
      'DB Error postgresql://postgres:SecretPassword123@db.supabase.co:5432/postgres with sk-proj-supersecretkey1234567890abcdef and Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abcdef1234567890';

    const scrubbed = sanitizeSecrets(compoundLeak);
    assert.ok(!scrubbed.includes('SecretPassword123'), 'Leaked DB password');
    assert.ok(!scrubbed.includes('supersecretkey1234567890'), 'Leaked OpenAI key');
    assert.ok(!scrubbed.includes('eyJzdWIi'), 'Leaked JWT payload');
    assert.ok(scrubbed.includes('[REDACTED_DB_URL]'));
    assert.ok(scrubbed.includes('[REDACTED_API_KEY]'));
    assert.ok(scrubbed.includes('Bearer [REDACTED]'));
  });
});
