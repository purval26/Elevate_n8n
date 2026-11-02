import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateCarouselHtml } from '../src/validator.ts';
import { HtmlCreativeDesigner } from '../src/designer.ts';
import type { CarouselPackage } from '../../types/src/index.ts';

const mockPackage: CarouselPackage = {
  topic: {
    title: 'How DNS Works',
    pillar: 'web_architecture',
  },
  hook: 'How DNS works',
  slides: [
    { slideNumber: 1, type: 'hook', headline: 'H1', body: 'B1', visualSuggestion: 'V1' },
    { slideNumber: 2, type: 'concept', headline: 'H2', body: 'B2', visualSuggestion: 'V2' },
    { slideNumber: 3, type: 'breakdown', headline: 'H3', body: 'B3', visualSuggestion: 'V3' },
    { slideNumber: 4, type: 'architecture', headline: 'H4', body: 'B4', visualSuggestion: 'V4' },
    { slideNumber: 5, type: 'takeaway', headline: 'H5', body: 'B5', visualSuggestion: 'V5' },
  ],
  caption: 'Caption',
  cta: 'CTA',
  hashtags: ['#dns'],
  sources: ['RFC 1034'],
};

describe('HtmlValidator: Security, Safety & Structure', () => {
  it('accepts a valid designer-generated HTML document', async () => {
    const designer = new HtmlCreativeDesigner({ offline: true });
    const html = await designer.generateCarouselHtml(mockPackage);

    const result = validateCarouselHtml(html);
    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.errors.length, 0);
    assert.strictEqual(result.slideCount, 5);
    assert.strictEqual(result.hasScripts, false);
    assert.strictEqual(result.hasExternalDeps, false);
  });

  it('rejects empty or whitespace-only HTML', () => {
    const result = validateCarouselHtml('   ');
    assert.strictEqual(result.valid, false);
    assert.ok(result.errors[0]?.includes('empty'));
  });

  it('rejects HTML containing <script> tags', () => {
    const dangerousHtml = `
      <!doctype html><html><head><script>alert("exploit")</script></head>
      <body>
        <section class="slide" data-slide="1">S1</section>
        <section class="slide" data-slide="2">S2</section>
        <section class="slide" data-slide="3">S3</section>
        <section class="slide" data-slide="4">S4</section>
        <section class="slide" data-slide="5">S5</section>
      </body></html>
    `;
    const result = validateCarouselHtml(dangerousHtml);
    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.hasScripts, true);
    assert.ok(result.errors.some((e) => e.includes('<script> tags are strictly prohibited')));
  });

  it('rejects inline DOM event handlers (e.g. onclick, onerror)', () => {
    const dangerousHtml = `
      <!doctype html><html><head></head>
      <body>
        <section class="slide" data-slide="1"><img src="x" onerror="alert(1)" /></section>
        <section class="slide" data-slide="2">S2</section>
        <section class="slide" data-slide="3">S3</section>
        <section class="slide" data-slide="4">S4</section>
        <section class="slide" data-slide="5">S5</section>
      </body></html>
    `;
    const result = validateCarouselHtml(dangerousHtml);
    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.hasScripts, true);
    assert.ok(result.errors.some((e) => e.includes('Inline DOM event handlers')));
  });

  it('rejects javascript: URIs', () => {
    const dangerousHtml = `
      <!doctype html><html><head></head>
      <body>
        <section class="slide" data-slide="1"><a href="javascript:alert(1)">Click</a></section>
        <section class="slide" data-slide="2">S2</section>
        <section class="slide" data-slide="3">S3</section>
        <section class="slide" data-slide="4">S4</section>
        <section class="slide" data-slide="5">S5</section>
      </body></html>
    `;
    const result = validateCarouselHtml(dangerousHtml);
    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.hasScripts, true);
    assert.ok(result.errors.some((e) => e.includes('javascript: URIs are prohibited')));
  });

  it('rejects external network stylesheet dependencies', () => {
    const externalHtml = `
      <!doctype html><html><head>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto">
      </head>
      <body>
        <section class="slide" data-slide="1">S1</section>
        <section class="slide" data-slide="2">S2</section>
        <section class="slide" data-slide="3">S3</section>
        <section class="slide" data-slide="4">S4</section>
        <section class="slide" data-slide="5">S5</section>
      </body></html>
    `;
    const result = validateCarouselHtml(externalHtml);
    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.hasExternalDeps, true);
    assert.ok(result.errors.some((e) => e.includes('External network dependencies found')));
  });

  it('rejects carousels with fewer than 5 or more than 8 slides', () => {
    const threeSlides = `
      <!doctype html><html><head></head>
      <body>
        <section class="slide" data-slide="1">S1</section>
        <section class="slide" data-slide="2">S2</section>
        <section class="slide" data-slide="3">S3</section>
      </body></html>
    `;
    const result = validateCarouselHtml(threeSlides);
    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes('Expected between 5 and 8 slides')));
  });
});
