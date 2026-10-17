import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { renderCarousel } from '../src/render.ts';
import { defaultResvgEngine } from '../src/engines/resvgEngine.ts';
import { explainerTemplate } from '../src/templates/explainer.ts';
import { comparisonTemplate } from '../src/templates/comparison.ts';
import { stepsTemplate } from '../src/templates/steps.ts';
import { statementTemplate } from '../src/templates/statement.ts';
import { diagramTemplate } from '../src/templates/diagram.ts';
import type { SlideRenderContext } from '../src/templates/types.ts';
import type { CarouselPackage } from '../../types/src/index.ts';

describe('Text Rendering Regression: SVG-Level Verification', () => {
  const testContext: SlideRenderContext = {
    slide: {
      slideNumber: 1,
      type: 'concept',
      headline: 'How DNS Actually Works',
      body: 'DNS translates human-readable domain names into machine-readable IP addresses in under 50 milliseconds.',
      visualSuggestion: 'Browser query -> Root Server -> TLD -> Authoritative Nameserver',
    },
    totalSlides: 6,
    topic: {
      title: 'How DNS Works',
      pillar: 'tech_explained',
    },
    hook: 'Ever wondered what happens between typing a URL and seeing the page load?',
    cta: 'Save this guide and follow @elevateweb for weekly architecture breakdowns.',
    caption: 'DNS is the backbone of the internet.',
    hashtags: ['#dns', '#networking', '#systems'],
  };

  it('explainerTemplate includes headline and body in SVG text elements', () => {
    const svg = explainerTemplate.render(testContext);

    assert.ok(svg.includes('<text'), 'SVG must contain <text> elements');
    assert.ok(svg.includes('<tspan'), 'SVG must contain <tspan> elements for wrapped lines');
    assert.ok(svg.includes('How DNS Actually Works'), 'SVG must contain the exact headline text');
    assert.ok(
      svg.includes('DNS translates human-readable domain names'),
      'SVG must contain the body text',
    );
    assert.ok(
      svg.includes('Outfit'),
      'SVG text elements must specify the brand font-family (Outfit)',
    );
  });

  it('all 5 templates generate non-empty text elements with valid styling', () => {
    const templates = [
      explainerTemplate,
      comparisonTemplate,
      stepsTemplate,
      statementTemplate,
      diagramTemplate,
    ];

    for (const template of templates) {
      const svg = template.render(testContext);
      assert.ok(
        svg.includes('How DNS Actually Works') ||
          svg.includes('HOW DNS ACTUALLY WORKS') ||
          svg.includes('HOW DNS') ||
          svg.includes('ACTUALLY WORKS'),
        `${template.name} SVG must contain the slide headline`,
      );
      assert.ok(svg.includes('Outfit'), `${template.name} must reference Outfit font`);
      assert.ok(svg.includes('ELEVATEWEB'), `${template.name} must render brand signature`);
    }
  });
});

