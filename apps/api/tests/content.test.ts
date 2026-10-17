import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { buildApp } from '../src/app.ts';
import {
  CarouselPackageSchema,
  type CarouselPackage,
  type SlideType,
  type TopicRecord,
  type PostRecord,
  type SlideRecord,
  type SourceRecord,
} from '../../../packages/types/src/index.ts';

interface ErrorResponsePayload {
  error?: {
    code?: string;
    message?: string;
    details?: Array<{
      path?: string;
      field?: string;
      message?: string;
      code?: string;
    }>;
  };
}

// Helper fixture generator for mock responses
function makeValidPackage(
  slideCount = 6,
  title = 'How DNS Works: From URL to IP Address',
  pillar = 'tech_explained',
): CarouselPackage {
  const slides = [];
  for (let i = 1; i <= slideCount; i++) {
    slides.push({
      slideNumber: i,
      type: (i === 1 ? 'hook' : i === slideCount ? 'cta' : 'concept') as SlideType,
      headline: `Slide ${i} Headline`,
      body: `Body explanation for slide ${i} with deep technical accuracy.`,
      visualSuggestion: `Architecture diagram for step ${i}.`,
    });
  }

  return {
    topic: {
      title,
      pillar,
    },
    hook: 'Ever wondered what happens behind the scenes when you hit Enter on a URL? Here is the complete DNS journey in 6 slides.',
    slides,
    caption:
      'DNS translates human-readable domain names into machine-readable IP addresses in under 50ms...',
    cta: 'Save this post for your next system design interview and follow @ElevateWeb!',
    hashtags: ['#DNS', '#SystemDesign', '#WebDev', '#Networking'],
    sources: ['RFC 1034 - Domain Names: Concepts and Facilities'],
  };
}

type MockOpenAIMode = 'success' | 'malformed_json' | 'schema_violation_few_slides' | 'timeout';

interface MockOpenAIOptions {
  mode?: MockOpenAIMode;
}

function createMockOpenAI(options: MockOpenAIOptions = {}) {
  const mode = options.mode ?? 'success';

  return {
    beta: {
      chat: {
        completions: {
          parse: async (params: { messages: Array<{ role: string; content: string }> }) => {
            if (mode === 'timeout') {
              const err = new Error('Request timed out after 30000ms');
              (err as unknown as { code: string }).code = 'ETIMEDOUT';
              throw err;
            }

            if (mode === 'malformed_json') {
              return {
                choices: [
                  {
                    message: {
                      parsed: null,
                      content: '{{malformed json',
                    },
                  },
                ],
              };
            }

            if (mode === 'schema_violation_few_slides') {
              // Only 2 slides (violates 5-8 requirement)
              return {
                choices: [
                  {
                    message: {
                      parsed: makeValidPackage(2),
                      content: JSON.stringify(makeValidPackage(2)),
                    },
                  },
                ],
              };
            }

            // Detect requested slide count and topic from user prompt if available
            const userMsg = params.messages.find((m) => m.role === 'user')?.content || '';
            const slideMatch = userMsg.match(/target slide count:\s*(\d+)/i);
            const count = slideMatch && slideMatch[1] ? parseInt(slideMatch[1], 10) : 6;

            const pkg = makeValidPackage(count);
            return {
              choices: [
                {
                  message: {
                    parsed: pkg,
                    content: JSON.stringify(pkg),
                  },
                },
              ],
            };
          },
        },
      },
    },
    chat: {
      completions: {
        create: async () => {
          throw new Error('Not implemented');
        },
      },
    },
  };
}

class MockSupabaseClient {
  public topics: Map<string, TopicRecord> = new Map();
  public posts: Map<string, PostRecord> = new Map();
  public slides: Map<string, SlideRecord> = new Map();
  public sources: Map<string, SourceRecord> = new Map();
  public failureMode: 'none' | 'fail_posts' | 'fail_connection';

  constructor(failureMode: 'none' | 'fail_posts' | 'fail_connection' = 'none') {
    this.failureMode = failureMode;
  }

