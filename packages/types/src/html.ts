import { z } from 'zod';

export interface HtmlValidationResult {
  valid: boolean;
  errors: string[];
  slideCount: number;
  hasScripts: boolean;
  hasExternalDeps: boolean;
  warnings?: string[];
}

export interface HtmlRenderSlideResult {
  slideNumber: number;
  filePath: string;
  width: number;
  height: number;
  overflowDetected?: boolean;
}

export interface HtmlRenderCarouselResult {
  outputDir: string;
  htmlPath: string;
  totalSlides: number;
  slides: HtmlRenderSlideResult[];
  fallbackUsed: boolean;
  fallbackReason?: string;
}

export interface HtmlRenderOptions {
  outputDir?: string;
  timeoutMs?: number;
  offline?: boolean;
  allowFallback?: boolean;
  openAiApiKey?: string;
  apiKey?: string;
  openRouterApiKey?: string;
  model?: string;
  baseURL?: string;
}

export const HtmlValidationResultSchema = z.object({
  valid: z.boolean(),
  errors: z.array(z.string()),
  slideCount: z.number().int().nonnegative(),
  hasScripts: z.boolean(),
  hasExternalDeps: z.boolean(),
  warnings: z.array(z.string()).optional(),
});
