ElevateWeb Content Engine — Phase 2

Visual Engine: Carousel JSON → Instagram-ready PNGs

You are continuing development of the existing "Elevate_n8n" repository.

Phase 1 is COMPLETE and LOCKED.

The existing Phase 1 implementation has already passed its quality gates, including TypeScript build, ESLint, unit/integration tests, E2E tests, adversarial tests, and live HTTP checks.

Your job is to implement ONLY Phase 2: the Visual Engine.

---

1. PRIMARY OBJECTIVE

Build a simple, reliable rendering system that takes the existing validated "CarouselPackage" produced by Phase 1 and renders it into polished Instagram carousel images.

Input

Existing "CarouselPackage" JSON.

Output

A directory containing:

slide-01.png
slide-02.png
slide-03.png
...

Each image must be:

1080 × 1350 px

optimized for an Instagram portrait carousel.

The renderer should be deterministic:

same CarouselPackage
        ↓
same template
        ↓
same visual structure
        ↓
same rendered output

The AI should NOT control pixel-level layout.

The renderer controls layout.

---

2. VERY IMPORTANT — DO NOT OVERENGINEER

This is a personal single-user ElevateWeb automation tool, NOT a SaaS product.

Optimize for:

- simplicity
- maintainability
- reliability
- visual consistency
- easy debugging
- low operational complexity

DO NOT introduce:

- ❌ authentication
- ❌ multi-user architecture
- ❌ organizations/workspaces
- ❌ permissions
- ❌ billing
- ❌ dashboards
- ❌ microservices
- ❌ message queues
- ❌ event buses
- ❌ Kubernetes
- ❌ Redis unless absolutely required
- ❌ cloud storage abstraction layers
- ❌ image-processing pipelines
- ❌ plugin marketplaces
- ❌ template management UIs
- ❌ admin panels
- ❌ CMS
- ❌ database tables for every visual property
- ❌ unnecessary design-pattern abstractions
- ❌ speculative scalability
- ❌ Instagram publishing
- ❌ Telegram integration
- ❌ n8n workflows
- ❌ analytics

Do not build infrastructure for hypothetical future users.

Build the smallest good system that solves the actual Phase 2 problem.

If a feature is not required to render the carousel, do not build it.

---

3. DO NOT REBUILD PHASE 1

Treat the existing Phase 1 contracts as stable.

Do NOT rewrite or redesign:

- "CarouselPackage"
- existing Zod schemas
- Phase 1 generation logic
- OpenAI generation logic
- Supabase persistence
- existing API contracts
- existing error architecture

Reuse the existing types.

Do not duplicate the carousel schema inside the renderer.

Import and use the existing shared types.

---

4. RENDERING TECHNOLOGY

Use a straightforward HTML/React → Chromium/Playwright rendering approach.

Preferred flow:

CarouselPackage
       ↓
Template selection
       ↓
React/HTML slide
       ↓
Playwright / Chromium
       ↓
PNG

Use Playwright only where necessary for rendering.

Do not introduce another rendering framework unless there is a concrete technical reason.

The renderer should run locally from the repository without requiring external design software.

---

5. INITIAL TEMPLATE SYSTEM

Implement exactly five initial visual templates.

Do not build a giant template library.

Template 1 — Explainer

For:

- technical concepts
- "How X works"
- educational posts

Structure:

small category label

large headline

short explanatory body

simple visual / diagram area

slide number

---

Template 2 — Comparison

For:

A vs B
X vs Y
technology comparisons

Structure:

headline

┌──────────────┬──────────────┐
│      A       │      B       │
│              │              │
│   details    │   details    │
└──────────────┴──────────────┘

bottom takeaway

---

Template 3 — Steps

For:

How to...
Process...
Workflow...

Structure:

STEP 01

large headline

short explanation

visual/process indicator

01 / 06

---

Template 4 — Statement

For strong educational statements.

Structure:

large statement

supporting explanation

small ElevateWeb branding

slide number

---

Template 5 — Diagram

For:

- architecture
- request flows
- system explanations
- technical diagrams

Structure:

headline

       ┌──────┐
       │      │
       └──┬───┘
          ↓
       ┌──────┐
       │      │
       └──┬───┘
          ↓
       ┌──────┐
       │      │
       └──────┘

short explanation

