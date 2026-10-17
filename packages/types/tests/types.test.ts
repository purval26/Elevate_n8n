import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  GenerateContentRequestSchema,
  ContentPillarSchema,
  SlideSchema,
  SlideTypeSchema,
  CarouselTopicSchema,
  BaseCarouselPackageSchema,
  CarouselPackageSchema,
  StructuredApiErrorSchema,
  ApiErrorResponseSchema,
  ERROR_CODES,
  type TopicRecord,
  type PostRecord,
  type SlideRecord,
  type SourceRecord,
  type PostWithRelations,
} from '../src/index.ts';

describe('GenerateContentRequestSchema', () => {
  it('should accept a valid full request with all fields', () => {
    const input = {
      topic: 'How DNS works',
      pillar: 'tech_explained',
      tone: 'educational',
      slideCount: 7,
    };
    const parsed = GenerateContentRequestSchema.parse(input);
    assert.strictEqual(parsed.topic, 'How DNS works');
    assert.strictEqual(parsed.pillar, 'tech_explained');
    assert.strictEqual(parsed.tone, 'educational');
    assert.strictEqual(parsed.slideCount, 7);
  });

  it('should accept a valid minimal request and apply defaults', () => {
    const input = {
      topic: 'Database Indexing B-Trees',
      pillar: 'web_architecture',
    };
    const parsed = GenerateContentRequestSchema.parse(input);
    assert.strictEqual(parsed.topic, 'Database Indexing B-Trees');
    assert.strictEqual(parsed.pillar, 'web_architecture');
    assert.strictEqual(parsed.tone, 'educational');
    assert.strictEqual(parsed.slideCount, 6);
  });

  it('should trim whitespace from topic', () => {
    const input = {
      topic: '   Kafka Event Streaming   ',
      pillar: 'developer_tools',
    };
    const parsed = GenerateContentRequestSchema.parse(input);
    assert.strictEqual(parsed.topic, 'Kafka Event Streaming');
  });

  it('should reject missing topic', () => {
    const input = {
      pillar: 'tech_explained',
    };
    const result = GenerateContentRequestSchema.safeParse(input);
    assert.strictEqual(result.success, false);
    if (!result.success) {
      assert.ok(result.error.issues.some((i) => i.path.includes('topic')));
    }
  });

  it('should reject missing pillar', () => {
    const input = {
      topic: 'How TLS 1.3 works',
    };
    const result = GenerateContentRequestSchema.safeParse(input);
    assert.strictEqual(result.success, false);
    if (!result.success) {
      assert.ok(result.error.issues.some((i) => i.path.includes('pillar')));
    }
  });

  it('should reject topic shorter than 3 characters', () => {
    const input = {
      topic: 'AI',
      pillar: 'tech_explained',
    };
    const result = GenerateContentRequestSchema.safeParse(input);
    assert.strictEqual(result.success, false);
    if (!result.success) {
      assert.ok(result.error.issues.some((i) => i.message.includes('at least 3 characters')));
    }
  });

  it('should reject topic with only whitespace', () => {
    const input = {
      topic: '     ',
      pillar: 'tech_explained',
    };
    const result = GenerateContentRequestSchema.safeParse(input);
    assert.strictEqual(result.success, false);
  });

  it('should reject non-string topic', () => {
    const input = {
      topic: 12345,
      pillar: 'tech_explained',
    };
    const result = GenerateContentRequestSchema.safeParse(input);
    assert.strictEqual(result.success, false);
  });

  it('should reject slideCount below 5', () => {
    const input = {
      topic: 'WebSockets Explained',
      pillar: 'tech_explained',
      slideCount: 4,
    };
    const result = GenerateContentRequestSchema.safeParse(input);
    assert.strictEqual(result.success, false);
    if (!result.success) {
      assert.ok(result.error.issues.some((i) => i.message.includes('between 5 and 8')));
    }
  });

  it('should reject slideCount above 8', () => {
    const input = {
      topic: 'WebSockets Explained',
      pillar: 'tech_explained',
      slideCount: 9,
    };
    const result = GenerateContentRequestSchema.safeParse(input);
    assert.strictEqual(result.success, false);
    if (!result.success) {
      assert.ok(result.error.issues.some((i) => i.message.includes('between 5 and 8')));
    }
  });

  it('should reject non-integer slideCount', () => {
    const input = {
      topic: 'WebSockets Explained',
      pillar: 'tech_explained',
      slideCount: 6.5,
    };
    const result = GenerateContentRequestSchema.safeParse(input);
    assert.strictEqual(result.success, false);
    if (!result.success) {
      assert.ok(result.error.issues.some((i) => i.message.includes('integer')));
    }
  });

  it('should reject extra unrecognized keys in strict mode', () => {
    const input = {
      topic: 'GraphQL vs REST',
      pillar: 'web_architecture',
      unexpectedField: 'malicious_payload',
    };
    const result = GenerateContentRequestSchema.safeParse(input);
    assert.strictEqual(result.success, false);
    if (!result.success) {
      assert.ok(result.error.issues.some((i) => i.code === 'unrecognized_keys'));
    }
  });
});

