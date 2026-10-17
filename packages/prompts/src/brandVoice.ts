/**
 * ElevateWeb Brand Voice Guidelines & Editorial Standards.
 * Defines tone, guardrails, prohibited phrases, and structural rules for Instagram carousels.
 */

export const BRAND_NAME = 'ElevateWeb';
export const BRAND_HANDLE = '@ElevateWeb';

export const BRAND_PILLARS = [
  'tech_explained',
  'web_architecture',
  'developer_tools',
  'performance',
  'security',
] as const;

export const BRAND_VOICE_ATTRIBUTES = [
  'modern',
  'technical',
  'technically competent',
  'clear',
  'confident',
  'educational',
  'concise',
] as const;

export const FORBIDDEN_CLICKBAIT_PHRASES = [
  "You won't believe",
  'Mind-blowing trick',
  'Stop scrolling right now',
  "Don't miss out",
  'Secret hackers do not want you to know',
  'This one trick changes everything',
  'Shocking truth',
] as const;

export const FORBIDDEN_AI_CLICHES = [
  "In today's fast-paced digital world",
  'Delve into the realm',
  'A tapestry of',
  'Game-changing paradigm',
  'Unlock your potential',
  'Let that sink in',
  'At the end of the day',
  'Needless to say',
] as const;

export const BRAND_GUARDRAILS = {
  maxHeadlineLength: 100,
  maxBodyLength: 300,
  maxCaptionLength: 1500,
  minSlides: 5,
  maxSlides: 8,
  maxCaptionEmojis: 2,
  allowHeadlineEmojis: false,
  prohibitFakeStatistics: true,
  prohibitInventedClaims: true,
} as const;

export const DEFAULT_ELEVATE_CTA =
  'Save this post and follow @ElevateWeb for weekly software architecture deep dives.';

export const BRAND_VOICE_RULES = `
ElevateWeb Editorial & Brand Rules:
1. Tone & Persona:
   - Modern, technical, technically competent, educational, clear, and concise.
   - Speak directly to software engineers, developers, and tech builders.
   - Do not sound like corporate PR, hype marketing, or generic AI slop.

2. Forbidden Phrasing & Anti-Patterns (ZERO TOLERANCE):
   - NO clickbait headlines (e.g., "You won't believe...", "Mind-blowing trick!").
   - NO fake urgency ("Stop scrolling right now!", "Don't miss out!").
   - NO generic AI cliches ("In today's fast-paced digital world", "Delve into the realm", "A tapestry of").
   - NO fake, invented, or unverified statistics (e.g., "99% of devs don't know this").
   - NO excessive emojis: 0 emojis in slide headlines, maximum 1-2 tasteful emojis in the entire post caption.
   - NO corporate buzzword overload ("synergized paradigms", "holistic solutions").

3. Slide Layout & Structure:
   - Total slides must be between 5 and 8 (respect the requested slide count).
   - Slide numbers must be strictly sequential starting from 1 (1, 2, 3... N).
   - Slide 1: Strong technical hook stating the engineering problem, curiosity, or architectural trade-off.
   - Middle Slides (2 to N-1): Progressive, step-by-step technical breakdown, code explanation, or architectural walkthrough. Keep body text concise (< 250 characters) designed for 1080x1350 card readability.
   - Final Slide (Slide N): Concise takeaway summary and ElevateWeb CTA ("Save this post and follow @ElevateWeb...").
   - Every single slide MUST include a descriptive "visualSuggestion" detailing diagrams, UI mockups, terminal outputs, or flow charts.

4. Caption, CTA, & Sources:
   - Caption must provide a clear 2-3 sentence overview and conclude with a discussion question.
   - Include 3 to 10 relevant technical hashtags (e.g., #webdev #softwareengineering #systemdesign).
   - Always cite 1-3 reputable technical sources (e.g., RFCs, official specs, MDN, standard documentation).
`.trim();
