import type { SlideTemplate, SlideRenderContext } from './types.ts';
import { createSvgShell } from './types.ts';
import { DIMENSIONS, COLORS, TYPOGRAPHY } from '../design/tokens.ts';
import { escapeXml, wrapText, renderWrappedTextSvg } from '../design/textLayout.ts';

/**
 * Template 3 — Steps
 * Best for processes, workflows, sequential tutorials, and "How to" step breakdowns.
 */
export const stepsTemplate: SlideTemplate = {
  name: 'steps',
  render(context: SlideRenderContext): string {
    const { slide, totalSlides } = context;
    const stepNumber = String(slide.slideNumber).padStart(2, '0');

    // Step Progress Indicator Bar (segment bar across top)
    const segmentCount = totalSlides;
    const totalBarWidth = DIMENSIONS.contentWidth;
    const gap = 12;
    const segmentWidth = (totalBarWidth - (segmentCount - 1) * gap) / segmentCount;

    let progressBarsSvg = '';
    for (let i = 1; i <= segmentCount; i++) {
      const segX = 80 + (i - 1) * (segmentWidth + gap);
      const isPastOrCurrent = i <= slide.slideNumber;
      const fillColor = isPastOrCurrent
        ? i === slide.slideNumber
          ? COLORS.text.accent
          : '#2563EB'
        : '#1E293B';
      progressBarsSvg += `<rect x="${segX}" y="150" width="${segmentWidth}" height="8" rx="4" fill="${fillColor}" />\n`;
    }

    // Step Badge
    const badgeY = 190;

    // Headline (Large, bold)
    const headlineLines = wrapText(slide.headline, {
      maxWidth: DIMENSIONS.contentWidth,
      fontSize: TYPOGRAPHY.fontSize.headlineLarge,
      maxLines: 3,
    });
    const headlineY = badgeY + 60;
    const headlineHeight =
      headlineLines.length * (TYPOGRAPHY.fontSize.headlineLarge * TYPOGRAPHY.lineHeight.tight);

    // Body (Short explanation)
    const bodyStartY = headlineY + headlineHeight + 25;
    const bodyLines = wrapText(slide.body, {
      maxWidth: DIMENSIONS.contentWidth,
      fontSize: TYPOGRAPHY.fontSize.bodyLarge,
      maxLines: 4,
    });
    const bodyHeight =
      bodyLines.length * (TYPOGRAPHY.fontSize.bodyLarge * TYPOGRAPHY.lineHeight.snug);

    // Process / Flow visual card
    const cardY = Math.max(bodyStartY + bodyHeight + 35, 580);
    const cardHeight = Math.min(620, 1220 - cardY);

    const suggestionLines = wrapText(slide.visualSuggestion || '', {
      maxWidth: DIMENSIONS.contentWidth - 80,
      fontSize: TYPOGRAPHY.fontSize.bodySmall,
      maxLines: 4,
    });

    const innerContent = `
  <!-- Steps Main Content -->
  <g id="stepsContent">
    <!-- Progress Segment Indicator -->
    ${progressBarsSvg}

    <!-- STEP XX Pill -->
    <rect x="80" y="${badgeY}" width="150" height="42" rx="10" fill="#1E293B" stroke="${COLORS.border.medium}" stroke-width="1.5" />
    <text x="155" y="${badgeY + 28}" text-anchor="middle" fill="${COLORS.text.accent}" font-family="${TYPOGRAPHY.fontFamily.mono}" font-size="22" font-weight="700" letter-spacing="2">STEP ${stepNumber}</text>

    <!-- Headline -->
    ${renderWrappedTextSvg(
      headlineLines,
      80,
      headlineY + 30,
      TYPOGRAPHY.fontSize.headlineLarge * TYPOGRAPHY.lineHeight.tight,
      {
        fill: COLORS.text.primary,
        'font-family': TYPOGRAPHY.fontFamily.sans,
        'font-size': TYPOGRAPHY.fontSize.headlineLarge,
        'font-weight': '700',
      },
    )}

    <!-- Explanation Body -->
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

    <!-- Process / Action Card -->
    <g transform="translate(80, ${cardY})">
      <rect width="${DIMENSIONS.contentWidth}" height="${cardHeight}" rx="20" fill="url(#cardGrad)" stroke="${COLORS.border.medium}" stroke-width="2" />
      
      <!-- Card Header -->
      <path d="M 0 20 A 20 20 0 0 1 20 0 L ${DIMENSIONS.contentWidth - 20} 0 A 20 20 0 0 1 ${DIMENSIONS.contentWidth} 20 L ${DIMENSIONS.contentWidth} 50 L 0 50 Z" fill="#131C2E" />
      <text x="30" y="32" fill="${COLORS.text.accent}" font-family="${TYPOGRAPHY.fontFamily.mono}" font-size="16" font-weight="700">EXECUTION FLOW • PHASE ${stepNumber}</text>

      <!-- Step Sequence Horizontal Graphic -->
      <g transform="translate(40, 80)">
        <rect x="0" y="0" width="${DIMENSIONS.contentWidth - 80}" height="140" rx="12" fill="#0A0E17" stroke="#1E293B" stroke-width="1.5" />
        
        <!-- Sequential flow blocks -->
        <rect x="40" y="35" width="220" height="70" rx="8" fill="#1E293B" stroke="${COLORS.border.medium}" stroke-width="1.5" />
        <text x="150" y="78" text-anchor="middle" fill="${COLORS.text.muted}" font-family="${TYPOGRAPHY.fontFamily.mono}" font-size="16">INPUT STATE</text>

        <!-- Arrow 1 -->
        <path d="M 285 70 L 315 70 M 307 62 L 315 70 L 307 78" stroke="${COLORS.text.accent}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none" />

        <!-- Active Center Block -->
        <rect x="340" y="25" width="240" height="90" rx="10" fill="#172554" stroke="${COLORS.text.accent}" stroke-width="2" />
        <text x="460" y="66" text-anchor="middle" fill="${COLORS.text.accent}" font-family="${TYPOGRAPHY.fontFamily.mono}" font-size="15" font-weight="700">CURRENT OPERATION</text>
        <text x="460" y="94" text-anchor="middle" fill="${COLORS.text.primary}" font-family="${TYPOGRAPHY.fontFamily.sans}" font-size="18" font-weight="600">${escapeXml(slide.type.toUpperCase())}</text>

        <!-- Arrow 2 -->
        <path d="M 605 70 L 635 70 M 627 62 L 635 70 L 627 78" stroke="${COLORS.text.accent}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none" />

        <!-- Output Block -->
        <rect x="660" y="35" width="220" height="70" rx="8" fill="#1E293B" stroke="${COLORS.border.medium}" stroke-width="1.5" />
        <text x="770" y="78" text-anchor="middle" fill="${COLORS.text.muted}" font-family="${TYPOGRAPHY.fontFamily.mono}" font-size="16">OUTPUT RESULT</text>
      </g>

      <!-- Step Technical Directive -->
      <g transform="translate(40, 260)">
        <text x="0" y="0" fill="${COLORS.text.muted}" font-family="${TYPOGRAPHY.fontFamily.sans}" font-size="18" font-weight="600" letter-spacing="1">PROCESS DIRECTIVE:</text>
        ${renderWrappedTextSvg(suggestionLines, 0, 36, 34, {
          fill: COLORS.text.primary,
          'font-family': TYPOGRAPHY.fontFamily.sans,
          'font-size': TYPOGRAPHY.fontSize.bodyMedium,
          'font-weight': '400',
        })}
      </g>
    </g>
  </g>`;

    return createSvgShell(context, innerContent);
  },
};
