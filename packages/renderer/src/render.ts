import fs from 'node:fs';
import path from 'node:path';
import {
  CarouselPackageSchema,
  type CarouselPackage,
  type CarouselVisualSpecification,
} from '../../types/src/index.ts';
import { selectTemplate, TEMPLATES } from './templateSelector.ts';
import { defaultResvgEngine } from './engines/resvgEngine.ts';
import type { RenderEngine } from './engines/types.ts';
import { DIMENSIONS } from './design/tokens.ts';
import type { SlideRenderContext } from './templates/types.ts';
import { renderVisualSpecToSvg } from './visualSpecRenderer.ts';
import {
  VisualDirector,
  type VisualDirectorOptions,
  type PreparedCarouselVisuals,
} from '../../visual-director/src/index.ts';

export interface RenderSlideResult {
  slideNumber: number;
  filePath: string;
  width: number;
  height: number;
  templateName: string;
  visualStrategy?: string;
  composition?: string;
}

export interface RenderCarouselResult {
  outputDir: string;
  totalSlides: number;
  slides: RenderSlideResult[];
  visualSpecification?: CarouselVisualSpecification;
}

export interface RenderCarouselOptions {
  outputDir?: string;
  engine?: RenderEngine;
  templateOverride?: string;
}

export interface RenderAiCarouselOptions extends RenderCarouselOptions, VisualDirectorOptions {
  visualSpecification?: CarouselVisualSpecification;
  saveVisualSpec?: boolean;
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

/**
 * Phase 2.5: AI Visual Director + Illustration Engine + Deterministic Renderer.
 * Converts CarouselPackage into an AI-directed visual specification, prepares illustrations
 * when needed, and produces diverse, branded 1080x1350 PNG slides.
 */
export async function renderAiCarousel(
  carouselPackageInput: unknown,
  options?: RenderAiCarouselOptions,
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

  // 2. Prepare output directory
  const outputDir = path.resolve(options?.outputDir ?? './output');
  fs.mkdirSync(outputDir, { recursive: true });

  // 3. AI Visual Director stage
  const director = new VisualDirector({
    openai: options?.openai,
    client: options?.client,
    model: options?.model,
    offline: options?.offline,
    provider: options?.provider,
    cache: options?.cache,
  });

  const prepared: PreparedCarouselVisuals = await director.directAndPrepare(carousel);
  const visualSpec = options?.visualSpecification ?? prepared.specification;

  // Save visual-spec.json if requested or default
  if (options?.saveVisualSpec !== false) {
    const specPath = path.join(outputDir, 'visual-spec.json');
    try {
      fs.writeFileSync(specPath, JSON.stringify(visualSpec, null, 2), 'utf-8');
    } catch {
      // ignore
    }
  }

  // 4. Render each slide using visualSpecRenderer
  const engine = options?.engine ?? defaultResvgEngine;
  const totalSlides = carousel.slides.length;
  const slideResults: RenderSlideResult[] = [];

  for (let i = 0; i < carousel.slides.length; i++) {
    const slide = carousel.slides[i]!;
    const slideSpec = visualSpec.slides[i] || visualSpec.slides[0]!;
    const slideNumberStr = String(slide.slideNumber).padStart(2, '0');
    const fileName = `slide-${slideNumberStr}.png`;
    const filePath = path.join(outputDir, fileName);

    const context: SlideRenderContext = {
      slide,
      totalSlides,
      topic: carousel.topic,
      hook: carousel.hook,
      cta: carousel.cta,
      caption: carousel.caption,
      hashtags: carousel.hashtags,
    };

    const illustrationAsset = prepared.assets.get(slide.slideNumber);

    let svg: string;
    try {
      svg = renderVisualSpecToSvg(context, slideSpec, { illustrationAsset });
    } catch {
      // Fallback cleanly to standard template
      const fallback = selectTemplate(slide.type);
      svg = fallback.render(context);
    }

    const pngBuffer = await engine.renderSvgToPng(svg, {
      width: DIMENSIONS.width,
      height: DIMENSIONS.height,
    });

    fs.writeFileSync(filePath, pngBuffer);

    slideResults.push({
      slideNumber: slide.slideNumber,
      filePath,
      width: DIMENSIONS.width,
      height: DIMENSIONS.height,
      templateName: slideSpec.composition,
      visualStrategy: slideSpec.visualStrategy,
      composition: slideSpec.composition,
    });
  }

  return {
    outputDir,
    totalSlides,
    slides: slideResults,
    visualSpecification: visualSpec,
  };
}