  public from(table: string) {
    let action = 'select';
    let payload: unknown = null;
    let filterCol = '';
    let filterVal: unknown = null;
    let isSingle = false;

    const builder = {
      insert: (values: unknown) => {
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
      eq: (col: string, val: unknown) => {
        filterCol = col;
        filterVal = val;
        return builder;
      },
      then: async (
        onfulfilled?: (val: { data: unknown; error: unknown }) => unknown,
        onrejected?: (err: unknown) => unknown,
      ): Promise<unknown> => {
        try {
          if (this.failureMode === 'fail_connection') {
            const errRes = {
              data: null,
              error: {
                message: 'Failed to connect to Supabase PostgreSQL cluster',
                code: 'PGRST000',
              },
            };
            return onfulfilled ? onfulfilled(errRes) : errRes;
          }

          if (this.failureMode === `fail_${table}`) {
            const errRes = {
              data: null,
              error: {
                message: `Simulated error on table ${table}`,
                code: '23505',
              },
            };
            return onfulfilled ? onfulfilled(errRes) : errRes;
          }

          if (action === 'insert') {
            const items = (Array.isArray(payload) ? payload : [payload]) as Record<
              string,
              unknown
            >[];
            const inserted: Record<string, unknown>[] = [];
            for (const item of items) {
              const id = typeof item.id === 'string' && item.id ? item.id : randomUUID();
              const now = new Date().toISOString();
              const rec = { ...item, id, created_at: now, updated_at: now };
              if (table === 'topics') this.topics.set(id, rec as unknown as TopicRecord);
              else if (table === 'posts') this.posts.set(id, rec as unknown as PostRecord);
              else if (table === 'slides') this.slides.set(id, rec as unknown as SlideRecord);
              else if (table === 'sources') this.sources.set(id, rec as unknown as SourceRecord);
              inserted.push(rec);
            }
            const res = isSingle ? inserted[0] : inserted;
            const successRes = { data: res, error: null };
            return onfulfilled ? onfulfilled(successRes) : successRes;
          }

          if (action === 'delete') {
            if (table === 'topics' && filterCol === 'id' && typeof filterVal === 'string') {
              this.topics.delete(filterVal);
            }
            if (table === 'posts' && filterCol === 'id' && typeof filterVal === 'string') {
              this.posts.delete(filterVal);
              for (const [id, s] of Array.from(this.slides.entries())) {
                if (s.post_id === filterVal) this.slides.delete(id);
              }
              for (const [id, src] of Array.from(this.sources.entries())) {
                if (src.post_id === filterVal) this.sources.delete(id);
              }
            }
            const deleteRes = { data: [], error: null };
            return onfulfilled ? onfulfilled(deleteRes) : deleteRes;
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

test('Integration: POST /api/content/generate', async (suite) => {
  // =========================================================================
  // 1. Valid Request Tests (HTTP 200)
  // =========================================================================
  await suite.test('1. Valid Requests', async (t) => {
    await t.test('1.1 Generates and persists carousel with minimal valid payload', async () => {
      const mockOpenAI = createMockOpenAI({ mode: 'success' });
      const mockSupabase = new MockSupabaseClient();
      const app = await buildApp({
        openaiClient: mockOpenAI,
        supabaseClient: mockSupabase,
        logger: false,
      });

      try {
        const res = await app.inject({
          method: 'POST',
          url: '/api/content/generate',
          payload: {
            topic: 'How DNS Works',
            pillar: 'tech_explained',
          },
        });

        assert.equal(res.statusCode, 200);
        assert.match(res.headers['content-type'] ?? '', /application\/json/i);

        const body = res.json() as CarouselPackage;
        // Validate against canonical CarouselPackageSchema
        const parsed = CarouselPackageSchema.safeParse(body);
        assert.ok(
          parsed.success,
          `Response should match CarouselPackageSchema: ${parsed.error?.message}`,
        );

        assert.equal(body.topic.title, 'How DNS Works: From URL to IP Address');
        assert.equal(body.topic.pillar, 'tech_explained');
        assert.equal(body.slides.length, 6);
        assert.equal(body.slides[0]?.slideNumber, 1);
        assert.equal(body.slides[0]?.type, 'hook');
        assert.equal(body.slides[5]?.slideNumber, 6);

        // Verify database persistence was called
        assert.equal(mockSupabase.topics.size, 1);
        assert.equal(mockSupabase.posts.size, 1);
        assert.equal(mockSupabase.slides.size, 6);
      } finally {
        await app.close();
      }
    });

    await t.test('1.2 Generates carousel with custom slideCount and tone', async () => {
      const mockOpenAI = createMockOpenAI({ mode: 'success' });
      const mockSupabase = new MockSupabaseClient();
      const app = await buildApp({
        openaiClient: mockOpenAI,
        supabaseClient: mockSupabase,
        logger: false,
      });

      try {
        const res = await app.inject({
          method: 'POST',
          url: '/api/content/generate',
          payload: {
            topic: 'PostgreSQL Index Internals',
            pillar: 'performance',
            tone: 'technical',
            slideCount: 8,
          },
        });

        assert.equal(res.statusCode, 200);
        const body = res.json() as CarouselPackage;
        assert.equal(body.slides.length, 8);
      } finally {
        await app.close();
      }
    });

    await t.test('1.3 Trims whitespace from topic and pillar automatically', async () => {
      const mockOpenAI = createMockOpenAI({ mode: 'success' });
      const mockSupabase = new MockSupabaseClient();
      const app = await buildApp({
        openaiClient: mockOpenAI,
        supabaseClient: mockSupabase,
        logger: false,
      });

      try {
        const res = await app.inject({
          method: 'POST',
          url: '/api/content/generate',
          payload: {
            topic: '   Kafka Architecture   ',
            pillar: '   web_architecture   ',
          },
        });

        assert.equal(res.statusCode, 200);
      } finally {
        await app.close();
      }
    });
  });

  // =========================================================================
  // 2. Request Validation Failure Tests (HTTP 400 VALIDATION_ERROR)
  // =========================================================================
  await suite.test('2. Request Validation Failures', async (t) => {
    const mockOpenAI = createMockOpenAI();
    const mockSupabase = new MockSupabaseClient();
    const app = await buildApp({
      openaiClient: mockOpenAI,
      supabaseClient: mockSupabase,
      logger: false,
    });

    t.after(async () => {
      await app.close();
    });

    await t.test('2.1 Rejects payload missing required topic', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/content/generate',
        payload: {
          pillar: 'tech_explained',
        },
      });

      assert.equal(res.statusCode, 400);
      const body = res.json() as ErrorResponsePayload;
      assert.equal(body.error?.code, 'VALIDATION_ERROR');
      assert.ok(
        body.error?.details?.some((d) => d.path?.includes('topic') || d.field?.includes('topic')),
        'Expected error details to mention missing topic',
      );
    });

    await t.test('2.2 Rejects payload missing required pillar', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/content/generate',
        payload: {
          topic: 'How DNS Works',
        },
      });

      assert.equal(res.statusCode, 400);
      const body = res.json() as ErrorResponsePayload;
      assert.equal(body.error?.code, 'VALIDATION_ERROR');
      assert.ok(
        body.error?.details?.some((d) => d.path?.includes('pillar') || d.field?.includes('pillar')),
      );
    });

    await t.test('2.3 Rejects topic shorter than 3 characters', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/content/generate',
        payload: {
          topic: 'ab',
          pillar: 'tech_explained',
        },
      });

      assert.equal(res.statusCode, 400);
      const body = res.json() as ErrorResponsePayload;
      assert.equal(body.error?.code, 'VALIDATION_ERROR');
    });

    await t.test('2.4 Rejects non-string or negative slideCount', async () => {
      const res1 = await app.inject({
        method: 'POST',
        url: '/api/content/generate',
        payload: {
          topic: 'How DNS Works',
          pillar: 'tech_explained',
          slideCount: 'ten',
        },
      });
      assert.equal(res1.statusCode, 400);
      assert.equal((res1.json() as ErrorResponsePayload).error?.code, 'VALIDATION_ERROR');

      const res2 = await app.inject({
        method: 'POST',
        url: '/api/content/generate',
        payload: {
          topic: 'How DNS Works',
          pillar: 'tech_explained',
          slideCount: -1,
        },
      });
      assert.equal(res2.statusCode, 400);
      assert.equal((res2.json() as ErrorResponsePayload).error?.code, 'VALIDATION_ERROR');
    });

    await t.test('2.5 Rejects slideCount outside bounds (4 or 9)', async () => {
      const resLow = await app.inject({
        method: 'POST',
        url: '/api/content/generate',
        payload: { topic: 'DNS', pillar: 'tech_explained', slideCount: 4 },
      });
      assert.equal(resLow.statusCode, 400);
      assert.equal((resLow.json() as ErrorResponsePayload).error?.code, 'VALIDATION_ERROR');

      const resHigh = await app.inject({
        method: 'POST',
        url: '/api/content/generate',
        payload: { topic: 'DNS', pillar: 'tech_explained', slideCount: 9 },
      });
      assert.equal(resHigh.statusCode, 400);
      assert.equal((resHigh.json() as ErrorResponsePayload).error?.code, 'VALIDATION_ERROR');
    });

    await t.test('2.6 Rejects unrecognized keys under strict validation', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/content/generate',
        payload: {
          topic: 'How DNS Works',
          pillar: 'tech_explained',
          unexpectedParam: 'forbidden',
        },
      });

