#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { renderCarousel } from './render.ts';

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
ElevateWeb Carousel Renderer CLI
Usage:
  npm run render -- <path-to-carousel.json> [options]

Options:
  --output, -o <dir>      Output directory for rendered PNGs (default: ./output)
  --template, -t <name>   Template override (explainer, comparison, steps, statement, diagram)
  --help, -h              Show this help message

Example:
  npm run render -- ./examples/how-dns-works.json --output ./output
`);
    process.exit(0);
  }

  let inputPath = '';
  let outputDir = './output';
  let templateOverride: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg === '--output' || arg === '-o') {
      outputDir = args[++i] || './output';
    } else if (arg === '--template' || arg === '-t') {
      templateOverride = args[++i];
    } else if (!arg.startsWith('-')) {
      inputPath = arg;
    }
  }

  if (!inputPath) {
    console.error('Error: Please provide a path to a carousel JSON file.');
    process.exit(1);
  }

  const resolvedInput = path.resolve(inputPath);
  if (!fs.existsSync(resolvedInput)) {
    console.error(`Error: File not found at ${resolvedInput}`);
    process.exit(1);
  }

  let rawJson: string;
  try {
    rawJson = fs.readFileSync(resolvedInput, 'utf-8');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Error reading file: ${message}`);
    process.exit(1);
  }

  let carouselData: unknown;
  try {
    carouselData = JSON.parse(rawJson);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Error parsing JSON: ${message}`);
    process.exit(1);
  }

  console.log(`\n🚀 Rendering ElevateWeb Carousel from: ${path.basename(resolvedInput)}`);
  const startTime = Date.now();

  try {
    const result = await renderCarousel(carouselData, {
      outputDir,
      templateOverride,
    });

    const elapsedMs = Date.now() - startTime;
    console.log(`\n✨ Successfully rendered ${result.totalSlides} slides in ${elapsedMs}ms!`);
    console.log(`📁 Output Directory: ${result.outputDir}\n`);

    result.slides.forEach((slide) => {
      console.log(
        `  • slide-${String(slide.slideNumber).padStart(2, '0')}.png (${slide.width}x${slide.height}) [Template: ${slide.templateName}]`,
      );
    });
    console.log('');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`\n❌ Rendering failed: ${message}\n`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Unexpected CLI error:', err);
  process.exit(1);
});
