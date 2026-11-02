# Phase 3 — LLM-Native HTML/CSS Creative Renderer

We have completed Phase 2.5 of the ElevateWeb Content Engine.

Phase 2.5 is stable:
- 200/200 tests passing
- TypeScript build clean
- ESLint clean
- Prettier clean
- Phase 1 + Phase 2 regression tests passing
- AI Visual Director implemented
- deterministic illustration providers implemented
- fallback system implemented
- existing SVG renderer is working

DO NOT rebuild, replace, or unnecessarily refactor Phase 2.5.

We are now testing a different creative rendering approach.

The goal of this phase is simple:

> Let the LLM design the actual carousel using HTML/CSS/SVG, then use Chromium/Playwright to render that HTML into 1080×1350 PNGs.

The LLM should have substantially more creative freedom than the current VisualSpecification/template system.

==================================================
1. CORE ARCHITECTURE
==================================================

Implement a new primary rendering path:

CarouselPackage
    ↓
LLM Creative Designer
    ↓
Complete HTML/CSS/SVG carousel
    ↓
HTML validation
    ↓
Chromium/Playwright rendering
    ↓
1080×1350 PNG per slide
    ↓
Basic visual/structural QA
    ↓
Final carousel

Existing Phase 2.5 renderer remains available as fallback:

HTML renderer failure
    ↓
Phase 2.5 AI visual renderer
    ↓
Phase 2 deterministic renderer

Do NOT delete existing renderers.

Do NOT make the new system dependent on the existing VisualSpecification schema.

The HTML itself is the visual specification.

==================================================
2. FIRST: INSPECT THE EXISTING REPOSITORY
==================================================

Before changing code:

- Inspect the current monorepo structure.
- Inspect packages/types.
- Inspect packages/prompts.
- Inspect packages/content.
- Inspect packages/renderer.
- Inspect existing renderer tests.
- Inspect the bundled Outfit and Space Mono fonts.
- Inspect the authoritative ElevateWeb SVG logo.
- Inspect existing Playwright dependencies/utilities if present.
- Inspect existing CLI conventions.
- Inspect existing examples.

Reuse existing infrastructure wherever sensible.

Do NOT introduce a new framework or unnecessary dependency if the repository already has what is needed.

Do NOT redesign the whole architecture.

==================================================
3. HTML CREATIVE DESIGNER
==================================================

Create a focused module responsible for generating the carousel HTML.

Input:

CarouselPackage

Output:

A complete self-contained HTML document.

Example conceptual output:

<!doctype html>
<html>
<head>
  ...
</head>
<body>

  <section class="slide" data-slide="1">
    ...
  </section>

  <section class="slide" data-slide="2">
    ...
  </section>

  ...

</body>
</html>

The LLM is responsible for designing the actual visual composition.

Do NOT force it to select from:
- hero-right
- hero-left
- diagram-focus
- process-flow
- editorial-stack
- etc.

Those fixed composition primitives are exactly what this experiment is intended to move beyond.

The model may create completely different layouts for different slides.

==================================================
4. CREATIVE FREEDOM
==================================================

The LLM should make the design decisions a skilled human Instagram designer would make.

It should decide:

- headline wording/layout within the supplied content
- visual hierarchy
- which words deserve accent color
- typography scale
- whitespace
- alignment
- card usage
- borders
- dividers
- shapes
- overlap
- visual rhythm
- illustration placement
- whether an illustration is necessary
- illustration style
- diagram structure
- editorial composition
- visual metaphor
- technical visualization
- UI mockup
- code presentation
- comparison layout
- process visualization
- timeline
- data visualization
- big-type slide
- typography-only slide
- mixed visual/text composition

Possible visual styles include, when appropriate:

- clean editorial illustration
- flat 2D illustration
- subtle 3D
- isometric
- hand-drawn
- technical schematic
- realistic object
- cartoon/character-based
- UI mockup
- abstract geometric
- diagrammatic
- typography-driven
- code/editor aesthetic

The model should choose the style based on the actual concept.

Do NOT make every slide look like a card.

Do NOT make every slide use the same composition.

Do NOT force illustrations onto every slide.

