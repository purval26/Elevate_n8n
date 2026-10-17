import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import util from 'node:util';
import type {
  CarouselPackage,
  SlideType,
  TopicRecord,
  PostRecord,
  SlideRecord,
  SourceRecord,
} from '../../types/src/index.ts';
import {
  createSupabaseClient,
  persistCarouselPackage,
  DatabasePersistenceError,
  scrubSecrets,
  scrubErrorDetails,
  sanitizeCause,
} from '../src/index.ts';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function makeTestCarouselPackage(slideCount = 6): CarouselPackage {
  const slides = [];
  for (let i = 1; i <= slideCount; i++) {
    slides.push({
      slideNumber: i,
      type: (i === 1 ? 'hook' : i === slideCount ? 'takeaway' : 'breakdown') as SlideType,
      headline: `Slide ${i} Headline`,
      body: `Detailed technical explanation for slide ${i}.`,
      visualSuggestion: `Architecture diagram for step ${i}.`,
    });
  }

  return {
    topic: {
      title: 'PostgreSQL Index Internals',
      pillar: 'performance',
    },
    hook: 'How do B-Tree and GIN indexes actually accelerate SQL queries under heavy load?',
    slides,
    caption:
      'Understanding PostgreSQL index internals allows you to write 100x faster database queries. Here is how B-Trees structure pointers on disk.',
    cta: 'Save this post and follow @ElevateWeb for weekly database performance deep dives.',
    hashtags: ['#postgresql', '#database', '#performance', '#sql', '#backend'],
    sources: [
      'https://www.postgresql.org/docs/current/indexes.html',
      'The Art of PostgreSQL by Dimitri Fontaine',
    ],
  };
}

/**
 * In-memory test mock for Supabase client verifying calls and simulating errors.
 */
class MockSupabaseClient {
  public topics: Map<string, TopicRecord> = new Map();
  public posts: Map<string, PostRecord> = new Map();
  public slides: Map<string, SlideRecord> = new Map();
  public sources: Map<string, SourceRecord> = new Map();
  public deletedPosts: string[] = [];
  public deletedTopics: string[] = [];
  public failureMode:
    | 'none'
    | 'fail_topics'
    | 'fail_posts'
    | 'fail_slides'
    | 'fail_sources'
    | 'fail_network'
    | 'fail_permission' = 'none';
  public customErrorMessage?: string;

