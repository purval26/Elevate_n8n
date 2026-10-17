import type { SlideTemplate, SlideRenderContext } from './types.ts';
import { createSvgShell } from './types.ts';
import { DIMENSIONS, COLORS, TYPOGRAPHY } from '../design/tokens.ts';
import { escapeXml, wrapText, renderWrappedTextSvg } from '../design/textLayout.ts';

/**
 * Template 2 — Comparison
 * Best for A vs B, technology comparisons, tradeoffs, and side-by-side evaluations.
 */
export const comparisonTemplate: SlideTemplate = {
  name: 'comparison',
  render(context: SlideRenderContext): string {
    const { slide } = context;

    // Headline (Large, bold)
    const headlineLines = wrapText(slide.headline, {
      maxWidth: DIMENSIONS.contentWidth,
      fontSize: TYPOGRAPHY.fontSize.headlineLarge,
      maxLines: 2,
    });
    const headlineHeight =
      headlineLines.length * (TYPOGRAPHY.fontSize.headlineLarge * TYPOGRAPHY.lineHeight.tight);

    // Extract subjects A and B from headline if format is "A vs B" or "A versus B"
    let labelA = 'OPTION A';
    let labelB = 'OPTION B';
    const vsMatch = slide.headline.match(/(.*?)\s+(?:vs\.?|versus)\s+(.*)/i);
    if (vsMatch && vsMatch[1] && vsMatch[2]) {
      labelA = vsMatch[1].trim().toUpperCase().slice(0, 25);
      labelB = vsMatch[2].trim().toUpperCase().slice(0, 25);
    }

    // Split body into comparison points for Column A and Column B
    // Fall back to splitting sentences or halves
    const sentences = slide.body.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 0);
    let textA = '';
    let textB = '';

    if (sentences.length >= 2) {
      const mid = Math.ceil(sentences.length / 2);
      textA = sentences.slice(0, mid).join(' ');
      textB = sentences.slice(mid).join(' ');
    } else {
      textA = slide.body;
      textB = slide.visualSuggestion;
    }

    const colWidth = 440;
    const colGap = 40;
    const gridY = 170 + headlineHeight + 40;
    const cardHeight = 620;

    const linesA = wrapText(textA, {
      maxWidth: colWidth - 60,
      fontSize: TYPOGRAPHY.fontSize.bodyMedium,
      maxLines: 10,
    });

    const linesB = wrapText(textB, {
      maxWidth: colWidth - 60,
      fontSize: TYPOGRAPHY.fontSize.bodyMedium,
      maxLines: 10,
    });

    // Bottom takeaway area
    const takeawayY = gridY + cardHeight + 35;
    const takeawayLines = wrapText(slide.visualSuggestion || slide.body, {
      maxWidth: DIMENSIONS.contentWidth - 60,
      fontSize: TYPOGRAPHY.fontSize.bodySmall,
      maxLines: 3,
    });

    const innerContent = `
  <!-- Comparison Main Content -->
  <g id="comparisonContent">
    <!-- Headline -->
    ${renderWrappedTextSvg(
      headlineLines,
      80,
      190,
      TYPOGRAPHY.fontSize.headlineLarge * TYPOGRAPHY.lineHeight.tight,
      {
        fill: COLORS.text.primary,
        'font-family': TYPOGRAPHY.fontFamily.sans,
        'font-size': TYPOGRAPHY.fontSize.headlineLarge,
        'font-weight': '700',
      },
    )}

    <!-- Two-Column Grid: Option A and Option B -->
    <g transform="translate(80, ${gridY})">
      <!-- Column A (Left) -->
      <g>
        <rect width="${colWidth}" height="${cardHeight}" rx="20" fill="url(#cardGrad)" stroke="${COLORS.border.medium}" stroke-width="2" />
        <!-- Top accent banner -->
        <path d="M 0 20 A 20 20 0 0 1 20 0 L ${colWidth - 20} 0 A 20 20 0 0 1 ${colWidth} 20 L ${colWidth} 60 L 0 60 Z" fill="#172554" />
        <rect x="0" y="0" width="${colWidth}" height="4" fill="${COLORS.text.accent}" />
        <text x="30" y="38" fill="${COLORS.text.accent}" font-family="${TYPOGRAPHY.fontFamily.mono}" font-size="20" font-weight="700" letter-spacing="1.5">${escapeXml(labelA)}</text>

        <!-- Column A Body -->
        <g transform="translate(30, 100)">
          ${renderWrappedTextSvg(linesA, 0, 0, 36, {
            fill: COLORS.text.secondary,
            'font-family': TYPOGRAPHY.fontFamily.sans,
            'font-size': TYPOGRAPHY.fontSize.bodyMedium,
            'font-weight': '400',
          })}
        </g>
      </g>

      <!-- Column B (Right) -->
      <g transform="translate(${colWidth + colGap}, 0)">
        <rect width="${colWidth}" height="${cardHeight}" rx="20" fill="url(#cardGrad)" stroke="${COLORS.border.medium}" stroke-width="2" />
        <!-- Top accent banner -->
        <path d="M 0 20 A 20 20 0 0 1 20 0 L ${colWidth - 20} 0 A 20 20 0 0 1 ${colWidth} 20 L ${colWidth} 60 L 0 60 Z" fill="#2E1065" />
        <rect x="0" y="0" width="${colWidth}" height="4" fill="${COLORS.text.accentSecondary}" />
        <text x="30" y="38" fill="${COLORS.text.accentSecondary}" font-family="${TYPOGRAPHY.fontFamily.mono}" font-size="20" font-weight="700" letter-spacing="1.5">${escapeXml(labelB)}</text>

        <!-- Column B Body -->
        <g transform="translate(30, 100)">
          ${renderWrappedTextSvg(linesB, 0, 0, 36, {
            fill: COLORS.text.secondary,
            'font-family': TYPOGRAPHY.fontFamily.sans,
            'font-size': TYPOGRAPHY.fontSize.bodyMedium,
            'font-weight': '400',
          })}
        </g>
      </g>
    </g>

    <!-- Bottom Takeaway Card -->
    <g transform="translate(80, ${takeawayY})">
      <rect width="${DIMENSIONS.contentWidth}" height="140" rx="16" fill="#0F172A" stroke="${COLORS.border.medium}" stroke-width="1.5" />
      <text x="30" y="38" fill="${COLORS.text.emerald}" font-family="${TYPOGRAPHY.fontFamily.sans}" font-size="18" font-weight="700" letter-spacing="2">KEY VERDICT &amp; TRADEOFF</text>
      <g transform="translate(30, 72)">
        ${renderWrappedTextSvg(takeawayLines, 0, 0, 30, {
          fill: COLORS.text.primary,
          'font-family': TYPOGRAPHY.fontFamily.sans,
          'font-size': TYPOGRAPHY.fontSize.bodySmall,
          'font-weight': '500',
        })}
      </g>
    </g>
  </g>`;

    return createSvgShell(context, innerContent);
  },
};
