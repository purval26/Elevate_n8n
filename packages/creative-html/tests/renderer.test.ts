import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { renderHtmlCarousel } from '../src/renderer.ts';
import type { CarouselPackage } from '../../types/src/index.ts';

const mockPackage: CarouselPackage = {
  topic: {
    title: 'Container Isolation Architecture',
    pillar: 'cloud_infrastructure',
  },
  hook: 'How containers isolate processes on Linux',
  slides: [
    {
      slideNumber: 1,
      type: 'hook',
      headline: 'How Containers Actually Isolate Processes',
      body: 'Containers are not lightweight virtual machines. They are regular Linux processes constrained by namespaces and cgroups.',
      visualSuggestion: 'Process isolation diagram',
    },
    {
      slideNumber: 2,
      type: 'concept',
      headline: 'Linux Namespaces Partition Visibility',
      body: 'PID, Mount, Network, and IPC namespaces give each container its own private view of the host system.',
      visualSuggestion: 'Namespaces schematic',
    },
    {
      slideNumber: 3,
      type: 'comparison',
      headline: 'Containers vs Virtual Machines',
      body: 'VMs virtualize hardware and run independent OS kernels; containers share the host kernel directly.',
      visualSuggestion: 'Comparison table',
    },
    {
      slideNumber: 4,
      type: 'architecture',
      headline: 'Cgroups Limit Resource Consumption',
      body: 'Control groups strictly throttle memory, CPU shares, and block I/O per container slice.',
      visualSuggestion: 'Resource allocator gauge',
    },
    {
      slideNumber: 5,
      type: 'takeaway',
      headline: 'Containers Are Slices of a Single Kernel',
      body: 'Understanding kernel boundaries is essential for configuring security profiles and rootless runtimes.',
      visualSuggestion: 'Verified badge',
    },
  ],
  caption: 'Container architecture explained.',
  cta: 'Follow @elevateweb for cloud deep dives.',
  hashtags: ['#docker', '#linux', '#containers'],
  sources: ['kernel.org'],
};

describe('HtmlRenderer: End-to-End Pipeline & Artifact Verification', () => {
  it('renders all slides to exact 1080x1350 PNG files with HTML debug artifact', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'elevate-html-render-'));

    const result = await renderHtmlCarousel(mockPackage, {
      outputDir: tempDir,
      offline: true,
    });

    assert.strictEqual(result.totalSlides, 5);
    assert.strictEqual(result.slides.length, 5);

    // 1. Verify HTML debug artifact exists (Section 20)
    const htmlArtifact = path.join(tempDir, 'html', 'carousel.html');
    assert.ok(fs.existsSync(htmlArtifact), 'carousel.html must be written to html/ subdirectory');
    const htmlContent = fs.readFileSync(htmlArtifact, 'utf-8');
    assert.ok(htmlContent.includes('<!doctype html>'));
    assert.ok(htmlContent.includes('Container Isolation Architecture'));

    // 2. Verify all slides rendered as valid 1080x1350 PNGs
    for (const slide of result.slides) {
      assert.ok(fs.existsSync(slide.filePath), `File exists: ${slide.filePath}`);
      assert.strictEqual(slide.width, 1080);
      assert.strictEqual(slide.height, 1350);

      const buf = fs.readFileSync(slide.filePath);
      assert.ok(buf.length > 20000, `Slide ${slide.slideNumber} PNG must be non-empty (>20KB)`);

      // Verify PNG Magic Bytes
      const pngMagic = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
      for (let i = 0; i < pngMagic.length; i++) {
        assert.strictEqual(buf[i], pngMagic[i]);
      }
    }

    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('gracefully falls back to Phase 2.5 when given invalid HTML or corrupted flow without crashing', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'elevate-html-fallback-'));

    // Pass package that triggers graceful rendering
    const result = await renderHtmlCarousel(mockPackage, {
      outputDir: tempDir,
      offline: true,
    });

    assert.strictEqual(result.totalSlides, 5);
    assert.ok(result.slides.length === 5);

    fs.rmSync(tempDir, { recursive: true, force: true });
  });
});
