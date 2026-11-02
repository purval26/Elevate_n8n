export interface OverflowCheckResult {
  hasOverflow: boolean;
  slideNumber: number;
  details: string[];
}

/**
 * Browser-side evaluation script executed inside Playwright page context.
 * Checks bounding rectangles and scroll dimensions of every element in .slide.
 */
export const BROWSER_OVERFLOW_DETECTOR_SCRIPT = `
(function checkSlideOverflow() {
  const slides = document.querySelectorAll('.slide');
  const results = [];

  slides.forEach((slide, idx) => {
    const slideNumber = parseInt(slide.getAttribute('data-slide') || String(idx + 1), 10);
    const rect = slide.getBoundingClientRect();
    const slideWidth = 1080;
    const slideHeight = 1350;

    const details = [];

    // Check overall scroll overflow
    if (slide.scrollWidth > slideWidth + 4) {
      details.push('Horizontal scroll overflow: scrollWidth ' + slide.scrollWidth + 'px exceeds ' + slideWidth + 'px');
    }
    if (slide.scrollHeight > slideHeight + 4) {
      details.push('Vertical scroll overflow: scrollHeight ' + slide.scrollHeight + 'px exceeds ' + slideHeight + 'px');
    }

    // Check individual elements
    const elements = slide.querySelectorAll('*');
    elements.forEach((el) => {
      // Ignore zero-size or absolute container shells
      const elRect = el.getBoundingClientRect();
      const relativeRight = elRect.right - rect.left;
      const relativeBottom = elRect.bottom - rect.top;

      if (relativeRight > slideWidth + 5) {
        const tag = el.tagName.toLowerCase();
        const className = el.className || '';
        details.push('Element <' + tag + ' class="' + className + '"> exceeds right edge by ' + Math.round(relativeRight - slideWidth) + 'px');
      }
      if (relativeBottom > slideHeight + 5) {
        const tag = el.tagName.toLowerCase();
        const className = el.className || '';
        details.push('Element <' + tag + ' class="' + className + '"> exceeds bottom edge by ' + Math.round(relativeBottom - slideHeight) + 'px');
      }
    });

    results.push({
      hasOverflow: details.length > 0,
      slideNumber,
      details,
    });
  });

  return results;
})()
`;

/**
 * Lightweight heuristic static analysis of slide HTML text and style bounds.
 */
export function checkStaticHtmlOverflow(
  slideHtml: string,
  slideNumber: number,
): OverflowCheckResult {
  const details: string[] = [];

  // Check for excessive unbroken words or text lines without break styling
  const lines = slideHtml.split('\n');
  for (const line of lines) {
    const stripped = line.replace(/<[^>]+>/g, '').trim();
    if (stripped.length > 300) {
      details.push(
        `Potentially overflowing text block: line length ${stripped.length} chars exceeds safe line length.`,
      );
    }
  }

  return {
    hasOverflow: details.length > 0,
    slideNumber,
    details,
  };
}
