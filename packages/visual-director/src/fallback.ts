import type {
  CarouselPackage,
  CarouselVisualSpecification,
  SlideVisualSpecification,
  VisualElement,
} from './schema.ts';
import { SLIDE_TYPE_STRATEGY_MAP, STRATEGY_COMPOSITION_DEFAULTS } from './strategies.ts';

/**
 * Handles illustration failure by transitioning the slide visual specification
 * cleanly to a deterministic non-illustration composition without failing the carousel.
 */
export function handleIllustrationFallback(
  slideSpec: SlideVisualSpecification,
): SlideVisualSpecification {
  const fallbackStrategy =
    slideSpec.illustration?.fallbackStrategy ??
    (slideSpec.visualStrategy === 'illustration' ? 'diagram' : slideSpec.visualStrategy);

  const fallbackComposition = STRATEGY_COMPOSITION_DEFAULTS[fallbackStrategy] ?? 'editorial-stack';

  return {
    ...slideSpec,
    visualStrategy: fallbackStrategy,
    composition: fallbackComposition,
    illustration: {
      required: false,
    },
  };
}

/**
 * Deterministically constructs an elevated CarouselVisualSpecification
 * based on the slide types, topic, and semantic heuristics.
 * Used for offline rendering, unit testing, and fallback director behavior.
 */
export function createDeterministicVisualSpec(
  carousel: CarouselPackage,
): CarouselVisualSpecification {
  const slides: SlideVisualSpecification[] = carousel.slides.map((slide, index) => {
    const isFirst = index === 0;
    const isLast = index === carousel.slides.length - 1;

    let strategy = SLIDE_TYPE_STRATEGY_MAP[slide.type]?.strategy ?? 'editorial';
    let composition = SLIDE_TYPE_STRATEGY_MAP[slide.type]?.composition ?? 'editorial-stack';
    let requiresIllustration = SLIDE_TYPE_STRATEGY_MAP[slide.type]?.illustration ?? false;

    // Enforce slide-to-slide variety
    if (isFirst) {
      strategy = 'big-type';
      composition = 'big-type';
      requiresIllustration = false;
    } else if (isLast) {
      strategy = 'editorial';
      composition = 'takeaway';
      requiresIllustration = false;
    }

    // Build semantic elements from the slide content
    const elements: VisualElement[] = [
      {
        type: 'eyebrow',
        text: carousel.topic.pillar.replace(/_/g, ' ').toUpperCase(),
      },
      {
        type: 'headline',
        text: slide.headline,
      },
      {
        type: 'body',
        text: slide.body,
      },
    ];

    if (slide.visualSuggestion) {
      elements.push({
        type: 'callout',
        label: 'CONCEPT DETAIL',
        text: slide.visualSuggestion,
      });
    }

    let fallbackTemplate: 'explainer' | 'comparison' | 'steps' | 'statement' | 'diagram' =
      'explainer';
    if (slide.type === 'comparison') fallbackTemplate = 'comparison';
    else if (
      slide.type === 'architecture' ||
      slide.type === 'code' ||
      slide.type === 'code_snippet'
    )
      fallbackTemplate = 'diagram';
    else if (slide.type === 'breakdown') fallbackTemplate = 'steps';
    else if (
      isFirst ||
      isLast ||
      slide.type === 'hook' ||
      slide.type === 'takeaway' ||
      slide.type === 'cta'
    )
      fallbackTemplate = 'statement';

    return {
      slideNumber: slide.slideNumber,
      visualStrategy: strategy,
      composition,
      background: 'dark',
      accent: isFirst ? 'accent-cyan' : isLast ? 'green' : 'primary-blue',
      illustration: requiresIllustration
        ? {
            required: true,
            purpose: `Explain ${slide.headline} conceptually`,
            visualConcept: slide.visualSuggestion || slide.headline,
            style: 'technical-editorial',
            aspectRatio: '1:1',
            assetId: `slide-${String(slide.slideNumber).padStart(2, '0')}-illustration`,
            fallbackStrategy: 'diagram',
          }
        : {
            required: false,
          },
      elements,
      fallbackTemplate,
    };
  });

  return {
    topic: carousel.topic,
    slides,
  };
}
