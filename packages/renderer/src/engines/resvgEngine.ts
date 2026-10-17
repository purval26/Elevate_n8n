import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import type { RenderEngine, RenderEngineOptions } from './types.ts';
import { DIMENSIONS } from '../design/tokens.ts';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ResvgInstance {
  render(): { asPng(): Uint8Array; width: number; height: number };
}

interface ResvgConstructor {
  new (svg: string, options?: unknown): ResvgInstance;
}

let cachedResvgClass: ResvgConstructor | null = null;

function getResvgClass(): ResvgConstructor {
  if (cachedResvgClass) {
    return cachedResvgClass;
  }

  try {
    // 1. Standard package import (Linux x64/arm64, macOS, Windows)
    const pkg = require('@resvg/resvg-js');
    cachedResvgClass = pkg.Resvg;
    return cachedResvgClass!;
  } catch (err: unknown) {
    const errorString = String(err);
    const isDlopenIssue =
      (err as { code?: string }).code === 'ERR_DLOPEN_FAILED' ||
      errorString.includes('not accessible for the namespace');

    // 2. Android / Termux storage workaround:
    // Android SELinux / bionic linker prevents loading native .node shared libraries
    // directly from /storage/emulated/0 (external storage).
    // Copying the native addon to ~/.cache/elevate/ (/data/data internal storage)
    // allows the bionic dynamic linker to load it successfully.
    if (isDlopenIssue) {
      const cacheDir = path.join(os.homedir(), '.cache', 'elevate');
      fs.mkdirSync(cacheDir, { recursive: true });
      const targetBinary = path.join(cacheDir, 'resvgjs.android-arm64.node');

      if (!fs.existsSync(targetBinary)) {
        const candidates = [
          path.resolve('node_modules/@resvg/resvg-js-android-arm64/resvgjs.android-arm64.node'),
          path.resolve('../node_modules/@resvg/resvg-js-android-arm64/resvgjs.android-arm64.node'),
          path.resolve(
            '../../node_modules/@resvg/resvg-js-android-arm64/resvgjs.android-arm64.node',
          ),
        ];
        const found = candidates.find((p) => fs.existsSync(p));
        if (found) {
          fs.copyFileSync(found, targetBinary);
        }
      }

      if (fs.existsSync(targetBinary)) {
        const raw = require(targetBinary);
        class AndroidResvgWrapper implements ResvgInstance {
          private _rawInstance: ResvgInstance;
          constructor(svg: string, options?: unknown) {
            this._rawInstance = new raw.Resvg(svg, options ? JSON.stringify(options) : undefined);
          }
          render() {
            return this._rawInstance.render();
          }
        }
        cachedResvgClass = AndroidResvgWrapper as unknown as ResvgConstructor;
        return cachedResvgClass;
      }
    }

    throw err;
  }
}

/**
 * Discovers bundled font files (Outfit, Space Mono) and optional environment CJK fallbacks.
 */
export function getBundledFontFiles(): string[] {
  const candidateDirs = [
    path.resolve(__dirname, '../../assets/fonts'),
    path.resolve(process.cwd(), 'packages/renderer/assets/fonts'),
  ];

  const fontFiles: string[] = [];
  for (const dir of candidateDirs) {
    if (fs.existsSync(dir)) {
      const files = fs
        .readdirSync(dir)
        .filter((f) => f.endsWith('.ttf') || f.endsWith('.otf'))
        .map((f) => path.join(dir, f));
      if (files.length > 0) {
        fontFiles.push(...files);
        break;
      }
    }
  }

  // Optional CJK system font fallback for Asian scripts if present in environment
  const cjkCandidates = [
    '/system/fonts/NotoSansCJK-Regular.ttc',
    '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',
    '/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc',
  ];
  for (const cjk of cjkCandidates) {
    if (fs.existsSync(cjk)) {
      fontFiles.push(cjk);
      break;
    }
  }

  return fontFiles;
}

/**
 * High-performance, deterministic native SVG-to-PNG renderer based on resvg.
 * Operates offline with zero browser dependencies.
 */
export class ResvgRenderEngine implements RenderEngine {
  readonly name = 'resvg';

  isAvailable(): boolean {
    try {
      getResvgClass();
      return true;
    } catch {
      return false;
    }
  }

  renderSvgToPng(svg: string, options?: RenderEngineOptions): Buffer {
    const width = options?.width ?? DIMENSIONS.width;
    const ResvgClass = getResvgClass();
    const fontFiles = getBundledFontFiles();
    const resvg = new ResvgClass(svg, {
      fitTo: { mode: 'width', value: width },
      font: {
        fontFiles,
        loadSystemFonts: false,
        defaultFontFamily: 'Outfit',
        sansSerifFamily: 'Outfit',
        monospaceFamily: 'Space Mono',
      },
    });
    const rendered = resvg.render();
    return Buffer.from(rendered.asPng());
  }
}

export const defaultResvgEngine = new ResvgRenderEngine();
