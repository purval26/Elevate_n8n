import type { HtmlValidationResult } from '../../types/src/index.ts';

const SCRIPT_REGEX = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
const INLINE_EVENT_REGEX = /\s+on[a-z]+\s*=\s*["'][^"']*["']/gi;
const JAVASCRIPT_URI_REGEX = /href\s*=\s*["']\s*javascript:[^"']*["']/gi;
const EXTERNAL_URL_REGEX =
  /(?:href|src|url)\s*=\s*["']\s*https?:\/\/[^"']*["']|url\(\s*['"]?https?:\/\/[^)'"]*['"]?\)/gi;
const IFRAME_REGEX = /<iframe\b/gi;
const FORM_REGEX = /<form\b/gi;
const SLIDE_TAG_REGEX = /<section[^>]*class=["'][^"']*\bslide\b[^"']*["'][^>]*>/gi;

/**
 * Validates a generated carousel HTML document for safety, structural integrity,
 * and Instagram portrait constraints.
 */
export function validateCarouselHtml(html: string): HtmlValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!html || typeof html !== 'string' || html.trim().length === 0) {
    return {
      valid: false,
      errors: ['HTML document is empty or missing.'],
      slideCount: 0,
      hasScripts: false,
      hasExternalDeps: false,
    };
  }

  // 1. Check basic HTML structure
  const lowerHtml = html.toLowerCase();
  if (!lowerHtml.includes('<html') || !lowerHtml.includes('</body>')) {
    errors.push('Document must be a valid HTML document containing <html> and <body> tags.');
  }

  // 2. Check for disallowed scripts and executable code
  let hasScripts = false;
  if (SCRIPT_REGEX.test(html) || lowerHtml.includes('<script')) {
    hasScripts = true;
    errors.push('Safety violation: <script> tags are strictly prohibited.');
  }
  if (INLINE_EVENT_REGEX.test(html)) {
    hasScripts = true;
    errors.push(
      'Safety violation: Inline DOM event handlers (e.g. onclick, onload) are prohibited.',
    );
  }
  if (JAVASCRIPT_URI_REGEX.test(html)) {
    hasScripts = true;
    errors.push('Safety violation: javascript: URIs are prohibited.');
  }
  if (IFRAME_REGEX.test(html)) {
    errors.push('Safety violation: <iframe> elements are prohibited.');
  }
  if (FORM_REGEX.test(html)) {
    errors.push('Safety violation: <form> elements are prohibited.');
  }

  // 3. Check for external network dependencies (fonts, remote CSS, remote images)
  let hasExternalDeps = false;
  const externalMatches = html.match(EXTERNAL_URL_REGEX);
  if (externalMatches && externalMatches.length > 0) {
    hasExternalDeps = true;
    errors.push(
      `Safety violation: External network dependencies found (${externalMatches.length} external URL references). All styling and fonts must be local/inlined.`,
    );
  }

  // 4. Validate slide count and slide class
  const slideMatches = html.match(SLIDE_TAG_REGEX) || [];
  const slideCount = slideMatches.length;

  if (slideCount === 0) {
    errors.push(
      'No slides found. Every slide must be defined with <section class="slide" data-slide="N">.',
    );
  } else if (slideCount < 5 || slideCount > 8) {
    errors.push(`Invalid slide count: Expected between 5 and 8 slides, but found ${slideCount}.`);
  }

  // 5. Check dimension declarations
  if (!html.includes('1080') || !html.includes('1350')) {
    warnings.push('Slide styling does not explicitly declare 1080px by 1350px dimensions.');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    slideCount,
    hasScripts,
    hasExternalDeps,
  };
}
