import fs from 'node:fs';
import { COLORS, TYPOGRAPHY, DIMENSIONS } from './design/tokens.ts';
import { wrapText, renderWrappedTextSvg, escapeXml } from './design/textLayout.ts';
import { createSvgShell, type SlideRenderContext } from './templates/types.ts';
import { comparisonTemplate } from './templates/comparison.ts';
import { diagramTemplate } from './templates/diagram.ts';
import type { SlideVisualSpecification, IllustrationAsset } from '../../types/src/index.ts';

export interface VisualSpecRenderOptions {
  illustrationAsset?: IllustrationAsset;
}

function getAssetDataUri(asset?: IllustrationAsset): string | null {
  if (!asset) return null;
  if (asset.dataUri) return asset.dataUri;

  if (fs.existsSync(asset.path)) {
    const buffer = fs.readFileSync(asset.path);
    const mime = asset.mimeType || (asset.path.endsWith('.svg') ? 'image/svg+xml' : 'image/png');
    return `data:${mime};base64,${buffer.toString('base64')}`;
  }

  return null;
}

export function renderVisualSpecToSvg(
  context: SlideRenderContext,
  spec: SlideVisualSpecification,
  options?: VisualSpecRenderOptions,
): string {
  const asset = options?.illustrationAsset;
  const dataUri = getAssetDataUri(asset);

  // If no illustration asset is available but one was required and no fallback was applied,
  // or if the spec specifically requests a comparison template, delegate
  if (!dataUri && spec.visualStrategy === 'comparison') {
    return comparisonTemplate.render(context);
  }

  const composition = spec.composition;

  // Dispatch based on composition primitive
  switch (composition) {
    case 'hero-right':
    case 'split-50':
    case 'split-60-40':
    case 'illustration-with-side-copy':
      return renderHeroSide(context, spec, dataUri, 'right');

    case 'hero-left':
      return renderHeroSide(context, spec, dataUri, 'left');

    case 'centered-hero':
    case 'full-width-illustration':
    case 'illustration-with-callouts':
      return renderCenteredHero(context, spec, dataUri);

    case 'big-type':
      return renderBigType(context, spec);

    case 'process-flow':
    case 'vertical-process':
      return renderProcessFlow(context, spec);

    case 'comparison':
    case 'before-after':
      return comparisonTemplate.render(context);

    case 'diagram-focus':
      return diagramTemplate.render(context);

    case 'takeaway':
      return renderTakeaway(context, spec);

    case 'editorial-stack':
    default:
      return renderEditorialStack(context, spec, dataUri);
  }
}

function getSlideText(
  context: SlideRenderContext,
  spec: SlideVisualSpecification,
): { headline: string; body: string } {
  const headline = spec.elements.find((e) => e.type === 'headline')?.text || context.slide.headline;
  const body = spec.elements.find((e) => e.type === 'body')?.text || context.slide.body;
  return { headline, body };
}

/**
 * Split composition: Copy on one side, Illustration / Graphic on the other.
 */
