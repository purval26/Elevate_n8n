import type { SlideTemplate, SlideRenderContext } from './types.ts';
import { createSvgShell } from './types.ts';
import { DIMENSIONS, COLORS, TYPOGRAPHY } from '../design/tokens.ts';
import { escapeXml, wrapText, renderWrappedTextSvg } from '../design/textLayout.ts';

/**
 * Template 5 — Diagram
 * Best for system architecture, request flows, network protocols, and multi-component technical flows.
 */
export const diagramTemplate: SlideTemplate = {
  name: 'diagram',
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

    // Short Explanation / Subtitle
    const bodyStartY = 170 + headlineHeight + 25;
    const bodyLines = wrapText(slide.body, {
      maxWidth: DIMENSIONS.contentWidth,
      fontSize: TYPOGRAPHY.fontSize.bodyMedium,
      maxLines: 3,
    });
    const bodyHeight =
      bodyLines.length * (TYPOGRAPHY.fontSize.bodyMedium * TYPOGRAPHY.lineHeight.snug);

    // Structured Technical Diagram Canvas
    const diagramY = Math.max(bodyStartY + bodyHeight + 35, 420);
    const diagramHeight = Math.min(680, 1220 - diagramY);

    // Extract or formulate 3 sequential architecture nodes
    // Try splitting visualSuggestion or body on '->' or ',' or ';' or newlines
    let nodeNames = ['Client Request', 'Service Gateway / Logic', 'Database / Network Host'];
    if (slide.visualSuggestion && slide.visualSuggestion.includes('->')) {
      const parts = slide.visualSuggestion
        .split('->')
        .map((p) => p.trim())
        .filter((p) => p.length > 0);
      if (parts.length >= 2) {
        nodeNames = parts.slice(0, 3);
      }
    } else if (slide.visualSuggestion) {
      const parts = slide.visualSuggestion
        .split(/[,.;]/)
        .map((p) => p.trim())
        .filter((p) => p.length > 0);
      if (parts.length >= 3) {
        nodeNames = parts.slice(0, 3);
      }
    }

    const nodeHeight = 120;
    const arrowHeight = 44;
    const nodeWidth = DIMENSIONS.contentWidth - 120;

    let nodesSvg = '';
    const startNodeY = 60;

    nodeNames.forEach((name, index) => {
      const y = startNodeY + index * (nodeHeight + arrowHeight);
      const isFirst = index === 0;
      const isLast = index === nodeNames.length - 1;
      const isMid = !isFirst && !isLast;

      const badgeColor = isFirst
        ? COLORS.text.accent
        : isMid
          ? COLORS.text.accentSecondary
          : COLORS.text.emerald;
      const badgeText = `STAGE ${String(index + 1).padStart(2, '0')}`;

      // Box
      nodesSvg += `
      <g transform="translate(60, ${y})">
        <rect width="${nodeWidth}" height="${nodeHeight}" rx="14" fill="#0E1626" stroke="${COLORS.border.medium}" stroke-width="2" />
        <rect x="0" y="0" width="6" height="${nodeHeight}" rx="3" fill="${badgeColor}" />
        
        <!-- Stage badge -->
        <rect x="30" y="22" width="100" height="26" rx="6" fill="#1E293B" />
        <text x="80" y="40" text-anchor="middle" fill="${badgeColor}" font-family="${TYPOGRAPHY.fontFamily.mono}" font-size="13" font-weight="700" letter-spacing="1">${badgeText}</text>

        <!-- Node Title -->
        <text x="30" y="82" fill="${COLORS.text.primary}" font-family="${TYPOGRAPHY.fontFamily.sans}" font-size="24" font-weight="600">${escapeXml(name.slice(0, 50))}</text>
      </g>`;

      // Connecting Arrow down (if not last)
      if (!isLast) {
        const arrowY = y + nodeHeight;
        nodesSvg += `
        <g transform="translate(${DIMENSIONS.contentWidth / 2}, ${arrowY})">
          <line x1="0" y1="6" x2="0" y2="${arrowHeight - 8}" stroke="${COLORS.text.accent}" stroke-width="2.5" stroke-dasharray="4,4" />
          <polygon points="-6,${arrowHeight - 8} 6,${arrowHeight - 8} 0,${arrowHeight}" fill="${COLORS.text.accent}" />
        </g>`;
      }
    });

    const innerContent = `
  <!-- Diagram Main Content -->
  <g id="diagramContent">
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

    <!-- Short Explanation -->
    ${renderWrappedTextSvg(
      bodyLines,
      80,
      bodyStartY,
      TYPOGRAPHY.fontSize.bodyMedium * TYPOGRAPHY.lineHeight.snug,
      {
        fill: COLORS.text.secondary,
        'font-family': TYPOGRAPHY.fontFamily.sans,
        'font-size': TYPOGRAPHY.fontSize.bodyMedium,
        'font-weight': '400',
      },
    )}

    <!-- Technical Flowchart Card -->
    <g transform="translate(80, ${diagramY})">
      <rect width="${DIMENSIONS.contentWidth}" height="${diagramHeight}" rx="20" fill="url(#cardGrad)" stroke="${COLORS.border.medium}" stroke-width="2" />
      
      <!-- Card Title Bar -->
      <path d="M 0 20 A 20 20 0 0 1 20 0 L ${DIMENSIONS.contentWidth - 20} 0 A 20 20 0 0 1 ${DIMENSIONS.contentWidth} 20 L ${DIMENSIONS.contentWidth} 50 L 0 50 Z" fill="#131C2E" />
      <text x="30" y="32" fill="${COLORS.text.muted}" font-family="${TYPOGRAPHY.fontFamily.mono}" font-size="16" font-weight="600">SYSTEM ARCHITECTURE FLOW</text>

      <!-- Flow Nodes -->
      ${nodesSvg}
    </g>
  </g>`;

    return createSvgShell(context, innerContent);
  },
};
