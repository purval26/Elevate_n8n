import type { SlideTemplate, SlideRenderContext } from './types.ts';
import { createSvgShell } from './types.ts';
import { DIMENSIONS, COLORS, TYPOGRAPHY, BRAND } from '../design/tokens.ts';
import { escapeXml, wrapText, renderWrappedTextSvg } from '../design/textLayout.ts';

/**
 * Template 4 — Statement
 * Best for hooks (Slide 1), bold takeaways, principles, and high-impact calls to action.
 */
export const statementTemplate: SlideTemplate = {
  name: 'statement',
  render(context: SlideRenderContext): string {
    const { slide, topic } = context;

    // Statement / Headline (Massive, bold, editorial statement)
    const statementLines = wrapText(slide.headline, {
      maxWidth: DIMENSIONS.contentWidth - 60,
      fontSize: 60,
      maxLines: 4,
    });
    const statementHeight = statementLines.length * (60 * 1.2);

    // Supporting Explanation / Body
    const bodyStartY = 200 + statementHeight + 50;
    const bodyLines = wrapText(slide.body, {
      maxWidth: DIMENSIONS.contentWidth - 80,
      fontSize: TYPOGRAPHY.fontSize.bodyLarge,
      maxLines: 6,
    });
    const bodyHeight =
      bodyLines.length * (TYPOGRAPHY.fontSize.bodyLarge * TYPOGRAPHY.lineHeight.normal);

    // Brand / Action Highlight card at bottom
    const cardY = Math.max(bodyStartY + bodyHeight + 50, 760);
    const cardHeight = Math.min(440, 1220 - cardY);

    const calloutLines = wrapText(slide.visualSuggestion || topic.title, {
      maxWidth: DIMENSIONS.contentWidth - 100,
      fontSize: TYPOGRAPHY.fontSize.bodyMedium,
      maxLines: 3,
    });

    const isHook = slide.type === 'hook' || slide.slideNumber === 1;
    const badgeLabel = isHook ? 'THE HOOK' : 'KEY PRINCIPLE';

    const innerContent = `
  <!-- Statement Main Content -->
  <g id="statementContent">
    <!-- Big Quote Mark Background Graphic -->
    <text x="70" y="270" fill="#1E293B" font-family="${TYPOGRAPHY.fontFamily.sans}" font-size="180" font-weight="900" opacity="0.3">“</text>

    <!-- Category / Type Pill -->
    <rect x="80" y="160" width="160" height="34" rx="8" fill="#1E293B" />
    <text x="160" y="184" text-anchor="middle" fill="${COLORS.text.accent}" font-family="${TYPOGRAPHY.fontFamily.mono}" font-size="16" font-weight="700" letter-spacing="1.5">${badgeLabel}</text>

    <!-- Large Statement Headline with Left Accent Bar -->
    <g transform="translate(80, 230)">
      <rect x="0" y="10" width="8" height="${statementHeight + 20}" rx="4" fill="url(#accentLine)" />
      <g transform="translate(40, 0)">
        ${renderWrappedTextSvg(statementLines, 0, 48, 60 * 1.2, {
          fill: COLORS.text.primary,
          'font-family': TYPOGRAPHY.fontFamily.sans,
          'font-size': '60',
          'font-weight': '800',
        })}
      </g>
    </g>

    <!-- Supporting Explanation -->
    <g transform="translate(120, ${bodyStartY})">
      ${renderWrappedTextSvg(
        bodyLines,
        0,
        0,
        TYPOGRAPHY.fontSize.bodyLarge * TYPOGRAPHY.lineHeight.normal,
        {
          fill: COLORS.text.secondary,
          'font-family': TYPOGRAPHY.fontFamily.sans,
          'font-size': TYPOGRAPHY.fontSize.bodyLarge,
          'font-weight': '400',
        },
      )}
    </g>

    <!-- Brand Statement Card Bottom -->
    <g transform="translate(80, ${cardY})">
      <rect width="${DIMENSIONS.contentWidth}" height="${cardHeight}" rx="20" fill="url(#cardGrad)" stroke="${COLORS.border.medium}" stroke-width="2" />
      <rect x="0" y="0" width="${DIMENSIONS.contentWidth}" height="4" fill="url(#accentLine)" />

      <!-- Official ElevateWeb Brand Logo Mark -->
      <g transform="translate(45, 42) scale(0.12)">
        <rect fill="url(#logoGrad1)" x="45.66" y="146.54" width="275.64" height="73.66" rx="36.83" transform="translate(-120.92 138.56) rotate(-45)" />
        <rect fill="url(#logoGrad2)" x="190.16" y="291.04" width="275.64" height="73.66" rx="36.83" transform="translate(-180.77 283.06) rotate(-45)" />
        <rect fill="#3B82F6" x="15.42" y="321.29" width="275.64" height="73.66" rx="36.83" transform="translate(-253.34 168.35) rotate(-45)" />
        <rect fill="#3B82F6" x="220.4" y="116.3" width="275.64" height="73.66" rx="36.83" transform="translate(-48.35 253.26) rotate(-45)" />
      </g>

      <text x="110" y="65" fill="${COLORS.text.primary}" font-family="${TYPOGRAPHY.fontFamily.sans}" font-size="24" font-weight="700">${escapeXml(BRAND.name)}</text>
      <text x="110" y="90" fill="${COLORS.text.muted}" font-family="${TYPOGRAPHY.fontFamily.mono}" font-size="16">${escapeXml(BRAND.tagline)}</text>

      <g transform="translate(50, 140)">
        <rect x="0" y="0" width="${DIMENSIONS.contentWidth - 100}" height="2" fill="#1E293B" />
        <g transform="translate(0, 36)">
          ${renderWrappedTextSvg(calloutLines, 0, 0, 32, {
            fill: COLORS.text.accent,
            'font-family': TYPOGRAPHY.fontFamily.sans,
            'font-size': TYPOGRAPHY.fontSize.bodySmall,
            'font-weight': '500',
          })}
        </g>
      </g>
    </g>
  </g>`;

    return createSvgShell(context, innerContent);
  },
};
