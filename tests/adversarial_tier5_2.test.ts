/**
 * Tier 5 Adversarial Stress, Concurrency, and Security Penetration Test Suite
 * Milestone 5: Final Monorepo E2E Integration & Adversarial Hardening
 *
 * Verifies:
 * 1. High-load concurrency stress testing (120+ requests across GET /health and POST /api/content/generate)
 *    - Zero request crosstalk
 *    - Clean state isolation in Supabase relational mock
 *    - Zero unhandled promise rejections
 * 2. Penetration testing for secret leakage across all vectors:
 *    - Request bodies containing secrets in keys and values
 *    - Request headers containing API keys, DB URLs, and JWTs
 *    - Upstream OpenAI mock errors containing API keys, JWTs, and DB URLs
 *    - Upstream Supabase mock errors containing DB passwords and service role keys
 *    - 100% redaction in response messages, details, and application logs
 * 3. Malformed payload attacks:
 *    - Prototype pollution (__proto__, constructor.prototype)
 *    - Deep circular references in error causes (10+ levels & self-loops)
 *    - Content-Type tampering (text/plain, multipart/form-data, invalid JSON, application/xml)
 *    - Extreme payload sizes (>1MB bodyLimit rejection with HTTP 413)
 *    - Deeply nested JSON structures
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { Writable } from 'node:stream';
import { buildApp } from '../apps/api/src/app.ts';
import {
  type CarouselPackage,
  type SlideType,
  type TopicRecord,
  type PostRecord,
  type SlideRecord,
  type SourceRecord,
  type StructuredApiError,
} from '../packages/types/src/index.ts';
import { DatabasePersistenceError } from '../packages/content/src/index.ts';

// Helper to create valid carousel packages matching topic & slideCount
function makeValidPackage(slideCount: number, title: string, pillar: string): CarouselPackage {
  const slides = [];
  for (let i = 1; i <= slideCount; i++) {
    slides.push({
      slideNumber: i,
      type: (i === 1 ? 'hook' : i === slideCount ? 'cta' : 'concept') as SlideType,
      headline: `${title} - Slide ${i}`,
      body: `Accurate technical explanation for slide ${i} regarding ${title}.`,
      visualSuggestion: `Architecture diagram visual for step ${i}.`,
    });
  }

  return {
    topic: {
      title,
      pillar,
    },
    hook: `Why ${title} matters in modern software engineering.`,
    slides,
    caption: `Deep dive into ${title}. Explaining core mechanisms and tradeoffs.`,
    cta: `Bookmark this guide for ${title} and share with your team!`,
    hashtags: [`#${pillar}`, '#SystemDesign', '#SoftwareEngineering'],
    sources: [`RFC 0001: Reference for ${title}`],
  };
}

// Dynamic Mock OpenAI Client with customizable error injection
function createDynamicMockOpenAI() {
  let errorToThrow: Error | null = null;

  return {
    setErrorToThrow: (err: Error | null) => {
      errorToThrow = err;
    },
    beta: {
      chat: {
        completions: {
          parse: async (params: { messages: Array<{ role: string; content: string }> }) => {
            if (errorToThrow) {
              throw errorToThrow;
            }

            const userMsg = params.messages.find((m) => m.role === 'user')?.content || '';
            const match = userMsg.match(
              /Generate\s+(\d+)\s+slides\s+on\s+(.*?)\s+\(pillar:\s*(.*?)\)/,
            );
            let slideCount = 6;
            let topicTitle = 'Default Topic';
            let pillar = 'tech_explained';

            if (match) {
              slideCount = parseInt(match[1], 10);
              topicTitle = match[2];
              pillar = match[3];
            }

            const pkg = makeValidPackage(slideCount, topicTitle, pillar);
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
          if (errorToThrow) {
            throw errorToThrow;
          }
          throw new Error('Not implemented');
        },
      },
    },
  };
}

// Concurrent In-Memory Mock Supabase Client with error injection and cascading rollback
class ConcurrentMockSupabaseClient {
  public topics: Map<string, TopicRecord> = new Map();
  public posts: Map<string, PostRecord> = new Map();
  public slides: Map<string, SlideRecord> = new Map();
  public sources: Map<string, SourceRecord> = new Map();
  public errorToThrow: Error | null = null;

  public setErrorToThrow(err: Error | null) {
    this.errorToThrow = err;
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
          if (this.errorToThrow) {
            throw this.errorToThrow;
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

test('Tier 5 Adversarial Stress, Concurrency & Security Penetration Suite', async (suite) => {
  // =========================================================================
  // SUB-SUITE 1: High-Load Concurrency Stress Testing
  // =========================================================================
  await suite.test('1. High-Load Concurrency: 120+ concurrent requests across GET /health and POST /api/content/generate', async () => {
    const mockOpenAI = createDynamicMockOpenAI();
    const mockSupabase = new ConcurrentMockSupabaseClient();
    const app = await buildApp({
      openaiClient: mockOpenAI,
      supabaseClient: mockSupabase,
    });

    const pillars = [
      'tech_explained',
      'web_architecture',
      'developer_tools',
      'performance',
      'security',
    ];
    const tones = ['educational', 'technical', 'practical', 'concise', 'authoritative'];
    const slideCounts = [5, 6, 7, 8];

    // 50 concurrent GET /health requests with unique trace parameters
    const healthRequests = Array.from({ length: 50 }, (_, i) =>
      app.inject({
        method: 'GET',
        url: `/health?trace_id=${i}&ts=${Date.now()}`,
      }),
    );

    // 70 concurrent POST /api/content/generate requests with unique topics
    const contentRequests = Array.from({ length: 70 }, (_, i) => {
      const topic = `Adversarial-Concurrent-Topic-${i}`;
      const pillar = pillars[i % pillars.length];
      const tone = tones[i % tones.length];
      const slideCount = slideCounts[i % slideCounts.length];

      return app.inject({
        method: 'POST',
        url: '/api/content/generate',
        payload: {
          topic,
          pillar,
          tone,
          slideCount,
        },
      });
    });

    // Fire all 120 requests concurrently
    const allResponses = await Promise.all([...healthRequests, ...contentRequests]);
    const healthResponses = allResponses.slice(0, 50);
    const contentResponses = allResponses.slice(50);

    // Verify all 50 health requests succeed
    for (const res of healthResponses) {
      assert.equal(res.statusCode, 200);
      assert.deepEqual(res.json(), {
        status: 'ok',
        service: 'elevate-content-engine-api',
      });
    }

    // Verify all 70 content requests succeed with zero crosstalk
    for (let i = 0; i < 70; i++) {
      const res = contentResponses[i];
      assert.equal(res.statusCode, 200, `Request ${i} should return HTTP 200`);
      const pkg = res.json() as CarouselPackage;

      const expectedTopic = `Adversarial-Concurrent-Topic-${i}`;
      const expectedPillar = pillars[i % pillars.length];
      const expectedSlideCount = slideCounts[i % slideCounts.length];

      // Exact matching proves ZERO crosstalk
      assert.equal(pkg.topic.title, expectedTopic, `Crosstalk detected on topic title ${i}`);
      assert.equal(pkg.topic.pillar, expectedPillar, `Crosstalk detected on pillar ${i}`);
      assert.equal(pkg.slides.length, expectedSlideCount, `Slide count mismatch on request ${i}`);
      assert.equal(pkg.slides[0].type, 'hook');
      assert.equal(pkg.slides[pkg.slides.length - 1].type, 'cta');
    }

    // Verify database state isolation
    assert.equal(mockSupabase.topics.size, 70, 'Supabase topics count must equal 70');
    assert.equal(mockSupabase.posts.size, 70, 'Supabase posts count must equal 70');

    await app.close();
  });

  // =========================================================================
  // SUB-SUITE 2: Penetration Testing for Secret Leakage
  // =========================================================================
  await suite.test('2. Penetration: Secret Leakage Redaction across All Injection Vectors', async (penSuite) => {
    const rawApiKey = 'sk-proj-testkey1234567890';
    const rawSupabaseKey = 'sbp_testkey1234567890abcdef';
    const rawDbUrl = 'postgresql://postgres:secretpassword@host.internal:5432/production_db';
    const rawJwt =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkFkbWluIFVzZXIiLCJyb2xlIjoic3VwZXJhZG1pbiJ9.dGhpcy1pcy1hLXZlcnktc2VjcmV0LXNpZ25hdHVyZQ';

    await penSuite.test('2.1 Request Body with Injected Secrets (API key, DB URL, JWT in unrecognized keys)', async () => {
      const mockOpenAI = createDynamicMockOpenAI();
      const mockSupabase = new ConcurrentMockSupabaseClient();
      const app = await buildApp({
        openaiClient: mockOpenAI,
        supabaseClient: mockSupabase,
      });

      const res = await app.inject({
        method: 'POST',
        url: '/api/content/generate',
        payload: {
          topic: 'How DNS Works',
          pillar: 'tech_explained',
          [rawApiKey]: 'injected_api_key_value',
          [rawDbUrl]: 'injected_db_url_value',
          [rawJwt]: 'injected_jwt_value',
        },
      });

      assert.equal(res.statusCode, 400);
      const rawResponseText = res.body;

      // 100% of raw secrets MUST NOT be present anywhere in response body
      assert.equal(rawResponseText.includes(rawApiKey), false, 'API key leaked in body response!');
      assert.equal(rawResponseText.includes(rawDbUrl), false, 'DB URL leaked in body response!');
      assert.equal(rawResponseText.includes(rawJwt), false, 'JWT leaked in body response!');
      assert.equal(rawResponseText.includes('secretpassword'), false, 'DB password leaked in body response!');

      // Verify that redacted tokens are present instead
      assert.ok(
        rawResponseText.includes('[REDACTED_API_KEY]'),
        'API key must be redacted to [REDACTED_API_KEY]',
      );
      assert.ok(
        rawResponseText.includes('[REDACTED_DB_URL]'),
        'DB URL must be redacted to [REDACTED_DB_URL]',
      );
      assert.ok(
        rawResponseText.includes('[REDACTED_JWT]'),
        'JWT must be redacted to [REDACTED_JWT]',
      );

      await app.close();
    });

    await penSuite.test('2.2 Request Headers with Injected Secrets (Authorization Bearer, x-api-key, x-db-url)', async () => {
      const mockOpenAI = createDynamicMockOpenAI();
      const mockSupabase = new ConcurrentMockSupabaseClient();
      const logLines: string[] = [];
      const logStream = new Writable({
        write(chunk, _encoding, callback) {
          logLines.push(chunk.toString());
          callback();
        },
      });

      const app = await buildApp({
        openaiClient: mockOpenAI,
        supabaseClient: mockSupabase,
        logger: {
          level: 'error',
          stream: logStream,
        },
      });

      // Trigger 400 validation error while headers contain high-entropy secrets
      const res = await app.inject({
        method: 'POST',
        url: '/api/content/generate',
        headers: {
          authorization: `Bearer ${rawJwt}`,
          'x-api-key': rawApiKey,
          'x-database-url': rawDbUrl,
          'x-supabase-service-key': rawSupabaseKey,
        },
        payload: {
          topic: 'AB', // Invalid: < 3 chars triggers validation error
          pillar: 'tech_explained',
        },
      });

      assert.equal(res.statusCode, 400);
      const resBody = res.body;

      assert.equal(resBody.includes(rawApiKey), false, 'Header API key leaked in response body!');
      assert.equal(resBody.includes(rawJwt), false, 'Header JWT leaked in response body!');
      assert.equal(resBody.includes(rawDbUrl), false, 'Header DB URL leaked in response body!');
      assert.equal(resBody.includes(rawSupabaseKey), false, 'Header Supabase key leaked in response body!');

      // Check application log stream
      const allLogs = logLines.join('\n');
      assert.equal(allLogs.includes(rawApiKey), false, 'Header API key leaked in logs!');
      assert.equal(allLogs.includes(rawJwt), false, 'Header JWT leaked in logs!');
      assert.equal(allLogs.includes(rawDbUrl), false, 'Header DB URL leaked in logs!');
      assert.equal(allLogs.includes(rawSupabaseKey), false, 'Header Supabase key leaked in logs!');

      await app.close();
    });

    await penSuite.test('2.3 Mocked OpenAI Errors with Secrets (API key, Bearer JWT, internal DB connection)', async () => {
      const mockOpenAI = createDynamicMockOpenAI();
      const mockSupabase = new ConcurrentMockSupabaseClient();
      const logLines: string[] = [];
      const logStream = new Writable({
        write(chunk, _encoding, callback) {
          logLines.push(chunk.toString());
          callback();
        },
      });

      const app = await buildApp({
        openaiClient: mockOpenAI,
        supabaseClient: mockSupabase,
        logger: {
          level: 'error',
          stream: logStream,
        },
      });

      // Inject error with raw secrets into OpenAI mock
      mockOpenAI.setErrorToThrow(
        new Error(
          `OpenAI upstream failure: Unauthorized with ${rawApiKey} while connecting to upstream token ${rawJwt} and fallback ${rawDbUrl}`,
        ),
      );

      const res = await app.inject({
        method: 'POST',
        url: '/api/content/generate',
        payload: {
          topic: 'Microservices Architecture',
          pillar: 'web_architecture',
        },
      });

      assert.equal(res.statusCode, 500);
      const resJson = res.json() as StructuredApiError;
      const resBody = res.body;

      // Assert zero raw secret leakage in response
      assert.equal(resBody.includes(rawApiKey), false, 'OpenAI error leaked API key in response!');
      assert.equal(resBody.includes(rawJwt), false, 'OpenAI error leaked JWT in response!');
      assert.equal(resBody.includes(rawDbUrl), false, 'OpenAI error leaked DB URL in response!');
      assert.equal(resBody.includes('secretpassword'), false, 'OpenAI error leaked DB password in response!');

      // Assert proper redactions
      assert.ok(resJson.error.message.includes('[REDACTED_API_KEY]'), 'Message must contain [REDACTED_API_KEY]');
      assert.ok(resJson.error.message.includes('[REDACTED_JWT]'), 'Message must contain [REDACTED_JWT]');
      assert.ok(resJson.error.message.includes('[REDACTED_DB_URL]'), 'Message must contain [REDACTED_DB_URL]');

      // Assert zero secret leakage in logs
      const allLogs = logLines.join('\n');
      assert.equal(allLogs.includes(rawApiKey), false, 'Logs leaked raw API key!');
      assert.equal(allLogs.includes(rawJwt), false, 'Logs leaked raw JWT!');
      assert.equal(allLogs.includes(rawDbUrl), false, 'Logs leaked raw DB URL!');
      assert.equal(allLogs.includes('secretpassword'), false, 'Logs leaked raw DB password!');

      await app.close();
    });

    await penSuite.test('2.4 Mocked Supabase Persistence Errors with Secrets (DB password, service_role key)', async () => {
      const mockOpenAI = createDynamicMockOpenAI();
      const mockSupabase = new ConcurrentMockSupabaseClient();
      const logLines: string[] = [];
      const logStream = new Writable({
        write(chunk, _encoding, callback) {
          logLines.push(chunk.toString());
          callback();
        },
      });

      const app = await buildApp({
        openaiClient: mockOpenAI,
        supabaseClient: mockSupabase,
        logger: {
          level: 'error',
          stream: logStream,
        },
      });

      // Inject DatabasePersistenceError containing connection credentials
      mockSupabase.setErrorToThrow(
        new DatabasePersistenceError(
          `Failed to persist topic to ${rawDbUrl} with service_role=${rawSupabaseKey} and password=secretpassword`,
          {
            code: 'DATABASE_ERROR',
            statusCode: 500,
            cause: new Error(`Internal socket error on ${rawDbUrl}`),
          },
        ),
      );

      const res = await app.inject({
        method: 'POST',
        url: '/api/content/generate',
        payload: {
          topic: 'Database Indexing Strategies',
          pillar: 'performance',
        },
      });

      assert.equal(res.statusCode, 500);
      const resJson = res.json() as StructuredApiError;
      const resBody = res.body;

      assert.equal(resJson.error.code, 'DATABASE_ERROR');
      assert.equal(resBody.includes(rawDbUrl), false, 'Database error leaked DB URL in response!');
      assert.equal(resBody.includes(rawSupabaseKey), false, 'Database error leaked Supabase key in response!');
      assert.equal(resBody.includes('secretpassword'), false, 'Database error leaked password in response!');

      assert.ok(resJson.error.message.includes('[REDACTED_DB_URL]'), 'Message must redact DB URL');
      assert.ok(
        resJson.error.message.includes('[REDACTED_SUPABASE_KEY]') ||
          resJson.error.message.includes('service_role=[REDACTED]'),
        'Message must redact service role key',
      );

      const allLogs = logLines.join('\n');
      assert.equal(allLogs.includes(rawDbUrl), false, 'Logs leaked DB URL!');
      assert.equal(allLogs.includes(rawSupabaseKey), false, 'Logs leaked Supabase key!');
      assert.equal(allLogs.includes('secretpassword'), false, 'Logs leaked password!');

      await app.close();
    });
  });

  // =========================================================================
  // SUB-SUITE 3: Malformed Payload Attacks
  // =========================================================================
  await suite.test('3. Malformed Payload Attacks', async (attackSuite) => {
    await attackSuite.test('3.1 Prototype Pollution Attacks (__proto__ and constructor.prototype)', async () => {
      const mockOpenAI = createDynamicMockOpenAI();
      const mockSupabase = new ConcurrentMockSupabaseClient();
      const app = await buildApp({
        openaiClient: mockOpenAI,
        supabaseClient: mockSupabase,
      });

      // Attack vector 1: __proto__ injection
      const protoPayload = '{"__proto__":{"polluted":"yes","isAdmin":true},"topic":"How DNS Works","pillar":"tech_explained"}';
      const res1 = await app.inject({
        method: 'POST',
        url: '/api/content/generate',
        headers: {
          'content-type': 'application/json',
        },
        payload: protoPayload,
      });

      // Must be rejected as 400 (either by JSON parser or Zod unrecognized_keys)
      assert.equal(res1.statusCode, 400, 'Prototype pollution attempt must return HTTP 400');
      // Crucial empirical check: Object.prototype must NOT be modified
      assert.equal((Object.prototype as unknown as { polluted?: unknown }).polluted, undefined, 'Object.prototype was polluted!');
      assert.equal((Object.prototype as unknown as { isAdmin?: unknown }).isAdmin, undefined, 'Object.prototype was polluted!');

      // Attack vector 2: constructor.prototype injection
      const ctorPayload = '{"constructor":{"prototype":{"hacked":true}},"topic":"How DNS Works","pillar":"tech_explained"}';
      const res2 = await app.inject({
        method: 'POST',
        url: '/api/content/generate',
        headers: {
          'content-type': 'application/json',
        },
        payload: ctorPayload,
      });

      assert.equal(res2.statusCode, 400, 'constructor.prototype attempt must return HTTP 400');
      assert.equal((Object.prototype as unknown as { hacked?: unknown }).hacked, undefined, 'Object.prototype was polluted!');

      await app.close();
    });

    await attackSuite.test('3.2 Deep Circular References in Error Causes (Self-loop & 10-level cycle)', async () => {
      const mockOpenAI = createDynamicMockOpenAI();
      const mockSupabase = new ConcurrentMockSupabaseClient();
      const app = await buildApp({
        openaiClient: mockOpenAI,
        supabaseClient: mockSupabase,
      });

      // Construct a deeply nested 10-level circular error chain with self-loop
      const rootError = new Error('Root error with circular dependencies');
      let currentErr: Record<string, unknown> = rootError as unknown as Record<string, unknown>;
      for (let i = 0; i < 10; i++) {
        const nextErr = new Error(`Chain step ${i}: postgresql://postgres:secretpassword@host.internal:5432/db`);
        currentErr.cause = nextErr;
        currentErr = nextErr as unknown as Record<string, unknown>;
      }
      // Close the loop to create circular reference
      currentErr.cause = rootError;
      (rootError as unknown as Record<string, unknown>).self = rootError;

      mockSupabase.setErrorToThrow(
        new DatabasePersistenceError('Database error with deep circular error graph', {
          code: 'DATABASE_ERROR',
          statusCode: 500,
          cause: rootError,
        }),
      );

      // Must handle circular graph without "RangeError: Maximum call stack size exceeded"
      const res = await app.inject({
        method: 'POST',
        url: '/api/content/generate',
        payload: {
          topic: 'Handling Cyclic Graph Dependencies',
          pillar: 'tech_explained',
        },
      });

      assert.equal(res.statusCode, 500);
      const resJson = res.json() as StructuredApiError;
      assert.equal(resJson.error.code, 'DATABASE_ERROR');
      assert.ok(resJson.error.message.length > 0);
      assert.equal(res.body.includes('secretpassword'), false, 'Password leaked in circular error!');

      await app.close();
    });

    await attackSuite.test('3.3 Content-Type Tampering (text/plain, multipart/form-data, invalid JSON, application/xml)', async () => {
      const mockOpenAI = createDynamicMockOpenAI();
      const mockSupabase = new ConcurrentMockSupabaseClient();
      const app = await buildApp({
        openaiClient: mockOpenAI,
        supabaseClient: mockSupabase,
      });

      // 1. text/plain Content-Type
      const resText = await app.inject({
        method: 'POST',
        url: '/api/content/generate',
        headers: { 'content-type': 'text/plain' },
        payload: '{"topic":"DNS","pillar":"tech_explained"}',
      });
      assert.ok(resText.statusCode === 415 || resText.statusCode === 400, 'text/plain must be rejected with 415 or 400');

      // 2. multipart/form-data Content-Type
      const resMultipart = await app.inject({
        method: 'POST',
        url: '/api/content/generate',
        headers: { 'content-type': 'multipart/form-data; boundary=----WebKitFormBoundaryXYZ' },
        payload: '------WebKitFormBoundaryXYZ\r\nContent-Disposition: form-data; name="topic"\r\n\r\nDNS\r\n------WebKitFormBoundaryXYZ--',
      });
      assert.ok(resMultipart.statusCode === 415 || resMultipart.statusCode === 400, 'multipart must be rejected with 415 or 400');

      // 3. Corrupted / malformed JSON syntax with application/json
      const resBadJson = await app.inject({
        method: 'POST',
        url: '/api/content/generate',
        headers: { 'content-type': 'application/json' },
        payload: '{"topic": "DNS", invalid_json without quotes',
      });
      assert.equal(resBadJson.statusCode, 400, 'Malformed JSON must return HTTP 400');
      const badJsonBody = resBadJson.json() as StructuredApiError;
      assert.equal(badJsonBody.error.code, 'VALIDATION_ERROR');

      // 4. application/xml Content-Type
      const resXml = await app.inject({
        method: 'POST',
        url: '/api/content/generate',
        headers: { 'content-type': 'application/xml' },
        payload: '<request><topic>DNS</topic><pillar>tech_explained</pillar></request>',
      });
      assert.ok(resXml.statusCode === 415 || resXml.statusCode === 400, 'application/xml must be rejected with 415 or 400');

      // 5. Truncated JSON
      const resTruncated = await app.inject({
        method: 'POST',
        url: '/api/content/generate',
        headers: { 'content-type': 'application/json' },
        payload: '{"topic": "Incomplete',
      });
      assert.equal(resTruncated.statusCode, 400, 'Truncated JSON must return HTTP 400');

      await app.close();
    });

    await attackSuite.test('3.4 Extreme Payload Size (>1MB bodyLimit) and Deep Nesting Attacks', async () => {
      const mockOpenAI = createDynamicMockOpenAI();
      const mockSupabase = new ConcurrentMockSupabaseClient();
      const app = await buildApp({
        openaiClient: mockOpenAI,
        supabaseClient: mockSupabase,
      });

      // 1. Extreme Payload Size Attack (>1 MB)
      // Fastify default bodyLimit is 1,048,576 bytes (1MB)
      const oversizedString = 'x'.repeat(1.2 * 1024 * 1024);
      const resOversized = await app.inject({
        method: 'POST',
        url: '/api/content/generate',
        headers: { 'content-type': 'application/json' },
        payload: JSON.stringify({
          topic: oversizedString,
          pillar: 'tech_explained',
        }),
      });

      // Fastify must return HTTP 413 Payload Too Large
      assert.equal(resOversized.statusCode, 413, 'Oversized payload (>1MB) must be rejected with HTTP 413');

      // 2. Deep Nesting Attack (50 levels of object nesting)
      let deepObj: Record<string, unknown> = { topic: 'DNS', pillar: 'tech_explained' };
      for (let i = 0; i < 50; i++) {
        deepObj = { level: deepObj };
      }

      const resDeep = await app.inject({
        method: 'POST',
        url: '/api/content/generate',
        headers: { 'content-type': 'application/json' },
        payload: JSON.stringify(deepObj),
      });

      // Must be rejected as 400 VALIDATION_ERROR because 'level' is unrecognized or topic is missing
      assert.equal(resDeep.statusCode, 400, 'Deep nesting without valid schema must return HTTP 400');
      const deepBody = resDeep.json() as StructuredApiError;
      assert.equal(deepBody.error.code, 'VALIDATION_ERROR');

      await app.close();
    });
  });
});
