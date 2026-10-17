/**
 * Tier 2 Validation for ElevateWeb Content Engine.
 * Enforces strict runtime Zod validation over generated carousel packages.
 */

import { CarouselPackageSchema, type CarouselPackage } from '../../../types/src/index.ts';

export type ErrorDetailItem = { path: string; message: string; code?: string };

/**
 * Strips sensitive API keys, connection strings, and tokens from error messages.
 */
export function sanitizeSecrets(text: string): string {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/sk-[a-zA-Z0-9_-]{15,}/gi, '[REDACTED_API_KEY]')
    .replace(/Bearer\s+[a-zA-Z0-9_.-]+/gi, 'Bearer [REDACTED]')
    .replace(/ey[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+/g, '[REDACTED_JWT]')
    .replace(/postgres(?:ql)?:\/\/[^\s"']+/gi, '[REDACTED_DB_URL]')
    .replace(/OPENAI_API_KEY=[^\s"']+/gi, 'OPENAI_API_KEY=[REDACTED]')
    .replace(/SUPABASE_SERVICE_ROLE_KEY=[^\s"']+/gi, 'SUPABASE_SERVICE_ROLE_KEY=[REDACTED]')
    .replace(/SUPABASE_URL=[^\s"']+/gi, 'SUPABASE_URL=[REDACTED]');
}

/**
 * Recursively scrubs secrets from error details objects or arrays.
 */
export function sanitizeErrorDetails<T>(data: T): T {
  if (typeof data === 'string') {
    return sanitizeSecrets(data) as unknown as T;
  }
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeErrorDetails(item)) as unknown as T;
  }
  if (data !== null && typeof data === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      result[key] = sanitizeErrorDetails(value);
    }
    return result as unknown as T;
  }
  return data;
}

/**
 * Base domain error for content generation failures.
 */
export class ContentGenerationError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: ErrorDetailItem[] | Record<string, unknown> | unknown;

  constructor(
    message: string,
    options?: {
      code?: string;
      statusCode?: number;
      details?: ErrorDetailItem[] | Record<string, unknown> | unknown;
      cause?: unknown;
    },
  ) {
    super(sanitizeSecrets(message));
    this.name = 'ContentGenerationError';
    this.code = options?.code ?? 'GENERATION_ERROR';
    this.statusCode = options?.statusCode ?? 500;
    this.details = options?.details ? sanitizeErrorDetails(options.details) : undefined;
    if (options?.cause) {
      this.cause = options.cause;
    }
  }
}

/**
 * Domain error thrown when raw or AI-generated output fails Tier 2 brand schema validation.
 */
export class ContentValidationError extends ContentGenerationError {
  public readonly errors: ErrorDetailItem[];
  public override readonly details?: ErrorDetailItem[];

  constructor(
    message: string,
    details?: ErrorDetailItem[] | unknown,
    code: string = 'GENERATION_ERROR',
  ) {
    const cleanDetails = details ? sanitizeErrorDetails(details) : undefined;
    super(message, { code, statusCode: 500, details: cleanDetails });
    this.name = 'ContentValidationError';
    this.errors = Array.isArray(cleanDetails) ? (cleanDetails as ErrorDetailItem[]) : [];
    this.details = Array.isArray(cleanDetails) ? (cleanDetails as ErrorDetailItem[]) : undefined;
  }
}

/**
 * Validates raw AI output against CarouselPackageSchema (Tier 2 validation).
 * Enforces 5-8 slides, strictly sequential slide numbering (1..N), valid types, and length bounds.
 *
 * @throws {ContentValidationError} If the payload violates the schema contract.
 */
export function validateCarouselOutput(raw: unknown): CarouselPackage {
  if (!raw || typeof raw !== 'object') {
    throw new ContentValidationError('Output is not a valid object', [
      { path: 'body', message: 'Output must be a non-null object', code: 'invalid_type' },
    ]);
  }

  const result = CarouselPackageSchema.safeParse(raw);
  if (!result.success) {
    const formattedIssues = result.error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
      code: issue.code,
    }));
    const message = `Tier 2 validation failed: ${result.error.issues
      .map((i) => `${i.path.join('.') || 'root'}: ${i.message}`)
      .join('; ')}`;

    throw new ContentValidationError(message, formattedIssues);
  }

  return result.data;
}
