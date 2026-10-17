import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  escapeXml,
  estimateCharUnits,
  estimateTextWidth,
  wrapText,
  renderWrappedTextSvg,
} from '../src/design/textLayout.ts';

describe('TextLayout: escapeXml', () => {
  it('should escape & < > " and \' characters', () => {
    const raw = `Tom & Jerry <script>alert("XSS")</script> 'hello'`;
    const escaped = escapeXml(raw);
    assert.strictEqual(
      escaped,
      'Tom &amp; Jerry &lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt; &apos;hello&apos;',
    );
  });

  it('should return the original string if no special characters are present', () => {
    const raw = 'Normal text 123 with no special xml chars.';
    assert.strictEqual(escapeXml(raw), raw);
  });

  it('should handle multiple occurrences in sequence', () => {
    const raw = '&&<<>>""\'\'';
    assert.strictEqual(escapeXml(raw), '&amp;&amp;&lt;&lt;&gt;&gt;&quot;&quot;&apos;&apos;');
  });
});

describe('TextLayout: Character Width Estimation', () => {
  it('should estimate narrow characters with lower weight', () => {
    const narrow = estimateCharUnits('i');
    const standard = estimateCharUnits('a');
    assert.ok(narrow < standard);
  });

  it('should estimate wide uppercase Latin letters with higher weight', () => {
    const wide = estimateCharUnits('W');
    const standard = estimateCharUnits('a');
    assert.ok(wide > standard);
  });

  it('should assign full-width weight to CJK and Hangul characters', () => {
    const cjk = estimateCharUnits('漢');
    const hangul = estimateCharUnits('한');
    const standard = estimateCharUnits('a');
    assert.strictEqual(cjk, 1.1);
    assert.strictEqual(hangul, 1.1);
    assert.ok(cjk > standard);
  });

  it('should calculate total text width proportional to font size', () => {
    const widthAt20 = estimateTextWidth('Hello World', 20);
    const widthAt40 = estimateTextWidth('Hello World', 40);
    assert.strictEqual(widthAt40, widthAt20 * 2);
  });
});

describe('TextLayout: wrapText', () => {
  it('should return empty array for empty or whitespace-only input', () => {
    assert.deepStrictEqual(wrapText('', { maxWidth: 500, fontSize: 24 }), []);
    assert.deepStrictEqual(wrapText('   \n\t   ', { maxWidth: 500, fontSize: 24 }), []);
  });

  it('should keep text on a single line if it fits within maxWidth', () => {
    const text = 'Short headline';
    const lines = wrapText(text, { maxWidth: 600, fontSize: 24 });
    assert.deepStrictEqual(lines, ['Short headline']);
  });

  it('should break text across multiple lines when exceeding maxWidth', () => {
    const text =
      'This is a longer technical description explaining how recursive DNS resolvers function when caching entries.';
    const lines = wrapText(text, { maxWidth: 300, fontSize: 24 });
    assert.ok(lines.length > 1);
    // Every line should be non-empty and stripped of excess whitespace
    for (const line of lines) {
      assert.ok(line.trim().length > 0);
      assert.ok(!line.startsWith(' '));
      assert.ok(!line.endsWith(' '));
    }
  });

  it('should clamp lines to maxLines and append ellipsis to the last line', () => {
    const text =
      'First sentence here. Second sentence follows. Third sentence comes next. Fourth sentence explains more. Fifth sentence concludes.';
    const lines = wrapText(text, {
      maxWidth: 200,
      fontSize: 24,
      maxLines: 2,
    });
    assert.strictEqual(lines.length, 2);
    assert.ok(lines[1]!.endsWith('...'));
  });

  it('should break continuous unbroken long strings without infinite looping', () => {
    const text =
      'https://api.elevateweb.io/v1/telemetry/verylongunbrokenqueryparameterstringthatneverendsuntilthelimit';
    const lines = wrapText(text, { maxWidth: 200, fontSize: 20, maxLines: 5 });
    assert.ok(lines.length > 1);
  });

  it('should correctly handle multi-byte Unicode, accents, and CJK text', () => {
    const unicodeText =
      'Café au lait with résumé and naïve piñata, Japanese 日本語, and Korean 한국어 engineering.';
    const lines = wrapText(unicodeText, {
      maxWidth: 400,
      fontSize: 24,
      maxLines: 4,
    });
    assert.ok(lines.length >= 1);
    const joined = lines.join(' ');
    assert.ok(joined.includes('Café'));
    assert.ok(joined.includes('résumé'));
    assert.ok(joined.includes('piñata'));
    assert.ok(joined.includes('日本語'));
    assert.ok(joined.includes('한국어'));
  });
});

describe('TextLayout: renderWrappedTextSvg', () => {
  it('should return empty string for empty lines array', () => {
    const svg = renderWrappedTextSvg([], 0, 0, 30);
    assert.strictEqual(svg, '');
  });

  it('should generate valid text and tspan SVG markup with correct line positions', () => {
    const lines = ['First Line', 'Second Line', 'Third Line'];
    const svg = renderWrappedTextSvg(lines, 80, 100, 40, {
      fill: '#FFFFFF',
      'font-size': '24',
    });

    assert.ok(svg.startsWith('<text '));
    assert.ok(svg.includes('fill="#FFFFFF"'));
    assert.ok(svg.includes('font-size="24"'));
    assert.ok(svg.includes('<tspan x="80" y="100">First Line</tspan>'));
    assert.ok(svg.includes('<tspan x="80" y="140">Second Line</tspan>'));
    assert.ok(svg.includes('<tspan x="80" y="180">Third Line</tspan>'));
    assert.ok(svg.endsWith('</text>'));
  });

  it('should escape XML entities inside tspan content', () => {
    const lines = ['A & B < C > D "quoted"'];
    const svg = renderWrappedTextSvg(lines, 0, 0, 30);
    assert.ok(svg.includes('A &amp; B &lt; C &gt; D &quot;quoted&quot;'));
  });
});
