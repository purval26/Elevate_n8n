import test from 'node:test';
import assert from 'node:assert/strict';
import type OpenAI from 'openai';
import type { GenerateContentRequest, CarouselPackage, SlideType } from '../../types/src/index.ts';
import {
  generateCarousel,
  validateCarouselOutput,
  createOpenAIClient,
  ContentGenerationError,
  ContentValidationError,
  sanitizeSecrets,
} from '../src/index.ts';

// Helper fixture generator for test packages
function makeValidPackage(slideCount = 6): CarouselPackage {
  const slides = [];
  for (let i = 1; i <= slideCount; i++) {
    slides.push({
      slideNumber: i,
      type: (i === 1 ? 'hook' : i === slideCount ? 'takeaway' : 'breakdown') as SlideType,
      headline: `Headline for Slide ${i}`,
      body: `Body text for slide ${i} explaining technical details concisely.`,
      visualSuggestion: `Diagram showing step ${i} of the process.`,
    });
  }

  return {
    topic: {
      title: 'How DNS Works',
      pillar: 'tech_explained',
    },
    hook: 'Ever wondered how your browser converts a domain to an IP address in under 50ms?',
    slides,
    caption:
      'DNS translates human-readable domains into machine-routable IP addresses through a 4-tier hierarchy. What networking topic should we cover next?',
    cta: 'Save this post and follow @ElevateWeb for weekly software architecture deep dives.',
    hashtags: ['#webdev', '#networking', '#dns', '#softwareengineering'],
    sources: ['RFC 1034 & RFC 1035: Domain Names - Implementation and Specification'],
  };
}

interface MockCompletionParams {
  messages: Array<{ role: string; content: string }>;
  model?: string;
  response_format?: unknown;
}

/**
 * Creates a mock OpenAI client that satisfies beta.chat.completions.parse and chat.completions.create.
 */
function createMockClient(handler: (params: MockCompletionParams) => Promise<unknown> | unknown) {
  return {
    beta: {
      chat: {
        completions: {
          parse: async (params: MockCompletionParams) => handler(params),
        },
      },
    },
    chat: {
      completions: {
        create: async (params: MockCompletionParams) => handler(params),
      },
    },
  };
}

