import type { RenderEngine, RenderEngineOptions } from './types.ts';
import { DIMENSIONS } from '../design/tokens.ts';

/**
 * Optional Playwright/Chromium engine for desktop/CI environments.
 * Gracefully reports "Chromium unavailable" when Playwright/Chromium is not installed
 * or on unsupported mobile/embedded platforms.
 */
export class PlaywrightRenderEngine implements RenderEngine {
  readonly name = 'playwright';

  async isAvailable(): Promise<boolean> {
    try {
      const moduleName = 'playwright-core';
      // Check if playwright-core can be dynamically imported
      const pw = await (import(moduleName) as Promise<{ chromium?: unknown }>).catch(() => null);
      if (!pw || !pw.chromium) {
        return false;
      }
      // On platforms like Android, playwright throws on launch attempt
      if (process.platform === ('android' as string)) {
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  async renderSvgToPng(svg: string, options?: RenderEngineOptions): Promise<Buffer> {
    const available = await this.isAvailable();
    if (!available) {
      throw new Error(
        'Chromium unavailable: Playwright could not find or launch Chromium in this environment.',
      );
    }

    const moduleName = 'playwright-core';
    const pw = (await import(moduleName)) as {
      chromium: {
        launch(opts: unknown): Promise<{
          newContext(opts: unknown): Promise<{
            newPage(): Promise<{
              setContent(html: string, opts: unknown): Promise<void>;
              screenshot(opts: unknown): Promise<Buffer>;
            }>;
            close(): Promise<void>;
          }>;
          close(): Promise<void>;
        }>;
      };
    };
    const width = options?.width ?? DIMENSIONS.width;
    const height = options?.height ?? DIMENSIONS.height;

    let browser;
    try {
      browser = await pw.chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      const context = await browser.newContext({
        viewport: { width, height },
        deviceScaleFactor: options?.deviceScaleFactor ?? 1,
      });
      const page = await context.newPage();

      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: ${width}px; height: ${height}px; overflow: hidden; background: #0B0F17; }
    svg { display: block; width: ${width}px; height: ${height}px; }
  </style>
</head>
<body>
  ${svg}
</body>
</html>`;

      await page.setContent(html, { waitUntil: 'load' });
      const buffer = await page.screenshot({ type: 'png' });
      await context.close();
      return buffer;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`Rendering failed: ${message}`);
    } finally {
      if (browser) {
        await browser.close().catch(() => {});
      }
    }
  }
}
