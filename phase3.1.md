# Phase 3.1 — Creative Intelligence Rewrite
## Make the LLM Actually Design the Carousel

Phase 3 is implemented and technically healthy:

- LLM-native HTML/CSS renderer exists
- Chromium/Playwright rendering works
- HTML validation works
- bundled fonts work
- logo injection works
- overflow detection works
- fallback to Phase 2.5 works
- 217/217 tests pass
- build/lint/format pass
- all five real example carousels render successfully

DO NOT rebuild Phase 3.

DO NOT replace the HTML renderer.

DO NOT add another renderer.

DO NOT add more templates.

DO NOT add more composition primitives.

This phase is specifically about fixing the CREATIVE INTELLIGENCE of the HTML generation.

==================================================
1. THE PROBLEM
==================================================

We inspected the actual Phase 3 PNG outputs from:

- DNS
- JWT vs Cookies
- Docker
- React vs Next.js
- API Request Flow

The implementation is technically successful, but the visual result is not meeting the intended goal.

The generated carousels are too repetitive.

They repeatedly resemble:

- dark navy background
- small metadata/header
- ElevateWeb logo in the corner
- small blue category label
- large white headline
- one large dark rounded card
- small paragraph text
- small footer

The five different topics therefore look like variations of the same documentation template.

This is NOT acceptable for the intended creative direction.

The purpose of Phase 3 was to escape the fixed-template mindset of Phase 2 and Phase 2.5.

We do NOT want:

"better templates."

We want:

"an LLM that actually designs each slide."

==================================================
2. IMPORTANT: DO NOT OVERENGINEER
==================================================

This is a focused prompt/pipeline improvement.

Do NOT introduce:

- new microservices
- new databases
- new agents
- multi-agent architecture
- queues
- Redis
- n8n
- Telegram
- Instagram API
- analytics
- scheduling
- SaaS architecture
- additional illustration providers
- dozens of new templates
- dozens of new layout primitives

Do NOT turn this into another giant architectural project.

The existing HTML renderer is sufficient.

The primary task is to improve the creative-generation prompt and generation contract.

==================================================
3. CORE CREATIVE PRINCIPLE
==================================================

The model must stop thinking:

"How do I fit this content into a carousel template?"

and instead think:

"What is the best visual way to communicate THIS specific idea?"

The LLM should treat every slide as an independent 1080×1350 artboard.

The slide's communication goal comes FIRST.

The layout comes SECOND.

The content comes THIRD in terms of visual arrangement.

The model should design the visual hierarchy around the concept.

Do NOT give the model a fixed menu of layouts to choose from.

Do NOT require:

- hero-right
- hero-left
- centered-hero
- diagram-focus
- process-flow
- comparison
- takeaway
- editorial-stack

Those are exactly the kind of constraints we are trying to escape.

==================================================
4. THE LLM IS THE DESIGNER
==================================================

The creative model should be instructed to behave as a senior:

- editorial designer
- graphic designer
- art director
- typography designer
- information designer
- technical illustrator

But these are NOT separate agents.

This is one creative model with one responsibility:

DESIGN THE CAROUSEL.

The model receives:

1. CarouselPackage
2. ElevateWeb brand rules
3. 1080×1350 canvas constraints

It then independently decides:

- composition
- typography
- visual hierarchy
- illustration
- diagrams
- visual metaphor
- color emphasis
- whitespace
- alignment
- scale
- layering
- visual rhythm
- slide-to-slide variation

==================================================
5. EVERY SLIDE NEEDS A COMMUNICATION GOAL
==================================================

Before writing HTML for each slide, the model should internally determine:

"What should the viewer understand or feel after seeing this slide?"

Examples:

HOOK:
Make the viewer curious.

EXPLANATION:
Make a difficult concept visually obvious.

PROCESS:
Make a sequence instantly understandable.

COMPARISON:
Make the difference immediately visible.

MECHANISM:
Show how something actually works.

EXAMPLE:
Make the abstract concept concrete.

TAKEAWAY:
Leave the viewer with one memorable idea.

Do NOT force these categories into a schema.

They are creative thinking guidance.

The final output should still be freeform HTML.

==================================================
6. VISUAL STORYTELLING
==================================================

The carousel should behave like a visual story.

Avoid making every slide:

headline
+
paragraph
+
card

Instead, vary the communication method.

For example, a six-slide technical carousel might naturally become:

