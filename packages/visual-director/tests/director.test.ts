import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { VisualDirector, directCarouselVisuals } from '../src/director.ts';
import {
  CarouselVisualSpecificationSchema,
  VisualStrategySchema,
  CompositionSchema,
  type CarouselPackage,
} from '../src/schema.ts';

const testPackage: CarouselPackage = {
  topic: {
    title: 'How DNS Works',
    pillar: 'web_architecture',
  },
  hook: 'What actually happens when you type google.com?',
  slides: [
    {
      slideNumber: 1,
      type: 'hook',
      headline: 'The Internet’s Phonebook Explained',
      body: 'DNS translates human-readable domain names into machine-readable IP addresses in under 50ms.',
      visualSuggestion: 'Browser address bar resolving to 192.0.2.1',
    },
    {
      slideNumber: 2,
      type: 'concept',
      headline: 'The Recursive Resolver Lookup',
      body: 'Your ISP queries root servers, TLD servers, and authoritative records.',
      visualSuggestion: 'Browser -> DNS Resolver -> Root Server',
    },
    {
      slideNumber: 3,
      type: 'comparison',
      headline: 'Authoritative vs Recursive DNS',
      body: 'Recursive resolvers hunt down answers while authoritative servers hold canonical truth.',
      visualSuggestion: 'Resolver cache vs Name server records',
    },
    {
      slideNumber: 4,
      type: 'architecture',
      headline: 'Hierarchical Server Chain',
      body: 'Resolution traverses Root (.) to TLD (.com) to Authoritative nameservers.',
      visualSuggestion: 'Hierarchy tree with 13 root clusters',
    },
    {
      slideNumber: 5,
      type: 'breakdown',
      headline: 'Record Types: A, CNAME, & MX',
      body: 'A records map IPv4, AAAA to IPv6, CNAME creates aliases, and MX routes mail.',
      visualSuggestion: 'Zone file syntax breakdown',
    },
    {
      slideNumber: 6,
      type: 'takeaway',
      headline: 'DNS Powers Every Web Request',
      body: 'Without caching and distributed nameservers, the modern internet could not scale.',
      visualSuggestion: 'ElevateWeb architectural badge',
    },
  ],
  caption: 'How DNS works in 6 steps',
  cta: 'Follow @elevateweb',
  hashtags: ['#dns', '#networking'],
  sources: ['RFC 1034'],
};

describe('Visual Director: Schema & Strategy Validation', () => {
  it('should validate allowed visual strategies', () => {
    assert.doesNotThrow(() => VisualStrategySchema.parse('illustration'));
    assert.doesNotThrow(() => VisualStrategySchema.parse('conceptual-metaphor'));
    assert.doesNotThrow(() => VisualStrategySchema.parse('technical-diagram'));
    assert.doesNotThrow(() => VisualStrategySchema.parse('big-type'));

    assert.throws(() => VisualStrategySchema.parse('unsupported-random-strategy'));
  });

  it('should validate allowed composition primitives', () => {
    assert.doesNotThrow(() => CompositionSchema.parse('centered-hero'));
    assert.doesNotThrow(() => CompositionSchema.parse('hero-right'));
    assert.doesNotThrow(() => CompositionSchema.parse('split-50'));
    assert.doesNotThrow(() => CompositionSchema.parse('big-type'));
    assert.doesNotThrow(() => CompositionSchema.parse('process-flow'));

    assert.throws(() => CompositionSchema.parse('unsupported-composition'));
  });

  it('should direct carousel visuals and return validated specification', async () => {
    const director = new VisualDirector({ offline: true });
    const spec = await director.direct(testPackage);

    const validation = CarouselVisualSpecificationSchema.safeParse(spec);
    assert.ok(
      validation.success,
      'Generated spec must strictly validate against CarouselVisualSpecificationSchema',
    );

    assert.strictEqual(spec.slides.length, 6);
    assert.strictEqual(spec.topic.title, 'How DNS Works');
  });

  it('should create visual variety across slides in the same carousel', async () => {
    const spec = await directCarouselVisuals(testPackage, { offline: true });

    const strategies = spec.slides.map((s) => s.visualStrategy);
    const compositions = spec.slides.map((s) => s.composition);

    // Enforce that not all slides have the same strategy/composition
    const uniqueStrategies = new Set(strategies);
    const uniqueCompositions = new Set(compositions);

    assert.ok(
      uniqueStrategies.size >= 3,
      `Carousel should demonstrate visual strategy variety (got ${uniqueStrategies.size} unique)`,
    );
    assert.ok(
      uniqueCompositions.size >= 3,
      `Carousel should demonstrate composition variety (got ${uniqueCompositions.size} unique)`,
    );

    // Slide 1 must be big-type for hook impact
    assert.strictEqual(spec.slides[0]!.composition, 'big-type');

    // Slide 2 (concept) should require conceptual illustration
    assert.strictEqual(spec.slides[1]!.illustration?.required, true);

    // Slide 6 (takeaway) should have takeaway composition
    assert.strictEqual(spec.slides[5]!.composition, 'takeaway');
  });

  it('should preserve original content without rewriting facts', async () => {
    const spec = await directCarouselVisuals(testPackage, { offline: true });

    for (let i = 0; i < testPackage.slides.length; i++) {
      const origSlide = testPackage.slides[i]!;
      const slideSpec = spec.slides[i]!;

      const headlineElem = slideSpec.elements.find((e) => e.type === 'headline');
      const bodyElem = slideSpec.elements.find((e) => e.type === 'body');

      assert.ok(headlineElem, `Slide ${i + 1} must retain headline element`);
      assert.strictEqual(headlineElem.text, origSlide.headline);

      assert.ok(bodyElem, `Slide ${i + 1} must retain body element`);
      assert.strictEqual(bodyElem.text, origSlide.body);
    }
  });

  it('directAndPrepare should prepare illustrations and map assets to slides', async () => {
    const director = new VisualDirector({ offline: true });
    const prepared = await director.directAndPrepare(testPackage);

    assert.ok(prepared.specification);
    assert.ok(prepared.assets instanceof Map);

    // At least one slide requested an illustration
    const illustratedSlide = prepared.specification.slides.find((s) => s.illustration?.required);
    assert.ok(illustratedSlide, 'At least one slide should require an illustration');

    const asset = prepared.assets.get(illustratedSlide.slideNumber);
    assert.ok(asset, `Asset for slide ${illustratedSlide.slideNumber} must be present`);
    assert.ok(asset.width > 0);
    assert.ok(asset.height > 0);
    assert.ok(asset.dataUri?.startsWith('data:image/svg+xml;base64,'));
  });
});
