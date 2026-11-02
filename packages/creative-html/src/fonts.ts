import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to packages/renderer/assets/fonts
const FONTS_DIR = path.resolve(__dirname, '../../renderer/assets/fonts');

interface FontDef {
  family: string;
  weight: number | string;
  style: string;
  fileName: string;
}

const BUNDLED_FONTS: FontDef[] = [
  { family: 'Outfit', weight: 400, style: 'normal', fileName: 'Outfit-Regular.ttf' },
  { family: 'Outfit', weight: 500, style: 'normal', fileName: 'Outfit-Medium.ttf' },
  { family: 'Outfit', weight: 600, style: 'normal', fileName: 'Outfit-SemiBold.ttf' },
  { family: 'Outfit', weight: 700, style: 'normal', fileName: 'Outfit-Bold.ttf' },
  { family: 'Space Mono', weight: 400, style: 'normal', fileName: 'SpaceMono-Regular.ttf' },
  { family: 'Space Mono', weight: 700, style: 'normal', fileName: 'SpaceMono-Bold.ttf' },
];

let cachedFontFaceCss: string | null = null;

/**
 * Returns the CSS @font-face rules with base64 data URIs for all bundled fonts.
 * Ensures Playwright and browsers load local fonts without network requests.
 */
export function getBundledFontFaceCss(): string {
  if (cachedFontFaceCss) {
    return cachedFontFaceCss;
  }

  const rules: string[] = [];

  for (const font of BUNDLED_FONTS) {
    const fullPath = path.join(FONTS_DIR, font.fileName);
    if (fs.existsSync(fullPath)) {
      const buffer = fs.readFileSync(fullPath);
      const b64 = buffer.toString('base64');
      rules.push(
        `
@font-face {
  font-family: '${font.family}';
  font-style: ${font.style};
  font-weight: ${font.weight};
  font-display: block;
  src: url('data:font/truetype;charset=utf-8;base64,${b64}') format('truetype');
}
      `.trim(),
      );
    }
  }

  cachedFontFaceCss = rules.join('\n\n');
  return cachedFontFaceCss;
}

/**
 * Verifies that the bundled font files exist in the repository.
 */
export function verifyBundledFontsExist(): { loaded: boolean; missing: string[] } {
  const missing: string[] = [];
  for (const font of BUNDLED_FONTS) {
    const fullPath = path.join(FONTS_DIR, font.fileName);
    if (!fs.existsSync(fullPath)) {
      missing.push(font.fileName);
    }
  }
  return { loaded: missing.length === 0, missing };
}