Slide 1:
Large conceptual hook with a striking visual metaphor.

Slide 2:
A visual explanation/diagram.

Slide 3:
A process or transformation.

Slide 4:
A comparison or technical detail.

Slide 5:
A practical example.

Slide 6:
A strong typographic takeaway.

That is ONLY an example.

The model must choose the actual structure based on the content.

==================================================
7. ALLOW EXTREME LAYOUT VARIETY
==================================================

The LLM is explicitly allowed to produce:

- typography-first compositions
- huge single-word headlines
- asymmetrical editorial layouts
- diagonal compositions
- large SVG illustrations
- technical schematics
- network diagrams
- timelines
- process diagrams
- comparison layouts
- visual metaphors
- UI mockups
- browser windows
- terminal windows
- code-focused compositions
- data visualizations
- layered objects
- overlapping elements
- large numbers
- split compositions
- full-bleed illustrations
- minimal slides
- dense technical diagrams when necessary
- whitespace-heavy slides
- experimental editorial compositions

It may use CSS grid, flexbox, absolute positioning, SVG, transforms, borders, shapes, shadows, etc.

Do NOT make every slide symmetrical.

Do NOT make every slide a card.

Do NOT make every slide centered.

Do NOT make every slide dark.

Do NOT make every slide blue.

Do NOT make every slide contain a paragraph.

==================================================
8. VISUAL VARIETY IS A REQUIREMENT
==================================================

The model must actively avoid repeating the same composition.

For a 5–8 slide carousel:

At least 3 substantially different visual composition families should normally appear.

For example:

Slide 1 → typography + visual metaphor
Slide 2 → technical diagram
Slide 3 → process
Slide 4 → comparison
Slide 5 → minimal takeaway

Again, these are examples, not templates.

"Changing the text position by 50px" does NOT count as visual variety.

Changing the card color does NOT count.

Changing a rounded rectangle into another rounded rectangle does NOT count.

A slide should feel compositionally different.

==================================================
9. ILLUSTRATION DECISIONS
==================================================

The model must decide whether an illustration actually helps.

Do NOT require an illustration on every slide.

Do NOT avoid illustrations simply because they are harder.

Use visual elements when they communicate something better than text.

Possible illustration approaches:

- custom inline SVG
- technical schematic
- geometric illustration
- flat editorial illustration
- isometric illustration
- subtle 3D-style SVG composition
- hand-drawn-style SVG
- conceptual metaphor
- abstract visual
- UI reconstruction
- network diagram
- object transformation

The model should select the visual language based on the topic.

Example:

DNS may benefit from:

domain → resolver → IP

JWT may benefit from:

client → token → server

Docker may benefit from:

application → container → runtime

React vs Next.js may benefit from:

two distinct architecture diagrams

API request flow may benefit from:

client → request → server → response

Do NOT simply put this information inside a generic card.

Turn the concept itself into the visual.

==================================================
10. SVG SHOULD BE A FIRST-CLASS CREATIVE TOOL
==================================================

The model is explicitly encouraged to write inline SVG.

SVG can be large and visually important.

Do not restrict SVG to tiny icons.

Use SVG for:

- diagrams
- illustrations
- arrows
- network graphs
- servers
- browsers
- devices
- containers
- documents
- tokens
- packets
- databases
- abstract objects
- visual metaphors
- decorative compositions

The SVG should communicate the concept.

Avoid meaningless decorative blobs.

==================================================
11. TYPOGRAPHY MUST BECOME PART OF THE DESIGN
==================================================

Typography is not just content placement.

The model should deliberately decide:

- what is dominant
- what is secondary
- what can be tiny
- what should be emphasized
- where line breaks occur
- how much whitespace surrounds text

Suggested minimum hierarchy:

Hero/display:
72–110px+

Primary headline:
56–82px

Secondary heading:
36–52px

Body:
28–36px

Metadata:
18–24px

These are guidelines, not rigid values.

Avoid tiny body copy.

This is an Instagram carousel, NOT a PDF.

The viewer should understand the slide on a phone.

==================================================
12. SEMANTIC ACCENTING
==================================================

Do NOT hardcode:

"technical nouns = blue."

Instead, the model should choose emphasis based on meaning.

For example:

"DNS turns a domain into an IP address."

Possible emphasis:

DNS
domain
IP address

But the model decides which words matter most.

