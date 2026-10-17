import { z } from 'zod';
import { ContentPillarSchema } from './request.ts';

export const SlideTypeSchema = z.enum([
  'hook',
  'problem',
  'concept',
  'code',
  'code_snippet',
  'breakdown',
  'architecture',
  'comparison',
  'takeaway',
  'cta',
]);
export type SlideType = z.infer<typeof SlideTypeSchema>;

export const SlideSchema = z.object({
  slideNumber: z
    .number({
      required_error: 'Slide number is required',
      invalid_type_error: 'Slide number must be an integer',
    })
    .int('Slide number must be an integer')
    .min(1, 'Slide number must be between 1 and 8')
    .max(8, 'Slide number must be between 1 and 8'),
  type: SlideTypeSchema,
  headline: z
    .string({
      required_error: 'Headline is required',
    })
    .trim()
    .min(1, 'Headline must not be empty')
    .max(150, 'Headline is too long'),
  body: z
    .string({
      required_error: 'Body text is required',
    })
    .trim()
    .min(1, 'Body text must not be empty')
    .max(1000, 'Body text is too long'),
  visualSuggestion: z
    .string({
      required_error: 'Visual suggestion is required',
    })
    .trim()
    .min(1, 'Visual suggestion must be provided')
    .max(500, 'Visual suggestion is too long'),
});
export type Slide = z.infer<typeof SlideSchema>;

export const CarouselTopicSchema = z.object({
  title: z
    .string({
      required_error: 'Topic title is required',
    })
    .trim()
    .min(1, 'Topic title must not be empty')
    .max(200, 'Topic title is too long'),
  pillar: ContentPillarSchema,
});
export type CarouselTopic = z.infer<typeof CarouselTopicSchema>;

/**
 * Base schema without Zod refinements — compatible with OpenAI zodResponseFormat / strict JSON schema.
 */
export const BaseCarouselPackageSchema = z.object({
  topic: CarouselTopicSchema,
  hook: z
    .string({
      required_error: 'Hook is required',
    })
    .trim()
    .min(5, 'Hook must be at least 5 characters')
    .max(300, 'Hook is too long'),
  slides: z
    .array(SlideSchema)
    .min(5, 'Carousel must contain at least 5 slides')
    .max(8, 'Carousel must not exceed 8 slides'),
  caption: z
    .string({
      required_error: 'Caption is required',
    })
    .trim()
    .min(10, 'Caption must be at least 10 characters')
    .max(2000, 'Caption is too long'),
  cta: z
    .string({
      required_error: 'CTA is required',
    })
    .trim()
    .min(3, 'CTA must be at least 3 characters')
    .max(300, 'CTA is too long'),
  hashtags: z
    .array(
      z
        .string()
        .trim()
        .regex(/^#?[a-zA-Z0-9_]+$/, 'Invalid hashtag format'),
    )
    .min(1, 'Must include at least one hashtag')
    .max(30, 'Too many hashtags'),
  sources: z.array(z.string().trim().min(1)).default([]),
});

/**
 * Full carousel package schema enforcing sequential slide numbering (1..N).
 */
export const CarouselPackageSchema = BaseCarouselPackageSchema.refine(
  (data) => data.slides.every((slide, idx) => slide.slideNumber === idx + 1),
  {
    message: 'Slide numbers must be strictly sequential starting from 1 (e.g. 1, 2, 3...)',
    path: ['slides'],
  },
);

export type CarouselPackage = z.infer<typeof BaseCarouselPackageSchema>;