  constructor(
    failureMode:
      | 'none'
      | 'fail_topics'
      | 'fail_posts'
      | 'fail_slides'
      | 'fail_sources'
      | 'fail_network'
      | 'fail_permission' = 'none',
  ) {
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
      select: (_cols?: string) => {
        return builder;
      },
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
          // Failure injections
          if (this.failureMode === 'fail_network') {
            const errRes = {
              data: null,
              error: {
                message:
                  this.customErrorMessage ||
                  'Connection to https://myproject.supabase.co timed out with service_role eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJvbGUiOiJzZXJ2aWNlX3JvbGUifQ.dummysecret',
                code: 'PGRST000',
              },
            };
            return onfulfilled ? onfulfilled(errRes) : errRes;
          }

          if (this.failureMode === 'fail_permission') {
            const errRes = {
              data: null,
              error: {
                message:
                  this.customErrorMessage ||
                  'Permission denied on postgresql://postgres:dbpassword123@db.supabase.co:5432/postgres for key eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoic2VydmljZV9yb2xlIn0.sig',
                code: '42501',
              },
            };
            return onfulfilled ? onfulfilled(errRes) : errRes;
          }

          if (this.failureMode === `fail_${table}`) {
            const errRes = {
              data: null,
              error: {
                message: `Simulated constraint failure on table ${table}`,
                code: '23505',
              },
            };
            return onfulfilled ? onfulfilled(errRes) : errRes;
          }

          // Real execution
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
              this.deletedTopics.push(filterVal);
            }
            if (table === 'posts' && filterCol === 'id' && typeof filterVal === 'string') {
              this.posts.delete(filterVal);
              this.deletedPosts.push(filterVal);
              // Cascade delete
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

test('Database Persistence Service & Supabase Client Tests', async (t) => {
  await t.test('1. createSupabaseClient factory unit tests', async (tCase) => {
    await tCase.test('returns custom client directly when mock passed', () => {
      const mock = new MockSupabaseClient();
      const client = createSupabaseClient(mock);
      assert.equal(client, mock as unknown);
    });

    await tCase.test('returns custom client when wrapped in options object', () => {
      const mock = new MockSupabaseClient();
      const client1 = createSupabaseClient({ client: mock });
      assert.equal(client1, mock as unknown);

      const client2 = createSupabaseClient({ supabase: mock });
      assert.equal(client2, mock as unknown);

      const client3 = createSupabaseClient({ supabaseClient: mock });
      assert.equal(client3, mock as unknown);
    });

    await tCase.test(
      'instantiates Supabase client without throwing when credentials missing',
      () => {
        // Must not throw even without SUPABASE_URL / KEY
        const client = createSupabaseClient({});
        assert.ok(client);
        assert.equal(typeof (client as { from?: unknown }).from, 'function');
      },
    );
  });

  await t.test('2. Successful persistence of complete carousel package', async (tCase) => {
    const mock = new MockSupabaseClient();
    const pkg = makeTestCarouselPackage(6);

    const result = await persistCarouselPackage(pkg, { supabase: mock });

    await tCase.test('returns valid UUIDs for topicId and postId', () => {
      assert.ok(result.topicId, 'Must return topicId');
      assert.ok(result.postId, 'Must return postId');
      assert.match(result.topicId, UUID_REGEX, 'topicId must be a valid UUID');
      assert.match(result.postId, UUID_REGEX, 'postId must be a valid UUID');
    });

    await tCase.test('persists topic correctly in topics table', () => {
      assert.equal(mock.topics.size, 1);
      const topic = mock.topics.get(result.topicId);
      assert.ok(topic);
      assert.equal(topic.title, pkg.topic.title);
      assert.equal(topic.pillar, pkg.topic.pillar);
      assert.ok(topic.created_at);
    });

    await tCase.test('persists post correctly linked to topic', () => {
      assert.equal(mock.posts.size, 1);
      const post = mock.posts.get(result.postId);
      assert.ok(post);
      assert.equal(post.topic_id, result.topicId);
      assert.equal(post.hook, pkg.hook);
      assert.equal(post.caption, pkg.caption);
      assert.equal(post.cta, pkg.cta);
      assert.deepEqual(post.hashtags, pkg.hashtags);
      assert.equal(post.slide_count, 6);
    });

    await tCase.test('persists all slides linked to post in sequential order', () => {
      assert.equal(mock.slides.size, 6);
      const slideList = Array.from(mock.slides.values()).sort(
        (a, b) => a.slide_number - b.slide_number,
      );

      slideList.forEach((slide, idx: number) => {
        assert.equal(slide.post_id, result.postId);
        assert.equal(slide.slide_number, idx + 1);
        assert.equal(slide.headline, pkg.slides[idx]?.headline);
        assert.equal(slide.body, pkg.slides[idx]?.body);
        assert.equal(slide.visual_suggestion, pkg.slides[idx]?.visualSuggestion);
      });
    });

    await tCase.test('persists sources correctly linked to post', () => {
      assert.equal(mock.sources.size, 2);
      const sourceList = Array.from(mock.sources.values());
      const urlSource = sourceList.find((s) => s.url !== null);
      const textSource = sourceList.find((s) => s.url === null);

      assert.ok(urlSource);
      assert.equal(urlSource.post_id, result.postId);
      assert.equal(urlSource.url, 'https://www.postgresql.org/docs/current/indexes.html');

      assert.ok(textSource);
      assert.equal(textSource.post_id, result.postId);
      assert.equal(textSource.source_text, 'The Art of PostgreSQL by Dimitri Fontaine');
    });
  });

  await t.test('3. Compensating rollback verification', async (tCase) => {
    await tCase.test('deletes post and topic records when slide insertion fails', async () => {
      const mock = new MockSupabaseClient('fail_slides');
      const pkg = makeTestCarouselPackage(5);

      await assert.rejects(
        async () => {
          await persistCarouselPackage(pkg, { supabase: mock });
        },
        (err: unknown) => {
          if (!(err instanceof DatabasePersistenceError)) return false;
          assert.equal(err.code, 'DATABASE_ERROR');
          assert.equal(err.statusCode, 500);
          assert.match(err.message, /Slide insert error/);
          return true;
        },
      );

      // Verify compensating rollback: post and topic records were created, then deleted
      assert.equal(mock.deletedPosts.length, 1, 'Post deletion must be invoked once');
      assert.equal(mock.posts.size, 0, 'No orphaned post record should remain');
      assert.equal(mock.slides.size, 0, 'No orphaned slides should remain');
      assert.equal(mock.deletedTopics.length, 1, 'Topic deletion must be invoked once');
      assert.equal(mock.topics.size, 0, 'No orphaned topic record should remain');
    });

    await tCase.test('deletes post and topic records when source insertion fails', async () => {
      const mock = new MockSupabaseClient('fail_sources');
      const pkg = makeTestCarouselPackage(5);

      await assert.rejects(
        async () => {
          await persistCarouselPackage(pkg, { supabase: mock });
        },
        (err: unknown) => {
          if (!(err instanceof DatabasePersistenceError)) return false;
          assert.equal(err.code, 'DATABASE_ERROR');
          assert.equal(err.statusCode, 500);
          assert.match(err.message, /Sources insert error/);
          return true;
        },
      );

      // Verify compensating rollback: post and topic records were created, then deleted
      assert.equal(mock.deletedPosts.length, 1, 'Post deletion must be invoked once');
      assert.equal(mock.posts.size, 0, 'No orphaned post record should remain');
      assert.equal(mock.slides.size, 0, 'No orphaned slides should remain');
      assert.equal(mock.sources.size, 0, 'No orphaned sources should remain');
      assert.equal(mock.deletedTopics.length, 1, 'Topic deletion must be invoked once');
      assert.equal(mock.topics.size, 0, 'No orphaned topic record should remain');
    });

    await tCase.test('deletes topic record when post insertion fails', async () => {
      const mock = new MockSupabaseClient('fail_posts');
      const pkg = makeTestCarouselPackage(5);

      await assert.rejects(
        async () => {
          await persistCarouselPackage(pkg, { supabase: mock });
        },
        (err: unknown) => {
          if (!(err instanceof DatabasePersistenceError)) return false;
          assert.equal(err.code, 'DATABASE_ERROR');
          assert.equal(err.statusCode, 500);
          assert.match(err.message, /Post insert error/);
          return true;
        },
      );

      // Verify compensating rollback: topic was created then deleted
      assert.equal(mock.deletedTopics.length, 1, 'Topic deletion must be invoked once');
      assert.equal(mock.topics.size, 0, 'No orphaned topic record should remain');
      assert.equal(mock.posts.size, 0, 'No posts should be created');
    });
  });

  await t.test('4. Upstream Supabase errors & Secret Scrubbing', async (tCase) => {
    await tCase.test(
      'catches upstream network failure and scrubs service role keys and URLs',
      async () => {
        const mock = new MockSupabaseClient('fail_network');
        const pkg = makeTestCarouselPackage(6);

        await assert.rejects(
          async () => {
            await persistCarouselPackage(pkg, { supabase: mock });
          },
          (err: unknown) => {
            if (!(err instanceof DatabasePersistenceError)) return false;
            assert.equal(err.code, 'DATABASE_ERROR');
            // Must not leak the JWT service role key or Supabase URL
            assert.doesNotMatch(err.message, /eyJhbGciOiJIUzI1Ni/);
            assert.doesNotMatch(err.message, /myproject\.supabase\.co/);
            assert.match(err.message, /\[REDACTED_JWT\]/);
            return true;
          },
        );
      },
    );

    await tCase.test(
      'catches permission error and scrubs database connection strings and passwords',
      async () => {
        const mock = new MockSupabaseClient('fail_permission');
        const pkg = makeTestCarouselPackage(6);

        await assert.rejects(
          async () => {
            await persistCarouselPackage(pkg, { supabase: mock });
          },
          (err: unknown) => {
            if (!(err instanceof DatabasePersistenceError)) return false;
            assert.equal(err.code, 'DATABASE_ERROR');
            // Must not leak the PostgreSQL connection string or password
            assert.doesNotMatch(err.message, /dbpassword123/);
            assert.doesNotMatch(err.message, /postgresql:\/\//);
            assert.match(err.message, /\[REDACTED_DB_URL\]/);
            return true;
          },
        );
      },
    );

    await tCase.test('scrubSecrets cleans nested strings and error details', () => {
      const rawText =
        'Error at postgresql://user:secretpass@host:5432/db with key eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.sig and sk-proj-1234567890abcdef12345';
      const cleaned = scrubSecrets(rawText);
      assert.doesNotMatch(cleaned, /secretpass/);
      assert.doesNotMatch(cleaned, /postgresql:\/\//);
      assert.doesNotMatch(cleaned, /sk-proj-/);
      assert.match(cleaned, /\[REDACTED_DB_URL\]/);
      assert.match(cleaned, /\[REDACTED_JWT\]/);
      assert.match(cleaned, /\[REDACTED_API_KEY\]/);

      const detailsObj = {
        connection: 'postgresql://admin:supersecret@db:5432/app',
        token: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxx.yyy',
        nested: {
          key: 'sk-1234567890abcdefghijklmnop',
        },
      };
      const cleanedDetails = scrubErrorDetails(detailsObj);
      assert.doesNotMatch(cleanedDetails.connection, /supersecret/);
      assert.doesNotMatch(cleanedDetails.token, /xxx\.yyy/);
      assert.doesNotMatch(cleanedDetails.nested.key, /1234567890/);
    });

    await tCase.test('handles circular references in details without stack overflow', () => {
      const cyclic: Record<string, unknown> = {
        msg: 'failure at postgresql://user:pass@localhost:5432/db',
      };
      cyclic.self = cyclic;
      const cleaned = scrubErrorDetails(cyclic);
      assert.ok(cleaned);
      assert.equal((cleaned as Record<string, unknown>).self, '[Circular]');
      assert.match((cleaned as Record<string, unknown>).msg as string, /\[REDACTED_DB_URL\]/);
    });

    await tCase.test(
      'DatabasePersistenceError.cause does not leak secrets under util.inspect',
      () => {
        const rawError = new Error(
          'Topic insert error: postgresql://postgres:secret_password_123@db:5432/app',
        );
        const dbErr = new DatabasePersistenceError('DB write failed', { cause: rawError });
        const inspected = util.inspect(dbErr);
        assert.equal(
          inspected.includes('secret_password_123'),
          false,
          'util.inspect must not leak secret from cause',
        );
        assert.ok(
          inspected.includes('[REDACTED_DB_URL]'),
          'util.inspect must contain redacted URL',
        );
        assert.equal(
          (dbErr.cause as Error).message.includes('secret_password_123'),
          false,
          'cause.message must not leak secret',
        );
        assert.ok((dbErr.cause as Error).message.includes('[REDACTED_DB_URL]'));
      },
    );

    await tCase.test('sanitizeCause handles circular errors without stack overflow', () => {
      const cyclicErr: Error & { self?: unknown } = new Error('Cyclic error');
      cyclicErr.self = cyclicErr;
      assert.doesNotThrow(() => {
        const cleaned = sanitizeCause(cyclicErr);
        assert.ok(cleaned);
      });
    });

    await tCase.test(
      'preserves and scrubs plain-object error causes (e.g. Supabase PostgrestError) without false-positive [Circular]',
      () => {
        const postgrestError = {
          code: '23505',
          message:
            'duplicate key value violates unique constraint on postgresql://usr:pass@db:5432/app',
          details:
            'Key (title)=(PostgreSQL Index Internals) already exists with key eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy.sig',
          hint: 'Use a unique title or update existing record at postgresql://usr:pass@db:5432/app',
        };

        const sanitized = sanitizeCause(postgrestError) as Record<string, unknown>;
        assert.ok(sanitized && typeof sanitized === 'object');
        assert.notEqual(
          sanitized,
          '[Circular]',
          'Must not evaluate plain-object cause to [Circular]',
        );
        assert.equal(sanitized.code, '23505');
        assert.match(sanitized.message as string, /\[REDACTED_DB_URL\]/);
        assert.doesNotMatch(sanitized.message as string, /usr:pass/);
        assert.match(sanitized.details as string, /\[REDACTED_JWT\]/);
        assert.doesNotMatch(sanitized.details as string, /eyJhbGciOiJIUzI1Ni/);
        assert.match(sanitized.hint as string, /\[REDACTED_DB_URL\]/);
        assert.doesNotMatch(sanitized.hint as string, /usr:pass/);

        // Verify via DatabasePersistenceError constructor
        const dbErr = new DatabasePersistenceError('Database insert failed', {
          code: 'DUPLICATE_KEY',
          cause: postgrestError,
        });
        assert.notEqual(dbErr.cause, '[Circular]', 'dbErr.cause must not be [Circular]');
        assert.ok(dbErr.cause && typeof dbErr.cause === 'object');
        const causeObj = dbErr.cause as Record<string, unknown>;
        assert.equal(causeObj.code, '23505');
        assert.match(causeObj.message as string, /\[REDACTED_DB_URL\]/);
        assert.doesNotMatch(causeObj.message as string, /usr:pass/);

        // util.inspect must show clean cause without leaking secrets or showing [Circular]
        const inspected = util.inspect(dbErr);
        assert.doesNotMatch(inspected, /usr:pass/);
        assert.doesNotMatch(inspected, /\[Circular\]/);
        assert.ok(inspected.includes('23505'));
      },
    );

    await tCase.test(
      'preserves and scrubs nested Error instances in details without false-positive [Circular]',
      () => {
        const innerError = new Error(
          'Underlying connection socket failed: sk-proj-1234567890abcdefghijklmnop',
        );
        const detailsPayload = {
          query: 'INSERT INTO posts ...',
          originalError: innerError,
          context: {
            table: 'posts',
            connection: 'postgresql://postgres:pass123@db:5432/app',
          },
        };

        const scrubbed = scrubErrorDetails(detailsPayload);
        assert.ok(scrubbed && typeof scrubbed === 'object');
        assert.notEqual(
          scrubbed.originalError,
          '[Circular]',
          'Nested error must not evaluate to [Circular]',
        );
        assert.ok(
          scrubbed.originalError instanceof Error,
          'originalError must remain an Error instance',
        );
        assert.match(scrubbed.originalError.message, /\[REDACTED_API_KEY\]/);
        assert.doesNotMatch(scrubbed.originalError.message, /sk-proj-/);
        assert.match(scrubbed.context.connection, /\[REDACTED_DB_URL\]/);
        assert.doesNotMatch(scrubbed.context.connection, /pass123/);

        // Verify via DatabasePersistenceError constructor
        const dbErr = new DatabasePersistenceError('Failed with details', {
          details: detailsPayload,
        });
        const detailsRes = dbErr.details as typeof detailsPayload;
        assert.notEqual(detailsRes.originalError, '[Circular]');
        assert.ok(detailsRes.originalError instanceof Error);
        assert.match(detailsRes.originalError.message, /\[REDACTED_API_KEY\]/);
      },
    );

    await tCase.test(
      'still detects and breaks true circular references in plain objects and error graphs',
      () => {
        // Plain object circular reference
        const cyclicObj: Record<string, unknown> = { code: 'PGRST500', note: 'cyclic' };
        cyclicObj.self = cyclicObj;
        const sanitizedObj = sanitizeCause(cyclicObj) as Record<string, unknown>;
        assert.equal(sanitizedObj.self, '[Circular]');
        assert.equal(sanitizedObj.code, 'PGRST500');

        // Mixed plain object and Error circular reference
        const err = new Error('Inner error');
        const container: Record<string, unknown> = { error: err };
        (err as unknown as Record<string, unknown>).parent = container;
        const scrubbedContainer = scrubErrorDetails(container);
        assert.ok(scrubbedContainer.error instanceof Error);
        assert.equal(
          (scrubbedContainer.error as unknown as Record<string, unknown>).parent,
          '[Circular]',
        );
      },
    );
  });

  await t.test('5. Input validation and edge cases', async (tCase) => {
    await tCase.test('rejects non-object package input', async () => {
      await assert.rejects(
        async () => {
          await persistCarouselPackage(null as unknown as CarouselPackage);
        },
        (err: unknown) => {
          if (!(err instanceof DatabasePersistenceError)) return false;
          assert.equal(err.code, 'VALIDATION_ERROR');
          assert.equal(err.statusCode, 400);
          return true;
        },
      );
    });

    await tCase.test('persists package without sources cleanly', async () => {
      const mock = new MockSupabaseClient();
      const pkg = makeTestCarouselPackage(5);
      pkg.sources = [];

      const result = await persistCarouselPackage(pkg, { supabase: mock });
      assert.ok(result.topicId);
      assert.ok(result.postId);
      assert.equal(mock.sources.size, 0);
    });
  });
});