function renderHeroSide(
  context: SlideRenderContext,
  spec: SlideVisualSpecification,
  dataUri: string | null,
  heroSide: 'left' | 'right',
): string {
  const { headline, body } = getSlideText(context, spec);

  const colW = 430;
  const textX = heroSide === 'right' ? 80 : 80 + colW + 60;
  const heroX = heroSide === 'right' ? 80 + colW + 60 : 80;

  const headlineLines = wrapText(headline, { fontSize: 46, maxWidth: colW });
  const headlineHeight = headlineLines.length * 56;
  const bodyLines = wrapText(body, { fontSize: 28, maxWidth: colW });

  const calloutElem = spec.elements.find((e) => e.type === 'callout');
  const calloutLines = calloutElem
    ? wrapText(calloutElem.text || '', { fontSize: 16, maxWidth: colW - 40, maxLines: 2 })
    : [];
  const calloutHeight = calloutLines.length > 1 ? 110 : 90;

  const heroGraphic = dataUri
    ? `
      <g transform="translate(${heroX}, 340)">
        <rect x="0" y="0" width="${colW}" height="480" rx="16" fill="#0D131F" stroke="#1E293B" stroke-width="1.5" />
        <image href="${dataUri}" x="15" y="15" width="${colW - 30}" height="450" preserveAspectRatio="xMidYMid meet" />
      </g>
    `
    : `
      <g transform="translate(${heroX}, 340)">
        <rect x="0" y="0" width="${colW}" height="480" rx="16" fill="#0D131F" stroke="#1E293B" stroke-width="1.5" />
        <circle cx="${colW / 2}" cy="240" r="80" fill="#1E293B" stroke="${COLORS.text.accent}" stroke-width="2" />
        <polygon points="${colW / 2 + 5},220 ${colW / 2 - 10},240 ${colW / 2 + 2},240 ${colW / 2 - 5},260 ${colW / 2 + 12},235 ${colW / 2 + 2},235" fill="${COLORS.text.accent}" />
      </g>
    `;

  const inner = `
    <!-- Slide Strategy Tag -->
    <text x="80" y="225" fill="${COLORS.text.accent}" font-family="${TYPOGRAPHY.fontFamily.mono}" font-size="16" font-weight="700" letter-spacing="1.5">${spec.visualStrategy.toUpperCase().replace(/-/g, ' ')}</text>

    <!-- Headline and Body -->
    <g transform="translate(${textX}, 340)">
      ${renderWrappedTextSvg(headlineLines, 0, 0, 56, {
        fill: COLORS.text.primary,
        'font-family': TYPOGRAPHY.fontFamily.sans,
        'font-size': TYPOGRAPHY.fontSize.headlineMedium,
        'font-weight': '700',
      })}

      <g transform="translate(0, ${headlineHeight + 35})">
        ${renderWrappedTextSvg(bodyLines, 0, 0, 38, {
          fill: COLORS.text.secondary,
          'font-family': TYPOGRAPHY.fontFamily.sans,
          'font-size': TYPOGRAPHY.fontSize.bodyMedium,
          'font-weight': '400',
        })}
      </g>

      ${
        calloutElem
          ? `
        <g transform="translate(0, ${headlineHeight + 40 + bodyLines.length * 40 + 25})">
          <rect x="0" y="0" width="${colW}" height="${calloutHeight}" rx="10" fill="#172554" stroke="${COLORS.text.accent}" stroke-width="1.5" />
          <text x="20" y="32" fill="${COLORS.text.accent}" font-family="${TYPOGRAPHY.fontFamily.mono}" font-size="14" font-weight="700">${escapeXml((calloutElem.label || 'KEY INSIGHT').toUpperCase())}</text>
          <g transform="translate(20, 60)">
            ${renderWrappedTextSvg(calloutLines, 0, 0, 24, {
              fill: COLORS.text.primary,
              'font-family': TYPOGRAPHY.fontFamily.sans,
              'font-size': 16,
              'font-weight': '500',
            })}
          </g>
        </g>
      `
          : ''
      }
    </g>

    <!-- Hero Illustration / Graphic -->
    ${heroGraphic}
  `;

  return createSvgShell(context, inner);
}

/**
 * Centered hero: Top headline, expansive central illustration, optional callouts below.
 */