Use accent color intentionally.

Do not highlight half of every sentence.

Normally emphasize only the most important 1–3 words/phrases.

==================================================
13. BRANDING WITHOUT DOMINATING THE DESIGN
==================================================

Preserve ElevateWeb branding.

Use:

#2563EB
#1D4ED8
#3B82F6
#EFF6FF
#FFFFFF
#F9FAFB
#111827
#6B7280
#E5E7EB

But do not force blue into every visual element.

Brand consistency does NOT mean:

"everything blue."

Use brand colors as an accent system.

Allow neutral compositions when appropriate.

Allow white/light compositions.

Allow dark compositions.

The model decides based on the slide.

==================================================
14. ELEVATEWEB TYPOGRAPHY
==================================================

Outfit is the primary brand font.

Use Outfit for:

- headlines
- body
- labels
- ElevateWeb wordmark
- slogan

Space Mono is reserved for:

- code
- technical metadata
- terminal-style content
- technical labels where appropriate

Do NOT use Space Mono for the ElevateWeb brand wordmark.

Do NOT recreate the logo using text.

Use the authoritative SVG logo.

==================================================
15. BRANDING SHOULD NOT FORCE A FIXED HEADER
==================================================

The current outputs repeatedly put:

logo
+
metadata
+
category

at the top of every slide.

Do NOT require that.

The logo may appear:

- top
- bottom
- side
- integrated into the composition
- subtly in a corner

The model should decide.

However, maintain recognizable ElevateWeb identity across the carousel.

Do not make every slide identical.

==================================================
16. BACKGROUND VARIETY
==================================================

The model may choose:

- white
- off-white
- dark
- blue-accented
- subtle gradient
- structured background
- editorial background
- diagram background

But avoid:

- neon AI gradients
- purple-blue startup gradients
- glassmorphism
- excessive glow
- random decorative blobs

The design should feel modern and editorial, not like generic AI SaaS marketing.

==================================================
17. CONTENT DENSITY
==================================================

Do not attempt to put every piece of CarouselPackage text onto every slide.

The model should prioritize.

A slide may contain:

- one sentence
- one headline
- one diagram
- one comparison
- one visual

That is completely valid.

Visual communication is more important than filling available space.

Do not shrink text to fit.

Do not create dense documentation pages.

==================================================
18. TECHNICAL ACCURACY
==================================================

CarouselPackage remains authoritative.

The creative model MUST NOT invent:

- technical facts
- statistics
- claims
- code
- API behavior
- security properties

The model may rearrange, emphasize, and visually interpret supplied information.

If the content says:

"DNS resolves a domain to an IP address"

the visual can represent:

domain → IP

but it must not invent unsupported infrastructure details.

==================================================
19. HTML OUTPUT
==================================================

The model must still output a complete self-contained HTML document.

The HTML should contain:

<section class="slide">
    ...
</section>

for every slide.

Each slide:

1080px × 1350px

The model has full CSS freedom inside the safety constraints.

Do not provide predefined layout functions such as:

createHeroSlide()
createComparisonSlide()
createProcessSlide()

unless they are purely optional utilities.

The preferred output is actual generated HTML/CSS.

==================================================
20. IMPORTANT: INSPECT CURRENT IMPLEMENTATION
==================================================

Before changing the prompt, inspect:

- packages/creative-html/designer.ts
- packages/prompts/htmlDesigner.ts
- current HTML generation flow
- any layout helper functions
- any hardcoded composition logic
- any default CSS template
- any predefined SVG generators

Identify why the model is converging on the same visual structure.

If the LLM is being constrained by hardcoded designer.ts logic, reduce or remove those constraints.

Do NOT simply add more predefined layouts.

The HTML generation should become more genuinely model-driven.

==================================================
21. PRESERVE THE RENDERER
==================================================

Do not rewrite:

- Chromium rendering
- font injection
- logo injection
- HTML sanitizer
- overflow detector
- fallback renderer

unless a small change is necessary for creative freedom.

The rendering infrastructure is working.

The problem is upstream.

==================================================
22. MODEL / PROVIDER
==================================================

Use the configured creative LLM provider.

For the current experiment:

Provider:
OpenRouter

Model:
nvidia/nemotron-3-ultra:free

Keep this configurable through environment/configuration.

Do not hardcode OpenRouter-specific assumptions throughout the renderer.

