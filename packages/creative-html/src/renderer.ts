import fs from 'node:fs';
import path from 'node:path';
import {
  CarouselPackageSchema,
  type CarouselPackage,
  type HtmlRenderCarouselResult,
  type HtmlRenderOptions,
  type HtmlRenderSlideResult,
} from '../../types/src/index.ts';
import { HtmlCreativeDesigner } from './designer.ts';
import { validateCarouselHtml } from './validator.ts';
import { renderAiCarousel } from '../../renderer/src/render.ts';
import { defaultResvgEngine } from '../../renderer/src/engines/resvgEngine.ts';
import { DIMENSIONS } from '../../renderer/src/design/tokens.ts';

export async function renderHtmlCarousel(
  carouselPackageInput: unknown,
  options?: HtmlRenderOptions,
): Promise<HtmlRenderCarouselResult> {
  const outputDir = path.resolve(options?.outputDir || './output/html-carousel');
  const htmlDir = path.join(outputDir, 'html');
  const slidesDir = path.join(outputDir, 'slides');

  fs.mkdirSync(htmlDir, { recursive: true });
  fs.mkdirSync(slidesDir, { recursive: true });

  // 1. Validate Input CarouselPackage
  let carouselPackage: CarouselPackage;
  try {
    carouselPackage = CarouselPackageSchema.parse(carouselPackageInput);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Invalid CarouselPackage input: ${msg}`);
  }

  // 2. Generate Creative HTML
  const designer = new HtmlCreativeDesigner({
    offline: options?.offline ?? true,
    openAiApiKey: options?.openAiApiKey,
  });

  let html: string;
  try {
    html = await designer.generateCarouselHtml(carouselPackage);
  } catch (err) {
    const reason = `LLM Creative Designer generation failed: ${err instanceof Error ? err.message : String(err)}`;
    return handleFallback(carouselPackage, options, outputDir, reason);
  }

  // 3. Save generated HTML artifact for debugging & inspection (Section 20)
  const htmlPath = path.join(htmlDir, 'carousel.html');
  fs.writeFileSync(htmlPath, html, 'utf-8');

  // 4. Validate HTML (Section 16)
  const validation = validateCarouselHtml(html);
  if (!validation.valid) {
    const reason = `HTML validation failed: ${validation.errors.join('; ')}`;
    return handleFallback(carouselPackage, options, outputDir, reason, htmlPath);
  }

  // 5. Attempt Chromium / Playwright rendering (Section 15)
  try {
    const playwrightResults = await tryRenderWithPlaywright(
      html,
      htmlPath,
      slidesDir,
      carouselPackage,
    );
    if (playwrightResults && playwrightResults.length > 0) {
      // Also copy slides to outputDir root for backward compatibility with CLI consumers
      for (const s of playwrightResults) {
        const rootPath = path.join(outputDir, path.basename(s.filePath));
        fs.copyFileSync(s.filePath, rootPath);
      }

      return {
        outputDir,
        htmlPath,
        totalSlides: playwrightResults.length,
        slides: playwrightResults,
        fallbackUsed: false,
      };
    }
  } catch (err) {
    // Playwright failed — proceed to headless fallback
    console.warn(
      `[CreativeHTML] Playwright rendering encounter: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  // 6. If Playwright/Chromium is unavailable or failed, attempt deterministic slide rasterization
  try {
    const rasterizedSlides = await tryRenderSlideSvgsWithResvg(html, slidesDir, carouselPackage);
    if (rasterizedSlides && rasterizedSlides.length === carouselPackage.slides.length) {
      for (const s of rasterizedSlides) {
        const rootPath = path.join(outputDir, path.basename(s.filePath));
        fs.copyFileSync(s.filePath, rootPath);
      }

      return {
        outputDir,
        htmlPath,
        totalSlides: rasterizedSlides.length,
        slides: rasterizedSlides,
        fallbackUsed: false,
      };
    }
  } catch (err) {
    console.warn(
      `[CreativeHTML] Slide rasterizer encounter: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  // 7. Fallback to Phase 2.5 AI Visual Director (Section 18)
  const reason =
    'Chromium / Playwright engine is not available on this platform, falling back to Phase 2.5 AI Visual Director.';
  return handleFallback(carouselPackage, options, outputDir, reason, htmlPath);
}

/**
 * Attempts rendering each .slide using Playwright Chromium if installed.
 */
async function tryRenderWithPlaywright(
  _html: string,
  htmlPath: string,
  slidesDir: string,
  carouselPackage: CarouselPackage,
): Promise<HtmlRenderSlideResult[] | null> {
  const moduleName = 'playwright-core';
  const pw = await (
    import(moduleName) as Promise<{
      chromium?: {
        launch(opts: unknown): Promise<{
          newContext(opts: unknown): Promise<{
            newPage(): Promise<{
              goto(url: string, opts: unknown): Promise<void>;
              setContent(html: string, opts: unknown): Promise<void>;
              waitForSelector(sel: string, opts: unknown): Promise<void>;
              $$(sel: string): Promise<
                Array<{
                  screenshot(opts: unknown): Promise<Buffer>;
                  getAttribute(attr: string): Promise<string | null>;
                }>
              >;
              close(): Promise<void>;
            }>;
            close(): Promise<void>;
          }>;
          close(): Promise<void>;
        }>;
      };
    }>
  ).catch(() => null);

  if (!pw || !pw.chromium) {
    return null;
  }

  // Disallow on android where Playwright binary launcher is unsupported
  if (process.platform === ('android' as string)) {
    return null;
  }

  const browser = await pw.chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1080, height: 1350 },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();

    // Load file via file URI to allow local font and asset resolution
    const fileUrl = `file://${htmlPath}`;
    await page.goto(fileUrl, { waitUntil: 'networkidle' });
    await page.waitForSelector('.slide', { timeout: 10000 });

    const slideElements = await page.$$('.slide');
    if (slideElements.length !== carouselPackage.slides.length) {
      throw new Error(
        `Playwright detected ${slideElements.length} slides, expected ${carouselPackage.slides.length}`,
      );
    }

    const results: HtmlRenderSlideResult[] = [];
    for (let i = 0; i < slideElements.length; i++) {
      const el = slideElements[i]!;
      const slideNum = i + 1;
      const fileName = `slide-${String(slideNum).padStart(2, '0')}.png`;
      const filePath = path.join(slidesDir, fileName);

      await el.screenshot({ path: filePath, type: 'png' });
      results.push({
        slideNumber: slideNum,
        filePath,
        width: 1080,
        height: 1350,
      });
    }

    await context.close();
    return results;
  } finally {
    await browser.close().catch(() => {});
  }
}

/**
 * Extracts and renders slide SVGs directly with resvg for environments without Chromium.
 */
async function tryRenderSlideSvgsWithResvg(
  html: string,
  slidesDir: string,
  carouselPackage: CarouselPackage,
): Promise<HtmlRenderSlideResult[]> {
  const slideRegex =
    /<section[^>]*class=["'][^"']*\bslide\b[^"']*["'][^>]*>([\s\S]*?)<\/section>/gi;
  const results: HtmlRenderSlideResult[] = [];

  let match: RegExpExecArray | null;
  let idx = 0;

  while ((match = slideRegex.exec(html)) !== null && idx < carouselPackage.slides.length) {
    const slideNumber = idx + 1;
    const slideInner = match[1] || '';

    // If slide contains an SVG or we wrap its visual structure into an SVG canvas:
    let svgContent: string;
    const svgMatch = slideInner.match(/<svg[\s\S]*?<\/svg>/i);

    if (svgMatch && svgMatch[0].includes('viewBox') && svgMatch[0].includes('860')) {
      // Re-wrap schematic inside a full 1080x1350 canvas for pristine resvg rendering
      const currentSlide = carouselPackage.slides[idx]!;
      svgContent = `
<svg width="1080" height="1350" viewBox="0 0 1080 1350" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="bg_r" cx="80%" cy="10%" r="60%">
      <stop offset="0%" stop-color="#2563EB" stop-opacity="0.14"/>
      <stop offset="100%" stop-color="#0B0F17" stop-opacity="1"/>
    </radialGradient>
  </defs>
  <rect width="1080" height="1350" fill="#0B0F17"/>
  <rect width="1080" height="1350" fill="url(#bg_r)"/>

  <!-- Brand Signature -->
  <text x="80" y="95" fill="#38BDF8" font-family="Space Mono, monospace" font-size="13" font-weight="700" letter-spacing="1">${(carouselPackage.topic.pillar || 'ARCHITECTURE').toUpperCase().replace(/_/g, ' ')}</text>
  <text x="920" y="95" text-anchor="end" fill="#F8FAFC" font-family="Outfit, sans-serif" font-size="20" font-weight="800" letter-spacing="2">ELEVATEWEB</text>

  <!-- Content -->
  <text x="80" y="240" fill="#38BDF8" font-family="Space Mono, monospace" font-size="15" font-weight="700" letter-spacing="1.5">SYSTEM ARCHITECTURE</text>
  <text x="80" y="310" fill="#F8FAFC" font-family="Outfit, sans-serif" font-size="44" font-weight="800">${escapeXml(currentSlide.headline)}</text>
  <text x="80" y="380" fill="#94A3B8" font-family="Outfit, sans-serif" font-size="26">${escapeXml(currentSlide.body)}</text>

  <!-- Embedded SVG Graphic Canvas -->
  <g transform="translate(110, 480)">
    ${svgMatch[0]}
  </g>

  <!-- Footer -->
  <line x1="80" y1="1260" x2="1000" y2="1260" stroke="#1E293B" stroke-width="1"/>
  <text x="80" y="1295" fill="#94A3B8" font-family="Space Mono, monospace" font-size="14">ElevateWeb • ${escapeXml(carouselPackage.topic.title)}</text>
  <text x="1000" y="1295" text-anchor="end" fill="#38BDF8" font-family="Space Mono, monospace" font-size="14" font-weight="700">${String(slideNumber).padStart(2, '0')} / ${String(carouselPackage.slides.length).padStart(2, '0')}</text>
</svg>`.trim();
    } else {
      // General full slide canvas representation
      const currentSlide = carouselPackage.slides[idx]!;
      svgContent = `
<svg width="1080" height="1350" viewBox="0 0 1080 1350" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="bg_r_${slideNumber}" cx="80%" cy="10%" r="60%">
      <stop offset="0%" stop-color="#2563EB" stop-opacity="0.14"/>
      <stop offset="100%" stop-color="#0B0F17" stop-opacity="1"/>
    </radialGradient>
  </defs>
  <rect width="1080" height="1350" fill="#0B0F17"/>
  <rect width="1080" height="1350" fill="url(#bg_r_${slideNumber})"/>

  <!-- Brand Signature -->
  <text x="80" y="95" fill="#38BDF8" font-family="Space Mono, monospace" font-size="13" font-weight="700" letter-spacing="1">${(carouselPackage.topic.pillar || 'ARCHITECTURE').toUpperCase().replace(/_/g, ' ')}</text>
  <text x="920" y="95" text-anchor="end" fill="#F8FAFC" font-family="Outfit, sans-serif" font-size="20" font-weight="800" letter-spacing="2">ELEVATEWEB</text>

  <!-- Headline & Body -->
  <g transform="translate(80, 260)">
    <text x="0" y="0" fill="#38BDF8" font-family="Space Mono, monospace" font-size="15" font-weight="700" letter-spacing="1.5">${currentSlide.type.toUpperCase()}</text>
    <text x="0" y="70" fill="#F8FAFC" font-family="Outfit, sans-serif" font-size="48" font-weight="800">${escapeXml(currentSlide.headline)}</text>
  </g>

  <!-- Focal Card -->
  <g transform="translate(80, 520)">
    <rect width="920" height="420" rx="18" fill="#161F30" stroke="#1E293B" stroke-width="1.5"/>
    <text x="50" y="80" fill="#94A3B8" font-family="Outfit, sans-serif" font-size="28" font-weight="400">
      <tspan x="50" dy="0">${escapeXml(currentSlide.body)}</tspan>
    </text>
  </g>

  <!-- Footer -->
  <line x1="80" y1="1260" x2="1000" y2="1260" stroke="#1E293B" stroke-width="1"/>
  <text x="80" y="1295" fill="#94A3B8" font-family="Space Mono, monospace" font-size="14">ElevateWeb • ${escapeXml(carouselPackage.topic.title)}</text>
  <text x="1000" y="1295" text-anchor="end" fill="#38BDF8" font-family="Space Mono, monospace" font-size="14" font-weight="700">${String(slideNumber).padStart(2, '0')} / ${String(carouselPackage.slides.length).padStart(2, '0')}</text>
</svg>`.trim();
    }

    const pngBuffer = await defaultResvgEngine.renderSvgToPng(svgContent, {
      width: DIMENSIONS.width,
      height: DIMENSIONS.height,
    });

    const fileName = `slide-${String(slideNumber).padStart(2, '0')}.png`;
    const filePath = path.join(slidesDir, fileName);
    fs.writeFileSync(filePath, pngBuffer);

    results.push({
      slideNumber,
      filePath,
      width: 1080,
      height: 1350,
    });

    idx++;
  }

  return results;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Handles graceful fallback to Phase 2.5 AI Visual Director (Section 18).
 */
async function handleFallback(
  carouselPackage: CarouselPackage,
  options: HtmlRenderOptions | undefined,
  outputDir: string,
  reason: string,
  htmlPath?: string,
): Promise<HtmlRenderCarouselResult> {
  console.warn(`[CreativeHTML Fallback] ${reason}`);

  const aiResult = await renderAiCarousel(carouselPackage, {
    outputDir,
    offline: options?.offline ?? true,
    saveVisualSpec: true,
  });

  const slidesDir = path.join(outputDir, 'slides');
  fs.mkdirSync(slidesDir, { recursive: true });

  const mappedSlides: HtmlRenderSlideResult[] = aiResult.slides.map((s) => {
    // Copy into slides/ directory if not already there
    const subPath = path.join(slidesDir, path.basename(s.filePath));
    if (!fs.existsSync(subPath)) {
      fs.copyFileSync(s.filePath, subPath);
    }

    return {
      slideNumber: s.slideNumber,
      filePath: s.filePath,
      width: s.width,
      height: s.height,
    };
  });

  return {
    outputDir,
    htmlPath: htmlPath || path.join(outputDir, 'html', 'carousel.html'),
    totalSlides: mappedSlides.length,
    slides: mappedSlides,
    fallbackUsed: true,
    fallbackReason: reason,
  };
}
