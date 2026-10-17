/**
 * OpenAI Client Factory for ElevateWeb Content Engine.
 */

import OpenAI from 'openai';

export interface OpenAIClientOptions {
  apiKey?: string;
  client?: OpenAI | unknown;
  baseURL?: string;
  timeout?: number;
  maxRetries?: number;
}

/**
 * Creates or retrieves an OpenAI client instance.
 * Accepts an existing client instance, custom options, or pulls OPENAI_API_KEY from environment.
 */
export function createOpenAIClient(options?: OpenAIClientOptions | string): OpenAI {
  if (typeof options === 'string') {
    return new OpenAI({ apiKey: options });
  }

  if (options && typeof options === 'object' && 'client' in options && options.client) {
    return options.client as OpenAI;
  }

  const apiKey = options?.apiKey ?? process.env.OPENAI_API_KEY;

  return new OpenAI({
    apiKey: apiKey || 'mock-api-key',
    baseURL: options?.baseURL,
    timeout: options?.timeout,
    maxRetries: options?.maxRetries,
  });
}

export const getOpenAIClient = createOpenAIClient;