test('Generator: Two-Tier Generation Engine & OpenAI Client Mocking', async (t) => {
  const defaultRequest: GenerateContentRequest = {
    topic: 'How DNS Works',
    pillar: 'tech_explained',
    tone: 'educational',
    slideCount: 6,
  };

  // =========================================================================
  // a) Valid 6-slide carousel output
  // =========================================================================
  await t.test('a) Generates and validates a valid 6-slide carousel output', async () => {
    const expected = makeValidPackage(6);
    const mock = createMockClient(async () => ({
      choices: [{ message: { parsed: expected, content: JSON.stringify(expected) } }],
    }));

    const result = await generateCarousel(defaultRequest, { openai: mock });

    assert.equal(result.topic.title, 'How DNS Works');
    assert.equal(result.topic.pillar, 'tech_explained');
    assert.equal(result.slides.length, 6);
    assert.equal(result.slides[0]?.slideNumber, 1);
    assert.equal(result.slides[5]?.slideNumber, 6);
    assert.equal(result.slides[0]?.type, 'hook');
    assert.ok(result.caption.length >= 10);
    assert.ok(result.cta.length >= 3);
    assert.ok(result.hashtags.length >= 1);
    assert.ok(result.sources.length >= 1);
  });

  // =========================================================================
  // b) Custom 5-slide and 8-slide outputs
  // =========================================================================
  await t.test('b.1) Generates and validates custom 5-slide carousel output', async () => {
    const pkg5 = makeValidPackage(5);
    const mock = createMockClient(async () => ({
      choices: [{ message: { parsed: pkg5, content: JSON.stringify(pkg5) } }],
    }));

    const req5 = {
      topic: 'Event Loops',
      pillar: 'developer_tools',
      slideCount: 5,
    };

    const result = await generateCarousel(req5, { openai: mock });
    assert.equal(result.slides.length, 5);
    assert.equal(result.slides[0]?.slideNumber, 1);
    assert.equal(result.slides[4]?.slideNumber, 5);
  });

  await t.test('b.2) Generates and validates custom 8-slide carousel output', async () => {
    const pkg8 = makeValidPackage(8);
    const mock = createMockClient(async () => ({
      choices: [{ message: { parsed: pkg8, content: JSON.stringify(pkg8) } }],
    }));

    const req8 = {
      topic: 'Distributed Consensus',
      pillar: 'web_architecture',
      slideCount: 8,
    };

    const result = await generateCarousel(req8, { openai: mock });
    assert.equal(result.slides.length, 8);
    assert.equal(result.slides[7]?.slideNumber, 8);
  });

  // =========================================================================
  // c) Malformed AI JSON response handling
  // =========================================================================
  await t.test('c.1) Handles broken JSON string from completions.create', async () => {
    const mock = {
      chat: {
        completions: {
          create: async () => ({
            choices: [{ message: { content: '{ "topic": "DNS", invalid_json without closing' } }],
          }),
        },
      },
    };

    await assert.rejects(
      async () => generateCarousel(defaultRequest, { openai: mock }),
      (err: unknown) => {
        const e = err as ContentGenerationError;
        assert.ok(e instanceof ContentGenerationError);
        assert.equal(e.code, 'GENERATION_ERROR');
        return true;
      },
    );
  });

  await t.test(
    'c.2) Handles parse failure exception from beta.chat.completions.parse',
    async () => {
      const mock = createMockClient(async () => {
        throw new Error('Failed to parse structured output from OpenAI: Invalid JSON');
      });

      await assert.rejects(
        async () => generateCarousel(defaultRequest, { openai: mock }),
        (err: unknown) => {
          const e = err as ContentGenerationError;
          assert.ok(e instanceof ContentGenerationError);
          assert.equal(e.code, 'GENERATION_ERROR');
          assert.match(e.message, /Malformed AI response/i);
          return true;
        },
      );
    },
  );

  // =========================================================================
  // d) Missing slide fields rejection (Tier 2 validation)
  // =========================================================================
  await t.test('d.1) Rejects slide missing visualSuggestion', async () => {
    const raw = makeValidPackage(6) as unknown as Record<string, unknown>;
    const slides = (raw['slides'] as Array<Record<string, unknown>>).slice();
    slides[0] = { ...slides[0] };
    delete slides[0]['visualSuggestion'];
    raw['slides'] = slides;

    const mock = createMockClient(async () => ({
      choices: [{ message: { parsed: raw, content: JSON.stringify(raw) } }],
    }));

    await assert.rejects(
      async () => generateCarousel(defaultRequest, { openai: mock }),
      (err: unknown) => {
        const e = err as ContentValidationError;
        assert.ok(e instanceof ContentValidationError);
        assert.ok(e instanceof ContentGenerationError);
        assert.equal(e.code, 'GENERATION_ERROR');
        assert.ok(
          e.errors.some((d) => d.path.includes('visualSuggestion')),
          'Error details must point to missing visualSuggestion',
        );
        return true;
      },
    );
  });

  await t.test('d.2) Rejects slide with non-sequential numbering (e.g. 1, 3, 2)', async () => {
    const raw = makeValidPackage(5) as unknown as Record<string, unknown>;
    const slides = (raw['slides'] as Array<Record<string, unknown>>).slice();
    slides[1] = { ...slides[1], slideNumber: 3 };
    slides[2] = { ...slides[2], slideNumber: 2 };
    raw['slides'] = slides;

    const mock = createMockClient(async () => ({
      choices: [{ message: { parsed: raw, content: JSON.stringify(raw) } }],
    }));

    await assert.rejects(
      async () => generateCarousel(defaultRequest, { openai: mock }),
      (err: unknown) => {
        const e = err as ContentValidationError;
        assert.ok(e instanceof ContentValidationError);
        assert.match(e.message, /sequential/i);
        return true;
      },
    );
  });

  // =========================================================================
  // e) Slide count < 5 or > 8 rejection
  // =========================================================================
  await t.test('e.1) Rejects output with fewer than 5 slides (e.g. 3 slides)', async () => {
    const raw = makeValidPackage(3);
    const mock = createMockClient(async () => ({
      choices: [{ message: { parsed: raw, content: JSON.stringify(raw) } }],
    }));

    await assert.rejects(
      async () => generateCarousel(defaultRequest, { openai: mock }),
      (err: unknown) => {
        const e = err as ContentValidationError;
        assert.ok(e instanceof ContentValidationError);
        assert.ok(
          e.errors.some((d) => d.message.includes('5 slides') || d.path.includes('slides')),
        );
        return true;
      },
    );
  });

  await t.test('e.2) Rejects output with more than 8 slides (e.g. 9 slides)', async () => {
    const raw = makeValidPackage(9);
    const mock = createMockClient(async () => ({
      choices: [{ message: { parsed: raw, content: JSON.stringify(raw) } }],
    }));

    await assert.rejects(
      async () => generateCarousel(defaultRequest, { openai: mock }),
      (err: unknown) => {
        const e = err as ContentValidationError;
        assert.ok(e instanceof ContentValidationError);
        assert.ok(
          e.errors.some((d) => d.message.includes('8 slides') || d.path.includes('slides')),
        );
        return true;
      },
    );
  });

  // =========================================================================
  // f) Upstream HTTP 429 rate limit error
  // =========================================================================
  await t.test(
    'f) Catches HTTP 429 rate limit error and returns ContentGenerationError',
    async () => {
      const mock = createMockClient(async () => {
        const err = new Error('429 Rate limit reached for requests per min');
        (err as unknown as { status: number; code: string }).status = 429;
        (err as unknown as { status: number; code: string }).code = 'rate_limit_exceeded';
        throw err;
      });

      await assert.rejects(
        async () => generateCarousel(defaultRequest, { openai: mock }),
        (err: unknown) => {
          const e = err as ContentGenerationError;
          assert.ok(e instanceof ContentGenerationError);
          assert.equal(e.code, 'GENERATION_ERROR');
          assert.match(e.message, /rate limit/i);
          return true;
        },
      );
    },
  );

  // =========================================================================
  // g) Upstream network timeout error
  // =========================================================================
  await t.test('g) Catches network timeout error and returns UPSTREAM_TIMEOUT', async () => {
    const mock = createMockClient(async () => {
      const err = new Error('Request timed out after 30000ms');
      (err as unknown as { code: string }).code = 'ETIMEDOUT';
      throw err;
    });

    await assert.rejects(
      async () => generateCarousel(defaultRequest, { openai: mock }),
      (err: unknown) => {
        const e = err as ContentGenerationError;
        assert.ok(e instanceof ContentGenerationError);
        assert.equal(e.code, 'UPSTREAM_TIMEOUT');
        assert.equal(e.statusCode, 504);
        assert.match(e.message, /timed out/i);
        return true;
      },
    );
  });

  // =========================================================================
  // h) Zero secret leakage in all error instances
  // =========================================================================
  await t.test('h.1) Sanitizes OpenAI API key from error messages and details', async () => {
    const leakedKey = 'sk-proj-abc123def456ghi789jkl012mno345pqr';
    const mock = createMockClient(async () => {
      throw new Error(`Authentication failed with key: ${leakedKey}`);
    });

    await assert.rejects(
      async () => generateCarousel(defaultRequest, { openai: mock }),
      (err: unknown) => {
        const e = err as ContentGenerationError;
        assert.ok(e instanceof ContentGenerationError);
        assert.doesNotMatch(e.message, new RegExp(leakedKey, 'i'));
        assert.ok(e.message.includes('[REDACTED_API_KEY]'));
        if (e.stack) {
          assert.doesNotMatch(e.stack, new RegExp(leakedKey, 'i'));
        }
        return true;
      },
    );
  });

  await t.test('h.2) Sanitizes Bearer tokens, DB connection strings, and env variables', () => {
    const raw =
      'Failed connecting to postgresql://admin:secret123@db.supabase.co:5432 with OPENAI_API_KEY=sk-testkey1234567890123456789 and Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.doNotLeak';
    const sanitized = sanitizeSecrets(raw);

    assert.doesNotMatch(sanitized, /secret123/);
    assert.doesNotMatch(sanitized, /sk-testkey/);
    assert.doesNotMatch(sanitized, /eyJhbGci/);
    assert.ok(sanitized.includes('[REDACTED_DB_URL]'));
    assert.ok(sanitized.includes('OPENAI_API_KEY=[REDACTED]'));
    assert.ok(sanitized.includes('Bearer [REDACTED]'));
  });

  await t.test('h.3) Sanitizes nested details objects inside ContentValidationError', () => {
    const rawDetails = [
      {
        path: 'auth',
        message: 'Invalid key sk-proj-supersecretkey123456789',
      },
    ];

    const err = new ContentValidationError('Validation error occurred', rawDetails);
    assert.doesNotMatch(JSON.stringify(err.details), /supersecretkey/);
    assert.ok(JSON.stringify(err.details).includes('[REDACTED_API_KEY]'));
  });
});

