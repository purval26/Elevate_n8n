import { zodResponseFormat } from 'openai/helpers/zod';
import {
  CarouselPackageSchema,
  CarouselVisualSpecificationSchema,
  type CarouselPackage,
  type CarouselVisualSpecification,
  type IllustrationAsset,
  type SlideVisualSpecification,
  type IllustrationRequest,
} from './schema.ts';
import { VISUAL_DIRECTOR_SYSTEM_PROMPT, buildVisualDirectorUserPrompt } from './prompts.ts';
import { createDeterministicVisualSpec, handleIllustrationFallback } from './fallback.ts';
import {
  type IllustrationProvider,
  DeterministicIllustrationProvider,
  OpenAIIllustrationProvider,
} from './provider.ts';
import { IllustrationCache } from './cache.ts';

interface CompletionChoice {
  message?: {
    parsed?: unknown;
    content?: string | null;
  };
}

interface CompatibleOpenAIClient {
  beta?: {
    chat?: {
      completions?: {
        parse?: (params: unknown) => Promise<{ choices?: CompletionChoice[] }>;
      };
    };
  };
  chat?: {
    completions?: {
      create?: (params: unknown) => Promise<{ choices?: CompletionChoice[] }>;
    };
  };
  images?: {
    generate?: (params: {
      model?: string;
      prompt: string;
      n?: number;
      size?: '1024x1024' | '1024x1792' | string;
      response_format?: 'url' | 'b64_json' | string;
    }) => Promise<{ data?: Array<{ b64_json?: string; url?: string }> }>;
  };
}

export interface VisualDirectorOptions {
  openai?: unknown;
  client?: unknown;
  model?: string;
  offline?: boolean;
  provider?: IllustrationProvider;
  cache?: IllustrationCache;
}

export interface PreparedCarouselVisuals {
  specification: CarouselVisualSpecification;
  assets: Map<number, IllustrationAsset>;
}

export class VisualDirector {
  private client?: CompatibleOpenAIClient;
  private model: string;
  private provider: IllustrationProvider;
  private cache: IllustrationCache;
  private isOffline: boolean;

  constructor(options?: VisualDirectorOptions) {
    this.client = (options?.openai ?? options?.client) as CompatibleOpenAIClient | undefined;
    this.model = options?.model ?? 'gpt-4o';
    this.cache = options?.cache ?? new IllustrationCache();
    this.isOffline = options?.offline ?? false;

    if (options?.provider) {
      this.provider = options.provider;
    } else if (this.client) {
      this.provider = new OpenAIIllustrationProvider(this.client);
    } else {
      this.provider = new DeterministicIllustrationProvider();
    }
  }

  /**
   * Directs the visual presentation of a CarouselPackage.
   * Produces a fully validated CarouselVisualSpecification.
   */
  async direct(carousel: CarouselPackage): Promise<CarouselVisualSpecification> {
    // 1. Validate incoming content package
    const validPkg = CarouselPackageSchema.parse(carousel);

    // 2. Offline or missing API client: use deterministic visual spec
    if (this.isOffline || !this.client?.beta?.chat?.completions?.parse) {
      return createDeterministicVisualSpec(validPkg);
    }

    // 3. Online AI Art Direction via OpenAI structured output
    try {
      const completion = await this.client.beta.chat.completions.parse({
        model: this.model,
        messages: [
          { role: 'system', content: VISUAL_DIRECTOR_SYSTEM_PROMPT },
          { role: 'user', content: buildVisualDirectorUserPrompt(validPkg) },
        ],
        response_format: zodResponseFormat(
          CarouselVisualSpecificationSchema,
          'carousel_visual_specification',
        ),
      });

      const choice = completion.choices?.[0];
      let rawResult = choice?.message?.parsed;

      if (!rawResult && choice?.message?.content) {
        try {
          rawResult = JSON.parse(choice.message.content);
        } catch {
          // ignore parse error, will fallback
        }
      }

      if (rawResult) {
        return CarouselVisualSpecificationSchema.parse(rawResult);
      }
    } catch {
      // Graceful fallback to deterministic director on any API or parsing error
    }

    return createDeterministicVisualSpec(validPkg);
  }

  /**
   * Directs visuals and generates/loads required illustration assets
   * with caching and automatic fallback.
   */
  async directAndPrepare(carousel: CarouselPackage): Promise<PreparedCarouselVisuals> {
    const spec = await this.direct(carousel);
    const assets = new Map<number, IllustrationAsset>();
    const preparedSlides: SlideVisualSpecification[] = [];

    for (const slide of spec.slides) {
      if (slide.illustration?.required) {
        const req: IllustrationRequest = {
          id: slide.illustration.assetId ?? `slide-${String(slide.slideNumber).padStart(2, '0')}`,
          purpose: slide.illustration.purpose ?? `Illustration for slide ${slide.slideNumber}`,
          visualConcept: slide.illustration.visualConcept ?? slide.visualStrategy,
          style: slide.illustration.style ?? 'technical-editorial',
          aspectRatio: slide.illustration.aspectRatio ?? '1:1',
          transparentBackground: true,
          constraints: [
            'NO text',
            'NO labels',
            'NO letters',
            'NO logos',
            'ElevateWeb blue and neutral visual language',
            'Simple geometric shapes and clean silhouettes',
          ],
        };

        // Check cache first
        let asset = this.cache.get(req);
        if (!asset) {
          try {
            asset = await this.provider.generateIllustration(req);
            this.cache.put(req, asset);
          } catch {
            // Illustration failed; fallback to deterministic layout without failing carousel
            const fallbackSlide = handleIllustrationFallback(slide);
            preparedSlides.push(fallbackSlide);
            continue;
          }
        }

        assets.set(slide.slideNumber, asset);
        preparedSlides.push(slide);
      } else {
        preparedSlides.push(slide);
      }
    }

    return {
      specification: {
        topic: spec.topic,
        slides: preparedSlides,
      },
      assets,
    };
  }
}

export async function directCarouselVisuals(
  carousel: CarouselPackage,
  options?: VisualDirectorOptions,
): Promise<CarouselVisualSpecification> {
  const director = new VisualDirector(options);
  return director.direct(carousel);
}
