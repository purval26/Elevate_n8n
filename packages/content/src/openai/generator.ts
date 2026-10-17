/**
 * OpenAI Generator for ElevateWeb Content Engine.
 * Two-tier generation:
 * - Tier 1: OpenAI SDK structured outputs via zodResponseFormat(BaseCarouselPackageSchema)
 * - Tier 2: Application-level Zod validation via validateCarouselOutput()
 */

import type OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import {
  BaseCarouselPackageSchema,
  type GenerateContentRequest,
  type CarouselPackage,
} from '../../../types/src/index.ts';
import { buildCarouselPrompt } from '../../../prompts/src/index.ts';
import { createOpenAIClient } from './client.ts';
import {
  validateCarouselOutput,
  ContentGenerationError,
  ContentValidationError,
  sanitizeSecrets,
} from '../validation/validator.ts';

export interface GenerateContentInput {
  topic: string;
  pillar: string;
  tone?: string;
  slideCount?: number;
}

interface CompletionChoice {
  message?: {
    parsed?: unknown;
    content?: string | null;
  };
}

interface CompatibleOpenAIClient {
  beta?: {
    chat?: {
      completions?: {
        parse?: (params: unknown) => Promise<{ choices?: CompletionChoice[] }>;
      };
    };
  };
  chat?: {
    completions?: {
      create?: (params: unknown) => Promise<{ choices?: CompletionChoice[] }>;
    };
  };
}

export interface GenerateCarouselOptions {
  openai?: OpenAI | CompatibleOpenAIClient | unknown;
  client?: OpenAI | CompatibleOpenAIClient | unknown;
  model?: string;
}

/**
 * Generates an Instagram carousel package using OpenAI structured output
 * and validates it through Tier 2 brand schema defense.
 *
 * @throws {ContentGenerationError} On rate limits (429), timeouts, malformed responses, or schema violations.
 */
export async function generateCarousel(
  request: GenerateContentRequest | GenerateContentInput,
  options?: GenerateCarouselOptions,
): Promise<CarouselPackage> {
  const client = (options?.openai ??
    options?.client ??
    createOpenAIClient()) as CompatibleOpenAIClient;
  const modelName = options?.model ?? 'gpt-4o';
  const prompt = buildCarouselPrompt(request);

  let rawResult: unknown;

  try {
    if (client.beta?.chat?.completions?.parse) {
      const completion = await client.beta.chat.completions.parse({
        model: modelName,
        messages: [
          { role: 'system', content: prompt.systemPrompt },
          { role: 'user', content: prompt.userPrompt },
        ],
        response_format: zodResponseFormat(BaseCarouselPackageSchema, 'carousel_package'),
      });

      const choice = completion.choices?.[0];
      if (!choice) {
        throw new ContentGenerationError('No completion choice returned from OpenAI');
      }

      if (choice.message?.parsed !== undefined && choice.message?.parsed !== null) {
        rawResult = choice.message.parsed;
      } else if (choice.message?.content) {
        try {
          rawResult = JSON.parse(choice.message.content);
        } catch (parseErr: unknown) {
          throw new ContentGenerationError('Failed to parse OpenAI JSON output', {
            code: 'GENERATION_ERROR',
            cause: parseErr,
          });
        }
      } else {
        throw new ContentGenerationError('Empty response message received from OpenAI');
      }
    } else if (client.chat?.completions?.create) {
      const completion = await client.chat.completions.create({
        model: modelName,
        messages: [
          { role: 'system', content: prompt.systemPrompt },
          { role: 'user', content: prompt.userPrompt },
        ],
        response_format: zodResponseFormat(BaseCarouselPackageSchema, 'carousel_package'),
      });

      const choice = completion.choices?.[0];
      if (!choice || !choice.message?.content) {
        throw new ContentGenerationError('Empty content returned from OpenAI');
      }

      try {
        rawResult = JSON.parse(choice.message.content);
      } catch (parseErr: unknown) {
        throw new ContentGenerationError('Failed to parse OpenAI JSON output', {
          code: 'GENERATION_ERROR',
          cause: parseErr,
        });
      }
    } else {
      throw new ContentGenerationError(
        'Provided OpenAI client has no compatible completions interface',
      );
    }
  } catch (err: unknown) {
    if (err instanceof ContentGenerationError) {
      throw err;
    }

    const errObj = err as { status?: number; code?: string; message?: string } | undefined;
    const rawMsg = errObj?.message || String(err);
    const cleanMsg = sanitizeSecrets(rawMsg);

    // 1. Rate Limit (HTTP 429)
    if (
      errObj?.status === 429 ||
      errObj?.code === 'rate_limit_exceeded' ||
      cleanMsg.includes('429') ||
      cleanMsg.toLowerCase().includes('rate limit')
    ) {
      throw new ContentGenerationError('OpenAI rate limit reached (HTTP 429)', {
        code: 'GENERATION_ERROR',
        statusCode: 500,
        cause: err,
      });
    }

    // 2. Upstream Network Timeout
    if (
      errObj?.code === 'ETIMEDOUT' ||
      cleanMsg.toLowerCase().includes('timed out') ||
      cleanMsg.toLowerCase().includes('timeout')
    ) {
      throw new ContentGenerationError('Upstream OpenAI request timed out', {
        code: 'UPSTREAM_TIMEOUT',
        statusCode: 504,
        cause: err,
      });
    }

    // 3. Malformed JSON / Schema violation from parse
    if (
      cleanMsg.toLowerCase().includes('failed to parse structured output') ||
      cleanMsg.toLowerCase().includes('invalid json')
    ) {
      throw new ContentGenerationError(`Malformed AI response: ${cleanMsg}`, {
        code: 'GENERATION_ERROR',
        statusCode: 500,
        cause: err,
      });
    }

    // 4. General upstream errors
    throw new ContentGenerationError(`OpenAI content generation failed: ${cleanMsg}`, {
      code: 'GENERATION_ERROR',
      statusCode: 500,
      cause: err,
    });
  }

  // Tier 2: Application-level Zod validation
  try {
    return validateCarouselOutput(rawResult);
  } catch (err: unknown) {
    if (err instanceof ContentValidationError) {
      throw err;
    }
    const message = err instanceof Error ? err.message : 'Unknown validation error';
    throw new ContentValidationError(`Tier 2 validation failed: ${message}`, err);
  }
}
