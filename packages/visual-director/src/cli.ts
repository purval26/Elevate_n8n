#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { directCarouselVisuals } from './director.ts';
import type { CarouselPackage } from './schema.ts';

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
ElevateWeb AI Visual Director CLI
Usage:
  npm run visual-design -- <path-to-carousel.json> [options]

Options:
  --output, -o <file>     Output file path for visual specification (default: ./visual-spec.json)
  --help, -h              Show this help message

Example:
  npm run visual-design -- ./examples/how-dns-works.json --output ./visual-spec.json
`);
    process.exit(0);
  }

  let inputPath = '';
  let outputPath = './visual-spec.json';

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg === '--output' || arg === '-o') {
      outputPath = args[++i] || './visual-spec.json';
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

  const rawJson = fs.readFileSync(resolvedInput, 'utf-8');
  const carousel = JSON.parse(rawJson) as CarouselPackage;

  console.log(
    `\n🎨 Directing Visuals for: "${carousel.topic.title}" (${carousel.slides.length} slides)`,
  );

  const spec = await directCarouselVisuals(carousel);

  fs.mkdirSync(path.dirname(path.resolve(outputPath)), { recursive: true });
  fs.writeFileSync(path.resolve(outputPath), JSON.stringify(spec, null, 2), 'utf-8');

  console.log(`\n✨ Successfully generated VisualSpecification: ${outputPath}`);
  console.log(`\nSlide Breakdowns:`);
  spec.slides.forEach((s) => {
    const illStr = s.illustration?.required
      ? ` [Illustration: ${s.illustration.visualConcept}]`
      : '';
    console.log(
      `  • Slide ${s.slideNumber}: Strategy="${s.visualStrategy}" | Composition="${s.composition}"${illStr}`,
    );
  });
  console.log('');
}

main().catch((err) => {
  console.error('Unexpected CLI error:', err);
  process.exit(1);
});
