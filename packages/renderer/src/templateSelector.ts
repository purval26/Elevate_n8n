import type { SlideType } from '../../types/src/index.ts';
import type { SlideTemplate } from './templates/types.ts';
import { explainerTemplate } from './templates/explainer.ts';
import { comparisonTemplate } from './templates/comparison.ts';
import { stepsTemplate } from './templates/steps.ts';
import { statementTemplate } from './templates/statement.ts';
import { diagramTemplate } from './templates/diagram.ts';

export const TEMPLATES: Record<string, SlideTemplate> = {
  explainer: explainerTemplate,
  comparison: comparisonTemplate,
  steps: stepsTemplate,
  statement: statementTemplate,
  diagram: diagramTemplate,
};

/**
 * Deterministically maps a Phase 1 slide type to the appropriate visual template.
 * If the slide type is unrecognized or unsupported, gracefully falls back to the Explainer template.
 */
export function selectTemplate(slideType: SlideType | string): SlideTemplate {
  switch (slideType) {
    case 'comparison':
      return comparisonTemplate;

    case 'architecture':
    case 'code':
    case 'code_snippet':
      return diagramTemplate;

    case 'breakdown':
      return stepsTemplate;

    case 'hook':
    case 'takeaway':
    case 'cta':
      return statementTemplate;

    case 'concept':
    case 'problem':
    default:
      return explainerTemplate;
  }
}
