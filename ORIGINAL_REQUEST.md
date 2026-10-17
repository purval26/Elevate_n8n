# Original User Request

## Initial Request — 2026-10-16T15:56:10Z

Build Phase 1 of the ElevateWeb Content Engine: a modular, production-ready TypeScript backend API using Fastify that accepts technology topics, generates structured, validated Instagram carousel content packages using OpenAI structured outputs, and persists them to Supabase/PostgreSQL.

Working directory: /data/data/com.termux/files/home/storage/downloads/Elevate_n8n
Integrity mode: development

## Requirements

### R1. Modular Monorepo Architecture & TypeScript Setup
Establish a modular project layout with strict TypeScript compilation, ESLint, Prettier, and environment variable configuration (`.env.example`):
- `apps/api` (Fastify server and route handlers)
- `packages/types` (shared data schemas and TypeScript interfaces)
- `packages/prompts` (modular, versioned prompt definitions and generation rules)
- `packages/content` (core content generation, transformation, and OpenAI client orchestration)
- `supabase/migrations` (database schema migration scripts)
- `docs` (architecture and API documentation)

### R2. Content Generation REST API
Implement Fastify HTTP endpoints:
- `GET /health`: Health-check endpoint returning service identity and status.
- `POST /api/content/generate`: Accepts `{ topic, pillar, tone?, slideCount? }`, validates the payload with Zod, invokes the content generator, persists the generated record to Supabase, and returns the validated structured JSON carousel package.
- Return structured error responses for validation failures (400), internal failures (500), and upstream timeouts without leaking secrets.

### R3. Brand-Aligned Prompt Architecture & Schema Validation
Implement prompt modules enforcing ElevateWeb brand standards (modern, technically accurate, educational, concise, zero clickbait or AI fluff) with OpenAI structured output / JSON schema mode. The output must strictly conform to:
- Topic (title, pillar)
- Hook
- Slides (5–8 slides, each with slideNumber, type, headline, body, visualSuggestion)
- Caption, CTA, hashtags, and sources

### R4. Database Schema Migrations
Create idempotent Supabase / PostgreSQL migrations defining:
- `topics` table
- `posts` table (linked to topic)
- `slides` table (linked to post, ordered)
- `sources` table (linked to post)
All tables must use UUID primary keys, foreign key constraints, and standard timestamp tracking.

### R5. Verification Test Suite & Mocking
Implement automated tests ensuring:
- Request validation accepts valid inputs and rejects malformed inputs with clear errors.
- OpenAI response schema parsing correctly validates real and mocks malformed outputs.
- Database error handling recovers gracefully.
- External API calls (OpenAI) are mocked so the test suite can run fully offline.

## Acceptance Criteria

### Verification & Automated Testing
- [ ] `npm run build` (or `npx tsc --noEmit`) passes with zero TypeScript errors under strict mode.
- [ ] `npm run lint` passes with zero ESLint errors.
- [ ] `npm test` runs and passes 100% of unit and integration tests (with OpenAI mocked).
- [ ] `GET /health` returns HTTP 200 with `{ "status": "ok", "service": "elevate-content-engine-api" }`.
- [ ] `POST /api/content/generate` returns HTTP 400 with field details when given an invalid payload, and returns HTTP 200 with the full structured carousel schema when given valid input.
- [ ] Supabase SQL migration files execute cleanly against PostgreSQL without syntax or constraint errors.

### Project Boundaries & Documentation
- [ ] `README.md` clearly explains setup, architecture, environment variables, local testing, example `curl` commands, and explicitly lists intentionally omitted future phases (no Instagram API, no Telegram bot, no Playwright renderer, no n8n workflow files yet).
- [ ] No secrets or API keys are committed or exposed in logs/responses.

## Follow-up — 2026-10-16T17:41:50Z

A server restart occurred and paused background subagents. Please revive orchestrator and subagents as needed, and continue where you left off with Milestone 3 verification and Milestone 4 implementation.

## Follow-up — 2026-10-17T04:09:06Z

The quota reset period has passed and resources are now fully restored. Please continue where you left off with Milestone 3 verification and proceed into Milestone 4 (Fastify REST API).
