import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { IllustrationCache } from '../src/cache.ts';
import type { IllustrationRequest, IllustrationAsset } from '../src/schema.ts';

describe('IllustrationCache: Filesystem Asset Caching', () => {
  it('should deterministically compute hash from request parameters', () => {
    const cache = new IllustrationCache();
    const req1: IllustrationRequest = {
      id: 'req-01',
      purpose: 'Purpose 1',
      visualConcept: 'DNS Lookups',
      style: 'technical-editorial',
      aspectRatio: '1:1',
      transparentBackground: true,
      constraints: ['NO text'],
    };
    const req2: IllustrationRequest = {
      ...req1,
      id: 'req-02-different-id-same-concept',
    };

    assert.strictEqual(
      cache.computeHash(req1),
      cache.computeHash(req2),
      'Identical visual concept, style, and constraints must produce identical cache key',
    );
  });

  it('should store and retrieve cached illustration assets', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'elevate-cache-test-'));
    const cache = new IllustrationCache(tempDir);

    const dummyAssetPath = path.join(tempDir, 'dummy.svg');
    fs.writeFileSync(dummyAssetPath, '<svg></svg>', 'utf-8');

    const req: IllustrationRequest = {
      id: 'test-req',
      purpose: 'Caching test',
      visualConcept: 'Cache Architecture',
      style: 'technical-editorial',
      aspectRatio: '1:1',
      transparentBackground: true,
      constraints: [],
    };

    assert.strictEqual(cache.get(req), null, 'Initial cache check must be miss');

    const asset: IllustrationAsset = {
      id: 'test-req',
      path: dummyAssetPath,
      mimeType: 'image/svg+xml',
      width: 800,
      height: 800,
    };

    cache.put(req, asset);

    const retrieved = cache.get(req);
    assert.ok(retrieved, 'Should retrieve cached asset');
    assert.strictEqual(retrieved.id, 'test-req');
    assert.strictEqual(retrieved.path, dummyAssetPath);

    fs.rmSync(tempDir, { recursive: true, force: true });
  });
});