Do NOT force dark backgrounds.

Do NOT use generic "AI-looking" neon/glow aesthetics unless the topic genuinely benefits from them.

The result should feel like a professionally art-directed Instagram carousel, not a technical documentation generator.

==================================================
5. BRAND RULES
==================================================

Preserve ElevateWeb's existing brand identity.

Use the existing authoritative assets from the repository.

Brand colors:

--primary: #2563EB
--primary-hover: #1D4ED8
--primary-light: #3B82F6
--primary-soft: #EFF6FF

--background: #FFFFFF
--surface: #F9FAFB
--card: #FFFFFF
--border: #E5E7EB
--text: #111827
--subtext: #6B7280

--success: #22C55E
--warning: #F59E0B
--error: #EF4444

Typography:

Outfit = primary brand/display/body font.

Space Mono = technical/code/metadata/technical labels only.

IMPORTANT:

The ElevateWeb wordmark must use Outfit.

The ElevateWeb slogan must use Outfit.

Do NOT render the brand name or slogan using Space Mono.

Use the actual ElevateWeb SVG logo from the repository rather than recreating the logo with text.

Do not introduce random brand colors.

==================================================
6. CONTENT AUTHORITY
==================================================

CarouselPackage remains authoritative.

The HTML designer must NOT:

- invent technical facts
- alter technical claims
- invent statistics
- change code
- fabricate citations
- introduce unsupported claims

The model may creatively arrange and visually emphasize the supplied content.

It may make minor copy/layout decisions only when explicitly permitted by the existing content-generation contract.

Do not allow visual creativity to become factual rewriting.

==================================================
7. SLIDE DIMENSIONS
==================================================

Every slide MUST be exactly:

1080px × 1350px

Use a fixed `.slide` element.

Example conceptual CSS:

.slide {
  width: 1080px;
  height: 1350px;
  position: relative;
  overflow: hidden;
}

Do NOT depend on:

- viewport dimensions
- responsive breakpoints
- mobile browser layout
- dynamic viewport units

The output must be deterministic at the target dimensions.

Maintain sensible safe margins.

Prefer approximately 70–90px minimum outer safe space unless the composition deliberately requires something different.

Nothing important should be clipped by the canvas.

==================================================
8. HTML/CSS/SVG CAPABILITIES
==================================================

Allow the LLM to use normal HTML/CSS capabilities needed for high-quality design:

- flexbox
- CSS grid
- absolute positioning
- relative positioning
- typography
- borders
- border-radius
- transforms
- gradients where genuinely useful
- shadows
- SVG
- CSS shapes
- pseudo-elements
- clipping/masking where safe
- layered compositions

Inline SVG is explicitly allowed.

SVG should be encouraged for:

- technical diagrams
- arrows
- icons
- geometric illustrations
- network diagrams
- conceptual illustrations
- decorative elements

Do not force all illustrations into predefined renderer primitives.

==================================================
9. ILLUSTRATIONS
==================================================

For this initial Phase 3 implementation, prioritize HTML/CSS/SVG-generated visuals.

Do NOT build another large illustration provider architecture.

Do NOT make external image generation mandatory.

The LLM should be able to create meaningful visuals using:

- inline SVG
- CSS shapes
- HTML structures
- diagrams
- UI mockups
- geometric compositions

Keep the architecture open enough that generated image assets can be added later.

If an external/generated image is eventually supported, typography and exact technical labels should remain HTML/SVG rather than relying on text baked into raster artwork.

==================================================
10. HTML GENERATION PROMPT
==================================================

Create a strong system prompt for the Creative Designer.

The prompt should communicate:

"You are the lead visual designer for ElevateWeb's Instagram content.

You are not filling a template.

You are designing a complete visual carousel from scratch.

Think like a senior editorial designer, graphic designer, art director, typography designer, and technical illustrator.

For every slide, first understand the communication goal.

Then choose the visual composition that communicates that idea most clearly.

Do not repeat layouts unnecessarily.

Use typography, whitespace, diagrams, illustrations, shapes, UI elements, code, comparisons, and visual metaphors intentionally.

The design should feel designed, not generated.

