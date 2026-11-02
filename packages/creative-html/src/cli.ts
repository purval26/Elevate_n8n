#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { renderHtmlCarousel } from './renderer.ts';
import type { CarouselPackage } from '../../types/src/index.ts';

// Load .env from project root if present
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

function printHelp(): void {
  console.log(`
ElevateWeb HTML Creative Renderer CLI (Phase 3.1)

Usage:
  npm run render-html -- <path-to-carousel.json> [options]

Options:
  -o, --output <dir>    Output directory (default: ./output/html-carousel)
  --live, --ai          Enable live LLM creative generation (OpenRouter / OpenAI)
  --offline             Force offline deterministic generation (default when no key is present)
  --model <model>       Model name (default: nvidia/nemotron-3-ultra:free or gpt-4o)
  --api-key <key>       API key (overrides OPENROUTER_API_KEY / OPENAI_API_KEY)
  --base-url <url>      Custom API baseURL (e.g. https://openrouter.ai/api/v1)
  -h, --help            Show help
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
  let offline: boolean | undefined = undefined;
  let model: string | undefined = undefined;
  let apiKey: string | undefined = undefined;
  let baseURL: string | undefined = undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg === '-i' || arg === '--input') {
      inputPath = args[++i] || inputPath;
    } else if (arg === '-o' || arg === '--output') {
      outputDir = args[++i] || outputDir;
    } else if (arg === '--offline') {
      offline = true;
    } else if (arg === '--live' || arg === '--ai') {
      offline = false;
    } else if (arg === '--model') {
      model = args[++i];
    } else if (arg === '--api-key') {
      apiKey = args[++i];
    } else if (arg === '--base-url') {
      baseURL = args[++i];
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

  // Determine provider mode for terminal banner
  const cleanKey = (key?: string) =>
    key && !key.startsWith('your_') && !key.startsWith('<') && key.length > 10 ? key : undefined;
  const orKey = cleanKey(process.env.OPENROUTER_API_KEY);
  const oaKey = cleanKey(process.env.OPENAI_API_KEY);
  const cliKey = cleanKey(apiKey);
  const effectiveKey = cliKey || orKey || oaKey;

  const isRunningLive = offline === false || (offline === undefined && Boolean(effectiveKey));
  const isOpenRouter = Boolean(orKey || (effectiveKey && effectiveKey.startsWith('sk-or-')));
  const defaultModel = isOpenRouter
    ? process.env.OPENROUTER_MODEL || 'cohere/north-mini-code:free'
    : process.env.OPENAI_MODEL || 'gpt-4o';
  const displayModel = model || defaultModel;

  const providerLabel = isRunningLive
    ? isOpenRouter
      ? `OpenRouter [${displayModel}]`
      : `OpenAI [${displayModel}]`
    : 'Deterministic Creative Designer (Offline)';

  console.log(`\n🎨 ElevateWeb LLM-Native HTML/CSS Creative Renderer [Phase 3.1]`);
  console.log(`📄 Input: ${path.basename(resolvedInput)} ("${carouselPackage.topic.title}")`);
  console.log(`🧠 Mode: ${providerLabel}`);

  const startTime = Date.now();
  try {
    const result = await renderHtmlCarousel(carouselPackage, {
      outputDir,
      offline: isRunningLive ? false : true,
      apiKey,
      model,
      baseURL,
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
