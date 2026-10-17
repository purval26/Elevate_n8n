# ElevateWeb Content Engine (Phase 1 & Phase 2)

> Modular, production-ready TypeScript content backend API (Phase 1) and deterministic 1080 × 1350 px Instagram Visual Engine (Phase 2). Built with Fastify, Zod, OpenAI SDK, Supabase PostgreSQL, and native Resvg rendering.

---

## 1. Project Purpose
ElevateWeb is a web development and systems engineering education brand. The ElevateWeb Content Engine is designed to automate the creation of high-quality, technically accurate daily Instagram carousel posts:
- **Phase 1 (Locked & Complete)**: Generates validated, structured `CarouselPackage` JSON via Fastify API, OpenAI structured outputs, and Supabase persistence.
- **Phase 2 (Visual Engine)**: Deterministically renders `CarouselPackage` JSON into 1080 × 1350 px Instagram-ready portrait PNGs across 5 visual templates (Explainer, Comparison, Steps, Statement, Diagram).

---

## 2. Architecture
The repository is structured as a modular TypeScript monorepo using npm workspaces:

```
Elevate_n8n/
├── apps/
│   └── api/                  # Fastify REST API, route handlers, error interceptor
├── packages/
│   ├── types/                # Canonical Zod schemas & TypeScript DTOs
│   ├── prompts/              # Brand voice rules & dynamic carousel prompt compiler
│   ├── content/              # OpenAI orchestration, 2-tier validation, Supabase persistence
│   └── renderer/             # Phase 2 Visual Engine: SVG templates, text layout, Resvg/Playwright PNG engine
├── examples/                 # Realistic carousel JSON examples for rendering & smoke tests
├── output/                   # Default output destination for rendered 1080x1350 PNG slides
├── supabase/
│   └── migrations/           # Idempotent PostgreSQL DDL with cascading deletes
└── docs/                     # In-depth architectural, API, & visual engine documentation
```

### Key Architectural Highlights:
1. **Two-Tier Validation Defense**:
   - **Tier 1 (Token Sampling Constraint)**: Uses OpenAI SDK `zodResponseFormat(BaseCarouselPackageSchema, 'carousel_package')` to force model outputs into structured JSON.
   - **Tier 2 (Runtime Verification)**: Validates generated payloads against `CarouselPackageSchema` with strict bounds (5–8 slides, sequential numbering, required visual suggestions).
2. **Cascading Compensating Rollback**:
   - Multi-table writes (`topics` -> `posts` -> `slides` -> `sources`) with transactional consistency. If a secondary insert fails, a compensating delete cleans up the parent records to prevent orphaned database rows.
3. **Multi-Layer Secret Redaction**:
   - Built-in sanitizers redact OpenAI API keys (`sk-proj-...`), Supabase JWTs, and database URLs from all error responses and logs.
4. **Hermetic Offline Testing**:
   - 100% of unit and integration tests run offline without network access or live API keys using dependency-injected test doubles.

---

## 3. Installation

### Prerequisites:
- **Node.js**: v22+ or v26+ (tested on Node v26.4.0)
- **npm**: v10+

### Setup:
Clone the repository and install dependencies:
```bash
git clone <repository-url>
cd Elevate_n8n
npm install --no-workspaces
```
*Note for Termux / FUSE filesystems: `.npmrc` is pre-configured with `bin-links=false` to ensure seamless execution on Android storage mounts.*

---

## 4. Environment Variables
Create a local `.env` configuration file from the provided template:
```bash
cp .env.example .env
```

Configure the following variables in `.env`:
| Variable | Description | Default | Example |
|---|---|---|---|
| `PORT` | Fastify HTTP server listening port | `3000` | `3000` |
| `OPENAI_API_KEY` | OpenAI secret API key (with gpt-4o access) | *None* | `sk-proj-abc123...` |
| `SUPABASE_URL` | Supabase project HTTPS URL | *None* | `https://xyz.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (bypasses RLS) | *None* | `eyJhbGciOi...` |

*Security Warning: Never commit `.env` or secrets to git. Unit and integration tests do not require `.env`.*

---

## 5. Local Development
```bash
# Typecheck TypeScript across all packages (strict mode, zero errors)
npm run build

# Run ESLint across all packages and apps (zero errors, zero warnings)
npm run lint

# Check code formatting with Prettier
npm run format:check

# Format code automatically
npm run format

# Run all unit and integration tests
npm test

# Run local development server
npm run dev
```

---

## 6. API Usage

### Endpoints Overview:
- `GET /health`: Service liveness and identity check.
- `POST /api/content/generate`: Generates and persists a structured carousel package.

### `POST /api/content/generate` Payload Schema:
```json
{
  "topic": "How DNS Works",
  "pillar": "tech_explained",
  "tone": "educational",
  "slideCount": 6
}
```
- `topic` *(string, required)*: 3–200 characters.
- `pillar` *(string, required)*: e.g. `tech_explained`, `web_architecture`, `developer_tools`, `performance`, `security`.
- `tone` *(string, optional)*: Default `"educational"`.
- `slideCount` *(integer, optional)*: Integer between `5` and `8` (default `6`).

---

## 7. Example curl Requests

### 1. Health Check
```bash
curl -X GET http://localhost:3000/health
```
**Response (HTTP 200)**:
```json
{
  "status": "ok",
  "service": "elevate-content-engine-api"
}
```

### 2. Generate Content (Minimal Request)
```bash
curl -X POST http://localhost:3000/api/content/generate \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "How DNS Works",
    "pillar": "tech_explained"
  }'
