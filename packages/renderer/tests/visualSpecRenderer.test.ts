import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { renderVisualSpecToSvg } from '../src/visualSpecRenderer.ts';
import { renderAiCarousel } from '../src/render.ts';
import type { SlideRenderContext } from '../src/templates/types.ts';
import type {
  SlideVisualSpecification,
  IllustrationAsset,
  CarouselPackage,
} from '../../types/src/index.ts';

const mockContext: SlideRenderContext = {
  slide: {
    slideNumber: 2,
    type: 'concept',
    headline: 'The Recursive Resolver Lookup',
    body: 'Your ISP or local recursive resolver checks cache before querying root servers.',
    visualSuggestion: 'Browser -> Resolver -> Root Nameserver',
  },
  totalSlides: 6,
  topic: {
    title: 'How DNS Works',
    pillar: 'web_architecture',
  },
  hook: 'What actually happens when you type google.com?',
  cta: 'Follow @elevateweb',
  caption: 'DNS resolution in 6 steps',
  hashtags: ['#dns', '#networking'],
};

const mockAsset: IllustrationAsset = {
  id: 'resolver-ill',
  path: '/tmp/resolver.svg',
  mimeType: 'image/svg+xml',
  width: 800,
  height: 800,
  dataUri: `data:image/svg+xml;base64,${Buffer.from('<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="40" fill="#2563EB"/></svg>').toString('base64')}`,
};

describe('VisualSpecRenderer: Composition Primitives', () => {
  it('should render hero-right composition with embedded illustration', () => {
    const spec: SlideVisualSpecification = {
      slideNumber: 2,
      visualStrategy: 'conceptual-metaphor',
      composition: 'hero-right',
      background: 'dark',
      accent: 'primary-blue',
      elements: [
        { type: 'eyebrow', text: 'WEB ARCHITECTURE' },
        { type: 'headline', text: mockContext.slide.headline },
        { type: 'body', text: mockContext.slide.body },
        { type: 'callout', label: 'METAPHOR', text: 'Phonebook routing' },
      ],
      fallbackTemplate: 'explainer',
    };

    const svg = renderVisualSpecToSvg(mockContext, spec, {
      illustrationAsset: mockAsset,
    });

    assert.ok(svg.includes('<svg width="1080" height="1350"'));
    assert.ok(svg.includes('Recursive'));
    assert.ok(svg.includes('Resolver'));
    assert.ok(svg.includes('Your ISP') && svg.includes('resolver'));
    assert.ok(svg.includes('<image href="data:image/svg+xml;base64,'));
    assert.ok(svg.includes('CONCEPTUAL METAPHOR'));
    assert.ok(svg.includes('Phonebook routing'));
  });

  it('should render centered-hero composition with full-width illustration', () => {
    const spec: SlideVisualSpecification = {
      slideNumber: 2,
      visualStrategy: 'illustration',
      composition: 'centered-hero',
      background: 'dark',
      accent: 'primary-blue',
      elements: [
        { type: 'headline', text: mockContext.slide.headline },
        { type: 'body', text: mockContext.slide.body },
      ],
      fallbackTemplate: 'explainer',
    };

    const svg = renderVisualSpecToSvg(mockContext, spec, {
      illustrationAsset: mockAsset,
    });

    assert.ok(svg.includes('<svg'));
    assert.ok(svg.includes('The Recursive Resolver Lookup'));
    assert.ok(svg.includes('<image href="data:image/svg+xml;base64,'));
  });

  it('should render big-type composition with hook accent lines', () => {
    const spec: SlideVisualSpecification = {
      slideNumber: 1,
      visualStrategy: 'big-type',
      composition: 'big-type',
      background: 'dark',
      accent: 'accent-cyan',
      elements: [
        { type: 'headline', text: 'What Happens When You Type google.com?' },
        { type: 'body', text: 'The 50ms journey behind modern web browsing.' },
      ],
      fallbackTemplate: 'statement',
    };

    const svg = renderVisualSpecToSvg(mockContext, spec);

    assert.ok(svg.includes('THE CORE HOOK'));
    assert.ok(svg.includes('What Happens'));
    assert.ok(svg.includes('google.com'));
  });

  it('should render process-flow composition with sequential execution nodes', () => {
    const spec: SlideVisualSpecification = {
      slideNumber: 4,
      visualStrategy: 'process',
      composition: 'process-flow',
      background: 'dark',
      accent: 'primary-blue',
      elements: [
        { type: 'headline', text: 'Hierarchical Server Chain' },
        { type: 'body', text: 'Root to TLD to Authoritative nameservers.' },
      ],
      fallbackTemplate: 'steps',
    };

    const svg = renderVisualSpecToSvg(mockContext, spec);

    assert.ok(svg.includes('EXECUTION ARCHITECTURE'));
    assert.ok(svg.includes('01'));
    assert.ok(svg.includes('02'));
    assert.ok(svg.includes('03'));
  });

  it('should render takeaway composition with success badge', () => {
    const spec: SlideVisualSpecification = {
      slideNumber: 6,
      visualStrategy: 'editorial',
      composition: 'takeaway',
      background: 'dark',
      accent: 'green',
      elements: [
        { type: 'headline', text: 'DNS Powers Every Web Request' },
        { type: 'body', text: 'Understand caching TTLs and distributed fallback records.' },
      ],
      fallbackTemplate: 'statement',
    };

    const svg = renderVisualSpecToSvg(mockContext, spec);

    assert.ok(svg.includes('KEY ENGINEERING TAKEAWAY'));
    assert.ok(svg.includes('CORE PRINCIPLE'));
    assert.ok(svg.includes('ElevateWeb • Verified System Architecture'));
  });
});