Prioritize clarity, hierarchy, visual storytelling, and brand consistency."

Include all relevant brand and technical constraints from this specification.

IMPORTANT:
Do not turn this prompt into a giant rigid checklist that prevents creativity.

The goal is controlled creative freedom.

==================================================
11. SEMANTIC ACCENT COLORS
==================================================

Do NOT hardcode rules such as:

"Always make technical nouns blue."

Instead, let the LLM decide which 1–3 words or phrases deserve emphasis based on meaning.

Examples:

"DNS turns a domain into an IP address."

Possible emphasis:

DNS
domain
IP address

But the model should choose based on the slide's communication goal.

Accent color should communicate hierarchy, not decoration.

Avoid excessive blue highlighting.

==================================================
12. HTML SAFETY
==================================================

The generated HTML must be safe to render.

Allow:

- HTML
- CSS
- inline SVG

Disallow or sanitize:

- script tags
- inline JavaScript
- event handlers
- arbitrary executable code
- browser storage APIs
- network requests
- external tracking
- iframes
- forms
- external fonts
- external CSS
- arbitrary remote assets

The renderer should operate without requiring internet access.

Do not allow the LLM to execute code during rendering.

==================================================
13. FONT LOADING
==================================================

Use the already bundled font files from the repository.

Do NOT rely on:

https://fonts.googleapis.com

or any external font CDN.

Ensure Chromium loads the bundled fonts before screenshots are taken.

Explicitly verify font loading.

This is important because Phase 2 previously experienced a font fallback problem.

Do not repeat that failure mode.

==================================================
14. LOGO
==================================================

Inject/use the existing authoritative ElevateWeb SVG logo.

Do not ask the LLM to recreate the logo.

Do not let the LLM generate a fake text-based logo.

The model may decide where the logo belongs and how large it should be, within brand constraints.

==================================================
15. CHROMIUM / PLAYWRIGHT RENDERER
==================================================

Implement a renderer that:

1. Receives generated HTML.
2. Writes it to a controlled temporary location or otherwise loads it safely.
3. Starts/reuses Chromium.
4. Loads the HTML.
5. Waits for fonts/assets/layout to finish.
6. Finds `.slide` elements.
7. Screenshots each slide individually.
8. Produces PNG files at exactly 1080×1350.

Do not screenshot the entire page and crop blindly.

Each `.slide` should be rendered as its own exact 1080×1350 image.

Reuse existing Playwright infrastructure if already present.

==================================================
16. VALIDATION
==================================================

Before rendering, validate:

- valid HTML structure
- 5–8 slides
- every slide has `class="slide"`
- no scripts
- no external network dependencies
- no unsupported elements
- required brand assets are available

After rendering, validate:

- PNG exists
- dimensions = 1080×1350
- slide count matches
- no missing images/assets
- fonts loaded
- no obvious horizontal overflow
- no obvious vertical overflow
- no important element extends outside the slide bounds

Use browser DOM measurements where practical.

For example, inspect bounding boxes of important elements against the slide rectangle.

Do not attempt to build an enormous computer-vision QA system in this phase.

Basic structural QA is enough.

==================================================
17. OPTIONAL CREATIVE QA
==================================================

If the existing project already has a suitable vision-capable model integration, it may be used for a lightweight visual critique.

But this is OPTIONAL.

Do not create a complex autonomous design-agent loop.

Maximum:

1 initial generation
+
1 revision if obvious structural/design problems are detected

Do not create 5–10 iterative LLM revision loops.

Token efficiency matters.

==================================================
18. FALLBACK
==================================================

If:

- LLM generation fails
- HTML validation fails
- Chromium rendering fails
- required fonts/assets fail
- output dimensions are wrong

then gracefully fall back to the existing Phase 2.5 renderer.

Do not fail the entire content pipeline.

Log the reason for fallback.

==================================================
19. CLI
==================================================

Add a simple CLI following existing project conventions.

Something conceptually like:

npm run render-html -- <carousel.json> -o <output_dir>

The command should:

1. Load CarouselPackage.
2. Generate HTML.
3. Save generated HTML for debugging.
4. Validate HTML.
5. Render slides.
6. Validate PNGs.
7. Report output paths.

