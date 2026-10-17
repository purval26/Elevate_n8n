/**
 * Offline Mock OpenAI SDK client for ElevateWeb Content Engine testing.
 * Compatible with OpenAI SDK v4 (chat.completions.create & beta.chat.completions.parse).
 */

import { createValidCarouselFixture, type TestCarouselPackage } from './fixtures.ts';

export type MockOpenAIMode =
  | 'success'
  | 'rate_limit'
  | 'timeout'
  | 'malformed_json'
  | 'schema_violation_few_slides'
  | 'schema_violation_missing_fields'
  | 'schema_violation_non_sequential';

export interface MockOpenAIOptions {
  mode?: MockOpenAIMode;
  customPackage?: TestCarouselPackage;
  delayMs?: number;
}

export class MockOpenAIClient {
  public mode: MockOpenAIMode;
  public customPackage?: TestCarouselPackage;
  public delayMs: number;
  public calls: Array<{
    messages: Array<{ role: string; content: string }>;
    model?: string;
    response_format?: unknown;
  }> = [];

  constructor(options: MockOpenAIOptions = {}) {
    this.mode = options.mode ?? 'success';
    this.customPackage = options.customPackage;
    this.delayMs = options.delayMs ?? 0;
  }

  public setMode(mode: MockOpenAIMode, customPackage?: TestCarouselPackage) {
    this.mode = mode;
    if (customPackage) {
      this.customPackage = customPackage;
    }
  }

  public reset() {
    this.calls = [];
    this.mode = 'success';
    this.customPackage = undefined;
  }

