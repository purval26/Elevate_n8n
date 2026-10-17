import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import type { IllustrationRequest, IllustrationAsset } from './schema.ts';

export class IllustrationCache {
  private cacheDir: string;

  constructor(cacheDir?: string) {
    this.cacheDir = cacheDir ?? path.join(os.homedir(), '.cache', 'elevate', 'illustrations-cache');
    fs.mkdirSync(this.cacheDir, { recursive: true });
  }

  computeHash(request: IllustrationRequest): string {
    const key = JSON.stringify({
      concept: request.visualConcept.trim().toLowerCase(),
      purpose: request.purpose.trim().toLowerCase(),
      style: request.style,
      aspectRatio: request.aspectRatio,
      constraints: request.constraints,
    });
    return crypto.createHash('sha256').update(key).digest('hex').substring(0, 16);
  }

  get(request: IllustrationRequest): IllustrationAsset | null {
    const hash = this.computeHash(request);
    const metaPath = path.join(this.cacheDir, `${hash}.json`);

    if (fs.existsSync(metaPath)) {
      try {
        const raw = fs.readFileSync(metaPath, 'utf-8');
        const asset = JSON.parse(raw) as IllustrationAsset;
        if (fs.existsSync(asset.path)) {
          return asset;
        }
      } catch {
        // Corrupted cache entry; treat as miss
        return null;
      }
    }

    return null;
  }

  put(request: IllustrationRequest, asset: IllustrationAsset): void {
    const hash = this.computeHash(request);
    const metaPath = path.join(this.cacheDir, `${hash}.json`);
    try {
      fs.writeFileSync(metaPath, JSON.stringify(asset, null, 2), 'utf-8');
    } catch {
      // Ignore write errors in caching
    }
  }

  clear(): void {
    if (fs.existsSync(this.cacheDir)) {
      fs.rmSync(this.cacheDir, { recursive: true, force: true });
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }
}
