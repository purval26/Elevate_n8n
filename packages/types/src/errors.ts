import { z } from 'zod';

export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  GENERATION_ERROR: 'GENERATION_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  UPSTREAM_TIMEOUT: 'UPSTREAM_TIMEOUT',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  NOT_FOUND: 'NOT_FOUND',
} as const;

export const ErrorCodeSchema = z.enum([
  'VALIDATION_ERROR',
  'GENERATION_ERROR',
  'DATABASE_ERROR',
  'UPSTREAM_TIMEOUT',
  'INTERNAL_SERVER_ERROR',
  'NOT_FOUND',
]);
export type ErrorCode = z.infer<typeof ErrorCodeSchema>;

export const ApiErrorDetailSchema = z.object({
  path: z.string().optional(),
  field: z.string().optional(),
  message: z.string(),
  code: z.string().optional(),
});
export type ApiErrorDetail = z.infer<typeof ApiErrorDetailSchema>;

/**
 * Structured API Error envelope returned by Fastify error handlers.
 */
export const StructuredApiErrorSchema = z.object({
  error: z.object({
    code: ErrorCodeSchema.or(z.string()),
    message: z.string(),
    details: z.array(ApiErrorDetailSchema).optional(),
  }),
});
export type StructuredApiError = z.infer<typeof StructuredApiErrorSchema>;

/**
 * Flexible API Error Response Schema accepting both structured error objects and standard HTTP error envelopes.
 */
export const ApiErrorResponseSchema = z.object({
  statusCode: z.number().int().optional(),
  error: z.union([
    z.string(),
    z.object({
      code: ErrorCodeSchema.or(z.string()),
      message: z.string(),
      details: z.array(ApiErrorDetailSchema).optional(),
    }),
  ]),
  message: z.string().optional(),
  details: z.array(ApiErrorDetailSchema).optional(),
});
export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>;