function renderCenteredHero(
  context: SlideRenderContext,
  spec: SlideVisualSpecification,
  dataUri: string | null,
): string {
  const { headline, body } = getSlideText(context, spec);

  const headlineLines = wrapText(headline, { fontSize: 46, maxWidth: DIMENSIONS.contentWidth });
  const bodyLines = wrapText(body, { fontSize: 24, maxWidth: DIMENSIONS.contentWidth });

  const headlineHeight = headlineLines.length * 56;
  const bodyHeight = bodyLines.length * 38;

  const illustrationY = 280 + headlineHeight + bodyHeight;
  const illustrationH = Math.min(520, 1140 - illustrationY);

  const heroGraphic = dataUri
    ? `
      <g transform="translate(80, ${illustrationY})">
        <rect x="0" y="0" width="${DIMENSIONS.contentWidth}" height="${illustrationH}" rx="20" fill="#0D131F" stroke="#1E293B" stroke-width="1.5" />
        <image href="${dataUri}" x="20" y="20" width="${DIMENSIONS.contentWidth - 40}" height="${illustrationH - 40}" preserveAspectRatio="xMidYMid meet" />
      </g>
    `
    : `
      <g transform="translate(80, ${illustrationY})">
        <rect x="0" y="0" width="${DIMENSIONS.contentWidth}" height="${illustrationH}" rx="20" fill="#0D131F" stroke="#1E293B" stroke-width="1.5" />
        <circle cx="${DIMENSIONS.contentWidth / 2}" cy="${illustrationH / 2}" r="90" fill="#1E293B" stroke="${COLORS.text.accent}" stroke-width="2" />
        <polygon points="${DIMENSIONS.contentWidth / 2 + 8},${illustrationH / 2 - 25} ${DIMENSIONS.contentWidth / 2 - 12},${illustrationH / 2} ${DIMENSIONS.contentWidth / 2 + 4},${illustrationH / 2} ${DIMENSIONS.contentWidth / 2 - 6},${illustrationH / 2 + 25} ${DIMENSIONS.contentWidth / 2 + 16},${illustrationH / 2 - 6} ${DIMENSIONS.contentWidth / 2 + 4},${illustrationH / 2 - 6}" fill="${COLORS.text.accent}" />
      </g>
    `;

  const inner = `
    <!-- Top Strategic Anchor -->
    <text x="80" y="225" fill="${COLORS.text.accent}" font-family="${TYPOGRAPHY.fontFamily.mono}" font-size="16" font-weight="700" letter-spacing="1.5">${spec.visualStrategy.toUpperCase().replace(/-/g, ' ')}</text>

    <!-- Centered Header Block -->
    <g transform="translate(80, 260)">
      ${renderWrappedTextSvg(headlineLines, 0, 0, 56, {
        fill: COLORS.text.primary,
        'font-family': TYPOGRAPHY.fontFamily.sans,
        'font-size': TYPOGRAPHY.fontSize.headlineMedium,
        'font-weight': '700',
      })}

      <g transform="translate(0, ${headlineHeight + 20})">
        ${renderWrappedTextSvg(bodyLines, 0, 0, 38, {
          fill: COLORS.text.secondary,
          'font-family': TYPOGRAPHY.fontFamily.sans,
          'font-size': TYPOGRAPHY.fontSize.bodyMedium,
          'font-weight': '400',
        })}
      </g>
    </g>

    <!-- Centered Hero Graphic -->
    ${heroGraphic}
  `;

  return createSvgShell(context, inner);
}

/**
 * Big-Type composition: Bold, high-contrast hook with quotes and brand watermarks.
 */
