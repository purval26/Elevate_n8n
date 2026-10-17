import type { SlideTemplate, SlideRenderContext } from './types.ts';
import { createSvgShell } from './types.ts';
import { DIMENSIONS, COLORS, TYPOGRAPHY } from '../design/tokens.ts';
import { escapeXml, wrapText, renderWrappedTextSvg } from '../design/textLayout.ts';

/**
 * Template 1 — Explainer
 * Best for technical concepts, "How X works", and core educational slides.
 */
export const explainerTemplate: SlideTemplate = {
  name: 'explainer',
  render(context: SlideRenderContext): string {
    const { slide } = context;

    // Headline (Large, bold, wrapped up to 3 lines)
    const headlineLines = wrapText(slide.headline, {
      maxWidth: DIMENSIONS.contentWidth,
      fontSize: TYPOGRAPHY.fontSize.headlineLarge,
      maxLines: 3,
    });
    const headlineHeight =
      headlineLines.length * (TYPOGRAPHY.fontSize.headlineLarge * TYPOGRAPHY.lineHeight.tight);

    // Body (Editorial explanation, wrapped up to 5 lines)
    const bodyStartY = 170 + headlineHeight + 30;
    const bodyLines = wrapText(slide.body, {
      maxWidth: DIMENSIONS.contentWidth,
      fontSize: TYPOGRAPHY.fontSize.bodyLarge,
      maxLines: 5,
    });
    const bodyHeight =
      bodyLines.length * (TYPOGRAPHY.fontSize.bodyLarge * TYPOGRAPHY.lineHeight.snug);

    // Visual / Diagram container area
    const cardY = Math.max(bodyStartY + bodyHeight + 40, 520);
    const cardHeight = Math.min(680, 1220 - cardY);

    // Visual suggestion text inside the diagram card
    const suggestionLines = wrapText(slide.visualSuggestion || '', {
      maxWidth: DIMENSIONS.contentWidth - 80,
      fontSize: TYPOGRAPHY.fontSize.bodySmall,
      maxLines: 4,
    });

    const innerContent = `
  <!-- Explainer Main Content -->
  <g id="explainerContent">
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

    <!-- Explanatory Body -->
    ${renderWrappedTextSvg(
      bodyLines,
      80,
      bodyStartY,
      TYPOGRAPHY.fontSize.bodyLarge * TYPOGRAPHY.lineHeight.snug,
      {
        fill: COLORS.text.secondary,
        'font-family': TYPOGRAPHY.fontFamily.sans,
        'font-size': TYPOGRAPHY.fontSize.bodyLarge,
        'font-weight': '400',
      },
    )}

    <!-- Visual / Technical Diagram Card -->
    <g transform="translate(80, ${cardY})">
      <!-- Card Container -->
      <rect width="${DIMENSIONS.contentWidth}" height="${cardHeight}" rx="20" fill="url(#cardGrad)" stroke="${COLORS.border.medium}" stroke-width="2" />
      
      <!-- Visual Card Header -->
      <path d="M 0 20 A 20 20 0 0 1 20 0 L ${DIMENSIONS.contentWidth - 20} 0 A 20 20 0 0 1 ${DIMENSIONS.contentWidth} 20 L ${DIMENSIONS.contentWidth} 50 L 0 50 Z" fill="#131C2E" />
      <circle cx="28" cy="25" r="5" fill="#EF4444" />
      <circle cx="48" cy="25" r="5" fill="#F59E0B" />
      <circle cx="68" cy="25" r="5" fill="#10B981" />
      <text x="100" y="31" fill="${COLORS.text.muted}" font-family="${TYPOGRAPHY.fontFamily.mono}" font-size="14" font-weight="600">ARCHITECTURE &amp; CONCEPT MODEL</text>

      <!-- Inner Diagram Elements -->
      <rect x="40" y="80" width="${DIMENSIONS.contentWidth - 80}" height="${cardHeight - 120}" rx="12" fill="#0A0E17" stroke="#1E293B" stroke-width="1.5" />
      
      <!-- Diagram Icon & Technical Highlights -->
      <circle cx="100" cy="140" r="28" fill="#1E293B" stroke="${COLORS.text.accent}" stroke-width="2" />
      <polygon points="103,126 94,141 101,141 97,154 108,138 101,138" fill="${COLORS.text.accent}" />
      
      <text x="150" y="136" fill="${COLORS.text.primary}" font-family="${TYPOGRAPHY.fontFamily.sans}" font-size="24" font-weight="600">KEY TAKEAWAY</text>
      <text x="150" y="162" fill="${COLORS.text.accent}" font-family="${TYPOGRAPHY.fontFamily.mono}" font-size="18">${escapeXml(slide.type.toUpperCase())}</text>

      <!-- Diagram / Suggestion Explanation Text -->
      <g transform="translate(60, 210)">
        <text x="0" y="0" fill="${COLORS.text.muted}" font-family="${TYPOGRAPHY.fontFamily.sans}" font-size="18" font-weight="600" letter-spacing="1">TECHNICAL DETAIL:</text>
        ${renderWrappedTextSvg(suggestionLines, 0, 36, 32, {
          fill: COLORS.text.secondary,
          'font-family': TYPOGRAPHY.fontFamily.sans,
          'font-size': TYPOGRAPHY.fontSize.bodySmall,
          'font-weight': '400',
        })}
      </g>
    </g>
  </g>`;

    return createSvgShell(context, innerContent);
  },
};
