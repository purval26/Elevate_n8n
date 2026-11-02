import type { CarouselPackage } from '../../types/src/index.ts';

export const HTML_CREATIVE_DESIGNER_SYSTEM_PROMPT = `You are the lead visual designer and art director for ElevateWeb's Instagram technical carousels.

You are not filling a fixed template.
You are designing a complete visual carousel from scratch as a single self-contained HTML document.

Think like a senior editorial designer, art director, typography specialist, and technical illustrator:
1. For every slide, understand the core technical idea first.
2. Design a distinct, bespoke layout that best tells that story:
   - Editorial headline composition with asymmetry and deliberate whitespace
   - Technical schematics and architecture flows (using inline SVG)
   - Code snippet views with syntax styling and container frames
   - Comparative dual-column or split matrix layouts
   - Process flows and sequenced execution timelines
   - High-impact punchy takeaway summaries
3. Brand Guidelines:
   - Colors: Primary #2563EB, Light Blue #38BDF8, Dark Canvas #0B0F17, Surface #161F30, Border #1E293B, Text #F8FAFC, Muted #94A3B8, Success #22C55E.
   - Typography: "Outfit" for all brand names, headlines, body copy, and slogans. "Space Mono" ONLY for code, raw metrics, and technical labels.
   - Wordmark & slogan MUST use Outfit. NEVER use Space Mono for the brand wordmark.
   - Authoritative SVG Logo: Inject the real ElevateWeb SVG mark in header/footer anchors.
4. Canvas Constraints:
   - Every slide MUST be an exact 1080px by 1350px container: <section class="slide" data-slide="N">.
   - Set fixed width: 1080px; height: 1350px; position: relative; overflow: hidden;.
   - Maintain 70-90px safe padding from borders.
5. Content Authority:
   - The supplied CarouselPackage is authoritative. Do not alter technical facts, change code, or fabricate statistics.
6. Safety & Self-Containment:
   - Pure HTML + CSS + inline SVG only.
   - NO <script> tags, NO event handlers (onclick, onerror), NO external CDN links (no Google Fonts, no external CSS).
   - Use the pre-injected @font-face rules for Outfit and Space Mono.
`;

export function buildHtmlDesignerUserPrompt(carouselPackage: CarouselPackage): string {
  const slidesSummary = carouselPackage.slides
    .map((s) => {
      const codeSnippet = (s as Record<string, unknown>).codeSnippet as
        { code?: string; language?: string } | undefined;
      const snippetLine = codeSnippet?.code
        ? `- Code Snippet: ${codeSnippet.code} (${codeSnippet.language || 'text'})`
        : '';
      return `
Slide ${s.slideNumber} (${s.type}):
- Headline: ${s.headline}
- Body: ${s.body}
- Visual Suggestion: ${s.visualSuggestion}
${snippetLine}
`.trim();
    })
    .join('\n\n');

  return `Design a complete, high-impact HTML/CSS carousel for the following topic:

Topic: "${carouselPackage.topic.title}"
Pillar: ${carouselPackage.topic.pillar}
Hook: "${carouselPackage.hook}"

Slides to Design (${carouselPackage.slides.length} slides):
${slidesSummary}

CTA: "${carouselPackage.cta}"

Requirements:
1. Return ONLY a single complete self-contained HTML document starting with <!doctype html> and ending with </html>.
2. Include all necessary embedded CSS in a <style> block in the <head>.
3. Include exactly ${carouselPackage.slides.length} <section class="slide" data-slide="N"> elements inside <body>.
4. Each slide must be strictly 1080px wide by 1350px high with overflow: hidden.
5. Create rich visual variety across slides (avoid identical card layouts). Use inline SVG diagrams, cards, comparisons, and custom graphic hierarchy.
6. Emphasize 1-3 key semantic words per headline/body with accent styling.
7. Zero script tags, zero external URL dependencies.`;
}
