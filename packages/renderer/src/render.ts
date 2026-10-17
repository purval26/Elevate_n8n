import fs from 'node:fs';
import path from 'node:path';
import { CarouselPackageSchema, type CarouselPackage } from '../../types/src/index.ts';
import { selectTemplate, TEMPLATES } from './templateSelector.ts';
import { defaultResvgEngine } from './engines/resvgEngine.ts';
import type { RenderEngine } from './engines/types.ts';
import { DIMENSIONS } from './design/tokens.ts';
import type { SlideRenderContext } from './templates/types.ts';

export interface RenderSlideResult {
  slideNumber: number;
  filePath: string;
  width: number;
  height: number;
  templateName: string;
}

export interface RenderCarouselResult {
  outputDir: string;
  totalSlides: number;
  slides: RenderSlideResult[];
}

export interface RenderCarouselOptions {
  outputDir?: string;
  engine?: RenderEngine;
  templateOverride?: string;
}

/**
 * Validates a CarouselPackage, selects templates, and renders each slide
 * to an Instagram portrait PNG image (1080 x 1350).
 */
export async function renderCarousel(
  carouselPackageInput: unknown,
  options?: RenderCarouselOptions,
): Promise<RenderCarouselResult> {
  // 1. Validate Input CarouselPackage
  if (!carouselPackageInput || typeof carouselPackageInput !== 'object') {
    throw new Error('Invalid carousel package: Expected a non-empty object.');
  }

  const parseResult = CarouselPackageSchema.safeParse(carouselPackageInput);
  if (!parseResult.success) {
    const errorDetails = parseResult.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid carousel package: ${errorDetails}`);
  }

  const carousel = parseResult.data as CarouselPackage;

  // 2. Resolve and prepare output directory
  const outputDir = path.resolve(options?.outputDir ?? './output');
  try {
    fs.mkdirSync(outputDir, { recursive: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Output directory unavailable: Could not create or access ${outputDir}. Error: ${message}`,
    );
  }

  // 3. Resolve rendering engine (default: Resvg native engine)
  const engine = options?.engine ?? defaultResvgEngine;

  // 4. Check template override if specified
  if (options?.templateOverride && !TEMPLATES[options.templateOverride]) {
    throw new Error(
      `Unsupported template: '${options.templateOverride}'. Available templates: ${Object.keys(TEMPLATES).join(', ')}.`,
    );
  }

  // 5. Render each slide
  const totalSlides = carousel.slides.length;
  const slideResults: RenderSlideResult[] = [];

  for (const slide of carousel.slides) {
    const slideNumberStr = String(slide.slideNumber).padStart(2, '0');
    const fileName = `slide-${slideNumberStr}.png`;
    const filePath = path.join(outputDir, fileName);

    // Template selection
    const template = options?.templateOverride
      ? TEMPLATES[options.templateOverride]!
      : selectTemplate(slide.type);

    const context: SlideRenderContext = {
      slide,
      totalSlides,
      topic: carousel.topic,
      hook: carousel.hook,
      cta: carousel.cta,
      caption: carousel.caption,
      hashtags: carousel.hashtags,
    };

    let svg: string;
    try {
      svg = template.render(context);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(
        `Rendering failed for slide ${slide.slideNumber} with template '${template.name}': ${message}`,
      );
    }

    let pngBuffer: Buffer;
    try {
      pngBuffer = await engine.renderSvgToPng(svg, {
        width: DIMENSIONS.width,
        height: DIMENSIONS.height,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('Chromium unavailable')) {
        throw new Error(message);
      }
      throw new Error(
        `Rendering failed: Could not render slide ${slide.slideNumber} to PNG. Error: ${message}`,
      );
    }

    fs.writeFileSync(filePath, pngBuffer);

    slideResults.push({
      slideNumber: slide.slideNumber,
      filePath,
      width: DIMENSIONS.width,
      height: DIMENSIONS.height,
      templateName: template.name,
    });
  }

  return {
    outputDir,
    totalSlides,
    slides: slideResults,
  };
}
