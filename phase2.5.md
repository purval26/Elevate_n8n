ElevateWeb Content Engine — Phase 2.5

AI Visual Director + Illustration Engine

Context

Phase 1 — Content Generation is complete.

Phase 2 — Deterministic Visual Renderer is complete and should now be treated as stable rendering infrastructure.

The current renderer successfully:

- Accepts validated "CarouselPackage" objects
- Produces deterministic 1080×1350 PNGs
- Uses the ElevateWeb logo
- Uses bundled Outfit typography
- Supports diagrams and vector elements
- Handles Unicode/text layout
- Has strong automated regression coverage
- Provides the existing five templates:
  - Explainer
  - Comparison
  - Steps
  - Statement
  - Diagram

However, visual inspection revealed an important product-level limitation:

The renderer is too template-driven.

Many slides have the same basic composition:

- text
- cards
- borders
- arrows
- boxes

This technically works, but it does not create the visual storytelling quality required for a professional ElevateWeb Instagram content engine.

A technical concept such as DNS, CDN, APIs, OAuth, Docker, caching, databases, networking, etc. often needs an actual visual illustration or visual metaphor so that a non-technical viewer can understand the concept quickly.

Therefore, the next layer must introduce AI-directed visual composition and AI-generated illustration assets, while keeping the existing deterministic renderer responsible for exact typography, branding, labels, diagrams, and final composition.

---

PRIMARY OBJECTIVE

Build a new AI Visual Director + Illustration Engine on top of the existing renderer.

The new pipeline should become:

CarouselPackage
       ↓
AI Visual Director
       ↓
Per-slide VisualSpecification
       ↓
┌───────────────────────┬────────────────────────┐
│ Deterministic layout  │ Illustration generation│
│ / visual primitives   │ when needed            │
└───────────┬───────────┴────────────┬───────────┘
            ↓                        ↓
            └──────────┬─────────────┘
                       ↓
             Existing Renderer
                       ↓
                 1080×1350 PNG

The AI should decide how the concept should be communicated visually.

The renderer should execute that decision reliably.

The image-generation model should generate illustrations/assets, NOT the finished Instagram slide.

---

VERY IMPORTANT: DO NOT OVERENGINEER

This remains a personal ElevateWeb automation, not a SaaS platform.

Optimize for:

- visual quality
- reliability
- simplicity
- maintainability
- deterministic rendering
- easy debugging
- low operational complexity

Do NOT add:

- authentication
- users
- organizations
- workspaces
- permissions
- billing
- dashboards
- microservices
- queues
- event buses
- Kubernetes
- Redis unless concretely required
- asset marketplaces
- template management UIs
- CMS systems
- plugin architectures
- multi-tenant infrastructure
- speculative scalability
- n8n
- Telegram
- Instagram publishing
- analytics

Do not rebuild Phase 1.

Do not replace the existing renderer.

Do not throw away the existing five templates.

They should become fallback rendering strategies/primitives, not the primary creative intelligence.

If an enterprise architecture and a simple architecture can both solve the problem, choose the simple architecture.

---

CORE DESIGN PRINCIPLE

The system should behave more like:

Writer + Art Director + Illustrator + Production Designer

rather than:

Writer + Template Filler

The AI Visual Director should ask:

«"What is the clearest visual way to explain this specific concept to a normal person?"»

not:

«"Which template should I put this text into?"»

---

1. VISUAL DIRECTOR

Create a new module responsible for converting a "CarouselPackage" into per-slide visual specifications.

Conceptually:

CarouselPackage
       ↓
Visual Director
       ↓
VisualSpecification[]

The Visual Director should receive:

- complete carousel content
- current slide
- previous slide context
- next slide context where useful
- slide type
- hook
- headline
- body
- visualSuggestion
- carousel topic
- content pillar
- ElevateWeb brand specification
- available visual primitives

The Visual Director must NOT rewrite the content.

It may decide:

- what to emphasize
- how to arrange it
- what visual form communicates it best
- whether an illustration is needed
- whether a diagram is better
- whether typography alone is sufficient
- which visual assets are required

---

2. VISUAL STRATEGY

Each slide should receive a visual strategy.

Example allowed strategies:

illustration
diagram
technical-diagram
conceptual-metaphor
comparison
process
timeline
big-type
editorial
ui-mockup
code
data-visualization
mixed
none

This list is extensible, but keep it small.

The AI should be able to choose different strategies for different slides in the same carousel.

Example:

Slide 1 → big-type
Slide 2 → conceptual-metaphor
Slide 3 → technical-diagram
Slide 4 → illustration
Slide 5 → comparison
Slide 6 → takeaway

This is intentional.

Do NOT force every slide into the same layout.

