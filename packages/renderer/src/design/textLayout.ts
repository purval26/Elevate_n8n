/**
 * Text layout, line wrapping, truncation, and XML escaping utilities for SVG rendering.
 * Ensures long text and multi-byte Unicode/CJK safely stay within canvas bounds.
 */

/**
 * Escapes characters that are special in XML/SVG.
 */
export function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Estimates the display width of a string in approximate units relative to font size.
 * Handles ASCII and full-width/CJK characters.
 */
export function estimateCharUnits(char: string): number {
  const code = char.charCodeAt(0);
  // Full-width, CJK, and emoji character ranges
  if (
    (code >= 0x1100 && code <= 0x11ff) || // Hangul Jamo
    (code >= 0x2e80 && code <= 0xa4cf) || // CJK Radicals, Kangxi, Ideographs
    (code >= 0xac00 && code <= 0xd7a3) || // Hangul Syllables
    (code >= 0xf900 && code <= 0xfaff) || // CJK Compatibility
    (code >= 0xff01 && code <= 0xff60) || // Fullwidth forms
    char.length > 1 // Multi-byte / surrogate pairs / emoji
  ) {
    return 1.1; // CJK / fullwidth
  }
  // Uppercase / wide Latin letters
  if (/[WMwmOQ@#%]/.test(char)) {
    return 0.75;
  }
  // Narrow Latin letters
  if (/[ijlrtfI1!.,:;()|]/.test(char)) {
    return 0.32;
  }
  // Standard Latin / digits
  return 0.54;
}

/**
 * Estimates the pixel width of a string at a given font size.
 */
export function estimateTextWidth(text: string, fontSize: number): number {
  let units = 0;
  for (const char of text) {
    units += estimateCharUnits(char);
  }
  return units * fontSize;
}

export interface WrapOptions {
  maxWidth: number;
  fontSize: number;
  maxLines?: number;
}

/**
 * Wraps text into lines that fit within maxWidth pixels.
 * Breaks on words if possible; falls back to character breaking for long continuous strings or CJK.
 * Clamps to maxLines with an ellipsis if specified.
 */
export function wrapText(text: string, options: WrapOptions): string[] {
  const { maxWidth, fontSize, maxLines = 10 } = options;
  if (!text || text.trim().length === 0) {
    return [];
  }

  const cleanText = text.replace(/\s+/g, ' ').trim();
  const words = cleanText.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (let i = 0; i < words.length; i++) {
    const word = words[i] ?? '';
    const testLine = currentLine.length === 0 ? word : `${currentLine} ${word}`;
    const testWidth = estimateTextWidth(testLine, fontSize);

    if (testWidth <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine.length > 0) {
        lines.push(currentLine);
        currentLine = '';
      }

      // Check if the single word itself is wider than maxWidth (e.g. huge URL, CJK string, or unbroken token)
      const wordWidth = estimateTextWidth(word, fontSize);
      if (wordWidth > maxWidth) {
        let chunk = '';
        for (const char of word) {
          const testChunk = chunk + char;
          if (estimateTextWidth(testChunk, fontSize) <= maxWidth) {
            chunk = testChunk;
          } else {
            if (chunk.length > 0) {
              lines.push(chunk);
            }
            chunk = char;
          }
        }
        currentLine = chunk;
      } else {
        currentLine = word;
      }
    }

    if (lines.length >= maxLines) {
      break;
    }
  }

  if (currentLine.length > 0 && lines.length < maxLines) {
    lines.push(currentLine);
  }

  // If there's still text left beyond maxLines, truncate the last line with ellipsis
  if (lines.length === maxLines) {
    const lastLine = lines[maxLines - 1] ?? '';
    if (!lastLine.endsWith('...')) {
      // Ensure ellipsis fits
      let truncated = lastLine;
      while (estimateTextWidth(`${truncated}...`, fontSize) > maxWidth && truncated.length > 1) {
        truncated = truncated.slice(0, -1);
      }
      lines[maxLines - 1] = `${truncated.trimEnd()}...`;
    }
  }

  return lines;
}

/**
 * Generates an SVG `<text>` element with `<tspan>` children for each wrapped line.
 */
export function renderWrappedTextSvg(
  lines: string[],
  x: number,
  startY: number,
  lineHeightPx: number,
  attributes: Record<string, string | number> = {},
): string {
  if (lines.length === 0) {
    return '';
  }

  const attrString = Object.entries(attributes)
    .map(([k, v]) => `${k}="${escapeXml(String(v))}"`)
    .join(' ');

  const tspans = lines
    .map((line, idx) => {
      const y = startY + idx * lineHeightPx;
      return `<tspan x="${x}" y="${y}">${escapeXml(line)}</tspan>`;
    })
    .join('\n    ');

  return `<text ${attrString}>\n    ${tspans}\n  </text>`;
}