The diagrams should be generated from structured slide information where possible.

Do NOT use AI-generated images for technical diagrams.

---

6. DESIGN SYSTEM

Create a small reusable ElevateWeb design system.

Centralize:

- colors
- typography
- spacing
- border radius
- shadows
- logo/brand treatment
- slide dimensions

Do NOT scatter hard-coded visual values across every template.

Use a small number of reusable design tokens.

Important design direction

The existing ElevateWeb visual identity should feel:

- modern
- technical
- editorial
- premium
- clean
- confident

Avoid:

- generic AI aesthetics
- excessive gradients
- neon glows
- glassmorphism everywhere
- excessive rounded cards
- random decorative blobs
- stock-photo aesthetics
- "AI startup landing page" appearance
- template-marketplace appearance

Prioritize typography and layout over decoration.

---

7. TYPOGRAPHY

Use a deliberate typography hierarchy.

At minimum:

Eyebrow / category
↓
Headline
↓
Body
↓
Metadata / slide number

Choose fonts that are legally/technically practical for local rendering.

The renderer must not depend on a user's locally installed font.

Bundle or load a reliable font source appropriate for deployment.

Do not use a different random font on every template.

---

8. RESPONSIVE / SAFE LAYOUT

The canvas is fixed:

1080 × 1350

Design for that exact canvas.

Every important element must remain inside a safe margin.

No:

- clipped text
- overflowing text
- overlapping elements
- text outside canvas
- broken Unicode
- accidental horizontal scroll
- unpredictable wrapping

Long headlines must gracefully wrap.

Long body text must either:

- fit within the designed area, or
- be truncated safely.

Do NOT allow content to destroy the layout.

---

9. SLIDE CONTENT MAPPING

Use the existing "CarouselPackage" structure.

The renderer should consume fields such as:

hook
slides[]
headline
body
visualSuggestion
slideNumber
caption
cta
hashtags

Do not ask OpenAI to rewrite the content during rendering.

Phase 2 is a visual rendering system, not another content-generation system.

---

10. TEMPLATE SELECTION

Implement a simple deterministic template-selection mechanism.

Do NOT build a machine-learning classifier.

A simple approach is sufficient:

slide.type
       ↓
template mapping
       ↓
renderer

For example:

comparison → comparison template
diagram → diagram template
steps → steps template
statement → statement template
default → explainer template

If the existing slide types differ from these names, adapt to the actual Phase 1 schema rather than changing the schema.

The existing Phase 1 types are the source of truth.

---

11. RENDERER API

Create a clean internal rendering interface.

Conceptually:

renderCarousel(carouselPackage, options)

It should return something equivalent to:

{
  outputDir: string,
  slides: [
    {
      slideNumber: 1,
      filePath: "...",
      width: 1080,
      height: 1350
    }
  ]
}

Use the actual project conventions and types rather than blindly copying this interface.

---

12. CLI

Provide a simple local CLI or script so the renderer can be tested without n8n.

Example:

npm run render -- ./examples/sample-carousel.json

Expected result:

output/
├── slide-01.png
├── slide-02.png
├── slide-03.png
├── slide-04.png
├── slide-05.png
└── slide-06.png

Also provide at least one realistic sample carousel.

---

13. TESTING

Add tests for the actual Phase 2 behavior.

At minimum test:

Renderer

- valid 5-slide carousel
- valid 6-slide carousel
- valid 8-slide carousel
- template selection
- correct output count
- correct filenames
- correct image dimensions
- empty/invalid input rejection
- long headlines
- long body text
- Unicode
- CJK text
- accented characters
- special characters
- missing visual suggestion where permitted
- unsupported slide type fallback

Visual smoke tests

Render at least one complete carousel and verify:

1080 × 1350
PNG
non-empty file
all expected slides generated

If practical, inspect screenshots or pixel dimensions programmatically.

Do not create hundreds of pointless tests.

---

14. VISUAL QUALITY CHECK

Create a small set of representative examples:

1. "How DNS Works"
2. "JWT vs Session Cookies"
3. "Docker Containers Explained"
4. "React vs Next.js"
5. "How an API Request Works"

Render each using the appropriate templates.

The output should look like something that could realistically be posted to the ElevateWeb Instagram account.

Avoid designs that look like developer documentation screenshots.

---

