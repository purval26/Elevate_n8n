import { type VisualStrategy, type Composition, type SlideType } from './schema.ts';

/**
 * Default composition choices for given visual strategies.
 */
export const STRATEGY_COMPOSITION_DEFAULTS: Record<VisualStrategy, Composition> = {
  illustration: 'split-50',
  diagram: 'diagram-focus',
  'technical-diagram': 'process-flow',
  'conceptual-metaphor': 'hero-right',
  comparison: 'comparison',
  process: 'process-flow',
  timeline: 'timeline',
  'big-type': 'big-type',
  editorial: 'editorial-stack',
  'ui-mockup': 'hero-right',
  code: 'code-focus',
  'data-visualization': 'split-60-40',
  mixed: 'illustration-with-callouts',
  none: 'editorial-stack',
};

/**
 * Heuristic fallback mapping from standard Phase 1 slide types to visual strategies
 * when running offline without an active LLM session.
 */
export const SLIDE_TYPE_STRATEGY_MAP: Record<
  SlideType,
  { strategy: VisualStrategy; composition: Composition; illustration: boolean }
> = {
  hook: { strategy: 'big-type', composition: 'big-type', illustration: false },
  problem: { strategy: 'conceptual-metaphor', composition: 'hero-right', illustration: true },
  concept: { strategy: 'conceptual-metaphor', composition: 'hero-right', illustration: true },
  architecture: {
    strategy: 'technical-diagram',
    composition: 'diagram-focus',
    illustration: false,
  },
  breakdown: { strategy: 'process', composition: 'process-flow', illustration: false },
  comparison: { strategy: 'comparison', composition: 'comparison', illustration: false },
  code: { strategy: 'code', composition: 'code-focus', illustration: false },
  code_snippet: { strategy: 'code', composition: 'code-focus', illustration: false },
  takeaway: { strategy: 'editorial', composition: 'takeaway', illustration: false },
  cta: { strategy: 'big-type', composition: 'takeaway', illustration: false },
};