describe('Text Rendering Regression: PNG-Level Text Visibility Proof', () => {
  it('rasterizer must produce distinct PNG buffers when text is present vs absent in minimal SVG', () => {
    // Under the previous bug, resvg had no fonts loaded in fontdb and silently dropped all <text> nodes.
    // If <text> is properly rasterized, an SVG with text will yield non-identical PNG bytes
    // compared to an SVG identical in every way except with text omitted.
    const svgWithText = `
      <svg width="1080" height="1350" viewBox="0 0 1080 1350" xmlns="http://www.w3.org/2000/svg">
        <rect width="1080" height="1350" fill="#0A0E17"/>
        <text x="100" y="300" font-family="Outfit" font-size="72" font-weight="700" fill="#FFFFFF">How DNS Actually Works</text>
        <text x="100" y="450" font-family="Outfit" font-size="28" font-weight="400" fill="#94A3B8">DNS translates human domain names to IP addresses.</text>
      </svg>
    `;

    const svgWithoutText = `
      <svg width="1080" height="1350" viewBox="0 0 1080 1350" xmlns="http://www.w3.org/2000/svg">
        <rect width="1080" height="1350" fill="#0A0E17"/>
      </svg>
    `;

    const pngWithText = defaultResvgEngine.renderSvgToPng(svgWithText);
    const pngWithoutText = defaultResvgEngine.renderSvgToPng(svgWithoutText);

    // 1. Buffers must differ
    assert.notDeepStrictEqual(
      pngWithText,
      pngWithoutText,
      'Rendered PNG with text MUST differ from PNG without text. If identical, text is not rasterizing!',
    );

    // 2. The PNG with text has drawn glyphs which increases entropy / byte differences
    assert.ok(
      Math.abs(pngWithText.length - pngWithoutText.length) > 500,
      `PNG size difference (${Math.abs(pngWithText.length - pngWithoutText.length)} bytes) must be substantial when text is drawn`,
    );
  });

  it('template SVG render with text differs from equivalent render with text elements removed', () => {
    const testContext: SlideRenderContext = {
      slide: {
        slideNumber: 1,
        type: 'concept',
        headline: 'How DNS Actually Works',
        body: 'DNS translates human-readable domain names into machine-readable IP addresses in under 50 milliseconds.',
        visualSuggestion: 'Browser address bar resolving to 192.0.2.1',
      },
      totalSlides: 6,
      topic: {
        title: 'How DNS Works',
        pillar: 'tech_explained',
      },
      hook: 'Ever wondered what happens between typing a URL and seeing the page load?',
      cta: 'Save this guide and follow @elevateweb for weekly architecture breakdowns.',
      caption: 'DNS is the backbone of the internet.',
      hashtags: ['#dns', '#networking'],
    };

    const templates = [
      explainerTemplate,
      comparisonTemplate,
      stepsTemplate,
      statementTemplate,
      diagramTemplate,
    ];

    for (const template of templates) {
      const fullSvg = template.render(testContext);

      // Equivalent render with all text elements stripped out
      const strippedSvg = fullSvg.replace(/<text[\s\S]*?<\/text>/g, '');

      const pngFull = defaultResvgEngine.renderSvgToPng(fullSvg);
      const pngStripped = defaultResvgEngine.renderSvgToPng(strippedSvg);

      // If text is visibly rendered by resvg, the PNG with text will have different byte contents
      // and larger size due to the complex text glyphs.
      assert.notDeepStrictEqual(
        pngFull,
        pngStripped,
        `${template.name}: PNG with text must differ from PNG with text removed`,
      );

      const sizeDiff = Math.abs(pngFull.length - pngStripped.length);
      assert.ok(
        sizeDiff > 500,
        `${template.name}: PNG size difference with text should be > 500 bytes (got ${sizeDiff})`,
      );
    }
  });

  it('full carousel render with distinctive text produces robust non-empty PNGs', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'elevate-reg-carousel-'));

    const packageWithText: CarouselPackage = {
      topic: {
        title: 'How DNS Actually Works',
        pillar: 'tech_explained',
      },
      hook: 'Ever wondered what happens between typing a URL and seeing the page load?',
      slides: [
        {
          slideNumber: 1,
          type: 'hook',
          headline: 'How DNS Actually Works in Real Systems',
          body: 'Resolving domain names in under 50 milliseconds across distributed nameservers.',
          visualSuggestion: 'Browser address bar resolving to 192.0.2.1',
        },
        {
          slideNumber: 2,
          type: 'concept',
          headline: 'Recursive Resolver Architecture',
          body: 'Your ISP queries root servers, TLD servers, and authoritative records.',
          visualSuggestion: 'Recursive resolver workflow',
        },
        {
          slideNumber: 3,
          type: 'comparison',
          headline: 'Authoritative vs Recursive DNS',
          body: 'Comparing authoritative storage vs recursive resolution cache.',
          visualSuggestion: 'Comparison table',
        },
        {
          slideNumber: 4,
          type: 'breakdown',
          headline: 'DNS Record Hierarchy',
          body: 'A, AAAA, CNAME, and MX record breakdowns.',
          visualSuggestion: 'Records table',
        },
        {
          slideNumber: 5,
          type: 'takeaway',
          headline: 'Core DNS Architecture Takeaways',
          body: 'Always understand caching TTLs and distributed fallback records.',
          visualSuggestion: 'ElevateWeb summary badge',
        },
      ],
      caption: 'DNS architecture guide',
      cta: 'Follow @elevateweb',
      hashtags: ['#dns', '#networking'],
      sources: ['RFC 1034'],
    };

    const result = await renderCarousel(packageWithText, { outputDir: tempDir });

    for (let i = 0; i < result.slides.length; i++) {
      const slideFile = result.slides[i]!.filePath;
      assert.ok(fs.existsSync(slideFile));
      const buf = fs.readFileSync(slideFile);
      assert.ok(buf.length > 20000, `Slide ${i + 1} PNG must be > 20KB`);
    }

    fs.rmSync(tempDir, { recursive: true, force: true });
  });
});