---

3. ILLUSTRATION DECISION

The Visual Director must explicitly decide whether an illustration is required.

Example:

{
  "visualStrategy": "conceptual-metaphor",
  "illustrationRequired": true,
  "illustrationPurpose": "Show how DNS translates a human-readable domain name into an IP address."
}

Or:

{
  "visualStrategy": "comparison",
  "illustrationRequired": false
}

Illustrations should be generated when they materially improve understanding.

Do NOT generate an illustration simply because the system can.

---

4. ILLUSTRATION TYPES

Support a small controlled set of illustration styles.

Examples:

technical-editorial
flat-geometric
conceptual
isometric-technical
minimal-diagrammatic
abstract-technical

Default toward:

clean technical editorial illustration

Characteristics:

- simple geometric forms
- clear silhouettes
- controlled detail
- professional
- modern
- understandable at mobile size
- ElevateWeb-compatible
- mostly blue/white/neutral
- subtle depth when useful

Avoid:

- generic AI art
- photorealistic people unless specifically useful
- excessive 3D
- neon cyberpunk
- glassmorphism
- glowing futuristic interfaces
- random decorative objects
- stock-photo aesthetics
- excessive gradients
- text-heavy generated images

---

5. CRITICAL IMAGE-GENERATION RULE

The image model should NOT generate the final Instagram slide.

It should generate an asset/illustration only.

Generated illustrations must preferably contain:

- NO text
- NO headlines
- NO technical labels
- NO code
- NO numbers that matter
- NO logos

Those elements must be rendered deterministically by our own renderer.

For example:

BAD:

Generate an Instagram slide explaining DNS.

GOOD:

Generate a clean technical editorial illustration showing
a web browser requesting the IP address associated with a
domain name through a DNS resolver.

No text.
No labels.
No letters.
No logos.
White/light background.
Blue and neutral visual language.
Clear visual hierarchy.
Suitable for placement inside a 1080x1350 editorial layout.

The renderer then adds:

Browser
google.com
DNS Resolver
142.250.x.x

with exact typography and positioning.

---

6. ILLUSTRATION ASSET CONTRACT

Create a simple asset contract.

Conceptually:

type IllustrationRequest = {
  id: string;
  purpose: string;
  visualConcept: string;
  style: string;
  aspectRatio: string;
  transparentBackground?: boolean;
  constraints: string[];
};

And:

type IllustrationAsset = {
  id: string;
  path: string;
  mimeType: string;
  width: number;
  height: number;
};

Adapt this to the existing repository architecture.

Do NOT create an elaborate asset-management platform.

---

7. VISUAL SPECIFICATION

Create a structured "VisualSpecification" that the renderer can consume.

The AI should work with high-level layout primitives, NOT arbitrary pixel coordinates.

For example:

{
  "visualStrategy": "illustration-with-callouts",
  "composition": "hero-right",
  "background": "light",
  "accent": "primary-blue",
  "illustration": {
    "required": true,
    "assetId": "dns-request"
  },
  "elements": [
    {
      "type": "eyebrow",
      "text": "WEB FUNDAMENTALS"
    },
    {
      "type": "headline",
      "text": "What actually happens when you type a URL?"
    },
    {
      "type": "callout",
      "label": "DNS",
      "target": "dns-resolver"
    }
  ]
}

Do NOT allow the AI to control arbitrary:

x=437
y=281
font-size=73

for every element.

The renderer should own geometry.

The AI should choose semantic composition primitives.

---

8. COMPOSITION PRIMITIVES

Create a controlled vocabulary of reusable compositions.

Start with approximately:

centered-hero
big-type
hero-left
hero-right
split-50
split-60-40
full-width-illustration
illustration-with-callouts
illustration-with-side-copy
process-flow
vertical-process
comparison
before-after
timeline
big-number
editorial-stack
diagram-focus
code-focus
ui-focus
takeaway

Do not create dozens of variants initially.

The goal is flexibility without chaos.

---

9. VISUAL ELEMENT PRIMITIVES

The renderer should support reusable semantic elements such as:

headline
body
eyebrow
label
badge
number
stat
divider
card
callout
arrow
connector
node
icon
illustration
code
quote
logo

Reuse existing renderer components where possible.

Do not rebuild components that already exist.

---

10. BRAND SYSTEM

Use the existing ElevateWeb brand specification as the source of truth.

Colors

Primary:

"#2563EB"

Deep:

"#1D4ED8"

Light:

"#3B82F6"

Soft:

"#EFF6FF"

Background:

"#FFFFFF"

Surface:

"#F9FAFB"

Border:

"#E5E7EB"

Primary text:

"#111827"

Secondary text:

"#6B7280"