function renderBigType(context: SlideRenderContext, spec: SlideVisualSpecification): string {
  const { headline, body } = getSlideText(context, spec);

  const headlineLines = wrapText(headline, { fontSize: 58, maxWidth: DIMENSIONS.contentWidth });
  const bodyLines = wrapText(body, { fontSize: 28, maxWidth: DIMENSIONS.contentWidth - 80 });

  const inner = `
    <!-- Strategy Eyebrow -->
    <text x="80" y="235" fill="${COLORS.text.accent}" font-family="${TYPOGRAPHY.fontFamily.mono}" font-size="16" font-weight="700" letter-spacing="2">THE CORE HOOK</text>

    <!-- Quotation Mark Accent Symbol -->
    <g transform="translate(80, 290)">
      <text x="0" y="60" fill="#1E293B" font-family="${TYPOGRAPHY.fontFamily.sans}" font-size="120" font-weight="900" opacity="0.6">“</text>
    </g>

    <!-- Huge Type Headline -->
    <g transform="translate(80, 390)">
      <line x1="0" y1="0" x2="0" y2="${headlineLines.length * 68 + 20}" stroke="${COLORS.text.accent}" stroke-width="6" stroke-linecap="round" />
      <g transform="translate(30, 0)">
        ${renderWrappedTextSvg(headlineLines, 0, 0, 68, {
          fill: COLORS.text.primary,
          'font-family': TYPOGRAPHY.fontFamily.sans,
          'font-size': TYPOGRAPHY.fontSize.headlineLarge,
          'font-weight': '800',
        })}
      </g>
    </g>

    <!-- Explanatory Body Card -->
    <g transform="translate(80, 780)">
      <rect x="0" y="0" width="${DIMENSIONS.contentWidth}" height="240" rx="16" fill="#0D131F" stroke="#1E293B" stroke-width="1.5" />
      <g transform="translate(40, 50)">
        ${renderWrappedTextSvg(bodyLines, 0, 0, 38, {
          fill: COLORS.text.secondary,
          'font-family': TYPOGRAPHY.fontFamily.sans,
          'font-size': TYPOGRAPHY.fontSize.bodyMedium,
          'font-weight': '400',
        })}
      </g>
    </g>
  `;

  return createSvgShell(context, inner);
}

/**
 * Process Flow composition: Multi-stage architectural flow with vector connectors.
 */
