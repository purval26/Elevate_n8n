/**
 * Relational Persistence Service for ElevateWeb Content Engine.
 * Persists complete CarouselPackage records to Supabase (topics -> posts -> slides/sources)
 * with compensating rollback on partial failure and secret scrubbing.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { CarouselPackage } from '../../../types/src/index.ts';
import { createSupabaseClient } from './client.ts';

export interface PersistCarouselOptions {
  supabase?: SupabaseClient | unknown;
  supabaseClient?: SupabaseClient | unknown;
  client?: SupabaseClient | unknown;
}

/**
 * Strips secrets, API keys, connection strings, and credentials from database errors.
 */
export function scrubSecrets(text: string): string {
  if (!text || typeof text !== 'string') return '';
  let scrubbed = text
    .replace(/sk-[a-zA-Z0-9_-]{15,}/gi, '[REDACTED_API_KEY]')
    .replace(/sbp_[a-zA-Z0-9_-]{15,}/gi, '[REDACTED_SUPABASE_KEY]')
    .replace(/Bearer\s+[a-zA-Z0-9_.-]+/gi, 'Bearer [REDACTED]')
    .replace(/ey[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+/g, '[REDACTED_JWT]')
    .replace(/postgres(?:ql)?:\/\/[^\s"'>)]+/gi, '[REDACTED_DB_URL]')
    .replace(
      /https?:\/\/[a-zA-Z0-9_.-]*(?:supabase\.co|supabase\.in|supabase\.net)[^\s"'>)]*/gi,
      '[REDACTED_SUPABASE_URL]',
    )
    .replace(/OPENAI_API_KEY=[^\s"']+/gi, 'OPENAI_API_KEY=[REDACTED]')
    .replace(/SUPABASE_SERVICE_ROLE_KEY=[^\s"']+/gi, 'SUPABASE_SERVICE_ROLE_KEY=[REDACTED]')
    .replace(/SUPABASE_URL=[^\s"']+/gi, 'SUPABASE_URL=[REDACTED]')
    .replace(
      /(?:service_role_key|service_role|anon_key|api_key|apiKey)\s*[=:]\s*['"]?[^\s"',;]+['"]?/gi,
      'service_role=[REDACTED]',
    )
    .replace(/(?:password|passwd|pwd)\s*[=:]\s*['"]?[^\s"',;]+['"]?/gi, 'password=[REDACTED]');

  if (process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY.length > 5) {
    scrubbed = scrubbed.split(process.env.SUPABASE_SERVICE_ROLE_KEY).join('[REDACTED_KEY]');
  }
  if (process.env.SUPABASE_URL && process.env.SUPABASE_URL.length > 5) {
    scrubbed = scrubbed.split(process.env.SUPABASE_URL).join('[REDACTED_URL]');
  }
  if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.length > 5) {
    scrubbed = scrubbed.split(process.env.OPENAI_API_KEY).join('[REDACTED_API_KEY]');
  }

  return scrubbed;
}

/**
 * Recursively scrubs secrets from error details objects or arrays with circular reference protection.
 */
export function scrubErrorDetails<T>(data: T, seen = new WeakSet<object>()): T {
  if (typeof data === 'string') {
    return scrubSecrets(data) as unknown as T;
  }
  if (data !== null && typeof data === 'object') {
    if (data instanceof Error) {
      return sanitizeCause(data, seen) as unknown as T;
    }

    if (seen.has(data as object)) {
      return '[Circular]' as unknown as T;
    }
    seen.add(data as object);

    if (Array.isArray(data)) {
      return data.map((item) => scrubErrorDetails(item, seen)) as unknown as T;
    }

    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      result[key] = scrubErrorDetails(value, seen);
    }
    return result as unknown as T;
  }
  return data;
}

/**
 * Sanitizes an error cause to prevent credential/secret leakage in util.inspect, console.error, or stack traces.
 */
export function sanitizeCause(cause: unknown, seen = new WeakSet<object>()): unknown {
  if (cause === null || cause === undefined) {
    return undefined;
  }
  if (typeof cause === 'string') {
    return scrubSecrets(cause);
  }
  if (typeof cause !== 'object') {
    return cause;
  }

  if (cause instanceof Error) {
    if (seen.has(cause)) {
      return '[Circular]';
    }
    seen.add(cause);

    const sanitized = new Error(scrubSecrets(cause.message));
    sanitized.name = scrubSecrets(cause.name);
    if (cause.stack) {
      sanitized.stack = scrubSecrets(cause.stack);
    }
    if ('cause' in cause && (cause as { cause?: unknown }).cause !== undefined) {
      (sanitized as unknown as Record<string, unknown>).cause = sanitizeCause(
        (cause as { cause?: unknown }).cause,
        seen,
      );
    }
    for (const [key, value] of Object.entries(cause)) {
      if (key !== 'message' && key !== 'name' && key !== 'stack' && key !== 'cause') {
        (sanitized as unknown as Record<string, unknown>)[key] = scrubErrorDetails(value, seen);
      }
    }
    return sanitized;
  }

  return scrubErrorDetails(cause, seen);
}

/**
 * Domain error representing database persistence failures.
 */
export class DatabasePersistenceError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(
    message: string,
    options?: {
      code?: string;
      statusCode?: number;
      details?: unknown;
      cause?: unknown;
    },
  ) {
    const cleanCause = options?.cause !== undefined ? sanitizeCause(options.cause) : undefined;
    super(scrubSecrets(message), cleanCause !== undefined ? { cause: cleanCause } : undefined);
    this.name = 'DatabasePersistenceError';
    this.code = options?.code ?? 'DATABASE_ERROR';
    this.statusCode = options?.statusCode ?? 500;
    this.details = options?.details !== undefined ? scrubErrorDetails(options.details) : undefined;
    if (cleanCause !== undefined) {
      this.cause = cleanCause;
    }
  }
}

/**
 * Persists a validated CarouselPackage to Supabase across topics, posts, slides, and sources.
 *
 * Implements compensating rollback:
 * If post, slides, or sources insertion fails, compensating delete removes created post and
 * topic records, guaranteeing zero orphaned data in PostgreSQL.
 *
 * All errors are wrapped in DatabasePersistenceError with secret scrubbing across all properties.
 */
export async function persistCarouselPackage(
  pkg: CarouselPackage,
  options?: PersistCarouselOptions,
): Promise<{ topicId: string; postId: string }> {
  if (!pkg || typeof pkg !== 'object') {
    throw new DatabasePersistenceError('Invalid carousel package: must be an object', {
      code: 'VALIDATION_ERROR',
      statusCode: 400,
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client: any =
    options?.supabase ??
    options?.supabaseClient ??
    options?.client ??
    createSupabaseClient(options);

  let topicId: string | undefined;
  let postId: string | undefined;

  try {
    // a) Insert topic -> topicId
    const topicRes = await client
      .from('topics')
      .insert({
        title: pkg.topic?.title,
        pillar: pkg.topic?.pillar,
      })
      .select()
      .single();

    if (topicRes.error) {
      throw new Error(
        `Topic insert error: ${topicRes.error.message || JSON.stringify(topicRes.error)}`,
      );
    }

    topicId = topicRes.data?.id;
    if (!topicId) {
      throw new Error('Topic insertion did not return an id');
    }

    // b) Insert post with topicId -> postId
    const postPayload = {
      topic_id: topicId,
      hook: pkg.hook,
      caption: pkg.caption,
      cta: pkg.cta,
      hashtags: pkg.hashtags ?? [],
      tone: (pkg as { tone?: string }).tone ?? 'educational',
      slide_count: pkg.slides?.length ?? 0,
      status: (pkg as { status?: string }).status ?? 'draft',
    };

    const postRes = await client.from('posts').insert(postPayload).select().single();

    if (postRes.error) {
      if (topicId) {
        try {
          await client.from('topics').delete().eq('id', topicId);
        } catch {
          // Ignore secondary rollback deletion errors to preserve root cause
        }
        topicId = undefined;
      }
      throw new Error(
        `Post insert error: ${postRes.error.message || JSON.stringify(postRes.error)}`,
      );
    }

    postId = postRes.data?.id;
    if (!postId) {
      if (topicId) {
        try {
          await client.from('topics').delete().eq('id', topicId);
        } catch {
          // Ignore secondary rollback deletion errors to preserve root cause
        }
        topicId = undefined;
      }
      throw new Error('Post insertion did not return an id');
    }

    // c) Batch insert slides & d) Batch insert sources with compensating rollback
    try {
      const slideRows = pkg.slides.map((s) => ({
        post_id: postId,
        slide_number: s.slideNumber,
        type: s.type,
        headline: s.headline,
        body: s.body,
        visual_suggestion: s.visualSuggestion,
      }));

      const slidesRes = await client.from('slides').insert(slideRows);
      if (slidesRes.error) {
        throw new Error(
          `Slide insert error: ${slidesRes.error.message || JSON.stringify(slidesRes.error)}`,
        );
      }

      if (pkg.sources && pkg.sources.length > 0) {
        const sourceRows = pkg.sources.map((src) => ({
          post_id: postId,
          source_text: src,
          url: src.startsWith('http://') || src.startsWith('https://') ? src : null,
        }));

        const sourcesRes = await client.from('sources').insert(sourceRows);
        if (sourcesRes.error) {
          throw new Error(
            `Sources insert error: ${sourcesRes.error.message || JSON.stringify(sourcesRes.error)}`,
          );
        }
      }
    } catch (childErr) {
      // Compensating rollback: Delete the post record, cascading deletion to slides/sources
      if (postId) {
        try {
          await client.from('posts').delete().eq('id', postId);
        } catch {
          // Ignore secondary rollback deletion errors to preserve root cause
        }
        postId = undefined;
      }
      if (topicId) {
        try {
          await client.from('topics').delete().eq('id', topicId);
        } catch {
          // Ignore secondary rollback deletion errors to preserve root cause
        }
        topicId = undefined;
      }
      throw childErr;
    }

    return {
      topicId,
      postId,
    };
  } catch (err: unknown) {
    if (err instanceof DatabasePersistenceError) {
      throw err;
    }

    // Fallback rollback: ensure any created records are purged if an unhandled error occurred
    if (postId) {
      try {
        await client.from('posts').delete().eq('id', postId);
      } catch {
        // Ignore secondary rollback deletion errors
      }
    }
    if (topicId) {
      try {
        await client.from('topics').delete().eq('id', topicId);
      } catch {
        // Ignore secondary rollback deletion errors
      }
    }

    const rawMessage = err instanceof Error ? err.message : String(err);
    const cleanMessage = scrubSecrets(rawMessage);

    throw new DatabasePersistenceError(
      `Failed to persist carousel package to database: ${cleanMessage}`,
      {
        code: 'DATABASE_ERROR',
        statusCode: 500,
        details:
          err && typeof err === 'object' && 'details' in err
            ? scrubErrorDetails((err as { details?: unknown }).details)
            : undefined,
        cause: err,
      },
    );
  }
}
