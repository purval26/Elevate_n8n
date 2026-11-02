#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { renderHtmlCarousel } from './renderer.ts';
import type { CarouselPackage } from '../../types/src/index.ts';

function printHelp(): void {
  console.log(`
ElevateWeb HTML Creative Renderer CLI (Phase 3)

Usage:
  npm run render-html -- <path-to-carousel.json> [options]

Options:
  -o, --output <dir>   Output directory (default: ./output/html-carousel)
  --offline            Force offline deterministic generation (default: true)
  -h, --help           Show help
`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
    printHelp();
    process.exit(0);
  }

  let inputPath: string | null = null;
  let outputDir = './output/html-carousel';
  let offline = true;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg === '-o' || arg === '--output') {
      outputDir = args[++i] || outputDir;
    } else if (arg === '--offline') {
      offline = true;
    } else if (!arg.startsWith('-')) {
      inputPath = arg;
    }
  }

  if (!inputPath) {
    console.error('Error: Please provide a valid path to a carousel JSON package.');
    process.exit(1);
  }

  const resolvedInput = path.resolve(inputPath);
  if (!fs.existsSync(resolvedInput)) {
    console.error(`Error: File not found: ${resolvedInput}`);
    process.exit(1);
  }

  let carouselPackage: CarouselPackage;
  try {
    const raw = fs.readFileSync(resolvedInput, 'utf-8');
    carouselPackage = JSON.parse(raw) as CarouselPackage;
  } catch (err) {
    console.error(
      `Error reading or parsing ${inputPath}:`,
      err instanceof Error ? err.message : String(err),
    );
    process.exit(1);
  }

  console.log(`\n🎨 ElevateWeb LLM-Native HTML/CSS Creative Renderer [Phase 3]`);
  console.log(`📄 Input: ${path.basename(resolvedInput)} ("${carouselPackage.topic.title}")`);

  const startTime = Date.now();
  try {
    const result = await renderHtmlCarousel(carouselPackage, {
      outputDir,
      offline,
    });

    const elapsed = Date.now() - startTime;
    console.log(`\n✨ Successfully rendered ${result.totalSlides} slides in ${elapsed}ms!`);
    console.log(`📁 Output Directory: ${result.outputDir}`);
    console.log(`📄 HTML Debug Artifact: ${result.htmlPath}`);
    if (result.fallbackUsed) {
      console.log(`⚠️  Note: Rendered via fallback path (${result.fallbackReason})`);
    }

    for (const slide of result.slides) {
      console.log(
        `  • slide-${String(slide.slideNumber).padStart(2, '0')}.png (${slide.width}x${slide.height})`,
      );
    }
  } catch (err) {
    console.error('\n❌ Fatal rendering error:', err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

main();