function renderProcessFlow(context: SlideRenderContext, spec: SlideVisualSpecification): string {
  const { headline, body } = getSlideText(context, spec);

  const headlineLines = wrapText(headline, { fontSize: 46, maxWidth: DIMENSIONS.contentWidth });
  const bodyLines = wrapText(body, {
    fontSize: TYPOGRAPHY.fontSize.bodyMedium,
    maxWidth: DIMENSIONS.contentWidth,
  });

  const inner = `
    <!-- Flow Header -->
    <text x="80" y="225" fill="${COLORS.text.accent}" font-family="${TYPOGRAPHY.fontFamily.mono}" font-size="16" font-weight="700" letter-spacing="1.5">EXECUTION ARCHITECTURE</text>

    <g transform="translate(80, 260)">
      ${renderWrappedTextSvg(headlineLines, 0, 0, 54, {
        fill: COLORS.text.primary,
        'font-family': TYPOGRAPHY.fontFamily.sans,
        'font-size': TYPOGRAPHY.fontSize.headlineMedium,
        'font-weight': '700',
      })}
      <g transform="translate(0, ${headlineLines.length * 54 + 15})">
        ${renderWrappedTextSvg(bodyLines, 0, 0, 36, {
          fill: COLORS.text.secondary,
          'font-family': TYPOGRAPHY.fontFamily.sans,
          'font-size': TYPOGRAPHY.fontSize.bodyMedium,
          'font-weight': '400',
        })}
      </g>
    </g>

    <!-- Sequential Pipeline Nodes -->
    <g transform="translate(80, 560)">
      <!-- Stage 1 -->
      <rect x="0" y="0" width="${DIMENSIONS.contentWidth}" height="120" rx="12" fill="#0D131F" stroke="#1E293B" stroke-width="1.5" />
      <circle cx="50" cy="60" r="24" fill="#172554" stroke="${COLORS.text.accent}" stroke-width="2" />
      <text x="50" y="66" text-anchor="middle" fill="${COLORS.text.accent}" font-family="${TYPOGRAPHY.fontFamily.mono}" font-size="16" font-weight="700">01</text>
      <text x="100" y="52" fill="${COLORS.text.primary}" font-family="${TYPOGRAPHY.fontFamily.sans}" font-size="22" font-weight="600">INPUT DISPATCH &amp; VALIDATION</text>
      <text x="100" y="82" fill="${COLORS.text.muted}" font-family="${TYPOGRAPHY.fontFamily.mono}" font-size="14">Client initiates connection packet</text>

      <!-- Connector 1 -->
      <path d="M 540 120 L 540 160 M 533 150 L 540 160 L 547 150" stroke="${COLORS.text.accent}" stroke-width="2.5" fill="none" />

      <!-- Stage 2 -->
      <rect x="0" y="160" width="${DIMENSIONS.contentWidth}" height="120" rx="12" fill="#131C2E" stroke="${COLORS.text.accent}" stroke-width="2" />
      <circle cx="50" cy="220" r="24" fill="#2563EB" />
      <text x="50" y="226" text-anchor="middle" fill="#FFFFFF" font-family="${TYPOGRAPHY.fontFamily.mono}" font-size="16" font-weight="700">02</text>
      <text x="100" y="212" fill="${COLORS.text.primary}" font-family="${TYPOGRAPHY.fontFamily.sans}" font-size="22" font-weight="700">CORE SYSTEM PROCESSING</text>
      <text x="100" y="242" fill="${COLORS.text.accent}" font-family="${TYPOGRAPHY.fontFamily.mono}" font-size="14">Execution of state transform and logic</text>

      <!-- Connector 2 -->
      <path d="M 540 280 L 540 320 M 533 310 L 540 320 L 547 310" stroke="${COLORS.text.accent}" stroke-width="2.5" fill="none" />

      <!-- Stage 3 -->
      <rect x="0" y="320" width="${DIMENSIONS.contentWidth}" height="120" rx="12" fill="#0D131F" stroke="#1E293B" stroke-width="1.5" />
      <circle cx="50" cy="380" r="24" fill="#172554" stroke="${COLORS.text.accent}" stroke-width="2" />
      <text x="50" y="386" text-anchor="middle" fill="${COLORS.text.accent}" font-family="${TYPOGRAPHY.fontFamily.mono}" font-size="16" font-weight="700">03</text>
      <text x="100" y="372" fill="${COLORS.text.primary}" font-family="${TYPOGRAPHY.fontFamily.sans}" font-size="22" font-weight="600">CANONICAL RESPONSE / STATE PERSISTENCE</text>
      <text x="100" y="402" fill="${COLORS.text.muted}" font-family="${TYPOGRAPHY.fontFamily.mono}" font-size="14">Payload return with guaranteed consistency</text>
    </g>
  `;

  return createSvgShell(context, inner);
}

/**
 * Takeaway composition: Final summary card with brand seal.
 */
function renderTakeaway(context: SlideRenderContext, spec: SlideVisualSpecification): string {
  const { headline, body } = getSlideText(context, spec);

  const headlineLines = wrapText(headline, { fontSize: 46, maxWidth: DIMENSIONS.contentWidth });
  const bodyLines = wrapText(body, {
    fontSize: TYPOGRAPHY.fontSize.bodyLarge,
    maxWidth: DIMENSIONS.contentWidth - 120,
  });

  const inner = `
    <!-- Takeaway Header -->
    <text x="80" y="225" fill="#22C55E" font-family="${TYPOGRAPHY.fontFamily.mono}" font-size="16" font-weight="700" letter-spacing="2">KEY ENGINEERING TAKEAWAY</text>

    <g transform="translate(80, 260)">
      ${renderWrappedTextSvg(headlineLines, 0, 0, 56, {
        fill: COLORS.text.primary,
        'font-family': TYPOGRAPHY.fontFamily.sans,
        'font-size': TYPOGRAPHY.fontSize.headlineMedium,
        'font-weight': '700',
      })}
    </g>

    <!-- Takeaway Focal Card -->
    <g transform="translate(80, 480)">
      <rect x="0" y="0" width="${DIMENSIONS.contentWidth}" height="380" rx="20" fill="#0D131F" stroke="#22C55E" stroke-width="2" />

      <!-- Success Badge -->
      <circle cx="60" cy="60" r="24" fill="#052E16" stroke="#22C55E" stroke-width="2" />
      <path d="M 50 60 L 57 67 L 72 52" stroke="#22C55E" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none" />

      <text x="100" y="66" fill="#22C55E" font-family="${TYPOGRAPHY.fontFamily.mono}" font-size="18" font-weight="700">CORE PRINCIPLE</text>

      <g transform="translate(60, 120)">
        ${renderWrappedTextSvg(bodyLines, 0, 0, 44, {
          fill: COLORS.text.primary,
          'font-family': TYPOGRAPHY.fontFamily.sans,
          'font-size': TYPOGRAPHY.fontSize.bodyLarge,
          'font-weight': '500',
        })}
      </g>

      <!-- Signature Seal -->
      <g transform="translate(60, 310)">
        <text x="0" y="0" fill="${COLORS.text.muted}" font-family="${TYPOGRAPHY.fontFamily.mono}" font-size="14">ElevateWeb • Verified System Architecture</text>
      </g>
    </g>
  `;

  return createSvgShell(context, inner);
}

