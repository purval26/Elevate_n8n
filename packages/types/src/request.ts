import { z } from 'zod';

export const COMMON_CONTENT_PILLARS = [
  'tech_explained',
  'web_architecture',
  'developer_tools',
  'performance',
  'security',
] as const;

export const ContentPillarSchema = z.string().trim().min(1, 'Pillar must not be empty');
export type ContentPillar = z.infer<typeof ContentPillarSchema>;

export const ContentToneSchema = z.string().trim().min(1).default('educational');
export type ContentTone = z.infer<typeof ContentToneSchema>;

export const GenerateContentRequestSchema = z
  .object({
    topic: z
      .string({
        required_error: 'Topic is required',
        invalid_type_error: 'Topic must be a string',
      })
      .trim()
      .min(3, 'Topic must be at least 3 characters')
      .max(200, 'Topic must not exceed 200 characters'),
    pillar: ContentPillarSchema,
    tone: z.string().trim().min(1).optional().default('educational'),
    slideCount: z
      .number({
        invalid_type_error: 'Slide count must be an integer',
      })
      .int('Slide count must be an integer')
      .min(5, 'Slide count must be between 5 and 8')
      .max(8, 'Slide count must be between 5 and 8')
      .optional()
      .default(6),
  })
  .strict();

export type GenerateContentRequest = z.infer<typeof GenerateContentRequestSchema>;
