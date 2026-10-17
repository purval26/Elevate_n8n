import { z } from 'zod';
import { CarouselTopicSchema, type CarouselTopic } from './carousel.ts';

export * from './request.ts';
export * from './carousel.ts';
export * from './database.ts';
export * from './errors.ts';
export * from './visual.ts';

/**
 * Convenience aliases for Topic and Source schemas per PROJECT.md interface contract.
 */
export const TopicSchema = CarouselTopicSchema;
export type Topic = CarouselTopic;

export const SourceSchema = z.string().trim().min(1);
export type Source = z.infer<typeof SourceSchema>;