  private async simulateDelay(): Promise<void> {
    if (this.delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.delayMs));
    }
  }

  private buildResponsePayload(userPrompt?: string): TestCarouselPackage {
    if (this.customPackage) {
      return this.customPackage;
    }

    // Try to adapt slide count from prompt if detected
    let slideCount = 6;
    let topicTitle = 'How DNS Works: From URL to IP Address';
    let pillar = 'tech_explained';

    if (userPrompt) {
      const slideMatch = userPrompt.match(/(\d+)\s+slides?/i);
      if (slideMatch && slideMatch[1]) {
        const parsed = parseInt(slideMatch[1], 10);
        if (parsed >= 5 && parsed <= 8) {
          slideCount = parsed;
        }
      }

      const topicMatch = userPrompt.match(/slides on (.+?)(?:\s+\(pillar:|$)/i);
      if (topicMatch && topicMatch[1]) {
        topicTitle = topicMatch[1].trim();
      }

      const pillarMatch = userPrompt.match(/\(pillar:\s*([^)]+)\)/i);
      if (pillarMatch && pillarMatch[1]) {
        pillar = pillarMatch[1].trim();
      }
    }

    return createValidCarouselFixture({ slideCount, topicTitle, pillar });
  }

  /**
   * Mock implementation of OpenAI chat completions.
   */
  public chat = {
    completions: {
      create: async (params: {
        messages: Array<{ role: string; content: string }>;
        model?: string;
        response_format?: unknown;
      }) => {
        this.calls.push({
          messages: params.messages,
          model: params.model,
          response_format: params.response_format,
        });

        await this.simulateDelay();

        if (this.mode === 'rate_limit') {
          const err = new Error('429 Rate limit reached for default-organization on requests per min.');
          (err as unknown as { status: number }).status = 429;
          (err as unknown as { code: string }).code = 'rate_limit_exceeded';
          throw err;
        }

        if (this.mode === 'timeout') {
          const err = new Error('Request timed out after 30000ms');
          (err as unknown as { code: string }).code = 'ETIMEDOUT';
          throw err;
        }

        if (this.mode === 'malformed_json') {
          return {
            id: 'mock-chatcmpl-malformed',
            object: 'chat.completion',
            created: Date.now(),
            model: params.model ?? 'gpt-4o',
            choices: [
              {
                index: 0,
                message: {
                  role: 'assistant',
                  content: '{ "topic": "DNS", invalid_json syntax without closing brackets',
                },
                finish_reason: 'stop',
              },
            ],
            usage: { prompt_tokens: 150, completion_tokens: 30, total_tokens: 180 },
          };
        }

        if (this.mode === 'schema_violation_few_slides') {
          const invalidPayload = {
            topic: { title: 'DNS', pillar: 'tech_explained' },
            hook: 'Short hook',
            slides: [
              { slideNumber: 1, type: 'hook', headline: 'H1', body: 'B1', visualSuggestion: 'V1' },
              { slideNumber: 2, type: 'concept', headline: 'H2', body: 'B2', visualSuggestion: 'V2' },
            ], // Only 2 slides! Minimum is 5
            caption: 'Valid caption with enough characters for test verification',
            cta: 'Save post',
            hashtags: ['#DNS'],
            sources: ['RFC 1035'],
          };
          return {
            id: 'mock-chatcmpl-few-slides',
            object: 'chat.completion',
            created: Date.now(),
            model: params.model ?? 'gpt-4o',
            choices: [
              {
                index: 0,
                message: {
                  role: 'assistant',
                  content: JSON.stringify(invalidPayload),
                },
                finish_reason: 'stop',
              },
            ],
            usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
          };
        }

        if (this.mode === 'schema_violation_missing_fields') {
          const invalidPayload = {
            topic: { title: 'DNS', pillar: 'tech_explained' },
            hook: 'Valid compelling hook text that satisfies minimum length',
            slides: [
              { slideNumber: 1, type: 'hook', headline: 'H1', body: 'Body text' }, // Missing visualSuggestion!
              { slideNumber: 2, type: 'concept', headline: 'H2', body: 'Body text', visualSuggestion: 'Vis 2' },
              { slideNumber: 3, type: 'concept', headline: 'H3', body: 'Body text', visualSuggestion: 'Vis 3' },
              { slideNumber: 4, type: 'concept', headline: 'H4', body: 'Body text', visualSuggestion: 'Vis 4' },
              { slideNumber: 5, type: 'cta', headline: 'H5', body: 'Body text', visualSuggestion: 'Vis 5' },
            ],
            caption: 'Descriptive caption that satisfies the length requirements for validation',
            cta: 'Follow @ElevateWeb',
            hashtags: ['#DNS', '#Networking', '#WebDev'],
            sources: ['RFC 1035'],
          };
          return {
            id: 'mock-chatcmpl-missing-fields',
            object: 'chat.completion',
            created: Date.now(),
            model: params.model ?? 'gpt-4o',
            choices: [
              {
                index: 0,
                message: {
                  role: 'assistant',
                  content: JSON.stringify(invalidPayload),
                },
                finish_reason: 'stop',
              },
            ],
            usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
          };
        }

        if (this.mode === 'schema_violation_non_sequential') {
          const invalidPayload = {
            topic: { title: 'DNS', pillar: 'tech_explained' },
            hook: 'Compelling hook text for non sequential slide test',
            slides: [
              { slideNumber: 1, type: 'hook', headline: 'H1', body: 'Body 1', visualSuggestion: 'Vis 1' },
              { slideNumber: 3, type: 'concept', headline: 'H3', body: 'Body 3', visualSuggestion: 'Vis 3' }, // Out of order!
              { slideNumber: 2, type: 'concept', headline: 'H2', body: 'Body 2', visualSuggestion: 'Vis 2' },
              { slideNumber: 4, type: 'concept', headline: 'H4', body: 'Body 4', visualSuggestion: 'Vis 4' },
              { slideNumber: 5, type: 'cta', headline: 'H5', body: 'Body 5', visualSuggestion: 'Vis 5' },
            ],
            caption: 'Descriptive caption that satisfies the length requirements for validation',
            cta: 'Follow @ElevateWeb',
            hashtags: ['#DNS', '#Networking', '#WebDev'],
            sources: ['RFC 1035'],
          };
          return {
            id: 'mock-chatcmpl-non-sequential',
            object: 'chat.completion',
            created: Date.now(),
            model: params.model ?? 'gpt-4o',
            choices: [
              {
                index: 0,
                message: {
                  role: 'assistant',
                  content: JSON.stringify(invalidPayload),
                },
                finish_reason: 'stop',
              },
            ],
            usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
          };
        }

        const userPrompt = params.messages.find((m) => m.role === 'user')?.content;
        const payload = this.buildResponsePayload(userPrompt);

        return {
          id: 'mock-chatcmpl-success',
          object: 'chat.completion',
          created: Date.now(),
          model: params.model ?? 'gpt-4o',
          choices: [
            {
              index: 0,
              message: {
                role: 'assistant',
                content: JSON.stringify(payload),
              },
              finish_reason: 'stop',
            },
          ],
          usage: { prompt_tokens: 350, completion_tokens: 420, total_tokens: 770 },
        };
      },
    },
  };

  /**
   * Mock implementation of OpenAI beta.chat.completions.parse for zodResponseFormat.
   */
  public beta = {
    chat: {
      completions: {
        parse: async (params: {
          messages: Array<{ role: string; content: string }>;
          model?: string;
          response_format?: unknown;
        }) => {
          this.calls.push({
            messages: params.messages,
            model: params.model,
            response_format: params.response_format,
          });

          await this.simulateDelay();

          if (this.mode === 'rate_limit') {
            const err = new Error('429 Rate limit reached');
            (err as unknown as { status: number }).status = 429;
            throw err;
          }

          if (this.mode === 'timeout') {
            const err = new Error('Request timed out after 30000ms');
            (err as unknown as { code: string }).code = 'ETIMEDOUT';
            throw err;
          }

          if (this.mode === 'malformed_json') {
            const err = new Error('Failed to parse structured output from OpenAI: Invalid JSON');
            throw err;
          }

          if (this.mode === 'schema_violation_few_slides') {
            const invalidPayload = {
              topic: { title: 'DNS', pillar: 'tech_explained' },
              hook: 'Short hook',
              slides: [
                { slideNumber: 1, type: 'hook', headline: 'H1', body: 'B1', visualSuggestion: 'V1' },
                { slideNumber: 2, type: 'concept', headline: 'H2', body: 'B2', visualSuggestion: 'V2' },
              ],
              caption: 'Valid caption with enough characters',
              cta: 'Save post',
              hashtags: ['#DNS'],
              sources: ['RFC 1035'],
            };
            return {
              id: 'mock-beta-few-slides',
              choices: [
                {
                  message: {
                    parsed: invalidPayload,
                    content: JSON.stringify(invalidPayload),
                  },
                },
              ],
            };
          }

          const userPrompt = params.messages.find((m) => m.role === 'user')?.content;
          const payload = this.buildResponsePayload(userPrompt);

          return {
            id: 'mock-beta-success',
            choices: [
              {
                message: {
                  parsed: payload,
                  content: JSON.stringify(payload),
                },
              },
            ],
          };
        },
      },
    },
  };
}

export function createMockOpenAI(options: MockOpenAIOptions = {}): MockOpenAIClient {
  return new MockOpenAIClient(options);
}