/**
 * Editorial Stack composition: Stacked typography with structured card container.
 */
function renderEditorialStack(
  context: SlideRenderContext,
  spec: SlideVisualSpecification,
  dataUri: string | null,
): string {
  const { headline, body } = getSlideText(context, spec);

  const headlineLines = wrapText(headline, { fontSize: 46, maxWidth: DIMENSIONS.contentWidth });
  const bodyLines = wrapText(body, { fontSize: 26, maxWidth: DIMENSIONS.contentWidth });

  const inner = `
    <!-- Strategy Eyebrow -->
    <text x="80" y="225" fill="${COLORS.text.accent}" font-family="${TYPOGRAPHY.fontFamily.mono}" font-size="16" font-weight="700" letter-spacing="1.5">${spec.visualStrategy.toUpperCase().replace(/-/g, ' ')}</text>

    <!-- Headline -->
    <g transform="translate(80, 260)">
      ${renderWrappedTextSvg(headlineLines, 0, 0, 56, {
        fill: COLORS.text.primary,
        'font-family': TYPOGRAPHY.fontFamily.sans,
        'font-size': TYPOGRAPHY.fontSize.headlineMedium,
        'font-weight': '700',
      })}

      <!-- Body -->
      <g transform="translate(0, ${headlineLines.length * 56 + 25})">
        ${renderWrappedTextSvg(bodyLines, 0, 0, 42, {
          fill: COLORS.text.secondary,
          'font-family': TYPOGRAPHY.fontFamily.sans,
          'font-size': TYPOGRAPHY.fontSize.bodyLarge,
          'font-weight': '400',
        })}
      </g>
    </g>

    <!-- Contextual Element / Graphic Card -->
    <g transform="translate(80, 680)">
      <rect x="0" y="0" width="${DIMENSIONS.contentWidth}" height="380" rx="16" fill="#0D131F" stroke="#1E293B" stroke-width="1.5" />
      ${
        dataUri
          ? `<image href="${dataUri}" x="20" y="20" width="${DIMENSIONS.contentWidth - 40}" height="340" preserveAspectRatio="xMidYMid meet" />`
          : `
        <circle cx="${DIMENSIONS.contentWidth / 2}" cy="190" r="70" fill="#1E293B" stroke="${COLORS.text.accent}" stroke-width="2" />
        <polygon points="${DIMENSIONS.contentWidth / 2 + 6},175 ${DIMENSIONS.contentWidth / 2 - 10},195 ${DIMENSIONS.contentWidth / 2 + 2},195 ${DIMENSIONS.contentWidth / 2 - 5},215 ${DIMENSIONS.contentWidth / 2 + 12},190 ${DIMENSIONS.contentWidth / 2 + 2},190" fill="${COLORS.text.accent}" />
      `
      }
    </g>
  `;

  return createSvgShell(context, inner);
}
