/**
 * Sanitized Error Response Envelope Plugin for ElevateWeb Content Engine.
 *
 * Implements Fastify centralized error handling:
 * - Intercepts all validation, generation, database, and internal errors.
 * - Formats errors into strict StructuredApiError envelopes.
 * - Enforces zero secret leakage across messages, details, and logs.
 */

import type { FastifyError, FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import {
  ERROR_CODES,
  type ApiErrorDetail,
  type StructuredApiError,
} from '../../../../packages/types/src/index.ts';
import {
  scrubSecrets,
  scrubErrorDetails,
  ContentGenerationError,
  ContentValidationError,
  DatabasePersistenceError,
} from '../../../../packages/content/src/index.ts';

export interface FormattedError {
  statusCode: number;
  payload: StructuredApiError;
}

/**
 * Pure formatting function mapping any error to status code and StructuredApiError envelope.
 */
export function formatErrorResponse(err: unknown): FormattedError {
  let statusCode = 500;
  let code: string = ERROR_CODES.INTERNAL_SERVER_ERROR;
  let message = 'An unexpected internal error occurred';
  let details: ApiErrorDetail[] | undefined;

  // 1. Zod Request Validation Error (HTTP 400)
  if (
    err instanceof ZodError ||
    (typeof err === 'object' &&
      err !== null &&
      (err as { name?: string }).name === 'ZodError' &&
      Array.isArray((err as { issues?: unknown }).issues))
  ) {
    const zodErr = err as ZodError;
    statusCode = 400;
    code = ERROR_CODES.VALIDATION_ERROR;
    message = 'Request validation failed';
    details = zodErr.issues.flatMap((issue) => {
      if (
        issue.code === 'unrecognized_keys' &&
        'keys' in issue &&
        Array.isArray((issue as { keys?: unknown[] }).keys)
      ) {
        const keys = (issue as { keys: string[] }).keys;
        return keys.map((key) => ({
          path: key,
          field: key,
          message: scrubSecrets(issue.message),
          code: issue.code,
        }));
      }
      const pathStr = issue.path.join('.');
      return [
        {
          path: pathStr || (issue.path.length > 0 ? String(issue.path[0]) : 'root'),
          field: issue.path.length > 0 ? String(issue.path[0]) : 'root',
          message: scrubSecrets(issue.message),
          code: issue.code,
        },
      ];
    });
  }
  // 2. Fastify Native Client / Bad JSON Syntax Error (HTTP 400)
  else if (
    err instanceof SyntaxError ||
    (typeof err === 'object' &&
      err !== null &&
      ((err as { name?: string }).name === 'SyntaxError' ||
        (err as { code?: string }).code === 'FST_ERR_CTP_INVALID_CONTENT' ||
        (err as { code?: string }).code === 'FST_ERR_CTP_EMPTY_JSON_BODY' ||
        ((err as { statusCode?: number }).statusCode === 400 &&
          String((err as { message?: string }).message)
            .toLowerCase()
            .includes('json'))))
  ) {
    const errorObj = err as Error;
    statusCode = 400;
    code = ERROR_CODES.VALIDATION_ERROR;
    message = scrubSecrets(errorObj.message || 'Invalid JSON syntax in request body');
    details = [
      {
        path: 'body',
        field: 'body',
        message: scrubSecrets(errorObj.message || 'Invalid JSON syntax in request body'),
        code: 'invalid_json',
      },
    ];
  }
  // 3. Fastify Schema Validation Error (HTTP 400)
  else if (
    typeof err === 'object' &&
    err !== null &&
    (err as { statusCode?: number }).statusCode === 400 &&
    'validation' in err
  ) {
    const fastifyErr = err as FastifyError;
    statusCode = 400;
    code = ERROR_CODES.VALIDATION_ERROR;
    message = scrubSecrets(fastifyErr.message || 'Request validation failed');
    if (Array.isArray(fastifyErr.validation)) {
      details = fastifyErr.validation.map((v) => ({
        path: v.instancePath ? v.instancePath.replace(/^\//, '') : 'root',
        field:
          v.params && typeof v.params === 'object' && 'missingProperty' in v.params
            ? String((v.params as { missingProperty?: unknown }).missingProperty)
            : undefined,
        message: scrubSecrets(v.message || 'Invalid property'),
        code: v.keyword,
      }));
    }
  }
  // 4. Content Validation Error - Tier 2 Schema Defense (HTTP 500)
  // MUST precede ContentGenerationError check due to inheritance!
  else if (
    err instanceof ContentValidationError ||
    (typeof err === 'object' &&
      err !== null &&
      (err as { name?: string }).name === 'ContentValidationError')
  ) {
    const valErr = err as ContentValidationError;
    statusCode = valErr.statusCode || 500;
    code = ERROR_CODES.GENERATION_ERROR;
    message = scrubSecrets(valErr.message);
    const rawDetails = valErr.errors ?? valErr.details;
    if (Array.isArray(rawDetails)) {
      details = scrubErrorDetails(rawDetails) as ApiErrorDetail[];
    }
  }
  // 5. Database Persistence Error (HTTP 500) - MUST evaluate before generic timeout check
  // because Supabase connection errors may contain "timed out" in their error message!
  else if (
    err instanceof DatabasePersistenceError ||
    (typeof err === 'object' &&
      err !== null &&
      ((err as { name?: string }).name === 'DatabasePersistenceError' ||
        (err as { code?: string }).code === 'DATABASE_ERROR'))
  ) {
    const dbErr = err as DatabasePersistenceError;
    statusCode = dbErr.statusCode || 500;
    code = ERROR_CODES.DATABASE_ERROR;
    message = scrubSecrets(dbErr.message);
  }
  // 6. Upstream OpenAI Network Timeout (HTTP 500 / UPSTREAM_TIMEOUT)
  else if (
    (typeof err === 'object' &&
      err !== null &&
      ((err as { code?: string }).code === 'UPSTREAM_TIMEOUT' ||
        (err as { statusCode?: number }).statusCode === 504 ||
        ((err as { statusCode?: number }).statusCode === 500 &&
          (err as { code?: string }).code === 'UPSTREAM_TIMEOUT'))) ||
    (err instanceof Error &&
      (err.message.toLowerCase().includes('timed out') ||
        err.message.toLowerCase().includes('timeout') ||
        (err as { code?: string }).code === 'ETIMEDOUT'))
  ) {
    const toErr = err as Error;
    statusCode = 500;
    code = ERROR_CODES.UPSTREAM_TIMEOUT;
    message = scrubSecrets(toErr.message || 'Upstream OpenAI request timed out');
  }
  // 7. Content Generation Error - OpenAI Service / Rate Limit (HTTP 500)
  else if (
    err instanceof ContentGenerationError ||
    (typeof err === 'object' &&
      err !== null &&
      (err as { name?: string }).name === 'ContentGenerationError')
  ) {
    const genErr = err as ContentGenerationError;
    statusCode = genErr.statusCode || 500;
    code = genErr.code || ERROR_CODES.GENERATION_ERROR;
    message = scrubSecrets(genErr.message);
    if (genErr.details && Array.isArray(genErr.details)) {
      details = scrubErrorDetails(genErr.details) as ApiErrorDetail[];
    }
  }
  // 8. Fastify 404 Route Not Found (HTTP 404)
  else if (
    typeof err === 'object' &&
    err !== null &&
    (err as { statusCode?: number }).statusCode === 404
  ) {
    statusCode = 404;
    code = ERROR_CODES.NOT_FOUND;
    message = scrubSecrets((err as Error).message || 'Route not found');
  }
  // 9. General HTTP Error Fallback with custom statusCode
  else if (
    typeof err === 'object' &&
    err !== null &&
    typeof (err as { statusCode?: unknown }).statusCode === 'number'
  ) {
    statusCode = (err as { statusCode: number }).statusCode;
    const rawMsg = (err as Error).message || 'An error occurred';
    message = scrubSecrets(rawMsg);
    if (statusCode === 400) code = ERROR_CODES.VALIDATION_ERROR;
    else if (statusCode === 404) code = ERROR_CODES.NOT_FOUND;
    else if (statusCode === 504) code = ERROR_CODES.UPSTREAM_TIMEOUT;
    else code = (err as { code?: string }).code || ERROR_CODES.INTERNAL_SERVER_ERROR;
  }
  // 10. Unhandled Exception Fallback (HTTP 500)
  else {
    statusCode = 500;
    code = ERROR_CODES.INTERNAL_SERVER_ERROR;
    const rawMsg = err instanceof Error ? err.message : String(err);
    message = scrubSecrets(rawMsg || 'An internal server error occurred');
  }

  // Construct envelope and run final recursive scrubbing pass
  const payload: StructuredApiError = {
    error: {
      code,
      message,
      ...(details && details.length > 0 ? { details } : {}),
    },
  };

  return {
    statusCode,
    payload: scrubErrorDetails(payload),
  };
}

/**
 * Fastify error handler function.
 */
export function errorHandler(
  error: FastifyError | Error | unknown,
  request: FastifyRequest,
  reply: FastifyReply,
): void {
  const { statusCode, payload } = formatErrorResponse(error);

  // Structured logging with sanitized message and code (zero credentials in logs)
  if (request.log) {
    request.log.error(
      {
        statusCode,
        code: payload.error.code,
        message: payload.error.message,
      },
      'API request failed',
    );
  }

  reply.status(statusCode).send(payload);
}

/**
 * Fastify Plugin registering the centralized error handler and 404 handler.
 */
export const errorHandlerPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.setErrorHandler(errorHandler);

  fastify.setNotFoundHandler((request, reply) => {
    const payload: StructuredApiError = {
      error: {
        code: ERROR_CODES.NOT_FOUND,
        message: `Route ${request.method} ${request.url} not found`,
      },
    };

    reply.status(404).send(payload);
  });
};
