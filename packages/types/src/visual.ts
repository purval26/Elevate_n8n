import { z } from 'zod';

export const VISUAL_STRATEGIES = [
  'illustration',
  'diagram',
  'technical-diagram',
  'conceptual-metaphor',
  'comparison',
  'process',
  'timeline',
  'big-type',
  'editorial',
  'ui-mockup',
  'code',
  'data-visualization',
  'mixed',
  'none',
] as const;

export const VisualStrategySchema = z.enum(VISUAL_STRATEGIES);
export type VisualStrategy = z.infer<typeof VisualStrategySchema>;

export const COMPOSITIONS = [
  'centered-hero',
  'big-type',
  'hero-left',
  'hero-right',
  'split-50',
  'split-60-40',
  'full-width-illustration',
  'illustration-with-callouts',
  'illustration-with-side-copy',
  'process-flow',
  'vertical-process',
  'comparison',
  'before-after',
  'timeline',
  'big-number',
  'editorial-stack',
  'diagram-focus',
  'code-focus',
  'ui-focus',
  'takeaway',
] as const;

export const CompositionSchema = z.enum(COMPOSITIONS);
export type Composition = z.infer<typeof CompositionSchema>;

export const ILLUSTRATION_STYLES = [
  'technical-editorial',
  'flat-geometric',
  'conceptual',
  'isometric-technical',
  'minimal-diagrammatic',
  'abstract-technical',
] as const;

export const IllustrationStyleSchema = z.enum(ILLUSTRATION_STYLES);
export type IllustrationStyle = z.infer<typeof IllustrationStyleSchema>;

export const VisualElementTypeSchema = z.enum([
  'headline',
  'body',
  'eyebrow',
  'label',
  'badge',
  'number',
  'stat',
  'divider',
  'card',
  'callout',
  'arrow',
  'connector',
  'node',
  'icon',
  'illustration',
  'code',
  'quote',
  'logo',
]);
export type VisualElementType = z.infer<typeof VisualElementTypeSchema>;

export const VisualElementSchema = z.object({
  type: VisualElementTypeSchema,
  text: z.string().optional(),
  label: z.string().optional(),
  target: z.string().optional(),
  icon: z.string().optional(),
  details: z.string().optional(),
  items: z.array(z.string()).optional(),
  position: z.enum(['top', 'bottom', 'left', 'right', 'center']).optional(),
});
export type VisualElement = z.infer<typeof VisualElementSchema>;

export const IllustrationSpecSchema = z.object({
  required: z.boolean(),
  purpose: z.string().optional(),
  visualConcept: z.string().optional(),
  style: z.string().optional(),
  aspectRatio: z.string().optional(),
  assetId: z.string().optional(),
  fallbackStrategy: VisualStrategySchema.optional(),
});
export type IllustrationSpec = z.infer<typeof IllustrationSpecSchema>;

export const SlideVisualSpecificationSchema = z.object({
  slideNumber: z.number().int().min(1).max(8),
  visualStrategy: VisualStrategySchema,
  composition: CompositionSchema,
  background: z.enum(['dark', 'light', 'surface']).default('dark'),
  accent: z.enum(['primary-blue', 'accent-cyan', 'purple', 'green']).default('primary-blue'),
  illustration: IllustrationSpecSchema.optional(),
  elements: z.array(VisualElementSchema),
  fallbackTemplate: z
    .enum(['explainer', 'comparison', 'steps', 'statement', 'diagram'])
    .default('explainer'),
});
export type SlideVisualSpecification = z.infer<typeof SlideVisualSpecificationSchema>;

export const CarouselVisualSpecificationSchema = z.object({
  topic: z.object({
    title: z.string().min(1),
    pillar: z.string().min(1),
  }),
  slides: z.array(SlideVisualSpecificationSchema).min(1).max(8),
});
export type CarouselVisualSpecification = z.infer<typeof CarouselVisualSpecificationSchema>;

export const IllustrationRequestSchema = z.object({
  id: z.string().min(1),
  purpose: z.string().min(1),
  visualConcept: z.string().min(1),
  style: z.string().default('technical-editorial'),
  aspectRatio: z.string().default('1:1'),
  transparentBackground: z.boolean().default(true),
  constraints: z
    .array(z.string())
    .default([
      'NO text',
      'NO labels',
      'NO letters',
      'NO logos',
      'ElevateWeb blue and neutral visual language',
      'Simple geometric shapes and clean silhouettes',
    ]),
});
export type IllustrationRequest = z.infer<typeof IllustrationRequestSchema>;

export const IllustrationAssetSchema = z.object({
  id: z.string().min(1),
  path: z.string().min(1),
  mimeType: z.string().default('image/png'),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  dataUri: z.string().optional(),
});
export type IllustrationAsset = z.infer<typeof IllustrationAssetSchema>;