The model should receive enough context to understand the entire CarouselPackage and design the full carousel coherently.

==================================================
23. GENERATION STRATEGY
==================================================

Prefer ONE strong creative generation request for the complete carousel.

Do not create a multi-agent system.

Do not call separate models for:

- copywriter
- art director
- layout designer
- illustrator
- critic

unless the current implementation already requires something minimal.

The goal is to see how much creative quality one strong model can produce when given genuine freedom.

==================================================
24. OPTIONAL DESIGN PLAN
==================================================

If useful, the LLM may internally reason about:

1. carousel narrative
2. slide purpose
3. visual concept
4. composition
5. typography
6. illustration
7. final HTML

But do NOT expose chain-of-thought or require verbose reasoning output.

The final output should remain the HTML document.

==================================================
25. DO NOT SACRIFICE DETERMINISM
==================================================

The final rendering must still be deterministic:

- fixed 1080×1350 canvas
- bundled fonts
- authoritative logo
- no external assets
- no network dependency
- no JavaScript
- Chromium screenshot

Creative freedom happens INSIDE the HTML.

Production remains deterministic.

==================================================
26. TESTING
==================================================

Keep all existing tests.

Do not rewrite the 217 tests.

Add only focused tests where necessary.

Run:

npm test
npm run build
npm run lint
npm run format:check

All must pass.

==================================================
27. REAL VISUAL VALIDATION IS REQUIRED
==================================================

After modifying the creative generation system, regenerate:

1. DNS
2. JWT vs Cookies
3. Docker
4. React vs Next.js
5. API Request Flow

Actually inspect the resulting PNGs.

Do not judge the implementation based only on:

- tests
- generated HTML existing
- successful screenshots

The visual output is the primary success criterion.

==================================================
28. SUCCESS CRITERIA
==================================================

The new output should clearly differ from the current Phase 3 output.

A successful result should demonstrate:

- different slide compositions
- stronger visual hierarchy
- larger typography
- meaningful SVG/visual storytelling
- less reliance on cards
- less repetitive headers
- less paragraph-heavy content
- concept-driven diagrams
- stronger slide-to-slide rhythm
- intentional whitespace
- meaningful accent colors
- better Instagram readability
- professional editorial feel

The five different topics should NOT all look like the same template.

==================================================
29. FAILURE CRITERIA
==================================================

Consider the implementation unsuccessful if the output still looks like:

- dark background
- small metadata
- top-right logo
- big headline
- one rounded rectangle
- paragraph inside rectangle
- footer

repeated six times.

Also consider it unsuccessful if:

- more templates were added instead of improving LLM creativity
- predefined layout primitives dominate the output
- illustrations are merely decorative
- text remains too small
- every slide is centered
- every slide uses the same header
- every slide uses the same card structure

==================================================
30. MOST IMPORTANT INSTRUCTION
==================================================

DO NOT SOLVE THIS BY BUILDING MORE DESIGN TEMPLATES.

We already have enough rendering infrastructure.

We need to make the LLM think like a designer.

The fundamental transformation should be:

CURRENT:

CarouselPackage
↓
LLM
↓
template-like HTML
↓
Chromium

TARGET:

CarouselPackage
↓
LLM understands the story
↓
LLM chooses the visual language
↓
LLM designs each slide
↓
LLM writes the actual HTML/CSS/SVG
↓
Chromium
↓
PNG

The LLM should be given a blank canvas, not a template catalog.

==================================================
31. DEFINITION OF DONE
==================================================

Phase 3.1 is complete when:

1. Existing Phase 3 renderer still works.
2. Existing tests remain green.
3. Build/lint/format remain clean.
4. OpenRouter + configured free model works.
5. Generated HTML is still safely validated.
6. Generated PNGs remain exactly 1080×1350.
7. Existing fallback still works.
8. All five real examples render.
9. The visual outputs demonstrate substantially more creative variety.
10. The outputs no longer look like repeated documentation cards.
11. At least several slides use meaningful custom SVG/visual compositions.
12. Typography is substantially larger and more Instagram-friendly.
13. Slide-to-slide visual storytelling is obvious.

At the end, report:

- what caused the repetitive output
- exactly what was changed
- files changed
- model/provider used
- tests
- build/lint/format
- regenerated example outputs
- visual QA observations
- fallback verification
- git commit hash
- push status

Do NOT claim success based solely on automated tests.

The final criterion is visual quality.