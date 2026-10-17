import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { explainerTemplate } from '../src/templates/explainer.ts';
import { comparisonTemplate } from '../src/templates/comparison.ts';
import { stepsTemplate } from '../src/templates/steps.ts';
import { statementTemplate } from '../src/templates/statement.ts';
import { diagramTemplate } from '../src/templates/diagram.ts';
import type { SlideRenderContext } from '../src/templates/types.ts';

const baseContext: SlideRenderContext = {
  slide: {
    slideNumber: 1,
    type: 'concept',
    headline: 'Understanding Event Loops in Node.js',
    body: 'The Node.js event loop coordinates non-blocking I/O operations using libuv phases.',
    visualSuggestion: 'libuv phases -> timers -> I/O polling -> check -> close',
  },
  totalSlides: 6,
  topic: {
    title: 'Node.js Runtime Internals',
    pillar: 'web_architecture',
  },
  hook: 'Ever wondered how Node handles thousands of concurrent requests on a single thread?',
  cta: 'Follow @elevateweb for more backend deep dives.',
  caption: 'Here is how the Node.js event loop actually works.',
  hashtags: ['#nodejs', '#javascript', '#backend'],
};

describe('Slide Templates: Structural Output', () => {
  const templates = [
    explainerTemplate,
    comparisonTemplate,
    stepsTemplate,
    statementTemplate,
    diagramTemplate,
  ];

  for (const template of templates) {
    it(`should render valid 1080x1350 SVG for ${template.name} template`, () => {
      const svg = template.render(baseContext);

      // SVG header and dimensions
      assert.ok(svg.includes('<svg width="1080" height="1350"'));
      assert.ok(svg.includes('viewBox="0 0 1080 1350"'));
      assert.ok(svg.includes('xmlns="http://www.w3.org/2000/svg"'));

      // Branding and footer
      assert.ok(svg.includes('ELEVATEWEB'));
      assert.ok(svg.includes('01 / 06'));
      assert.ok(svg.includes('</svg>'));
    });
  }
});

describe('Slide Templates: Edge Cases & Layout Safety', () => {
  it('explainerTemplate should handle empty visualSuggestion gracefully', () => {
    const context: SlideRenderContext = {
      ...baseContext,
      slide: {
        ...baseContext.slide,
        visualSuggestion: '',
      },
    };
    const svg = explainerTemplate.render(context);
    assert.ok(svg.includes('<svg'));
    assert.ok(svg.includes('</svg>'));
  });

  it('comparisonTemplate should parse "A vs B" headline into columns', () => {
    const context: SlideRenderContext = {
      ...baseContext,
      slide: {
        slideNumber: 2,
        type: 'comparison',
        headline: 'Server-Side Rendering vs Static Site Generation',
        body: 'SSR dynamically generates HTML per request. SSG builds static pages ahead of time.',
        visualSuggestion: 'SSR delivers fresh data; SSG delivers peak CDN speed.',
      },
    };
    const svg = comparisonTemplate.render(context);
    assert.ok(svg.includes('SERVER-SIDE RENDERING'));
    assert.ok(svg.includes('STATIC SITE GENERATION'));
    assert.ok(svg.includes('KEY VERDICT &amp; TRADEOFF'));
  });

  it('comparisonTemplate should fallback gracefully when headline has no "vs"', () => {
    const context: SlideRenderContext = {
      ...baseContext,
      slide: {
        slideNumber: 2,
        type: 'comparison',
        headline: 'Evaluating Authentication Tradeoffs',
        body: 'JWTs are stateless but hard to revoke. Cookies require server sessions.',
        visualSuggestion: 'Session tokens vs signed JWT claims.',
      },
    };
    const svg = comparisonTemplate.render(context);
    assert.ok(svg.includes('OPTION A'));
    assert.ok(svg.includes('OPTION B'));
  });

  it('stepsTemplate should render step progress indicator and current step pill', () => {
    const context: SlideRenderContext = {
      ...baseContext,
      slide: {
        slideNumber: 3,
        type: 'breakdown',
        headline: 'Step 3: TLS 1.3 Handshake',
        body: 'Client and server agree on cryptographic keys in a single roundtrip.',
        visualSuggestion: 'ClientHello + KeyShare -> ServerHello + Finished',
      },
    };
    const svg = stepsTemplate.render(context);
    assert.ok(svg.includes('STEP 03'));
    assert.ok(svg.includes('EXECUTION FLOW • PHASE 03'));
  });

  it('diagramTemplate should parse arrows in visualSuggestion into diagram stages', () => {
    const context: SlideRenderContext = {
      ...baseContext,
      slide: {
        slideNumber: 4,
        type: 'architecture',
        headline: 'Edge Proxy Request Flow',
        body: 'Requests are routed through Cloudflare edge to origin servers.',
        visualSuggestion: 'Client Browser -> Edge CDN -> Reverse Proxy -> Origin DB',
      },
    };
    const svg = diagramTemplate.render(context);
    assert.ok(svg.includes('STAGE 01'));
    assert.ok(svg.includes('STAGE 02'));
    assert.ok(svg.includes('STAGE 03'));
    assert.ok(svg.includes('SYSTEM ARCHITECTURE FLOW'));
  });

  it('statementTemplate should render bold headline and brand seal', () => {
    const context: SlideRenderContext = {
      ...baseContext,
      slide: {
        slideNumber: 1,
        type: 'hook',
        headline: 'Architecture Is About Tradeoffs, Not Best Practices.',
        body: 'Every technical choice sacrifices something: latency, complexity, or cost.',
        visualSuggestion: 'ElevateWeb architectural core principle.',
      },
    };
    const svg = statementTemplate.render(context);
    assert.ok(svg.includes('THE HOOK'));
    assert.ok(svg.includes('Architecture Is About'));
    assert.ok(svg.includes('Tradeoffs, Not Best Practices.'));
    assert.ok(svg.includes('ElevateWeb'));
  });

  it('should safely escape XML in user content to prevent malformed SVG', () => {
    const context: SlideRenderContext = {
      ...baseContext,
      slide: {
        slideNumber: 1,
        type: 'hook',
        headline: 'Handling <T> & "Generic" Types with &amp; Operators',
        body: 'In TypeScript, generics <T> allow writing type-safe code without <script> alerts.',
        visualSuggestion: 'Compiler <T extends object> check & verify',
      },
    };
    const svg = statementTemplate.render(context);
    assert.ok(!svg.includes('<script>'));
    assert.ok(svg.includes('&lt;T&gt;'));
    assert.ok(svg.includes('&amp;'));
  });

  it('should support CJK and accented characters across templates', () => {
    const context: SlideRenderContext = {
      ...baseContext,
      slide: {
        slideNumber: 2,
        type: 'concept',
        headline: '国際化とアーキテクチャ: CJK Unicode Support',
        body: 'Global systems must handle 한국어, 日本語, and 中文 without font clipping or buffer overflows.',
        visualSuggestion: 'UTF-8 multibyte encoding -> 4 bytes per codepoint',
      },
    };
    const svg = explainerTemplate.render(context);
    assert.ok(svg.includes('国際化とアーキテクチャ'));
    assert.ok(svg.includes('한국어'));
    assert.ok(svg.includes('日本語'));
    assert.ok(svg.includes('中文'));
  });
});