      assert.equal(res.statusCode, 400);
      const body = res.json() as ErrorResponsePayload;
      assert.equal(body.error?.code, 'VALIDATION_ERROR');
      assert.ok(
        body.error?.details?.some(
          (d) => d.path === 'unexpectedParam' || d.field === 'unexpectedParam',
        ),
        'Expected details to mention unrecognized key unexpectedParam',
      );
    });

    await t.test('2.7 Handles malformed JSON payload gracefully', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/content/generate',
        headers: { 'content-type': 'application/json' },
        payload: '{ "topic": "DNS", invalid_json',
      });

      assert.equal(res.statusCode, 400);
      const body = res.json() as ErrorResponsePayload;
      assert.ok(body.error?.code === 'VALIDATION_ERROR' || body.error?.code === 'BAD_REQUEST');
    });
  });

  // =========================================================================
  // 3. OpenAI Upstream Failure Tests (HTTP 500 / 504)
  // =========================================================================
  await suite.test('3. Upstream Generation Failures', async (t) => {
    await t.test(
      '3.1 Returns 500 GENERATION_ERROR when OpenAI returns malformed JSON',
      async () => {
        const mockOpenAI = createMockOpenAI({ mode: 'malformed_json' });
        const mockSupabase = new MockSupabaseClient();
        const app = await buildApp({
          openaiClient: mockOpenAI,
          supabaseClient: mockSupabase,
          logger: false,
        });

        try {
          const res = await app.inject({
            method: 'POST',
            url: '/api/content/generate',
            payload: { topic: 'DNS', pillar: 'tech_explained' },
          });

          assert.equal(res.statusCode, 500);
          const body = res.json() as ErrorResponsePayload;
          assert.equal(body.error?.code, 'GENERATION_ERROR');
          assert.match(body.error?.message ?? '', /malformed|failed/i);
        } finally {
          await app.close();
        }
      },
    );

    await t.test(
      '3.2 Returns 500 GENERATION_ERROR when AI output violates schema (e.g. 2 slides)',
      async () => {
        const mockOpenAI = createMockOpenAI({ mode: 'schema_violation_few_slides' });
        const mockSupabase = new MockSupabaseClient();
        const app = await buildApp({
          openaiClient: mockOpenAI,
          supabaseClient: mockSupabase,
          logger: false,
        });

        try {
          const res = await app.inject({
            method: 'POST',
            url: '/api/content/generate',
            payload: { topic: 'DNS', pillar: 'tech_explained' },
          });

          assert.equal(res.statusCode, 500);
          const body = res.json() as ErrorResponsePayload;
          assert.equal(body.error?.code, 'GENERATION_ERROR');
        } finally {
          await app.close();
        }
      },
    );

    await t.test('3.3 Returns 500 UPSTREAM_TIMEOUT on OpenAI network timeout', async () => {
      const mockOpenAI = createMockOpenAI({ mode: 'timeout' });
      const mockSupabase = new MockSupabaseClient();
      const app = await buildApp({
        openaiClient: mockOpenAI,
        supabaseClient: mockSupabase,
        logger: false,
      });

      try {
        const res = await app.inject({
          method: 'POST',
          url: '/api/content/generate',
          payload: { topic: 'DNS', pillar: 'tech_explained' },
        });

        assert.equal(res.statusCode, 500);
        const body = res.json() as ErrorResponsePayload;
        assert.equal(body.error?.code, 'UPSTREAM_TIMEOUT');
        assert.match(body.error?.message ?? '', /timed out/i);
      } finally {
        await app.close();
      }
    });
  });

  // =========================================================================
  // 4. Supabase Persistence Failure Tests (HTTP 500 DATABASE_ERROR)
  // =========================================================================
  await suite.test('4. Database Failures & Rollback', async (t) => {
    await t.test(
      '4.1 Returns 500 DATABASE_ERROR when Supabase fails connection or insert',
      async () => {
        const mockOpenAI = createMockOpenAI({ mode: 'success' });
        const mockSupabase = new MockSupabaseClient('fail_posts');
        const app = await buildApp({
          openaiClient: mockOpenAI,
          supabaseClient: mockSupabase,
          logger: false,
        });

        try {
          const res = await app.inject({
            method: 'POST',
            url: '/api/content/generate',
            payload: { topic: 'DNS', pillar: 'tech_explained' },
          });

          assert.equal(res.statusCode, 500);
          const body = res.json() as ErrorResponsePayload;
          assert.equal(body.error?.code, 'DATABASE_ERROR');
          assert.match(body.error?.message ?? '', /database|persist/i);

          // Verify compensating rollback deleted topic so no orphaned records exist
          assert.equal(mockSupabase.topics.size, 0);
        } finally {
          await app.close();
        }
      },
    );
  });

  // =========================================================================
  // 5. Secret Scrubbing & Security Verification
  // =========================================================================
  await suite.test('5. Secret Scrubbing Security Defense', async (t) => {
    await t.test('5.1 Redacts OpenAI API keys in error responses', async () => {
      const leakedKey = 'sk-proj-supersecretkey1234567890abcdefghijklmnopqrstuvwxyz';
      const mockOpenAI = {
        beta: {
          chat: {
            completions: {
              parse: async () => {
                throw new Error(`Unauthorized OpenAI call with key: ${leakedKey}`);
              },
            },
          },
        },
      };
      const mockSupabase = new MockSupabaseClient();
      const app = await buildApp({
        openaiClient: mockOpenAI,
        supabaseClient: mockSupabase,
        logger: false,
      });

      try {
        const res = await app.inject({
          method: 'POST',
          url: '/api/content/generate',
          payload: { topic: 'DNS', pillar: 'tech_explained' },
        });

        assert.equal(res.statusCode, 500);
        assert.doesNotMatch(res.body, new RegExp(leakedKey, 'i'));
        assert.ok(res.body.includes('[REDACTED_API_KEY]'));
        assert.doesNotMatch(JSON.stringify(res.headers), new RegExp(leakedKey, 'i'));
      } finally {
        await app.close();
      }
    });

    await t.test('5.2 Redacts database connection URIs in error responses', async () => {
      const leakedDbUrl = 'postgresql://postgres:secretpassword123@db.supabase.co:5432/postgres';
      const mockOpenAI = createMockOpenAI({ mode: 'success' });
      const mockSupabase = {
        from: () => ({
          insert: () => ({
            select: () => ({
              single: async () => {
                throw new Error(`Connection failed to ${leakedDbUrl}`);
              },
            }),
          }),
        }),
      };
      const app = await buildApp({
        openaiClient: mockOpenAI,
        supabaseClient: mockSupabase,
        logger: false,
      });

      try {
        const res = await app.inject({
          method: 'POST',
          url: '/api/content/generate',
          payload: { topic: 'DNS', pillar: 'tech_explained' },
        });

        assert.equal(res.statusCode, 500);
        assert.doesNotMatch(res.body, /secretpassword123/);
        assert.doesNotMatch(res.body, /postgresql:\/\//);
        assert.ok(res.body.includes('[REDACTED_DB_URL]'));
      } finally {
        await app.close();
      }
    });
  });
});
