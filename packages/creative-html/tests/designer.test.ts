import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { HtmlCreativeDesigner } from '../src/designer.ts';
import { verifyBundledFontsExist } from '../src/fonts.ts';
import type { CarouselPackage } from '../../types/src/index.ts';

const mockPackage = {
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
      type: 'code',
      headline: 'Querying DNS with Dig',
      body: 'Use dig command-line utility to trace DNS propagation.',
      visualSuggestion: 'Terminal trace',
      codeSnippet: {
        code: 'dig +trace elevateweb.io A',
        language: 'bash',
      },
    },
    {
      slideNumber: 5,
      type: 'takeaway',
      headline: 'DNS Powers Every Web Request',
      body: 'Without distributed caching and resilient records, the modern web halts.',
      visualSuggestion: 'ElevateWeb systems engineering badge',
    },
  ],
  caption: 'How DNS works in 5 steps.',
  cta: 'Save this guide and follow @elevateweb.',
  hashtags: ['#dns', '#networking', '#systems'],
  sources: ['RFC 1034'],
} as unknown as CarouselPackage;

describe('HtmlCreativeDesigner: Generation Contract & Brand Integrity', () => {
  it('verifies that all bundled font files exist in the repository', () => {
    const fontCheck = verifyBundledFontsExist();
    assert.strictEqual(
      fontCheck.loaded,
      true,
      `Missing bundled fonts: ${fontCheck.missing.join(', ')}`,
    );
  });

  it('generates a complete self-contained HTML document', async () => {
    const designer = new HtmlCreativeDesigner({ offline: true });
    const html = await designer.generateCarouselHtml(mockPackage);

    assert.ok(html.startsWith('<!doctype html>'), 'Must start with <!doctype html>');
    assert.ok(html.includes('<html'), 'Must contain <html> tag');
    assert.ok(html.includes('<head>'), 'Must contain <head> tag');
    assert.ok(html.includes('<body>'), 'Must contain <body> tag');
    assert.ok(html.endsWith('</html>'), 'Must end with </html>');
  });

  it('contains exactly 5 slides with class="slide" and 1080x1350 dimensions', async () => {
    const designer = new HtmlCreativeDesigner({ offline: true });
    const html = await designer.generateCarouselHtml(mockPackage);

    const slideMatches = html.match(/<section[^>]*class=["'][^"']*\bslide\b[^"']*["']/g) || [];
    assert.strictEqual(slideMatches.length, 5, 'Must contain exactly 5 slides');

    assert.ok(html.includes('1080px'), 'Must declare 1080px width');
    assert.ok(html.includes('1350px'), 'Must declare 1350px height');
    assert.ok(html.includes('overflow: hidden'), 'Must declare overflow: hidden on slide canvas');
  });

  it('embeds local @font-face rules with base64 data URIs for Outfit and Space Mono', async () => {
    const designer = new HtmlCreativeDesigner({ offline: true });
    const html = await designer.generateCarouselHtml(mockPackage);

    assert.ok(html.includes('@font-face'), 'Must contain @font-face declarations');
    assert.ok(html.includes("font-family: 'Outfit'"), 'Must include Outfit font-family');
    assert.ok(html.includes("font-family: 'Space Mono'"), 'Must include Space Mono font-family');
    assert.ok(
      html.includes('data:font/truetype;charset=utf-8;base64,'),
      'Must use base64 data URIs for fonts',
    );
    assert.ok(!html.includes('fonts.googleapis.com'), 'Must NOT depend on Google Fonts CDN');
  });

  it('inlines the authoritative ElevateWeb SVG logo and uses Outfit for brand wordmark', async () => {
    const designer = new HtmlCreativeDesigner({ offline: true });
    const html = await designer.generateCarouselHtml(mockPackage);

    assert.ok(html.includes('id="Layer_1"'), 'Must include authoritative ElevateWeb SVG mark');
    assert.ok(html.includes('ELEVATEWEB'), 'Must include ELEVATEWEB wordmark');
    assert.ok(html.includes("font-family:'Outfit'"), 'Brand wordmark must use Outfit font family');
  });

  it('preserves authoritative content without hallucination or copy alteration', async () => {
    const designer = new HtmlCreativeDesigner({ offline: true });
    const html = await designer.generateCarouselHtml(mockPackage);

    assert.ok(html.includes('What Actually Happens When You Type a URL?'));
    assert.ok(html.includes('The Recursive Resolver Lookup'));
    assert.ok(html.includes('Authoritative vs Recursive DNS'));
    assert.ok(html.includes('Querying DNS with Dig'));
    assert.ok(html.includes('DNS Powers Every Web Request'));
    assert.ok(html.includes('dig +trace elevateweb.io A'));
  });
});