describe('ContentPillarSchema', () => {
  it('should accept valid non-empty pillar string', () => {
    assert.strictEqual(ContentPillarSchema.parse('tech_explained'), 'tech_explained');
    assert.strictEqual(ContentPillarSchema.parse('performance'), 'performance');
  });

  it('should reject empty or whitespace pillar', () => {
    assert.strictEqual(ContentPillarSchema.safeParse('').success, false);
    assert.strictEqual(ContentPillarSchema.safeParse('   ').success, false);
  });
});

describe('CarouselTopicSchema', () => {
  it('should accept valid topic with title and pillar', () => {
    const topic = {
      title: 'How DNS Works',
      pillar: 'tech_explained',
    };
    const parsed = CarouselTopicSchema.parse(topic);
    assert.strictEqual(parsed.title, 'How DNS Works');
    assert.strictEqual(parsed.pillar, 'tech_explained');
  });

  it('should reject empty title', () => {
    const topic = {
      title: '',
      pillar: 'tech_explained',
    };
    assert.strictEqual(CarouselTopicSchema.safeParse(topic).success, false);
  });
});

describe('SlideSchema & SlideTypeSchema', () => {
  const validSlideTypes = [
    'hook',
    'problem',
    'concept',
    'code',
    'code_snippet',
    'breakdown',
    'architecture',
    'comparison',
    'takeaway',
    'cta',
  ] as const;

  for (const slideType of validSlideTypes) {
    it(`should accept valid slide type: ${slideType}`, () => {
      const parsed = SlideTypeSchema.parse(slideType);
      assert.strictEqual(parsed, slideType);
    });
  }

  it('should reject invalid slide type', () => {
    const result = SlideTypeSchema.safeParse('random_unsupported_type');
    assert.strictEqual(result.success, false);
  });

  it('should validate a complete slide', () => {
    const slide = {
      slideNumber: 1,
      type: 'hook',
      headline: 'The Hidden Cost of Microservices',
      body: 'Network latency, distributed tracing, and eventual consistency can derail your architecture.',
      visualSuggestion:
        'Architectural diagram showing 10 tangled service boxes with red latency arrows.',
    };
    const parsed = SlideSchema.parse(slide);
    assert.strictEqual(parsed.slideNumber, 1);
    assert.strictEqual(parsed.type, 'hook');
  });

  it('should reject slide missing visualSuggestion', () => {
    const slide = {
      slideNumber: 1,
      type: 'hook',
      headline: 'The Hidden Cost of Microservices',
      body: 'Network latency can derail architecture.',
    };
    const result = SlideSchema.safeParse(slide);
    assert.strictEqual(result.success, false);
    if (!result.success) {
      assert.ok(result.error.issues.some((i) => i.path.includes('visualSuggestion')));
    }
  });

  it('should reject slideNumber outside 1-8', () => {
    const slideZero = {
      slideNumber: 0,
      type: 'hook',
      headline: 'Title',
      body: 'Body text here',
      visualSuggestion: 'Visual idea',
    };
    assert.strictEqual(SlideSchema.safeParse(slideZero).success, false);

    const slideNine = {
      slideNumber: 9,
      type: 'hook',
      headline: 'Title',
      body: 'Body text here',
      visualSuggestion: 'Visual idea',
    };
    assert.strictEqual(SlideSchema.safeParse(slideNine).success, false);
  });
});

