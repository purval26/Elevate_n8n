# ElevateWeb Visual Engine — Architecture & Specification (Phase 2)

> Deterministic Visual Engine rendering validated Phase 1 `CarouselPackage` JSON into 1080 × 1350 px Instagram-ready portrait PNGs.

---

## 1. Overview & Objectives

The Visual Engine takes the structured, validated `CarouselPackage` output from Phase 1 and converts each slide into an Instagram-ready portrait image (1080 × 1350 px).

### Core Principles:
1. **Deterministic Rendering**: Same `CarouselPackage` + same template $\rightarrow$ identical byte-for-byte PNG output.
2. **Layout Controlled by Engine, Not AI**: The LLM outputs structured content and suggestions; layout, typography, word-wrapping, margins, and hierarchy are strictly governed by the renderer.
3. **Safe Layout & Zero Overflow**: Fixed 1080 × 1350 canvas with 80px safe margins. Text wrapping, character width estimation, and safe ellipsis clamping prevent text clipping or overlapping.
4. **Offline & High Performance**: Powered by a native SVG-to-PNG engine (`@resvg/resvg-js`) rendering full carousels in ~1 second without browser overhead, plus an optional Playwright/Chromium engine for desktop environments.
5. **No Over-Engineering**: Personal automation tool. Zero SaaS infrastructure, zero databases for visual properties, zero auth/queues.

---

## 2. Directory Structure

```
packages/renderer/
├── package.json
├── src/
│   ├── design/
│   │   ├── tokens.ts          # Centralized colors, typography sizes, dimensions, brand marks
│   │   └── textLayout.ts      # Line wrapping, CJK/Unicode width estimation, XML escaping
│   ├── templates/
│   │   ├── types.ts           # SlideTemplate, SlideRenderContext, common SVG shell
│   │   ├── explainer.ts       # Template 1: Technical concepts & "How X works"
│   │   ├── comparison.ts      # Template 2: A vs B & technology tradeoffs (2-column)
│   │   ├── steps.ts           # Template 3: Sequential workflows & execution stages
│   │   ├── statement.ts       # Template 4: Bold quotes, hooks, principles & CTA
│   │   └── diagram.ts         # Template 5: System architecture & request flows
│   ├── engines/
│   │   ├── types.ts           # RenderEngine & RenderEngineOptions interfaces
│   │   ├── resvgEngine.ts     # Universal high-speed Resvg native renderer
│   │   └── playwrightEngine.ts# Optional Playwright Chromium renderer
│   ├── templateSelector.ts    # Deterministic SlideType -> Template mapping
│   ├── render.ts              # Core renderCarousel() pipeline
│   ├── cli.ts                 # Local CLI runner
│   └── index.ts               # Public module exports
└── tests/
    ├── textLayout.test.ts     # Line wrapping, CJK width, XML escaping tests
    ├── templateSelector.test.ts# Template mapping & fallback tests
    ├── templates.test.ts      # SVG structure & layout edge case tests
    ├── renderer.test.ts       # 5, 6, 8-slide package validation & override tests
    └── visualSmoke.test.ts    # Programmatic PNG header (1080x1350) & byte checks
```

---

## 3. Template System

The engine implements exactly five visual templates aligned with ElevateWeb's modern, technical, editorial brand identity:

| Template | Best For | Visual Structure |
|---|---|---|
| **Explainer** | Technical concepts, "How X works", educational posts | Category pill, large headline, editorial body, architecture card with status indicators |
| **Comparison** | A vs B, X vs Y, technology comparisons, tradeoffs | Large headline, 2-column comparison grid (left/right cards), bottom takeaway card |
| **Steps** | Workflows, processes, sequential breakdowns | Top multi-segment progress bar, `STEP 0X` badge, execution flow diagram, directive card |
| **Statement** | Hooks (Slide 1), takeaways, principles, strong statements | Large quote mark watermark, left gradient accent bar, 60px bold statement, ElevateWeb seal |
| **Diagram** | System architecture, request flows, network protocols | Headline, short subtitle, sequential multi-stage flowchart with connecting dashed vector arrows |

### Deterministic Template Mapping:
```
SlideType: 'comparison'              → comparisonTemplate
SlideType: 'architecture', 'code'    → diagramTemplate
SlideType: 'breakdown'               → stepsTemplate
SlideType: 'hook', 'takeaway', 'cta' → statementTemplate
SlideType: 'concept', 'problem'      → explainerTemplate
Unsupported / Unknown SlideType      → explainerTemplate (graceful fallback)
```

---

## 4. Typography & Design System Tokens

Centralized in `packages/renderer/src/design/tokens.ts`:
- **Canvas Size**: 1080 × 1350 px (Instagram portrait 4:5 aspect ratio).
- **Margins**: 80px safe margins on all sides (`contentWidth: 920px`, `contentHeight: 1190px`).
- **Color Palette**: Dark theme with `#0B0F17` primary background, `#161F30` card surfaces, `#38BDF8` cyan accent, `#818CF8` indigo secondary, `#34D399` emerald accent.
- **Typography**: Clean system fallbacks (`system-ui, -apple-system, Roboto, sans-serif` and `ui-monospace, Menlo, Consolas, monospace`), strict font size scales (headlineLarge: 58px, bodyLarge: 32px, bodyMedium: 28px).

---

## 5. Text Layout & Layout Safety

Implemented in `packages/renderer/src/design/textLayout.ts`:
- **`escapeXml(str)`**: Protects against malformed SVG by escaping `&`, `<`, `>`, `"`, and `'`.
- **`estimateCharUnits(char)`**: Accurately measures character widths including full-width CJK (Chinese, Japanese, Korean) and multi-byte surrogate pairs/emoji.
- **`wrapText(text, options)`**: Words are wrapped without breaking words unless a single continuous token exceeds `maxWidth`. Clamps output to `maxLines` with an ellipsis (`...`).
- **`renderWrappedTextSvg(lines, x, startY, lineHeightPx, attributes)`**: Emits clean `<text>` SVG blocks with positioned `<tspan>` child elements.

---

## 6. CLI Usage

The renderer includes a standalone CLI:
```bash
# Render a carousel JSON file to ./output/
npm run render -- ./examples/how-dns-works.json --output ./output/how-dns-works

# Override template across all slides
npm run render -- ./examples/docker-containers.json --output ./output/docker-statement --template statement
```

Output:
```
output/how-dns-works/
├── slide-01.png   (1080 × 1350)
├── slide-02.png   (1080 × 1350)
├── slide-03.png   (1080 × 1350)
├── slide-04.png   (1080 × 1350)
├── slide-05.png   (1080 × 1350)
└── slide-06.png   (1080 × 1350)
```