15. ERROR HANDLING

Errors should be useful and simple.

Examples:

Invalid carousel package
Unsupported template
Rendering failed
Chromium unavailable
Output directory unavailable

Do not expose secrets.

Reuse existing Phase 1 error/sanitization utilities where appropriate instead of creating another secret-redaction system.

---

16. DEPENDENCY DISCIPLINE

Before adding a dependency:

1. Check whether the existing repository already provides the capability.
2. Prefer the smallest well-maintained dependency.
3. Avoid dependencies that solve only trivial problems.
4. Do not add infrastructure dependencies for hypothetical future requirements.

At the end, report every new dependency and why it was necessary.

---

17. REPOSITORY STRUCTURE

Follow the existing monorepo structure.

A reasonable implementation might look like:

packages/
  renderer/
    src/
      templates/
      components/
      design/
      render.ts
      templateSelector.ts
      index.ts
    tests/

examples/
  sample-carousel.json

output/

Adapt this to the existing repository conventions.

Do not reorganize the entire repository.

Do not rename existing Phase 1 packages simply to make the structure "cleaner."

---

18. NO N8N YET

Do NOT implement:

- n8n workflows
- cron scheduling
- webhook automation
- Telegram
- Instagram
- Meta API
- analytics

Those belong to later phases.

The renderer should simply expose a clean interface that a future n8n workflow can call.

---

19. NO DATABASE CHANGES UNLESS ABSOLUTELY NECESSARY

Phase 2 should preferably require zero database schema changes.

Do not add database tables merely to store rendering metadata.

If you believe a database change is absolutely necessary, STOP and explain why before implementing it.

---

20. BACKWARD COMPATIBILITY

After Phase 2:

npm run build
npm run lint
npm test

must continue passing.

All existing Phase 1 tests must remain passing.

Do not weaken or delete existing tests to make Phase 2 pass.

Do not change Phase 1 behavior just to simplify Phase 2.

---

21. DEFINITION OF DONE

Phase 2 is complete only when:

Engineering

- [ ] Existing Phase 1 functionality still works
- [ ] TypeScript build passes
- [ ] ESLint passes
- [ ] Existing tests pass
- [ ] Phase 2 tests pass
- [ ] No secrets committed

Rendering

- [ ] Five templates implemented
- [ ] 1080×1350 PNG output
- [ ] Correct slide ordering
- [ ] Correct filenames
- [ ] Long text handled safely
- [ ] Unicode handled
- [ ] Template fallback works
- [ ] CLI/local rendering works

Quality

- [ ] At least five realistic example carousels rendered
- [ ] Visual output inspected
- [ ] No clipped/overflowing content
- [ ] No unnecessary dependencies
- [ ] No Phase 1 API breaking changes

Scope

- [ ] No n8n
- [ ] No Telegram
- [ ] No Instagram
- [ ] No analytics
- [ ] No authentication
- [ ] No multi-user functionality
- [ ] No SaaS infrastructure
- [ ] No unnecessary architecture expansion

---

22. CRITICAL AGENT BEHAVIOR

You are working on an existing project.

Before modifying anything:

1. Inspect the current repository.
2. Read the existing Phase 1 types and schemas.
3. Understand the current workspace structure.
4. Identify the existing slide types.
5. Reuse existing utilities where possible.

Do NOT assume the architecture from this prompt overrides the repository.

The repository is the source of truth.

If something already exists, reuse it.

If something is unnecessary, do not add it.

If you encounter an architectural question that does not affect Phase 2, choose the simplest reasonable option and continue.

Do not stop to build infrastructure for future phases.

---

23. MOST IMPORTANT RULE

Do not over-engineer this project.

This is a personal tool used by one person to automate ElevateWeb's Instagram content.

The goal is not:

«"Build the most scalable content platform possible."»

The goal is:

«"Turn good carousel JSON into consistently excellent Instagram images with as little complexity as possible."»

When choosing between:

simple solution

and

abstract/scalable/enterprise solution

choose the simple solution unless there is a concrete current requirement that makes it insufficient.

At the end of the implementation, provide:

1. What you changed
2. Files created/modified
3. Dependencies added
4. How to run the renderer
5. Test results
6. Example output locations
7. Any known limitations

Do not begin Phase 3.

Stop after Phase 2 and report completion.