describe('CarouselPackageSchema', () => {
  const makeSampleSlides = (count: number) =>
    Array.from({ length: count }, (_, i) => ({
      slideNumber: i + 1,
      type: i === 0 ? 'hook' : i === count - 1 ? 'takeaway' : 'breakdown',
      headline: `Slide ${i + 1} Headline`,
      body: `Detailed educational body text for slide ${i + 1}.`,
      visualSuggestion: `Clear visual illustration for slide ${i + 1}.`,
    }));

  it('should validate a standard 5-slide carousel package', () => {
    const pkg = {
      topic: {
        title: 'How DNS Works',
        pillar: 'tech_explained',
      },
      hook: 'Ever wondered how your browser converts google.com to an IP address in under 50ms?',
      slides: makeSampleSlides(5),
      caption: 'DNS is the address book of the internet. Here is the 5-step resolution breakdown.',
      cta: 'Save this post and follow @ElevateWeb for weekly software architecture deep dives.',
      hashtags: ['#webdev', '#networking', '#softwareengineering', '#dns'],
      sources: ['https://www.rfc-editor.org/rfc/rfc1034', 'MDN Web Docs'],
    };

    const parsed = CarouselPackageSchema.parse(pkg);
    assert.strictEqual(parsed.slides.length, 5);
    assert.strictEqual(parsed.topic.title, 'How DNS Works');
    assert.strictEqual(parsed.sources.length, 2);
  });

  it('should validate an 8-slide carousel package with default empty sources', () => {
    const pkg = {
      topic: {
        title: 'PostgreSQL Indexing Deep Dive',
        pillar: 'performance',
      },
      hook: 'Sequential table scans are killing your query latency. Here is how B-Trees fix it.',
      slides: makeSampleSlides(8),
      caption: 'Indexes make reads lightning fast, but have write costs. Understand how they work.',
      cta: 'Follow @ElevateWeb for more database performance optimizations.',
      hashtags: ['#postgresql', '#database', '#performance', '#sql'],
      sources: [],
    };

    const parsed = CarouselPackageSchema.parse(pkg);
    assert.strictEqual(parsed.slides.length, 8);
    assert.deepStrictEqual(parsed.sources, []);
  });

  it('should reject carousel with fewer than 5 slides', () => {
    const pkg = {
      topic: { title: 'Quick Topic', pillar: 'tech_explained' },
      hook: 'Short hook over 5 chars',
      slides: makeSampleSlides(4),
      caption: 'A caption that is long enough for the validation requirement.',
      cta: 'Follow @ElevateWeb',
      hashtags: ['#tech'],
      sources: [],
    };

    const result = CarouselPackageSchema.safeParse(pkg);
    assert.strictEqual(result.success, false);
    if (!result.success) {
      assert.ok(result.error.issues.some((i) => i.message.includes('at least 5 slides')));
    }
  });

  it('should reject carousel with more than 8 slides', () => {
    const pkg = {
      topic: { title: 'Long Topic', pillar: 'tech_explained' },
      hook: 'Compelling hook that is descriptive enough',
      slides: makeSampleSlides(9),
      caption: 'A caption that is long enough for the validation requirement.',
      cta: 'Follow @ElevateWeb',
      hashtags: ['#tech'],
      sources: [],
    };

    const result = CarouselPackageSchema.safeParse(pkg);
    assert.strictEqual(result.success, false);
    if (!result.success) {
      assert.ok(result.error.issues.some((i) => i.message.includes('not exceed 8 slides')));
    }
  });

  it('should reject carousel with non-sequential slide numbers', () => {
    const slides = makeSampleSlides(5);
    // Introduce non-sequential numbering: [1, 3, 2, 4, 5]
    slides[1]!.slideNumber = 3;
    slides[2]!.slideNumber = 2;

    const pkg = {
      topic: { title: 'DNS', pillar: 'tech_explained' },
      hook: 'Compelling hook that is descriptive enough',
      slides,
      caption: 'A caption that is long enough for the validation requirement.',
      cta: 'Follow @ElevateWeb',
      hashtags: ['#dns'],
      sources: [],
    };

    const result = CarouselPackageSchema.safeParse(pkg);
    assert.strictEqual(result.success, false);
    if (!result.success) {
      assert.ok(result.error.issues.some((i) => i.message.includes('strictly sequential')));
    }
  });

  it('should allow BaseCarouselPackageSchema to parse without sequential refinement', () => {
    const slides = makeSampleSlides(5);
    slides[1]!.slideNumber = 3;
    slides[2]!.slideNumber = 2;

    const pkg = {
      topic: { title: 'DNS', pillar: 'tech_explained' },
      hook: 'Compelling hook that is descriptive enough',
      slides,
      caption: 'A caption that is long enough for the validation requirement.',
      cta: 'Follow @ElevateWeb',
      hashtags: ['#dns'],
      sources: [],
    };

    const result = BaseCarouselPackageSchema.safeParse(pkg);
    assert.strictEqual(result.success, true);
  });
});