Success:

"#22C55E"

Warning:

"#F59E0B"

Error:

"#EF4444"

Typography

Primary font:

Outfit

Monospace:

Space Mono

The bundled fonts created during Phase 2 must continue to be used.

Do not reintroduce system-font dependency.

Logo

Use the existing authoritative ElevateWeb SVG.

Do not recreate it.

---

11. BRAND CONSISTENCY VS VISUAL VARIETY

This is extremely important.

Different slides should be visually different while still clearly belonging to ElevateWeb.

Maintain consistency through:

- typography
- color palette
- spacing philosophy
- logo treatment
- line weight
- geometric language
- visual restraint

Allow variety through:

- composition
- illustration
- diagrams
- typography scale
- image placement
- visual strategy
- information hierarchy

The objective is:

Same brand. Different visual story.

---

12. REAL EXAMPLE

For a carousel:

"What happens when you type google.com?"

The Visual Director should NOT produce five identical cards.

A good result might be:

Slide 1:
big-type + minimal browser visual

Slide 2:
conceptual illustration:
browser → DNS resolver

Slide 3:
technical diagram:
domain → DNS → IP

Slide 4:
illustration:
request traveling from client to server

Slide 5:
process flow:
DNS → connection → HTTP request → response

Slide 6:
big takeaway + simplified mental model

This is only an example.

The AI should make the decision based on the actual content.

---

13. ILLUSTRATION PROVIDER

Inspect the existing repository and determine the cleanest way to integrate an image-generation provider.

Do NOT hard-code the entire architecture around an undocumented or speculative API.

Prefer a small provider abstraction:

generateIllustration(request)

The implementation can use the project's existing AI provider strategy.

If an image-generation API is not currently configured, implement:

- provider interface
- request/response types
- mock provider for tests
- deterministic placeholder asset for local testing

Do not make the entire renderer dependent on a live image-generation API.

The renderer must remain usable offline.

---

14. CACHING

Illustration generation can be expensive.

Implement only simple deterministic asset reuse.

For example:

hash(illustration request)
        ↓
existing asset?
   ↓          ↓
 yes         no
 ↓            ↓
reuse      generate

Do not build a full asset-management service.

A simple filesystem-based cache is sufficient for now.

---

15. FALLBACK BEHAVIOR

The system must never fail an entire carousel simply because illustration generation fails.

If illustration generation fails:

illustration
    ↓
failure
    ↓
fallback visual strategy
    ↓
existing deterministic renderer

Possible fallbacks:

- diagram
- geometric visual
- typography
- existing template

The final carousel must still render.

---

16. SLIDE-TO-SLIDE COHERENCE

The Visual Director must consider the entire carousel.

Avoid six unrelated visual styles.

Maintain:

- consistent brand identity
- consistent illustration style
- coherent visual progression
- repeated visual language where useful

But avoid:

«every slide = same layout»

A carousel should feel like one designed story.

---

17. CONTENT MUST REMAIN AUTHORITATIVE

Do NOT allow the visual model to invent technical facts.

The original "CarouselPackage" remains authoritative for:

- headline
- body
- claims
- numbers
- terminology
- examples
- CTA
- hashtags

The Visual Director only determines presentation.

If the visual concept requires information that does not exist in the content, do not invent it.

---

18. TESTING

Add tests for:

Visual Director

- valid VisualSpecification
- deterministic schema validation
- invalid strategy rejection
- unsupported composition rejection
- missing required fields
- illustration required/optional behavior

Renderer integration

- VisualSpecification renders successfully
- existing template fallback works
- illustration asset placement works
- missing illustration falls back correctly
- long text remains safe
- Unicode remains safe

Illustration provider

Use a mock provider.

Test:

- successful generation
- provider failure
- invalid response
- cached asset reuse
- fallback behavior

Regression

All existing Phase 1 and Phase 2 tests must continue passing.

---

19. VISUAL TEST CASES

Create several realistic examples specifically designed to test visual variety.

Use topics such as:

1. What happens when you type a URL?
2. What is a CDN?
3. JWT vs Session Cookies
4. What actually happens inside an API request?
5. How Docker containers work

The outputs should demonstrate that the system can choose meaningfully different visual approaches.

Do NOT judge success merely by:

- PNG exists
- PNG is 1080×1350
- SVG is valid

The output must also demonstrate visual diversity and communication quality.

---

20. VISUAL QUALITY GATE

After implementation, render complete example carousels.

Inspect the actual PNGs.

Verify:

- text is visible
- illustrations are visible
- illustrations actually explain something
- no generated text appears inside illustrations
- no clipping
- no awkward overlaps
- visual hierarchy is clear
- slides do not all look identical
- brand identity remains consistent
- illustrations don't overwhelm the content
- technical concepts are easier to understand visually
- output looks appropriate for an actual ElevateWeb Instagram account

