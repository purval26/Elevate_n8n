import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { renderCarousel } from '../src/render.ts';
import type { CarouselPackage } from '../../types/src/index.ts';

const smokePackage: CarouselPackage = {
  topic: {
    title: 'How DNS Works',
    pillar: 'tech_explained',
  },
  hook: 'Ever wondered what happens between typing a URL and seeing the page load?',
  slides: [
    {
      slideNumber: 1,
      type: 'hook',
      headline: 'The Internet’s Phonebook Explained',
      body: 'DNS translates human-readable domain names into machine-readable IP addresses in under 50 milliseconds.',
      visualSuggestion: 'Browser address bar resolving to 192.0.2.1',
    },
    {
      slideNumber: 2,
      type: 'concept',
      headline: 'The Recursive Resolver Lookup',
      body: 'Your ISP or recursive DNS resolver checks its local cache before querying the internet root nameservers.',
      visualSuggestion: 'Client -> Recursive Resolver -> Root Nameserver',
    },
    {
      slideNumber: 3,
      type: 'comparison',
      headline: 'Authoritative vs Recursive DNS',
      body: 'Recursive resolvers hunt down the answer. Authoritative nameservers hold the actual canonical records.',
      visualSuggestion: 'Comparison of query workflow vs definitive DNS records',
    },
    {
      slideNumber: 4,
      type: 'architecture',
      headline: 'Hierarchical Server Chain',
      body: 'Resolution traverses Root (.) to TLD (.com) to Authoritative nameservers in a strict hierarchy.',
      visualSuggestion: 'Root Servers -> TLD Servers -> Authoritative Nameservers',
    },
    {
      slideNumber: 5,
      type: 'breakdown',
      headline: 'Record Types: A, CNAME, & MX',
      body: 'A records map to IPv4, AAAA to IPv6, CNAME to canonical alias names, and MX routes mail.',
      visualSuggestion: 'DNS zone file records breakdown',
    },
    {
      slideNumber: 6,
      type: 'takeaway',
      headline: 'DNS Powers Every Web Request',
      body: 'Without caching and distributed nameservers, the modern internet could not scale. Understand the protocol.',
      visualSuggestion: 'ElevateWeb systems engineering badge and summary',
    },
  ],
  caption: 'DNS is the backbone of the internet. Here is how resolution works in 6 steps.',
  cta: 'Save this guide and follow @elevateweb for weekly architecture breakdowns.',
  hashtags: ['#dns', '#networking', '#systems', '#webdev'],
  sources: ['RFC 1034', 'RFC 1035'],
};

describe('Visual Smoke Tests: Programmatic PNG Inspection', () => {
  it('should render all slides to 1080x1350 PNG files with valid PNG signatures', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'elevate-smoke-'));

    const result = await renderCarousel(smokePackage, { outputDir: tempDir });

    assert.strictEqual(result.slides.length, 6);

    for (const slide of result.slides) {
      assert.ok(fs.existsSync(slide.filePath), `File exists: ${slide.filePath}`);

      const buffer = fs.readFileSync(slide.filePath);

      // Verify file is substantial (> 20KB for high-res 1080x1350)
      assert.ok(
        buffer.length > 20000,
        `File ${path.basename(slide.filePath)} size should be > 20KB, got ${buffer.length} bytes`,
      );

      // Verify PNG Magic Bytes: 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A
      const pngMagic = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
      for (let i = 0; i < pngMagic.length; i++) {
        assert.strictEqual(buffer[i], pngMagic[i], `PNG signature byte mismatch at index ${i}`);
      }

      // Verify IHDR width and height:
      // In PNG format:
      // Bytes 12-15: "IHDR"
      // Bytes 16-19: Width (uint32 big-endian)
      // Bytes 20-23: Height (uint32 big-endian)
      const ihdrChunkType = buffer.toString('ascii', 12, 16);
      assert.strictEqual(ihdrChunkType, 'IHDR');

      const width = buffer.readUInt32BE(16);
      const height = buffer.readUInt32BE(20);

      assert.strictEqual(width, 1080, 'Rendered PNG width must be exactly 1080px');
      assert.strictEqual(height, 1350, 'Rendered PNG height must be exactly 1350px');

      // Verify bit depth (byte 24) is 8-bit
      const bitDepth = buffer.readUInt8(24);
      assert.strictEqual(bitDepth, 8, 'Rendered PNG bit depth must be 8-bit');
    }

    // Clean up
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should be deterministic: same input produces identical PNG bytes', async () => {
    const tempDirA = fs.mkdtempSync(path.join(os.tmpdir(), 'elevate-det-a-'));
    const tempDirB = fs.mkdtempSync(path.join(os.tmpdir(), 'elevate-det-b-'));

    const resultA = await renderCarousel(smokePackage, { outputDir: tempDirA });
    const resultB = await renderCarousel(smokePackage, { outputDir: tempDirB });

    for (let i = 0; i < resultA.slides.length; i++) {
      const bufA = fs.readFileSync(resultA.slides[i]!.filePath);
      const bufB = fs.readFileSync(resultB.slides[i]!.filePath);
      assert.ok(bufA.equals(bufB), `Slide ${i + 1} render must be 100% deterministic between runs`);
    }

    // Clean up
    fs.rmSync(tempDirA, { recursive: true, force: true });
    fs.rmSync(tempDirB, { recursive: true, force: true });
  });
});
