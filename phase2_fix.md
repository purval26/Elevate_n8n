ElevateWeb Content Engine — Phase 2 Critical Fix: Text Rendering

The Phase 2 renderer technically passes all automated tests and produces valid 1080×1350 PNG files, but visual inspection of the actual rendered PNGs shows a critical production issue:

Text content is not visibly rendering in the generated PNGs.

Shapes, backgrounds, borders, accent lines, and the ElevateWeb logo render correctly, but slide headlines, body text, labels, and other textual content are missing/blank.

This makes the current Phase 2 output unusable for Instagram.

Objective

Fix the rendering pipeline so that ALL intended text from the CarouselPackage is visibly rendered in the final PNG output.

Do not redesign the entire renderer.

Do not start Phase 3.

Do not add n8n, Telegram, Instagram, analytics, authentication, or other infrastructure.

This is a focused Phase 2 bug-fix task.

---

First: Reproduce the actual problem

Before changing code:

1. Render the existing example:
   "how-dns-works.json"

2. Open the resulting PNG.

3. Confirm that:
   
   - shapes render
   - logo renders
   - text does not

4. Identify exactly why text disappears between:
   "CarouselPackage → SVG → @resvg/resvg-js → PNG"

Do not guess.

Inspect the generated SVG before rasterization.

---

Investigate these areas

Check:

1. SVG text generation

Verify that generated SVG actually contains:

- "<text>"
- "<tspan>" where applicable
- non-empty text content
- correct "x" / "y"
- valid "font-family"
- valid "font-size"
- valid "fill"
- valid opacity
- valid XML escaping

Do not assume that because the SVG string contains text-related code, the final SVG is correct.

Save or inspect an actual generated SVG from one of the example carousels.

---

2. Font loading

The current design specifies:

Outfit

Determine whether "@resvg/resvg-js" can actually resolve Outfit in the current runtime.

Do NOT rely on:

"font-family: "Outfit", sans-serif"

if Outfit is not physically available to the renderer.

For deterministic rendering, the renderer should use a font that is explicitly available to the rendering environment.

Prefer a repository-bundled font asset if licensing permits.

The renderer must not depend on whatever fonts happen to be installed on the developer's machine.

---

3. Verify with a minimal rendering test

Create a minimal SVG containing:

- black text
- white text
- blue text
- large heading
- small body text
- Outfit or the selected bundled font
- multiple lines
- numbers
- punctuation
- accented characters

Render it through the exact same "@resvg/resvg-js" pipeline.

This isolates font/rendering problems from the template system.

---

4. Check text color against background

Verify that text isn't merely being rendered with colors that are too close to the background.

Use actual pixel inspection if useful.

For the dark ElevateWeb theme:

- primary text should be clearly readable
- secondary text should still have sufficient contrast
- blue accent text should remain readable

Do not solve this by randomly making everything white.

Preserve the intended visual hierarchy.

---

Font fallback requirement

The final renderer must have a deterministic font strategy.

Acceptable approaches:

1. Bundle Outfit in the repository and explicitly provide it to the renderer, OR
2. Use another deterministic bundled font only if necessary and document the change.

Do NOT silently switch to an arbitrary system font.

If Outfit cannot be used with the current renderer, explain why before changing the font.

---

Preserve the current brand system

Do NOT redesign the existing templates.

Keep:

- 1080×1350
- ElevateWeb blue palette
- dark editorial visual system
- existing logo
- existing five templates
- current layout system
- current safe margins
- current template selection
- current API
- current CLI

Only change what is necessary to make text render correctly.

---

Improve tests

The current tests prove PNG validity and dimensions, but they do not sufficiently prove that textual content is visible.

Add regression coverage.

At minimum:

SVG-level test

Given a known headline such as:

"How DNS Actually Works"

verify the generated SVG contains the expected text.

PNG-level smoke test

Render a known sample containing highly distinctive text and verify the final PNG differs from an equivalent render with the text removed.

If practical, use pixel-region analysis to verify that the expected text region contains non-background pixels.

The test should fail if text disappears again.

Do not create brittle OCR tests unless there is a strong reason.

---

Visual verification

After fixing:

Render at least:

1. how-dns-works
2. jwt-vs-cookies
3. docker-containers
4. react-vs-nextjs
5. api-request-flow

Open the actual PNGs and verify:

- headlines visible
- body text visible
- labels visible
- numbers visible
- diagrams readable
- logo visible
- no clipping
- no overflow
- no unexpected missing characters
- Unicode still works
- text hierarchy is visually correct

Do not merely check that the PNG files exist.

---

Quality gate

Run:

"npm run build"

"npm run lint"

"npm run format:check"

"npm test"

All existing Phase 1 tests must remain passing.

All Phase 2 tests must remain passing.

Add the new regression tests.

---

Scope restriction

This is ONLY a Phase 2 rendering bug fix.

Do not:

- redesign templates
- rewrite Phase 1
- add n8n
- add Telegram
- add Instagram
- add analytics
- add authentication
- add database tables
- add multi-user infrastructure
- introduce a new rendering framework unless the existing approach is demonstrably impossible

Prefer the smallest reliable fix.

Final report

Report:

1. Root cause
2. Exact files changed
3. Font strategy used
4. How text rendering was fixed
5. New regression tests
6. Final test results
7. Example rendered outputs inspected
8. Any remaining limitations

STOP after this fix. Do not begin Phase 3.