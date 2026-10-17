import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createRequire } from 'node:module';
import type { RenderEngine, RenderEngineOptions } from './types.ts';
import { DIMENSIONS } from '../design/tokens.ts';

const require = createRequire(import.meta.url);

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
    const resvg = new ResvgClass(svg, {
      fitTo: { mode: 'width', value: width },
    });
    const rendered = resvg.render();
    return Buffer.from(rendered.asPng());
  }
}

export const defaultResvgEngine = new ResvgRenderEngine();
