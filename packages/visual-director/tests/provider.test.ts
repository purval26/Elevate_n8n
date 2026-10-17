import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DeterministicIllustrationProvider, MockIllustrationProvider } from '../src/provider.ts';
import { handleIllustrationFallback } from '../src/fallback.ts';
import type { IllustrationRequest, SlideVisualSpecification } from '../src/schema.ts';

describe('Illustration Providers & Fallback Engine', () => {
  it('DeterministicIllustrationProvider produces clean vector SVG with NO text or labels', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'elevate-ill-'));
    const provider = new DeterministicIllustrationProvider(tempDir);

    const request: IllustrationRequest = {
      id: 'dns-resolver-test',
      purpose: 'Demonstrate browser querying DNS resolver',
      visualConcept: 'DNS resolver lookup with satellite nodes',
      style: 'technical-editorial',
      aspectRatio: '1:1',
      transparentBackground: true,
      constraints: ['NO text', 'NO labels', 'NO logos'],
    };

    const asset = await provider.generateIllustration(request);

    assert.strictEqual(asset.id, 'dns-resolver-test');
    assert.ok(fs.existsSync(asset.path));
    assert.strictEqual(asset.mimeType, 'image/svg+xml');

    const svgContent = fs.readFileSync(asset.path, 'utf-8');
    assert.ok(svgContent.includes('<svg'));
    assert.ok(svgContent.includes('</svg>'));

    // Critical constraint: MUST NOT contain <text> or <tspan> elements
    assert.strictEqual(
      svgContent.includes('<text'),
      false,
      'Generated illustration must NOT contain <text> elements',
    );
    assert.strictEqual(
      svgContent.includes('<tspan'),
      false,
      'Generated illustration must NOT contain <tspan> elements',
    );

    // Verify brand colors
    assert.ok(svgContent.includes('#2563EB') || svgContent.includes('#38BDF8'));

    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('MockIllustrationProvider records requests and handles simulated failure', async () => {
    const mock = new MockIllustrationProvider();

    const request: IllustrationRequest = {
      id: 'mock-req-01',
      purpose: 'Testing mock call',
      visualConcept: 'Container isolation box',
      style: 'flat-geometric',
      aspectRatio: '1:1',
      transparentBackground: true,
      constraints: ['NO text'],
    };

    const asset = await mock.generateIllustration(request);
    assert.strictEqual(mock.calls.length, 1);
    assert.strictEqual(mock.calls[0]!.id, 'mock-req-01');
    assert.ok(asset);

    mock.shouldFail = true;
    await assert.rejects(
      async () => {
        await mock.generateIllustration(request);
      },
      { message: /MockIllustrationProvider simulated failure/ },
    );
  });

  it('handleIllustrationFallback transitions slide to fallback without crashing', () => {
    const originalSlide: SlideVisualSpecification = {
      slideNumber: 2,
      visualStrategy: 'illustration',
      composition: 'hero-right',
      background: 'dark',
      accent: 'primary-blue',
      illustration: {
        required: true,
        purpose: 'Show container namespace split',
        visualConcept: 'Linux namespaces',
        style: 'technical-editorial',
        aspectRatio: '1:1',
        assetId: 'container-ill',
        fallbackStrategy: 'diagram',
      },
      elements: [
        { type: 'headline', text: 'Namespaces Isolation' },
        { type: 'body', text: 'Partitioning kernel resources.' },
      ],
      fallbackTemplate: 'explainer',
    };

    const fallbackSlide = handleIllustrationFallback(originalSlide);

    assert.strictEqual(fallbackSlide.illustration?.required, false);
    assert.strictEqual(fallbackSlide.visualStrategy, 'diagram');
    assert.strictEqual(fallbackSlide.composition, 'diagram-focus');
    assert.strictEqual(fallbackSlide.elements.length, 2);
  });
});