describe('ApiErrorResponseSchema & StructuredApiErrorSchema', () => {
  it('should validate structured API error envelope', () => {
    const structuredError = {
      error: {
        code: ERROR_CODES.VALIDATION_ERROR,
        message: 'Invalid request payload',
        details: [
          {
            path: 'topic',
            message: 'Topic must be at least 3 characters',
            code: 'too_small',
          },
        ],
      },
    };

    const parsedStructured = StructuredApiErrorSchema.parse(structuredError);
    assert.strictEqual(parsedStructured.error.code, 'VALIDATION_ERROR');
    assert.strictEqual(parsedStructured.error.details?.length, 1);

    const parsedResponse = ApiErrorResponseSchema.parse(structuredError);
    assert.ok(typeof parsedResponse.error === 'object');
  });

  it('should validate standard Fastify HTTP error response', () => {
    const httpError = {
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Database persistence failed',
    };

    const parsed = ApiErrorResponseSchema.parse(httpError);
    assert.strictEqual(parsed.statusCode, 500);
    assert.strictEqual(parsed.error, 'Internal Server Error');
    assert.strictEqual(parsed.message, 'Database persistence failed');
  });
});

describe('Database Interfaces Compile-Time & Runtime Verification', () => {
  it('should correctly shape TopicRecord and PostWithRelations objects', () => {
    const sampleTopic: TopicRecord = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      title: 'How DNS Works',
      pillar: 'tech_explained',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const samplePost: PostRecord = {
      id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      topic_id: sampleTopic.id,
      hook: 'Ever wondered how DNS works?',
      caption: 'Complete breakdown of DNS resolution.',
      cta: 'Follow @ElevateWeb',
      hashtags: ['#dns', '#networking'],
      tone: 'educational',
      slide_count: 5,
      status: 'generated',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const sampleSlide: SlideRecord = {
      id: '6ba7b811-9dad-11d1-80b4-00c04fd430c8',
      post_id: samplePost.id,
      slide_number: 1,
      type: 'hook',
      headline: 'How DNS Resolves Domains',
      body: 'Every domain translates to an IP address.',
      visual_suggestion: 'Browser address bar resolving to IP',
      created_at: new Date().toISOString(),
    };

    const sampleSource: SourceRecord = {
      id: '6ba7b812-9dad-11d1-80b4-00c04fd430c8',
      post_id: samplePost.id,
      url: 'https://www.rfc-editor.org/rfc/rfc1034',
      source_text: 'RFC 1034: Domain Names',
      created_at: new Date().toISOString(),
    };

    const postWithRelations: PostWithRelations = {
      ...samplePost,
      topic: sampleTopic,
      slides: [sampleSlide],
      sources: [sampleSource],
    };

    assert.strictEqual(postWithRelations.topic?.id, sampleTopic.id);
    assert.strictEqual(postWithRelations.slides.length, 1);
    assert.strictEqual(postWithRelations.sources.length, 1);
  });
});
