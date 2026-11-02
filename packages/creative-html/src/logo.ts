import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Root logo.svg path
const LOGO_SVG_PATH = path.resolve(__dirname, '../../../logo.svg');

let cachedLogoSvg: string | null = null;

/**
 * Returns the raw authoritative ElevateWeb SVG logo markup.
 */
export function getElevateLogoSvg(size = 36): string {
  if (!cachedLogoSvg) {
    if (fs.existsSync(LOGO_SVG_PATH)) {
      cachedLogoSvg = fs.readFileSync(LOGO_SVG_PATH, 'utf-8');
    } else {
      // Fallback clean inline vector mark if path resolution differs
      cachedLogoSvg = `<svg id="Layer_1" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 421.47 421.47"><defs><linearGradient id="elevate_grad" x1="86.03" y1="280.83" x2="278.3" y2="88.56" gradientTransform="translate(183.41 -76.03) rotate(45)" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#2563eb"/><stop offset="1" stop-color="#1d4ed8"/></linearGradient></defs><rect fill="url(#elevate_grad)" x="45.66" y="146.54" width="275.64" height="73.66" rx="36.83" transform="translate(-120.92 138.56) rotate(-45)"/><rect fill="url(#elevate_grad)" x="190.16" y="291.04" width="275.64" height="73.66" rx="36.83" transform="translate(-180.77 283.06) rotate(-45)"/><rect fill="#3b82f6" x="15.42" y="321.29" width="275.64" height="73.66" rx="36.83" transform="translate(-253.34 168.35) rotate(-45)"/><rect fill="#3b82f6" x="220.4" y="116.3" width="275.64" height="73.66" rx="36.83" transform="translate(-48.35 253.26) rotate(-45)"/></svg>`;
    }
  }

  // Wrap in sized container with preserveAspectRatio
  return `<span class="elevate-logo-wrapper" style="display:inline-flex;align-items:center;width:${size}px;height:${size}px;">${cachedLogoSvg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</span>`;
}

/**
 * Returns full brand header markup with SVG mark and Outfit wordmark.
 * Slogan and wordmark strictly use font-family: Outfit per Phase 3 brand rules.
 */
export function getElevateBrandHeaderHtml(topicPillar?: string): string {
  const pillarHtml = topicPillar
    ? `<span class="brand-pill" style="display:inline-flex;align-items:center;gap:6px;padding:6px 14px;border-radius:9999px;background:#172554;color:#38BDF8;font-family:'Space Mono',monospace;font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;"><span style="width:6px;height:6px;border-radius:50%;background:#38BDF8;"></span>${topicPillar.replace(/_/g, ' ')}</span>`
    : '';

  return `
  <header class="slide-header" style="display:flex;justify-content:space-between;align-items:center;width:100%;padding:70px 80px 0 80px;position:absolute;top:0;left:0;box-sizing:border-box;z-index:10;">
    <div>${pillarHtml}</div>
    <div class="brand-signature" style="display:inline-flex;align-items:center;gap:12px;">
      ${getElevateLogoSvg(32)}
      <span class="brand-wordmark" style="font-family:'Outfit',sans-serif;font-size:22px;font-weight:800;letter-spacing:2px;color:#F8FAFC;">ELEVATEWEB</span>
    </div>
  </header>
  `.trim();
}