describe('AI Carousel End-to-End Pipeline: renderAiCarousel', () => {
  const samplePackage: CarouselPackage = {
    topic: {
      title: 'How DNS Actually Works',
      pillar: 'web_architecture',
    },
    hook: 'What happens in the 50ms between hitting Enter and loading the page?',
    slides: [
      {
        slideNumber: 1,
        type: 'hook',
        headline: 'What Actually Happens When You Type a URL?',
        body: 'Your browser executes a multi-tier cryptographic and DNS handshake before a single byte of HTML arrives.',
        visualSuggestion: 'Browser address bar entering google.com',
      },
      {
        slideNumber: 2,
        type: 'concept',
        headline: 'The Recursive Resolver Lookup',
        body: 'The ISP recursive resolver queries Root, TLD, and Authoritative nameservers in a strict hierarchy.',
        visualSuggestion: 'Client query -> Resolver -> Root server cluster',
      },
      {
        slideNumber: 3,
        type: 'comparison',
        headline: 'Authoritative vs Recursive DNS',
        body: 'Recursive resolvers hunt down records while Authoritative servers hold canonical DNS truth.',
        visualSuggestion: 'Comparison of query workflow vs definitive records',
      },
      {
        slideNumber: 4,
        type: 'breakdown',
        headline: 'Record Types: A, CNAME, & MX',
        body: 'A records map IPv4, AAAA to IPv6, CNAME to canonical aliases, and MX routes mail.',
        visualSuggestion: 'DNS zone file records table',
      },
      {
        slideNumber: 5,
        type: 'takeaway',
        headline: 'DNS Powers Every Web Request',
        body: 'Without caching and distributed nameservers, the modern internet could not scale.',
        visualSuggestion: 'ElevateWeb systems engineering badge',
      },
    ],
    caption: 'How DNS works in 5 steps.',
    cta: 'Save this guide and follow @elevateweb.',
    hashtags: ['#dns', '#networking', '#systems'],
    sources: ['RFC 1034'],
  };

  it('renders all slides to 1080x1350 PNG files with visual-spec.json', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'elevate-ai-render-'));

    const result = await renderAiCarousel(samplePackage, {
      outputDir: tempDir,
      offline: true,
      saveVisualSpec: true,
    });

    assert.strictEqual(result.totalSlides, 5);
    assert.strictEqual(result.slides.length, 5);

    // Verify visual-spec.json was saved
    const specFile = path.join(tempDir, 'visual-spec.json');
    assert.ok(fs.existsSync(specFile), 'visual-spec.json must be written to output directory');

    // Verify all slides rendered as valid 1080x1350 PNGs
    for (const slide of result.slides) {
      assert.ok(fs.existsSync(slide.filePath), `File exists: ${slide.filePath}`);
      assert.strictEqual(slide.width, 1080);
      assert.strictEqual(slide.height, 1350);

      const buf = fs.readFileSync(slide.filePath);
      assert.ok(buf.length > 20000, `Slide ${slide.slideNumber} PNG must be > 20KB`);

      // Verify PNG Magic Bytes
      const pngMagic = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
      for (let i = 0; i < pngMagic.length; i++) {
        assert.strictEqual(buf[i], pngMagic[i]);
      }
    }

    // Verify variety in compositions
    const compositions = result.slides.map((s) => s.composition);
    const uniqueCompositions = new Set(compositions);
    assert.ok(
      uniqueCompositions.size >= 3,
      `Output must demonstrate visual composition variety (got ${uniqueCompositions.size} unique compositions)`,
    );

    fs.rmSync(tempDir, { recursive: true, force: true });
  });
});