Do not remove:

npm run render
npm run visual-design
npm run render-ai

Existing commands must continue working.

==================================================
20. DEBUG ARTIFACTS
==================================================

For each HTML-rendered carousel, make it easy to inspect:

output/
  html/
    carousel.html

  slides/
    slide-01.png
    slide-02.png
    ...

Do not create unnecessary artifact types.

The generated HTML should be preserved because it is extremely useful for debugging visual quality.

==================================================
21. TESTS
==================================================

Add focused tests for the new path.

At minimum:

- HTML generation contract
- slide count validation
- `.slide` detection
- invalid HTML rejection
- script rejection
- external dependency rejection
- font loading
- logo injection
- exact 1080×1350 rendering
- multi-slide screenshot generation
- overflow detection
- fallback behavior
- existing renderers still pass

Do NOT rewrite the existing 200 tests.

The existing test suite must remain green.

==================================================
22. EXAMPLE / REAL-WORLD VALIDATION
==================================================

After implementation, render at least these existing examples:

- DNS
- JWT vs Cookies
- Docker
- React vs Next.js
- API request flow

Do not judge success only by tests.

Actually inspect the generated PNGs.

The important question is:

Does this look substantially more like a professionally designed Instagram carousel than the current deterministic/template renderer?

Specifically look for:

- visual variety
- strong hierarchy
- meaningful illustration
- whitespace
- composition
- typography
- storytelling
- concept-to-visual relationship
- brand consistency

If every slide still looks like a card with text inside it, the implementation has failed the creative objective even if all tests pass.

==================================================
23. DESIGN QUALITY BAR
==================================================

Avoid:

- generic SaaS dashboards
- repetitive cards
- excessive rounded rectangles
- neon gradients
- glassmorphism
- random decorative blobs
- excessive shadows
- fake 3D
- generic AI-art aesthetics
- dense documentation layouts
- tiny unreadable text
- walls of text
- identical slide compositions
- unnecessary icons everywhere

Prefer:

- editorial composition
- strong typography
- deliberate whitespace
- visual storytelling
- concept-driven illustrations
- asymmetry when useful
- meaningful contrast
- varied slide rhythm
- clear information hierarchy
- sophisticated but restrained visual design

The carousel should look like something a skilled designer intentionally created for Instagram.

==================================================
24. IMPORTANT ARCHITECTURAL CONSTRAINT
==================================================

Do NOT overengineer this phase.

This is an experiment.

Do NOT introduce:

- microservices
- Redis
- queues
- Kubernetes
- authentication
- multi-tenancy
- billing
- workspaces
- SaaS abstractions
- new databases
- n8n integration
- Telegram integration
- Instagram API
- analytics systems
- scheduling systems

Those are outside the scope.

Keep this as a clean personal content-generation tool.

==================================================
25. DEFINITION OF DONE
==================================================

Phase 3 is complete when:

- LLM can generate a complete carousel HTML document.
- HTML can contain arbitrary creative CSS/SVG compositions.
- 5–8 slides render successfully.
- Every PNG is exactly 1080×1350.
- Outfit loads correctly.
- Space Mono works where appropriate.
- ElevateWeb logo is the real SVG.
- ElevateWeb wordmark/slogan use Outfit.
- No external network dependency is required.
- HTML is safely validated.
- Overflow is detected.
- Existing Phase 1/2/2.5 tests remain green.
- Existing renderers remain intact.
- At least the five real examples render successfully.
- Generated HTML is preserved for debugging.
- Phase 2.5 renderer works as fallback.

Most importantly:

The resulting slides should demonstrate that the LLM can make substantially better and more varied visual design decisions than our fixed template/composition system.

Do not optimize for architectural complexity.

Optimize for:

LLM creative intelligence
+
HTML/CSS flexibility
+
deterministic Chromium rendering
+
brand consistency
+
reliable fallback.

Before finishing, run the complete verification suite and report:

1. files changed
2. architecture implemented
3. tests
4. build/lint/format
5. example renders
6. fallback verification
7. visual QA observations
8. git commit hash and push status

Do not claim success without actually running the tests and rendering the example carousels.