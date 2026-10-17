import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { renderCarousel } from '../src/render.ts';
import type { CarouselPackage } from '../../types/src/index.ts';

function createMockCarouselPackage(slideCount: number): CarouselPackage {
  const slides = Array.from({ length: slideCount }, (_, idx) => {
    const num = idx + 1;
    let type: CarouselPackage['slides'][number]['type'] = 'concept';
    if (num === 1) type = 'hook';
    else if (num === 2) type = 'comparison';
    else if (num === 3) type = 'architecture';
    else if (num === 4) type = 'breakdown';
    else if (num === slideCount) type = 'takeaway';

    return {
      slideNumber: num,
      type,
      headline: `Slide ${num} Headline for Testing`,
      body: `Educational body explaining slide ${num} in clear detail with actionable insights.`,
      visualSuggestion: `Visual suggestion for slide ${num}`,
    };
  });

  return {
    topic: {
      title: 'Testing Monorepo Architecture',
      pillar: 'software_engineering',
    },
    hook: 'How to build rock-solid TypeScript packages without over-engineering.',
    slides,
    caption: 'Step-by-step breakdown of modular monorepo packages.',
    cta: 'Save this guide and follow @elevateweb.',
    hashtags: ['#typescript', '#architecture'],
    sources: ['https://elevateweb.io'],
  };
}

describe('Renderer: renderCarousel', () => {
  it('should reject non-object or null input', async () => {
    await assert.rejects(
      async () => {
        await renderCarousel(null);
      },
      {
        message: /Invalid carousel package: Expected a non-empty object/,
      },
    );

    await assert.rejects(
      async () => {
        await renderCarousel('string-not-object');
      },
      {
        message: /Invalid carousel package: Expected a non-empty object/,
      },
    );
  });

  it('should reject invalid schema payload (e.g. missing slides)', async () => {
    const invalidPkg = {
      topic: { title: 'Test', pillar: 'tech' },
      hook: 'Hook',
    };

    await assert.rejects(
      async () => {
        await renderCarousel(invalidPkg);
      },
      {
        message: /Invalid carousel package:/,
      },
    );
  });

  it('should reject unsupported template override', async () => {
    const pkg = createMockCarouselPackage(5);
    await assert.rejects(
      async () => {
        await renderCarousel(pkg, {
          templateOverride: 'nonexistent_template',
        });
      },
      {
        message: /Unsupported template: 'nonexistent_template'/,
      },
    );
  });

  it('should successfully render a 5-slide carousel to PNG files', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'elevate-render-5-'));
    const pkg = createMockCarouselPackage(5);

    const result = await renderCarousel(pkg, { outputDir: tempDir });

    assert.strictEqual(result.totalSlides, 5);
    assert.strictEqual(result.slides.length, 5);
    assert.strictEqual(result.outputDir, tempDir);

    for (let i = 0; i < 5; i++) {
      const slide = result.slides[i]!;
      assert.strictEqual(slide.slideNumber, i + 1);
      assert.strictEqual(slide.width, 1080);
      assert.strictEqual(slide.height, 1350);
      assert.strictEqual(
        path.basename(slide.filePath),
        `slide-${String(i + 1).padStart(2, '0')}.png`,
      );
      assert.ok(fs.existsSync(slide.filePath));
      const stats = fs.statSync(slide.filePath);
      assert.ok(stats.size > 1000); // Verify non-empty PNG
    }

    // Clean up
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should successfully render an 8-slide carousel to PNG files', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'elevate-render-8-'));
    const pkg = createMockCarouselPackage(8);

    const result = await renderCarousel(pkg, { outputDir: tempDir });

    assert.strictEqual(result.totalSlides, 8);
    assert.strictEqual(result.slides.length, 8);

    for (let i = 0; i < 8; i++) {
      const slide = result.slides[i]!;
      assert.strictEqual(slide.slideNumber, i + 1);
      assert.ok(fs.existsSync(slide.filePath));
    }

    // Clean up
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should support template override across all slides', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'elevate-render-override-'));
    const pkg = createMockCarouselPackage(5);

    const result = await renderCarousel(pkg, {
      outputDir: tempDir,
      templateOverride: 'statement',
    });

    for (const slide of result.slides) {
      assert.strictEqual(slide.templateName, 'statement');
    }

    // Clean up
    fs.rmSync(tempDir, { recursive: true, force: true });
  });
});
