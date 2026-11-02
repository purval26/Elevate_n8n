# ElevateWeb Instagram Carousel Engine — Complete Operational Guide

This guide explains how to configure, run, and master the **ElevateWeb Instagram Carousel Engine** (Phase 1, Phase 2, Phase 2.5, Phase 3, and Phase 3.1).

---

## 1. Engine Overview & Architecture

The ElevateWeb Carousel Engine turns technical ideas into published 1080×1350 Instagram carousels through three rendering tiers:

| Tier | Command | Method | Best For |
|---|---|---|---|
| **Phase 3.1 (Creative HTML)** | `npm run render-html -- <pkg.json>` | LLM-native HTML/CSS/SVG with Chromium rasterization | High-impact bespoke editorial layouts, custom diagrams, rich visual storytelling |
| **Phase 2.5 (AI Visual Director)** | `npm run render-ai -- <pkg.json>` | Structured Visual Director + custom SVG vector illustrations | Structured templates with AI-directed vector assets |
| **Phase 2 (Deterministic)** | `npm run render -- <pkg.json>` | 5 canonical SVG templates + Resvg engine | Ultra-fast, consistent, mathematical baseline |
| **Phase 1 (Content API)** | `npm run dev` | Fastify HTTP API + OpenAI GPT-4o structured outputs | Generating carousel topic copy and database persistence |

---

## 2. Choosing Your Operating Mode

The engine operates in two modes:

### Mode A: 100% Offline & Deterministic (Default — No API Key Required)
- **Zero setup required.** All bundled fonts (`Outfit` and `Space Mono`), authoritative SVG logos, layout algorithms, and vector generators run entirely on your local machine.
- Every test in `npm test` runs offline without network calls.
- Run:
  ```bash
  npm run render-html -- examples/how-dns-works.json -o output/html-dns
  ```
  The engine uses the upgraded Phase 3.1 deterministic creative designer, producing diverse, Instagram-scaled slides (hero typography, SVG schematics, tradeoff matrices, terminal windows, and takeaway seals).

---

### Mode B: Live LLM Creative Designer (OpenRouter or OpenAI)
In live mode, an LLM acts as the senior editorial art director, reading the authoritative content and authoring a bespoke HTML/CSS/SVG document from scratch.

#### Option 1: OpenRouter (Free or Paid Models)
1. Copy the environment template:
   ```bash
   cp .env.example .env
   ```
2. Open `.env` and add your OpenRouter key:
   ```env
   OPENROUTER_API_KEY=sk-or-v1-...
   OPENROUTER_MODEL=nvidia/nemotron-3-ultra:free
   OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
   ```
   *(You can also use other free or paid models like `meta-llama/llama-3.3-70b-instruct:free` or `deepseek/deepseek-chat`).*

3. Render with live AI:
   ```bash
   npm run render-html -- examples/how-dns-works.json -o output/html-dns-live --live
   ```

#### Option 2: OpenAI (GPT-4o)
1. In `.env`:
   ```env
   OPENAI_API_KEY=sk-proj-...
   OPENAI_MODEL=gpt-4o
   ```
2. Render with live AI:
   ```bash
   npm run render-html -- examples/how-dns-works.json -o output/html-dns-live --live
   ```

---

## 3. CLI Command Reference

### HTML Creative Renderer (Phase 3.1)
```bash
# Render using default settings (auto-detects keys or runs deterministic)
npm run render-html -- examples/jwt-vs-cookies.json -o output/jwt

# Force live LLM design
npm run render-html -- examples/docker-containers.json -o output/docker --live

# Force offline deterministic design
npm run render-html -- examples/react-vs-nextjs.json -o output/react --offline

# Specify a custom model
npm run render-html -- examples/api-request-flow.json -o output/api --live --model meta-llama/llama-3.3-70b-instruct:free
```

### AI Visual Director Renderer (Phase 2.5)
```bash
npm run render-ai -- examples/how-dns-works.json -o output/ai-dns
```

### Baseline Template Renderer (Phase 2)
```bash
npm run render -- examples/how-dns-works.json -o output/baseline-dns
```

### Fastify Content Generation API Server (Phase 1)
```bash
npm run dev
```
Test the content generation endpoint:
```bash
curl -X POST http://localhost:3000/api/content/generate \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "How DNS Resolution Works",
    "pillar": "web_architecture",
    "slideCount": 6
  }'
```

---

## 4. Output Structure & Inspection

When `render-html` executes, it generates:
```
output/my-carousel/
├── html/
│   └── carousel.html      <-- Complete, self-contained HTML debug artifact
├── slides/
│   ├── slide-01.png       <-- 1080×1350 Instagram Portrait PNG
│   ├── slide-02.png
│   ├── slide-03.png
│   ├── slide-04.png
│   ├── slide-05.png
│   └── slide-06.png
├── slide-01.png           <-- Top-level mirror for easy access
├── slide-02.png
...
```

### Inspecting HTML Artifacts:
Open `output/<dir>/html/carousel.html` in any browser to inspect the raw layout, CSS, and SVG markup.

### Verifying PNGs:
All PNGs are exact 1080px × 1350px images with safe margin padding and zero script dependencies.

---

## 5. Security & Safety Guarantee

Every generated HTML document is evaluated before rendering:
1. **Script Prohibition:** Any `<script>` tag or inline event handler (`onclick`, `onerror`) is immediately blocked.
2. **Network Isolation:** No external stylesheet links (`<link rel="stylesheet">` or `@import`) are allowed. Local bundled fonts (`Outfit` and `Space Mono`) are injected directly via base64 data URIs.
3. **Resilient Fallback Hierarchy:**
   ```
   Live LLM HTML Generation
             ↓ (if fails or invalid)
   Deterministic Creative Designer (Phase 3.1)
             ↓ (if Chromium/Resvg unavailable)
   AI Visual Director (Phase 2.5)
   ```
   The engine never crashes or produces blank output.

---

## 6. Monorepo Quality Verification

Before committing any changes, run the complete suite of quality gates:
```bash
# 1. Type Check (TypeScript 5.7 strict)
npm run build

# 2. Linter (ESLint 9)
npm run lint

# 3. Code Formatter Check (Prettier)
npm run format:check

# 4. Full Test Suite (220+ tests)
npm test
```