Do not claim visual quality based solely on automated tests.

---

21. KEEP THE EXISTING FIVE TEMPLATES

Do NOT delete the existing:

- Explainer
- Comparison
- Steps
- Statement
- Diagram

They should remain useful as deterministic fallback strategies.

However:

Do not make them the primary creative decision-maker anymore.

The AI Visual Director should be able to select:

AI-designed composition
        OR
existing deterministic template fallback

---

22. CLI / LOCAL DEVELOPMENT

Provide a simple way to test the new pipeline locally.

For example:

npm run visual-design -- ./examples/how-dns-works.json

and/or:

npm run render-ai -- ./examples/how-dns-works.json

Use whatever naming fits the repository best.

A developer should be able to run one command and obtain:

visual-spec/
illustrations/
output/

without needing n8n.

---

23. FILE ORGANIZATION

Adapt to the current repository.

A reasonable structure may be:

packages/
  visual-director/
    src/
      director.ts
      schema.ts
      strategies.ts
      prompts.ts
      provider.ts
      cache.ts
      fallback.ts
      tests/

  renderer/
    src/
      ...
      visualSpecRenderer.ts
      primitives/

Do NOT blindly create this exact structure if the existing monorepo suggests a simpler approach.

Reuse existing packages and types where possible.

---

24. DEPENDENCY DISCIPLINE

Before adding dependencies:

1. Check whether the repository already provides the capability.
2. Prefer existing dependencies.
3. Add the minimum necessary dependency.
4. Explain why each new dependency exists.

Do not introduce a framework simply to implement a small abstraction.

---

25. SECURITY

Never expose:

- API keys
- provider credentials
- environment secrets

in:

- VisualSpecifications
- logs
- generated prompts
- output JSON
- error messages
- committed assets

Follow the existing Phase 1 secret-scrubbing strategy where applicable.

---

26. IMPORTANT: DO NOT START PHASE 3

Do NOT implement:

- n8n
- Telegram
- Instagram publishing
- Meta APIs
- analytics
- scheduled jobs

Those belong to later phases.

Stop after Phase 2.5.

---

DEFINITION OF DONE

Phase 2.5 is complete when:

- [ ] AI Visual Director exists
- [ ] It consumes existing CarouselPackage data
- [ ] It produces validated VisualSpecifications
- [ ] It can choose different visual strategies per slide
- [ ] It can request illustrations when appropriate
- [ ] Illustration generation is provider-abstracted
- [ ] Generated illustrations contain no required textual information
- [ ] Renderer combines illustrations with deterministic text/layout
- [ ] Existing brand system is preserved
- [ ] Existing five templates remain as fallbacks
- [ ] Illustration failure has a deterministic fallback
- [ ] Simple asset caching exists
- [ ] Visual specifications are validated
- [ ] Tests cover the new system
- [ ] Existing Phase 1 tests pass
- [ ] Existing Phase 2 tests pass
- [ ] Build passes
- [ ] Lint passes
- [ ] Formatting passes
- [ ] Multiple example carousels have been rendered
- [ ] Examples demonstrate meaningful visual variety
- [ ] At least some technical concepts use actual explanatory illustrations
- [ ] The resulting slides look appropriate for ElevateWeb Instagram content

---

CRITICAL AGENT BEHAVIOR

Before modifying anything:

1. Inspect the current repository.
2. Inspect the actual Phase 1 types.
3. Inspect the actual Phase 2 renderer.
4. Understand how existing templates and renderer primitives work.
5. Reuse existing infrastructure.

Do not assume the repository matches this specification perfectly.

The repository is the source of truth.

Do not launch a huge multi-agent architecture/research process.

This is a focused implementation task.

If something can be solved with 100 lines, do not create 1,000 lines of framework around it.

If the image provider cannot be safely integrated yet, build the provider interface + mock + fallback instead of blocking the entire system.

---

FINAL RULE

The goal is NOT:

"Generate prettier templates."

The goal is:

"Give the AI the ability to decide how a technical idea should be visually explained, generate an appropriate illustration when necessary, and then have our deterministic renderer produce a precise, branded Instagram slide."

The final result should feel like:

AI writer + AI art director + AI illustrator + deterministic production renderer

—not—

AI text + fixed template.

Stop after Phase 2.5 and provide a concise completion report containing:

1. Architecture implemented
2. Files created/modified
3. Dependencies added
4. VisualSpecification schema
5. Illustration provider strategy
6. Fallback strategy
7. Test results
8. Example outputs
9. Remaining limitations

Do not begin Phase 3.