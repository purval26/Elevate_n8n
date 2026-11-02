import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { checkStaticHtmlOverflow, BROWSER_OVERFLOW_DETECTOR_SCRIPT } from '../src/overflow.ts';

describe('HtmlOverflowDetector: Structural & Visual Bounds', () => {
  it('detects dangerously overflowing text lines without wrapping', () => {
    const safeHtml = '<section class="slide"><p>Short line of text.</p></section>';
    const safeCheck = checkStaticHtmlOverflow(safeHtml, 1);
    assert.strictEqual(safeCheck.hasOverflow, false);

    const overlyLongLine = '<section class="slide"><p>' + 'A'.repeat(350) + '</p></section>';
    const overflowCheck = checkStaticHtmlOverflow(overlyLongLine, 1);
    assert.strictEqual(overflowCheck.hasOverflow, true);
    assert.ok(overflowCheck.details[0]?.includes('Potentially overflowing text block'));
  });

  it('contains valid browser DOM measurement script', () => {
    assert.ok(BROWSER_OVERFLOW_DETECTOR_SCRIPT.includes("document.querySelectorAll('.slide')"));
    assert.ok(BROWSER_OVERFLOW_DETECTOR_SCRIPT.includes('slide.scrollWidth > slideWidth'));
    assert.ok(BROWSER_OVERFLOW_DETECTOR_SCRIPT.includes('slide.scrollHeight > slideHeight'));
  });
});
