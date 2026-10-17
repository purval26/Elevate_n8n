export {
  renderCarousel,
  type RenderCarouselOptions,
  type RenderCarouselResult,
  type RenderSlideResult,
} from './render.ts';

export { selectTemplate, TEMPLATES } from './templateSelector.ts';
export type { SlideTemplate, SlideRenderContext } from './templates/types.ts';
export { explainerTemplate } from './templates/explainer.ts';
export { comparisonTemplate } from './templates/comparison.ts';
export { stepsTemplate } from './templates/steps.ts';
export { statementTemplate } from './templates/statement.ts';
export { diagramTemplate } from './templates/diagram.ts';

export { DIMENSIONS, COLORS, TYPOGRAPHY, BRAND } from './design/tokens.ts';

export {
  escapeXml,
  wrapText,
  renderWrappedTextSvg,
  type WrapOptions,
} from './design/textLayout.ts';

export type { RenderEngine, RenderEngineOptions } from './engines/types.ts';
export { ResvgRenderEngine, defaultResvgEngine } from './engines/resvgEngine.ts';
export { PlaywrightRenderEngine } from './engines/playwrightEngine.ts';