test('Validator: Direct validateCarouselOutput Unit Verification', async (t) => {
  await t.test('accepts perfectly formatted 5-slide package', () => {
    const pkg = makeValidPackage(5);
    const validated = validateCarouselOutput(pkg);
    assert.equal(validated.slides.length, 5);
  });

  await t.test('throws ContentValidationError when input is not an object', () => {
    assert.throws(() => validateCarouselOutput(null), ContentValidationError);
    assert.throws(() => validateCarouselOutput('string input'), ContentValidationError);
    assert.throws(() => validateCarouselOutput(12345), ContentValidationError);
  });

  await t.test('throws ContentValidationError when slides array is missing', () => {
    const raw = makeValidPackage(6) as unknown as Record<string, unknown>;
    delete raw['slides'];
    assert.throws(() => validateCarouselOutput(raw), ContentValidationError);
  });
});

test('Client: createOpenAIClient Factory Unit Verification', async (t) => {
  await t.test('returns custom client if provided in options', () => {
    const custom = { custom: true };
    const client = createOpenAIClient({ client: custom });
    assert.equal(client, custom as unknown as OpenAI);
  });

  await t.test('instantiates client from string apiKey', () => {
    const client = createOpenAIClient('test-key-123');
    assert.ok(client);
    assert.equal(client.apiKey, 'test-key-123');
  });

  await t.test('instantiates client from options object with apiKey', () => {
    const client = createOpenAIClient({ apiKey: 'options-key-456' });
    assert.ok(client);
    assert.equal(client.apiKey, 'options-key-456');
  });
});
