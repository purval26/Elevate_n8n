# ElevateWeb Content Engine (Phase 1)

> Modular, production-ready TypeScript backend API built with Fastify, Zod, the OpenAI SDK, and Supabase PostgreSQL. Generates validated, brand-aligned Instagram technology carousel packages and persists them for automated publishing.

---

## 1. Project Purpose
ElevateWeb is a web development and systems engineering education brand. The ElevateWeb Content Engine is designed to automate the creation of high-quality, technically accurate daily Instagram carousel posts. 

Phase 1 provides the foundational REST API backend that:
- Accepts technical topics and content pillars.
- Orchestrates OpenAI structured outputs using strict prompt guardrails.
- Enforces a two-tier validation defense (sampling constraints + runtime schema verification).
- Persists normalized relational records (topics, posts, slides, sources) in Supabase.
- Exposes clean HTTP endpoints intended to be invoked by n8n automation workflows in subsequent phases.

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
│   └── content/              # OpenAI orchestration, 2-tier validation, Supabase persistence
├── supabase/
│   └── migrations/           # Idempotent PostgreSQL DDL with cascading deletes
└── docs/                     # In-depth architectural & API documentation
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

## 9. Testing
The test suite is built on Node's native test runner (`node:test`, `node:assert/strict`) and executes 100% offline.

```bash
# Run all unit and integration tests
npm test

# Run integration tests specifically
node --test 'apps/api/tests/**/*.test.ts'
```

All external calls to OpenAI and Supabase are intercepted by mock clients:
- `MockOpenAIClient`: Simulates OpenAI chat completions, rate limits, timeouts, and malformed outputs.
- `MockSupabaseClient`: In-memory relational tables with foreign keys and cascading rollback simulation.

---

## 10. What is Intentionally NOT Implemented Yet
To preserve architectural boundaries and maintain production rigor, Phase 1 deliberately omits:
1. **Instagram / Meta Graph API Publishing**: No social media publishing logic.
2. **Telegram Approval Bot**: No notification bots or human-in-the-loop chat interfaces.
3. **n8n Workflow Automation**: No n8n JSON canvas exports (the Fastify REST API is designed to be called by n8n in Phase 2).
4. **Playwright / Image Rendering**: No HTML-to-image or React slide rendering engine.
5. **AI Image Generation**: No DALL-E or Midjourney integrations.
6. **Automatic Scheduling / Cron**: No unattended scheduling services.
7. **Post Analytics**: No impressions, likes, or engagement tracking.
8. **Public Authentication / User Accounts**: No multi-tenant user accounts or OAuth logins.

These components are scheduled for subsequent roadmap milestones.
