# ElevateWeb Content Engine — Phase 1 Architecture

## 1. System Overview
ElevateWeb Content Engine is a modular, high-reliability backend API designed to generate and persist brand-aligned Instagram carousel packages for technical education.

```
+-----------------------------------------------------------------------------------+
|                                  apps/api                                         |
|  Fastify HTTP Server | GET /health | POST /api/content/generate | Error Handler    |
+-----------------------------------------------------------------------------------+
           |                                                      |
           v                                                      v
+-------------------------------+              +------------------------------------+
|       packages/content        |              |          packages/types            |
| Content Engine Orchestration  |              | Zod Schemas & TypeScript DTOs      |
| OpenAI Client (2-tier valid.) | -----------> | - Request / Response schemas       |
| Supabase Persistence Service  |              | - CarouselPackage, Slide, Topic    |
| Compensating Rollback         |              | - ApiErrorResponse                 |
+-------------------------------+              +------------------------------------+
           |                                                      ^
           v                                                      |
+-------------------------------+                                 |
|       packages/prompts        |                                 |
| Brand Voice Guidelines        | --------------------------------+
| System & User Carousel Prompts|
+-------------------------------+

+-------------------------------+
|      supabase/migrations      |
| Idempotent PostgreSQL DDL     |
| topics -> posts -> slides/src |
+-------------------------------+
```

---

## 2. Package Boundaries & Responsibilities

### 2.1 `packages/types`
The canonical contract authority across the entire monorepo:
- **`request.ts`**: Defines `GenerateContentRequestSchema` with `.strict()` parsing, requiring `topic` (3–200 chars), `pillar`, and bounded `slideCount` (5–8).
- **`carousel.ts`**: Defines `CarouselPackageSchema` and `SlideSchema` with sequential slide number validation.
- **`database.ts`**: Defines relational TypeScript interfaces for `TopicRecord`, `PostRecord`, `SlideRecord`, and `SourceRecord`.
- **`errors.ts`**: Defines `StructuredApiErrorSchema` ensuring consistent error envelopes `{ error: { code, message, details? } }`.

### 2.2 `packages/prompts`
Editorial and prompt engineering core:
- **`brandVoice.ts`**: Brand standards (modern, technical, educational, concise, zero clickbait or fake stats).
- **`systemPrompt.ts`**: Lead Content Engineer persona and instruction set.
- **`carousel.ts`**: Compiles structured system and user prompts parameterized by topic, pillar, tone, and slide count.

### 2.3 `packages/content`
AI orchestration and persistence engine:
- **`openai/generator.ts`**: Orchestrates OpenAI API calls using `beta.chat.completions.parse` with `zodResponseFormat(BaseCarouselPackageSchema)`.
- **`validation/validator.ts`**: Tier 2 application-level validation defense enforcing strict business rules (5–8 slides, sequential ordering).
- **`db/persistence.ts`**: Relational persistence coordinator. Writes to `topics`, `posts`, `slides`, and `sources` with compensating rollback on failure.
- Secret scrubbing utilities preventing credential leakage.

### 2.4 `apps/api`
HTTP transport and delivery layer:
- Fastify server with dependency injection for offline testing.
- `GET /health` liveness probe.
- `POST /api/content/generate` route handler.
- Sanitized error handling interceptor.

---

## 3. Data Flow & Execution Lifecycle

```
Client (n8n / curl)
       │
       ▼  HTTP POST /api/content/generate
Fastify Router
       │
       ▼  Validate Request
Zod (GenerateContentRequestSchema.safeParse)
       │
       ├──[Invalid]──► HTTP 400 VALIDATION_ERROR
       │
       ▼  [Valid]
Prompt Engine (buildCarouselPrompt)
       │
       ▼  Invoke OpenAI SDK (Tier 1 Constraint)
OpenAI API (gpt-4o + zodResponseFormat)
       │
       ├──[Timeout]──► HTTP 504 UPSTREAM_TIMEOUT
       ├──[Error]────► HTTP 500 GENERATION_ERROR
       │
       ▼  Raw AI JSON Output
Tier 2 Validator (validateCarouselOutput)
       │
       ├──[Invalid]──► HTTP 500 GENERATION_ERROR (Schema Violation)
       │
       ▼  Validated CarouselPackage
Supabase Persistence (persistCarouselPackage)
       │
       ├── Topic Insert
       ├── Post Insert
       ├── Slides Insert
       ├── Sources Insert
       │
       ├──[Partial Failure]──► Compensating Delete (Post & Topic) ──► HTTP 500 DATABASE_ERROR
       │
       ▼  [Success]
HTTP 200 OK (Validated CarouselPackage JSON)
```

---

## 4. Reliability & Security Guarantees

1. **Two-Tier Validation Defense**:
   - Tier 1 guides LLM token generation at the inference layer.
   - Tier 2 independently inspects the parsed payload at the application layer, guaranteeing that no hallucinated or corrupted data enters the persistence layer.
2. **Compensating Rollback**:
   - In distributed database environments where native multi-table transactions across microservices or REST APIs are unavailable, compensating deletes ensure atomic-like guarantees: if slide 4 fails, post and topic records are cleaned up immediately.
3. **Secret Scrubbing Guarantee**:
   - Error messages, nested cause objects, and details are passed through recursive redaction filters before being serialized to HTTP responses or logs.