```

### 3. Generate Content (Custom Options)
```bash
curl -X POST http://localhost:3000/api/content/generate \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "PostgreSQL Index Internals",
    "pillar": "performance",
    "tone": "technical",
    "slideCount": 7
  }'
```

### 4. Validation Error Response (HTTP 400)
```bash
curl -X POST http://localhost:3000/api/content/generate \
  -H "Content-Type: application/json" \
  -d '{"topic": "ab"}'
```
**Response (HTTP 400)**:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      { "path": "topic", "message": "Topic must be at least 3 characters" },
      { "path": "pillar", "message": "Pillar must not be empty" }
    ]
  }
}
```

---

## 8. Database Setup
The relational database schema is managed via Supabase / PostgreSQL migrations.

### Applying Migrations:
Apply the SQL migration file located at:
`supabase/migrations/20261016000000_create_content_engine_tables.sql`

Via Supabase CLI:
```bash
supabase db push
```
Or via SQL editor in the Supabase Dashboard.

### Entity Relationship Model:
- `topics`: Stores core technical subject and pillar.
- `posts`: Belongs to topic (`topic_id` FK, `ON DELETE CASCADE`), stores caption, hook, CTA, hashtags, and status.
- `slides`: Belongs to post (`post_id` FK, `ON DELETE CASCADE`), ordered sequence (`1` to `8`), headline, body, and visual suggestion.
- `sources`: Belongs to post (`post_id` FK, `ON DELETE CASCADE`), technical documentation citations.

---

## 9. Phase 2: Visual Engine & CLI Rendering

The Phase 2 Visual Engine converts validated `CarouselPackage` JSON into high-resolution 1080 × 1350 px portrait PNGs.

### Visual Templates:
- **Explainer** (`explainer`): Technical concepts, educational posts, and "How X works".
- **Comparison** (`comparison`): A vs B side-by-side grids with bottom tradeoff cards.
- **Steps** (`steps`): Workflows, sequential breakdowns, top progress segments, and process cards.
- **Statement** (`statement`): Bold quotes, hooks, principles, and ElevateWeb brand seal.
- **Diagram** (`diagram`): Architecture flowcharts, multi-stage server request flows with vector arrows.

### Local CLI Usage:
```bash
# Render any carousel JSON into PNGs:
npm run render -- ./examples/how-dns-works.json --output ./output/how-dns-works

# Available Options:
#   --output, -o <dir>      Output directory for rendered PNGs (default: ./output)
#   --template, -t <name>   Template override (explainer, comparison, steps, statement, diagram)
#   --help, -h              Show help message
```

### Provided Examples:
- `examples/how-dns-works.json`: 6-slide architecture breakdown.
- `examples/jwt-vs-cookies.json`: 6-slide security & tradeoff comparison.
- `examples/docker-containers.json`: 5-slide containerization concepts.
- `examples/react-vs-nextjs.json`: 5-slide frontend framework comparison.
- `examples/api-request-flow.json`: 6-slide backend system architecture flow.

---

## 10. Testing & Verification

The test suite runs 100% offline via Node's native test runner (`node:test`, `node:assert/strict`) across all workspaces:

```bash
# Run all 178 unit, integration, and visual smoke tests
npm test

# Run renderer tests specifically
node --test 'packages/renderer/tests/*.test.ts'
```

### Test Coverage Highlights:
- **Phase 1 (134 tests)**: Schema validation, prompt compilation, mock OpenAI orchestration, database persistence, and cascading compensating rollbacks.
- **Phase 2 (44 tests)**: Text wrapping, line clamping, CJK and multi-byte Unicode handling, template selection & fallbacks, 5/6/8-slide rendering, PNG byte inspection (1080 × 1350, 8-bit RGBA), and deterministic byte reproduction.

---

## 11. What is Intentionally NOT Implemented Yet

To prevent over-engineering a personal automation tool, the following remain strictly out of scope for Phases 1 & 2:
1. **Instagram / Meta Graph API Publishing**: No automatic social media publishing logic.
2. **Telegram Approval Bot**: No notification bots or human-in-the-loop chat interfaces.
3. **n8n Workflow Automation**: No n8n workflow canvas files (Phase 3).
4. **AI Image Generation**: No DALL-E, Midjourney, or stock photography (diagrams are rendered programmatically via SVG).
5. **Automatic Scheduling / Cron**: No unattended scheduling services.
6. **Post Analytics**: No impressions, likes, or engagement tracking.
7. **Public Authentication / Multi-Tenant / SaaS**: No user accounts, billing, or multi-tenant infrastructure.
