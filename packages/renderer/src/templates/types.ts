import type { Slide, CarouselTopic } from '../../../types/src/index.ts';
import { DIMENSIONS, COLORS, TYPOGRAPHY, BRAND } from '../design/tokens.ts';
import { escapeXml } from '../design/textLayout.ts';

export interface SlideRenderContext {
  slide: Slide;
  totalSlides: number;
  topic: CarouselTopic;
  hook: string;
  cta: string;
  caption: string;
  hashtags: string[];
}

export interface SlideTemplate {
  name: string;
  render(context: SlideRenderContext): string;
}

/**
 * Generates the common SVG shell including gradients, background canvas,
 * header brand badge, eyebrow category, and footer pagination metadata.
 */
export function createSvgShell(context: SlideRenderContext, innerContent: string): string {
  const { slide, totalSlides, topic } = context;
  const currentNum = String(slide.slideNumber).padStart(2, '0');
  const totalNum = String(totalSlides).padStart(2, '0');
  const category = (topic.pillar || 'Tech Explained').replace(/_/g, ' ').toUpperCase();

  return `<svg width="${DIMENSIONS.width}" height="${DIMENSIONS.height}" viewBox="0 0 ${DIMENSIONS.width} ${DIMENSIONS.height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Background Gradient -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${COLORS.bg.primary}" />
      <stop offset="60%" stop-color="${COLORS.bg.secondary}" />
      <stop offset="100%" stop-color="#080C14" />
    </linearGradient>

    <!-- Brand Accent Line Gradient -->
    <linearGradient id="accentLine" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${COLORS.gradients.accentBar[0]}" />
      <stop offset="100%" stop-color="${COLORS.gradients.accentBar[1]}" />
    </linearGradient>

    <!-- Card Background Gradient -->
    <linearGradient id="cardGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${COLORS.bg.card}" />
      <stop offset="100%" stop-color="${COLORS.bg.cardMuted}" />
    </linearGradient>

    <!-- ElevateWeb Authentic Logo Gradients -->
    <linearGradient id="logoGrad1" x1="86.03" y1="280.83" x2="278.3" y2="88.56" gradientTransform="translate(183.41 -76.03) rotate(45)" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#2563EB" />
      <stop offset="1%" stop-color="#1D4ED8" />
    </linearGradient>
    <linearGradient id="logoGrad2" x1="230.53" y1="425.33" x2="422.8" y2="233.06" gradientTransform="translate(327.91 -135.88) rotate(45)" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#2563EB" />
      <stop offset="1%" stop-color="#1D4ED8" />
    </linearGradient>

    <!-- Inner Glow Gradient -->
    <radialGradient id="cardGlow" cx="50%" cy="0%" r="80%">
      <stop offset="0%" stop-color="#1E293B" stop-opacity="0.6" />
      <stop offset="100%" stop-color="#0F172A" stop-opacity="0.9" />
    </radialGradient>
  </defs>

  <!-- Canvas Background -->
  <rect width="${DIMENSIONS.width}" height="${DIMENSIONS.height}" fill="url(#bgGrad)" />

  <!-- Top Accent Bar -->
  <rect x="0" y="0" width="${DIMENSIONS.width}" height="6" fill="url(#accentLine)" />

  <!-- Header Section -->
  <g id="header">
    <!-- Category Eyebrow Pill -->
    <rect x="80" y="76" width="220" height="38" rx="19" fill="#1E293B" stroke="${COLORS.border.medium}" stroke-width="1.5" />
    <circle cx="102" cy="95" r="5" fill="${COLORS.text.accent}" />
    <text x="116" y="101" fill="${COLORS.text.accent}" font-family="${TYPOGRAPHY.fontFamily.sans}" font-size="${TYPOGRAPHY.fontSize.eyebrow}" font-weight="700" letter-spacing="1.5">${escapeXml(category)}</text>

    <!-- ElevateWeb Brand Mark & Official Logo Top-Right -->
    <g transform="translate(790, 76)">
      <g transform="scale(0.085)">
        <rect fill="url(#logoGrad1)" x="45.66" y="146.54" width="275.64" height="73.66" rx="36.83" transform="translate(-120.92 138.56) rotate(-45)" />
        <rect fill="url(#logoGrad2)" x="190.16" y="291.04" width="275.64" height="73.66" rx="36.83" transform="translate(-180.77 283.06) rotate(-45)" />
        <rect fill="#3B82F6" x="15.42" y="321.29" width="275.64" height="73.66" rx="36.83" transform="translate(-253.34 168.35) rotate(-45)" />
        <rect fill="#3B82F6" x="220.4" y="116.3" width="275.64" height="73.66" rx="36.83" transform="translate(-48.35 253.26) rotate(-45)" />
      </g>
      <text x="46" y="25" fill="${COLORS.text.secondary}" font-family="${TYPOGRAPHY.fontFamily.sans}" font-size="${TYPOGRAPHY.fontSize.badge}" font-weight="600" letter-spacing="2">${BRAND.markText}</text>
    </g>
  </g>

  <!-- Slide Body Content -->
  ${innerContent}

  <!-- Footer Section -->
  <g id="footer">
    <!-- Subtle divider line -->
    <line x1="80" y1="1260" x2="1000" y2="1260" stroke="${COLORS.border.subtle}" stroke-width="1.5" />

    <!-- Brand Label Bottom-Left -->
    <text x="80" y="1300" fill="${COLORS.text.muted}" font-family="${TYPOGRAPHY.fontFamily.sans}" font-size="${TYPOGRAPHY.fontSize.metadata}" font-weight="500">${BRAND.name} • ${escapeXml(topic.title)}</text>

    <!-- Slide Pagination Bottom-Right (e.g. 01 / 06) -->
    <rect x="910" y="1275" width="90" height="34" rx="8" fill="#1E293B" />
    <text x="955" y="1298" text-anchor="middle" fill="${COLORS.text.accent}" font-family="${TYPOGRAPHY.fontFamily.mono}" font-size="18" font-weight="700">${currentNum} / ${totalNum}</text>
  </g>
</svg>`;
}
