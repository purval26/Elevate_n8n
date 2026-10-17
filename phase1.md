You are building the first phase of a production-quality project called ElevateWeb Content Engine.

Context

ElevateWeb is a web development/technology brand. The goal of this project is to eventually automate the creation of one high-quality Instagram technology post/carousel per day.

The final system will use:

- n8n for orchestration
- Supabase/PostgreSQL for persistence
- OpenAI APIs for AI content generation/research
- A custom HTML/React + Playwright renderer for Instagram carousel images
- Telegram for approval
- Meta/Instagram APIs for publishing
- Analytics to measure post performance

However, DO NOT build the entire system yet.

This phase is only the foundation + content-generation backend.

---

Phase 1 Objective

Create a clean TypeScript backend that can accept a technology topic and generate a structured ElevateWeb Instagram carousel package.

The backend must be designed so that n8n can call it later through HTTP APIs.

---

Technology

Use:

- Node.js
- TypeScript
- Fastify or Express
- Zod for validation
- OpenAI SDK
- Supabase client
- dotenv
- ESLint
- Prettier

Use strict TypeScript.

Do not introduce unnecessary frameworks or dependencies.

---

Project structure

Create:

apps/
api/

packages/
types/
prompts/
content/

supabase/
migrations/

docs/

.env.example
README.md
package.json

Keep the architecture modular.

---

API

Create:

POST /api/content/generate

Request:

{
"topic": "How DNS works",
"pillar": "tech_explained"
}

Optional fields:

{
"tone": "educational",
"slideCount": 6
}

Validate all requests with Zod.

---

Response schema

Return structured JSON:

{
"topic": {
"title": "...",
"pillar": "tech_explained"
},

"hook": "...",

"slides": [
{
"slideNumber": 1,
"type": "hook",
"headline": "...",
"body": "...",
"visualSuggestion": "..."
}
],

"caption": "...",

"cta": "...",

"hashtags": [],

"sources": []
}

Create TypeScript types/interfaces for this schema.

The API must never return unvalidated arbitrary AI output.

---

Content rules

The generated content is for Instagram carousel posts.

Target:

- 5–8 slides
- 1080×1350 eventual output
- concise text
- educational
- technically accurate
- easy for non-experts to understand
- modern but not cringe
- no excessive emojis
- no generic AI-slop phrasing
- no clickbait that misrepresents facts
- no invented statistics
- no unsupported claims

Slide 1 must prioritize a strong hook.

The final slide should usually contain a concise takeaway and/or ElevateWeb CTA.

Do not overload slides with text.

---

ElevateWeb brand voice

ElevateWeb should feel:

- modern
- technically competent
- clear
- confident
- educational
- concise

Avoid:

- "You won't believe..."
- excessive emojis
- fake urgency
- generic motivational language
- corporate buzzword spam
- excessive hashtags
- fake statistics
- pretending AI-generated claims are facts

The content should feel like it was written by a technically knowledgeable person.

---

Prompt architecture

Do NOT put the entire AI prompt directly inside the route handler.

Create reusable prompt modules under:

packages/prompts/

For example:

packages/prompts/carousel.ts

The prompt should explicitly require structured JSON matching the Zod schema.

Use OpenAI structured output/schema support where appropriate.

---

Database foundation

Create Supabase migrations for:

topics
posts
slides
sources

Use sensible UUID primary keys and timestamps.

Relationships:

topics
↓
posts
↓
slides
↓
sources

A post belongs to one topic.

A post can contain multiple slides and sources.

Do not build analytics yet.

---

Environment variables

Create .env.example with placeholders for:

OPENAI_API_KEY
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
PORT

Never hardcode secrets.

Never commit .env.

---

Error handling

Implement:

- request validation errors
- OpenAI errors
- database errors
- malformed AI output
- timeouts
- useful HTTP status codes
- structured server-side logging

Do not expose secrets in errors.

---

Testing

Add tests for:

1. invalid request
2. valid request
3. Zod validation
4. malformed AI response
5. response schema
6. database failure handling

For AI tests, mock the OpenAI client rather than making real API calls.

---

Health endpoint

Create:

GET /health

Return something like:

{
"status": "ok",
"service": "elevate-content-engine-api"
}

---

Documentation

README must explain:

1. project purpose
2. architecture
3. installation
4. environment variables
5. local development
6. API usage
7. example curl request
8. database setup
9. testing
10. what is intentionally NOT implemented yet

---

Important constraints

DO NOT implement yet:

- Instagram publishing
- Telegram
- n8n workflows
- automatic scheduling
- analytics
- image generation
- Playwright rendering
- autonomous posting
- authentication
- public user accounts

Those belong to later phases.

Do not create placeholder systems pretending those features work.

---

Development process

Before writing large amounts of code:

1. Inspect the repository.
2. Produce a short implementation plan.
3. Create the project structure.
4. Implement the smallest working version.
5. Run type checking.
6. Run linting.
7. Run tests.
8. Fix all errors.
9. Verify the API locally.
10. Update README.

Do not stop after generating code.

Actually test the implementation.

At the end, report:

- files created
- architecture
- commands used
- tests performed
- remaining limitations
- exact command to start the API
- example API request

Do not proceed into Phase 2 unless Phase 1 is working cleanly.