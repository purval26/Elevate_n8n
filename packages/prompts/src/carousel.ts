/**
 * Carousel prompt generator for ElevateWeb Content Engine.
 * Compiles system and user prompts matching requested topic, pillar, tone, and slide count.
 */

import type { GenerateContentRequest } from '../../types/src/index.ts';
import { ELEVATE_SYSTEM_PROMPT } from './systemPrompt.ts';
import { DEFAULT_ELEVATE_CTA } from './brandVoice.ts';

export interface CarouselPromptInput {
  topic: string;
  pillar: string;
  tone?: string;
  slideCount?: number;
}

export interface CompiledPrompt {
  systemPrompt: string;
  userPrompt: string;
}

/**
 * Builds the dynamic user prompt for carousel generation based on the request.
 */
export function buildUserPrompt(request: CarouselPromptInput): string {
  const slideCount = request.slideCount ?? 6;
  const tone = request.tone ?? 'educational';
  const topic = request.topic.trim();
  const pillar = request.pillar.trim();

  return `
Create an Instagram carousel content package with exactly ${slideCount} slides on the topic: "${topic}".

Parameters:
- Topic Title: "${topic}"
- Content Pillar: "${pillar}"
- Editorial Tone: "${tone}"
- Target Slide Count: ${slideCount} slides (Strict: exactly ${slideCount} items in the "slides" array, numbered sequentially from 1 to ${slideCount})

Slide Distribution & Structure:
- Slide 1:
  - Type: "hook"
  - Headline: High-impact technical hook highlighting an architectural challenge, paradox, or real-world problem.
  - Body: 1-2 concise sentences framing the stakes.
  - Visual Suggestion (visualSuggestion): Clear visual metaphor, split-screen UI comparison, or problem diagram.
- Slides 2 to ${slideCount - 1}:
  - Type: Choose appropriately from "concept", "breakdown", "code_snippet", "architecture", or "comparison".
  - Content: Progressive technical explanation breaking down how it works. Keep body text under 250 characters per slide.
  - Visual Suggestion (visualSuggestion): Specific diagram description (flow chart, sequence diagram, memory layout, code highlight).
- Slide ${slideCount}:
  - Type: "takeaway" or "cta"
  - Headline: Key takeaway summary or architectural rule of thumb.
  - Body: Actionable takeaway and clear call-to-action to follow @ElevateWeb.
  - Visual Suggestion (visualSuggestion): ElevateWeb branded card with follow badge and key bullet points.

Accompanying Elements:
- Hook: A compelling 1-2 sentence hook for the post.
- Caption: Engaging technical caption (2-4 paragraphs) breaking down the core concepts with zero fluff, concluding with an engineering discussion question.
- CTA: "${DEFAULT_ELEVATE_CTA}"
- Hashtags: 4 to 8 relevant tech hashtags (e.g., #webdev, #systemdesign, #softwarearchitecture).
- Sources: 1 to 3 authoritative technical specifications, RFCs, or documentation links.

Output Requirement:
Return valid JSON matching the carousel package schema. All slide numbers must be sequentially numbered 1 through ${slideCount}.
`.trim();
}

/**
 * Compiles the complete system and user prompts for the content engine.
 */
export function buildCarouselPrompt(
  request: CarouselPromptInput | GenerateContentRequest,
): CompiledPrompt {
  return {
    systemPrompt: ELEVATE_SYSTEM_PROMPT,
    userPrompt: buildUserPrompt(request),
  };
}
