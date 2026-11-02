import OpenAI from 'openai';
import type { CarouselPackage } from '../../types/src/index.ts';
import { getBundledFontFaceCss } from './fonts.ts';
import { getElevateLogoSvg, getElevateBrandHeaderHtml } from './logo.ts';
import {
  HTML_CREATIVE_DESIGNER_SYSTEM_PROMPT,
  buildHtmlDesignerUserPrompt,
} from '../../prompts/src/htmlDesigner.ts';
import { validateCarouselHtml } from './validator.ts';

export interface CreativeDesignerOptions {
  offline?: boolean;
  apiKey?: string;
  openAiApiKey?: string;
  openRouterApiKey?: string;
  model?: string;
  baseURL?: string;
  theme?: 'dark' | 'light';
  openAiClient?: unknown;
}

/**
 * Escapes characters for HTML content.
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Sanitizes an API key string, filtering out empty values or template placeholders.
 */
function sanitizeApiKey(key?: string): string | undefined {
  if (!key) return undefined;
  const trimmed = key.trim();
  if (
    trimmed.startsWith('your_') ||
    trimmed.startsWith('<') ||
    trimmed === 'undefined' ||
    trimmed === 'null' ||
    trimmed.length < 10
  ) {
    return undefined;
  }
  return trimmed;
}

/**
 * Applies semantic accent highlighting to 1-3 key technical phrases in a headline or text.
 */
function applySemanticAccents(text: string): string {
  const keywords = [
    'DNS',
    'Recursive Resolver',
    'Root Servers',
    'TLD',
    'Authoritative',
    'Nameservers',
    'JWT',
    'Cookie',
    'Cookies',
    'HttpOnly',
    'Stateful',
    'Stateless',
    'Containers',
    'cgroups',
    'namespaces',
    'Docker',
    'Virtual Machines',
    'React',
    'Next.js',
    'SSR',
    'Hydration',
    'API',
    'Idempotency',
    'Rate Limiting',
    'Token',
    'Tokens',
    'Encryption',
    'Payload',
    'Handshake',
    'Kernel',
    'Isolation',
    'Latency',
  ];

  let formatted = escapeHtml(text);
  for (const kw of keywords) {
    const regex = new RegExp(`\\b(${kw})\\b`, 'i');
    if (regex.test(formatted)) {
      formatted = formatted.replace(
        regex,
        `<span class="accent-text" style="color:var(--accent);font-weight:700;">$1</span>`,
      );
      break;
    }
  }

  return formatted;
}

/**
 * HTML Creative Designer: Art-directs and generates complete, responsive, self-contained HTML carousels.
 * Supports live LLM design (via OpenRouter or OpenAI) with an intelligent, highly varied deterministic fallback.
 */
export class HtmlCreativeDesigner {
  private readonly options: CreativeDesignerOptions;

  constructor(options?: CreativeDesignerOptions) {
    this.options = options || {};
  }

  /**
   * Generates a complete self-contained HTML document for the given CarouselPackage.
   */
  async generateCarouselHtml(carouselPackage: CarouselPackage): Promise<string> {
    const rawOpenRouterKey = sanitizeApiKey(
      this.options.openRouterApiKey || process.env.OPENROUTER_API_KEY,
    );
    const rawOpenAiKey = sanitizeApiKey(
      this.options.openAiApiKey || this.options.apiKey || process.env.OPENAI_API_KEY,
    );
    const hasAnyKey = Boolean(
      this.options.openAiClient ||
      sanitizeApiKey(this.options.apiKey) ||
      rawOpenRouterKey ||
      rawOpenAiKey,
    );

    const isOffline = this.options.offline ?? !hasAnyKey;

    if (!isOffline) {
      const llmHtml = await this.tryGenerateWithLlm(carouselPackage);
      if (llmHtml) {
        return llmHtml;
      }
    }

    return this.generateDeterministicCreativeHtml(carouselPackage);
  }

  /**
   * Attempts live creative HTML generation using configured OpenRouter or OpenAI model.
   */
  private async tryGenerateWithLlm(carouselPackage: CarouselPackage): Promise<string | null> {
    let openRouterKey = sanitizeApiKey(
      this.options.openRouterApiKey || process.env.OPENROUTER_API_KEY,
    );
    let openAiKey = sanitizeApiKey(
      this.options.openAiApiKey || this.options.apiKey || process.env.OPENAI_API_KEY,
    );

    // If openAiKey starts with sk-or- (common user config mistake), treat it as openRouterKey
    if (!openRouterKey && openAiKey && openAiKey.startsWith('sk-or-')) {
      openRouterKey = openAiKey;
      openAiKey = undefined;
    }

    const explicitApiKey = sanitizeApiKey(this.options.apiKey);
    const apiKey = explicitApiKey || openRouterKey || openAiKey;

    if (!apiKey && !this.options.openAiClient) {
      return null;
    }

    // Determine baseURL and model based on configured provider
    let baseURL = this.options.baseURL;
    let model = this.options.model;

    if (openRouterKey || (apiKey && apiKey.startsWith('sk-or-'))) {
      baseURL = baseURL || process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
      model = model || process.env.OPENROUTER_MODEL || 'cohere/north-mini-code:free';
    } else {
      baseURL = baseURL || process.env.OPENAI_BASE_URL || undefined;
      model = model || process.env.OPENAI_MODEL || 'gpt-4o';
    }

    // Alias common model names to exact OpenRouter endpoints
    if (model === 'nvidia/nemotron-3-ultra:free') {
      model = 'cohere/north-mini-code:free';
    }

    try {
      const client =
        (this.options.openAiClient as OpenAI) ||
        new OpenAI({
          apiKey: apiKey || 'mock-key',
          baseURL: baseURL || undefined,
          timeout: 180000,
          maxRetries: 2,
        });

      const response = await client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: HTML_CREATIVE_DESIGNER_SYSTEM_PROMPT },
          { role: 'user', content: buildHtmlDesignerUserPrompt(carouselPackage) },
        ],
        temperature: 0.7,
        max_tokens: 16384,
      });

      const choiceText = response.choices?.[0]?.message?.content?.trim();
      if (!choiceText) {
        console.warn(`[CreativeHTML LLM] Empty response received from model ${model}.`);
        return null;
      }

      let cleanedHtml = choiceText;
      if (cleanedHtml.includes('```html')) {
        cleanedHtml = cleanedHtml.replace(/^[\s\S]*?```html\s*/i, '').replace(/```[\s\S]*$/, '');
      } else if (cleanedHtml.includes('```')) {
        cleanedHtml = cleanedHtml.replace(/^[\s\S]*?```\s*/, '').replace(/```[\s\S]*$/, '');
      }
      cleanedHtml = cleanedHtml.trim();

      // Extract HTML document if preceded or followed by non-HTML text
      const docTypeIndex = cleanedHtml.toLowerCase().indexOf('<!doctype html');
      if (docTypeIndex !== -1) {
        cleanedHtml = cleanedHtml.slice(docTypeIndex);
      } else {
        const htmlIndex = cleanedHtml.toLowerCase().indexOf('<html');
        if (htmlIndex !== -1) {
          cleanedHtml = cleanedHtml.slice(htmlIndex);
        }
      }
      const closeHtmlIndex = cleanedHtml.toLowerCase().lastIndexOf('</html>');
      if (closeHtmlIndex !== -1) {
        cleanedHtml = cleanedHtml.slice(0, closeHtmlIndex + 7);
      }

      if (!cleanedHtml.toLowerCase().startsWith('<!doctype html>')) {
        cleanedHtml = `<!doctype html>\n${cleanedHtml}`;
      }

      // Ensure bundled font-face rules are injected if missing
      if (!cleanedHtml.includes('data:font/truetype;charset=utf-8;base64,')) {
        const fontFaceCss = getBundledFontFaceCss();
        if (cleanedHtml.includes('<head>')) {
          cleanedHtml = cleanedHtml.replace('<head>', `<head>\n<style>\n${fontFaceCss}\n</style>`);
        }
      }

      // Ensure ElevateWeb SVG logo mark is included
      if (!cleanedHtml.includes('id="Layer_1"')) {
        const logoMark = getElevateLogoSvg(28);
        cleanedHtml = cleanedHtml.replace(
          /(<(?:section|div)[^>]*\bclass=["'][^"']*\b(?<!-)slide(?!-)[^"']*["'][^>]*>)/gi,
          (match) => {
            const classMatch = match.match(/\bclass=["']([^"']+)["']/i);
            const classes =
              classMatch && classMatch[1] ? classMatch[1].trim().split(/\s+/) : [];
            if (!classes.includes('slide')) return match;
            return `${match}\n  <div class="brand-signature" style="position:absolute;top:70px;right:80px;z-index:20;display:flex;align-items:center;gap:10px;">${logoMark}<span style="font-family:'Outfit',sans-serif;font-size:18px;font-weight:800;letter-spacing:2px;color:#F8FAFC;">ELEVATEWEB</span></div>`;
          },
        );
      }

      const validation = validateCarouselHtml(cleanedHtml);
      if (validation.valid) {
        return cleanedHtml;
      } else {
        console.warn(
          `[CreativeHTML LLM] Output failed validation (${validation.errors.join('; ')}), using deterministic creative designer.`,
        );
      }
    } catch (err) {
      console.warn(
        `[CreativeHTML LLM] Error calling ${model} (${err instanceof Error ? err.message : String(err)}). Using deterministic creative designer.`,
      );
    }

    return null;
  }

  /**
   * Generates creative, art-directed HTML/CSS/SVG for all slides in the package.
   * Completely escapes repetitive card templates with distinct slide storytelling.
   */
  generateDeterministicCreativeHtml(carouselPackage: CarouselPackage): string {
    const fontFaceCss = getBundledFontFaceCss();
    const totalSlides = carouselPackage.slides.length;

    const slidesHtml = carouselPackage.slides
      .map((slide) => this.renderSlideSection(slide, carouselPackage, totalSlides))
      .join('\n\n');

    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(carouselPackage.topic.title)}</title>
  <style>
    /* Bundled Local Fonts (@font-face) */
    ${fontFaceCss}

    /* CSS Reset & Variables */
    :root {
      --primary: #2563EB;
      --primary-hover: #1D4ED8;
      --primary-light: #3B82F6;
      --primary-soft: #EFF6FF;
      --accent: #38BDF8;
      --accent-secondary: #818CF8;
      --bg: #0B0F17;
      --surface: #111827;
      --card: #161F30;
      --border: #1E293B;
      --border-bright: #2B3950;
      --text: #F8FAFC;
      --subtext: #94A3B8;
      --success: #22C55E;
      --warning: #F59E0B;
      --error: #EF4444;
      --font-brand: 'Outfit', sans-serif;
      --font-mono: 'Space Mono', monospace;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      background: #000000;
      color: var(--text);
      font-family: var(--font-brand);
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    /* Slide Canvas: Fixed 1080x1350 Instagram Portrait */
    .slide {
      width: 1080px;
      height: 1350px;
      position: relative;
      overflow: hidden;
      background: var(--bg);
      margin-bottom: 40px;
    }

    /* Varied slide backgrounds */
    .slide[data-slide="1"] {
      background: #0B0F17 radial-gradient(ellipse at 85% 15%, rgba(37, 99, 235, 0.22) 0%, transparent 65%);
    }
    .slide[data-slide="2"] {
      background: #0A0E1A radial-gradient(circle at 50% 50%, rgba(56, 189, 248, 0.08) 0%, transparent 70%);
    }
    .slide[data-slide="3"] {
      background: #090D18 linear-gradient(180deg, #090D18 0%, #0E1526 100%);
    }
    .slide[data-slide="4"] {
      background: #080C16 radial-gradient(ellipse at 20% 80%, rgba(129, 140, 248, 0.12) 0%, transparent 60%);
    }
    .slide[data-slide="5"], .slide[data-slide="6"], .slide[data-slide="7"], .slide[data-slide="8"] {
      background: #0B0F17 radial-gradient(ellipse at 50% 30%, rgba(37, 99, 235, 0.18) 0%, transparent 70%);
    }

    /* Safe Margins and Base Typography */
    .slide-body {
      width: 100%;
      height: 100%;
      padding: 140px 80px 80px 80px;
      display: flex;
      flex-direction: column;
      position: relative;
      z-index: 2;
    }

    .slide-footer {
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      padding: 0 80px 45px 80px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-family: var(--font-mono);
      font-size: 14px;
      color: var(--subtext);
      z-index: 10;
    }

    .slide-counter {
      background: rgba(30, 41, 59, 0.8);
      border: 1px solid var(--border);
      color: var(--accent);
      padding: 6px 14px;
      border-radius: 9999px;
      font-weight: 700;
      letter-spacing: 1px;
    }
  </style>
</head>
<body>
${slidesHtml}
</body>
</html>`;
  }

  private renderSlideSection(
    slide: CarouselPackage['slides'][number],
    carouselPackage: CarouselPackage,
    totalSlides: number,
  ): string {
    const slideNumber = slide.slideNumber;
    const contentHtml = this.renderSlideContent(slide, carouselPackage);

    // Varied subtle brand anchors
    const isFirstSlide = slideNumber === 1;
    const headerHtml = isFirstSlide
      ? getElevateBrandHeaderHtml(carouselPackage.topic.pillar)
      : `
      <div style="position:absolute;top:60px;left:80px;right:80px;display:flex;justify-content:space-between;align-items:center;z-index:10;">
        <span style="font-family:'Space Mono',monospace;font-size:13px;font-weight:700;color:var(--accent);letter-spacing:2px;text-transform:uppercase;">
          // ${carouselPackage.topic.pillar.replace(/_/g, ' ')}
        </span>
        <div style="display:flex;align-items:center;gap:8px;">
          ${getElevateLogoSvg(24)}
          <span style="font-family:'Outfit',sans-serif;font-size:17px;font-weight:800;letter-spacing:2px;color:#F8FAFC;">ELEVATEWEB</span>
        </div>
      </div>
      `.trim();

    const footerHtml = `
    <footer class="slide-footer">
      <span style="letter-spacing:0.5px;">elevateweb.io • ${escapeHtml(carouselPackage.topic.title)}</span>
      <span class="slide-counter">${String(slideNumber).padStart(2, '0')} / ${String(totalSlides).padStart(2, '0')}</span>
    </footer>
    `;

    return `
  <!-- Slide ${slideNumber}: ${escapeHtml(slide.headline)} -->
  <section class="slide" data-slide="${slideNumber}">
    ${headerHtml}
    <div class="slide-body">
      ${contentHtml}
    </div>
    ${footerHtml}
  </section>
    `.trim();
  }

  private renderSlideContent(
    slide: CarouselPackage['slides'][number],
    carouselPackage: CarouselPackage,
  ): string {
    const type = slide.type;

    switch (type) {
      case 'hook':
        return this.renderHookSlide(slide, carouselPackage);
      case 'comparison':
        return this.renderComparisonSlide(slide);
      case 'code':
      case 'code_snippet':
        return this.renderCodeSlide(slide);
      case 'architecture':
      case 'concept':
        return this.renderSchematicSlide(slide, carouselPackage);
      case 'breakdown':
      case 'problem':
        return this.renderProcessSlide(slide);
      case 'takeaway':
      case 'cta':
      default:
        return this.renderTakeawaySlide(slide, carouselPackage);
    }
  }

  /**
   * Hook Slide: Asymmetric editorial typography with giant display headline (74px+),
   * dramatic quote watermark, and question kicker without any generic cards.
   */
  private renderHookSlide(
    slide: CarouselPackage['slides'][number],
    carouselPackage: CarouselPackage,
  ): string {
    return `
      <div style="margin-top:70px;margin-bottom:30px;">
        <span style="display:inline-flex;align-items:center;gap:8px;padding:8px 18px;border-radius:9999px;background:rgba(37,99,235,0.15);border:1px solid rgba(56,189,248,0.3);font-family:var(--font-mono);font-size:14px;font-weight:700;color:var(--accent);letter-spacing:2px;text-transform:uppercase;">
          <span style="width:8px;height:8px;border-radius:50%;background:var(--accent);display:inline-block;"></span>
          CORE ARCHITECTURE HOOK
        </span>
      </div>

      <div style="position:relative;margin-bottom:40px;">
        <div style="position:absolute;top:-40px;left:-20px;font-family:var(--font-brand);font-size:240px;font-weight:900;color:rgba(56,189,248,0.06);line-height:0.8;pointer-events:none;z-index:0;">“</div>
        <h1 style="font-family:var(--font-brand);font-size:74px;font-weight:800;line-height:1.12;color:var(--text);letter-spacing:-1px;position:relative;z-index:2;max-width:920px;">
          ${applySemanticAccents(slide.headline)}
        </h1>
      </div>

      <div style="display:flex;gap:30px;align-items:flex-start;margin-top:auto;margin-bottom:120px;padding:36px;border-left:5px solid var(--accent);background:linear-gradient(90deg, rgba(30,41,59,0.5) 0%, rgba(15,23,42,0) 100%);">
        <div>
          <p style="font-family:var(--font-brand);font-size:32px;line-height:1.42;color:var(--text);font-weight:400;">
            ${escapeHtml(slide.body)}
          </p>
          <div style="margin-top:24px;display:flex;align-items:center;gap:14px;">
            <span style="font-family:var(--font-mono);font-size:15px;color:var(--accent);font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">
              ${escapeHtml(carouselPackage.hook || 'Swipe to decode the architecture →')}
            </span>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Schematic Slide: Large concept-driven inline SVG diagram connecting real nodes
   * with directional glowing data flows and status badges.
   */
  private renderSchematicSlide(
    slide: CarouselPackage['slides'][number],
    carouselPackage: CarouselPackage,
  ): string {
    const isDns = carouselPackage.topic.title.toLowerCase().includes('dns');
    const isDocker = carouselPackage.topic.title.toLowerCase().includes('docker');

    // Bespoke SVG diagram based on concept
    let svgGraphic = '';
    if (isDns) {
      svgGraphic = `
        <svg viewBox="0 0 920 480" width="920" height="480" xmlns="http://www.w3.org/2000/svg" style="display:block;margin:0 auto;">
          <defs>
            <linearGradient id="flow_blue" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="#38BDF8"/>
              <stop offset="100%" stop-color="#2563EB"/>
            </linearGradient>
            <linearGradient id="card_grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#1E293B"/>
              <stop offset="100%" stop-color="#0F172A"/>
            </linearGradient>
          </defs>

          <!-- Connecting Flow Path -->
          <path d="M 120 240 L 320 240 L 520 130 M 320 240 L 520 240 M 320 240 L 520 350 L 780 350" fill="none" stroke="url(#flow_blue)" stroke-width="4" stroke-dasharray="8 6"/>

          <!-- Client Browser Node -->
          <rect x="20" y="180" width="180" height="120" rx="16" fill="url(#card_grad)" stroke="#38BDF8" stroke-width="2"/>
          <text x="110" y="225" font-family="Outfit" font-size="20" font-weight="700" fill="#F8FAFC" text-anchor="middle">Client Browser</text>
          <text x="110" y="255" font-family="Space Mono" font-size="13" font-weight="700" fill="#38BDF8" text-anchor="middle">GET elevateweb.io</text>
          <circle cx="110" cy="280" r="4" fill="#22C55E"/>

          <!-- Recursive Resolver Node -->
          <rect x="260" y="170" width="180" height="140" rx="16" fill="#172554" stroke="#60A5FA" stroke-width="2"/>
          <text x="350" y="215" font-family="Outfit" font-size="20" font-weight="700" fill="#F8FAFC" text-anchor="middle">ISP Resolver</text>
          <text x="350" y="245" font-family="Space Mono" font-size="13" font-weight="700" fill="#60A5FA" text-anchor="middle">1.1.1.1 / 8.8.8.8</text>
          <rect x="290" y="265" width="120" height="26" rx="6" fill="rgba(56,189,248,0.2)"/>
          <text x="350" y="282" font-family="Space Mono" font-size="11" font-weight="700" fill="#38BDF8" text-anchor="middle">Cache Check</text>

          <!-- Root Nameserver -->
          <rect x="520" y="80" width="190" height="90" rx="14" fill="url(#card_grad)" stroke="#334155" stroke-width="2"/>
          <text x="615" y="122" font-family="Outfit" font-size="18" font-weight="700" fill="#F8FAFC" text-anchor="middle">Root Cluster (.)</text>
          <text x="615" y="148" font-family="Space Mono" font-size="12" fill="#94A3B8" text-anchor="middle">13 Worldwide IPs</text>

          <!-- TLD Nameserver -->
          <rect x="520" y="195" width="190" height="90" rx="14" fill="url(#card_grad)" stroke="#334155" stroke-width="2"/>
          <text x="615" y="237" font-family="Outfit" font-size="18" font-weight="700" fill="#F8FAFC" text-anchor="middle">TLD Server (.io)</text>
          <text x="615" y="263" font-family="Space Mono" font-size="12" fill="#94A3B8" text-anchor="middle">Registry Authority</text>

          <!-- Authoritative Nameserver -->
          <rect x="520" y="310" width="220" height="110" rx="14" fill="#0c4a6e" stroke="#38BDF8" stroke-width="2.5"/>
          <text x="630" y="352" font-family="Outfit" font-size="19" font-weight="700" fill="#F8FAFC" text-anchor="middle">Authoritative DNS</text>
          <text x="630" y="380" font-family="Space Mono" font-size="13" font-weight="700" fill="#38BDF8" text-anchor="middle">Cloudflare / NS1</text>
          <text x="630" y="402" font-family="Space Mono" font-size="11" fill="#22C55E" text-anchor="middle">Holds Canonical Truth</text>

          <!-- Final Resolved IP Badge -->
          <rect x="760" y="330" width="150" height="70" rx="12" fill="#14532D" stroke="#22C55E" stroke-width="2"/>
          <text x="835" y="358" font-family="Space Mono" font-size="12" font-weight="700" fill="#86EFAC" text-anchor="middle">A RECORD</text>
          <text x="835" y="382" font-family="Space Mono" font-size="14" font-weight="700" fill="#FFFFFF" text-anchor="middle">104.21.55.2</text>
        </svg>
      `;
    } else if (isDocker) {
      svgGraphic = `
        <svg viewBox="0 0 920 480" width="920" height="480" xmlns="http://www.w3.org/2000/svg" style="display:block;margin:0 auto;">
          <defs>
            <linearGradient id="docker_card" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#1E293B"/>
              <stop offset="100%" stop-color="#0F172A"/>
            </linearGradient>
          </defs>
          <!-- User space vs Kernel boundary -->
          <line x1="40" y1="280" x2="880" y2="280" stroke="#38BDF8" stroke-width="2" stroke-dasharray="6 6"/>
          <text x="870" y="265" font-family="Space Mono" font-size="13" fill="#38BDF8" text-anchor="end">USER SPACE</text>
          <text x="870" y="305" font-family="Space Mono" font-size="13" fill="#64748B" text-anchor="end">KERNEL SPACE</text>

          <!-- Container 1 -->
          <rect x="80" y="50" width="340" height="190" rx="16" fill="url(#docker_card)" stroke="#2563EB" stroke-width="2"/>
          <text x="250" y="95" font-family="Outfit" font-size="22" font-weight="700" fill="#F8FAFC" text-anchor="middle">Container Instance A</text>
          <rect x="110" y="120" width="280" height="40" rx="8" fill="#1E293B"/>
          <text x="250" y="146" font-family="Space Mono" font-size="14" fill="#38BDF8" text-anchor="middle">Isolated Process (PID 1)</text>
          <text x="250" y="195" font-family="Space Mono" font-size="13" fill="#94A3B8" text-anchor="middle">net: veth0 • mnt: /rootfs</text>

          <!-- Container 2 -->
          <rect x="500" y="50" width="340" height="190" rx="16" fill="url(#docker_card)" stroke="#2563EB" stroke-width="2"/>
          <text x="670" y="95" font-family="Outfit" font-size="22" font-weight="700" fill="#F8FAFC" text-anchor="middle">Container Instance B</text>
          <rect x="530" y="120" width="280" height="40" rx="8" fill="#1E293B"/>
          <text x="670" y="146" font-family="Space Mono" font-size="14" fill="#38BDF8" text-anchor="middle">Isolated Process (PID 1)</text>
          <text x="670" y="195" font-family="Space Mono" font-size="13" fill="#94A3B8" text-anchor="middle">net: veth1 • mnt: /rootfs</text>

          <!-- Linux Kernel Layer -->
          <rect x="80" y="330" width="760" height="110" rx="16" fill="#172554" stroke="#38BDF8" stroke-width="2.5"/>
          <text x="460" y="375" font-family="Outfit" font-size="24" font-weight="700" fill="#F8FAFC" text-anchor="middle">Shared Linux Host Kernel</text>
          <text x="460" y="410" font-family="Space Mono" font-size="15" font-weight="700" fill="#38BDF8" text-anchor="middle">cgroups (Resource Limits) + namespaces (Visibility Slices)</text>
        </svg>
      `;
    } else {
      svgGraphic = `
        <svg viewBox="0 0 920 480" width="920" height="480" xmlns="http://www.w3.org/2000/svg" style="display:block;margin:0 auto;">
          <defs>
            <linearGradient id="arch_grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#1E293B"/>
              <stop offset="100%" stop-color="#0F172A"/>
            </linearGradient>
          </defs>
          <rect x="60" y="80" width="240" height="280" rx="16" fill="url(#arch_grad)" stroke="#38BDF8" stroke-width="2"/>
          <text x="180" y="150" font-family="Outfit" font-size="24" font-weight="700" fill="#F8FAFC" text-anchor="middle">Client Origin</text>
          <text x="180" y="200" font-family="Space Mono" font-size="14" fill="#94A3B8" text-anchor="middle">HTTP/2 • TLS 1.3</text>
          <circle cx="180" cy="270" r="32" fill="#2563EB"/>
          <text x="180" y="278" font-family="Space Mono" font-size="18" font-weight="700" fill="#FFFFFF" text-anchor="middle">REQ</text>

          <!-- Directional Arrow -->
          <path d="M 320 220 L 410 220" stroke="#38BDF8" stroke-width="4" marker-end="url(#arrow)"/>
          <polygon points="410,212 430,220 410,228" fill="#38BDF8"/>

          <rect x="440" y="80" width="420" height="280" rx="16" fill="#172554" stroke="#60A5FA" stroke-width="2"/>
          <text x="650" y="140" font-family="Outfit" font-size="24" font-weight="700" fill="#F8FAFC" text-anchor="middle">Distributed Architecture</text>
          <rect x="470" y="170" width="360" height="50" rx="8" fill="#1E293B"/>
          <text x="650" y="202" font-family="Space Mono" font-size="15" fill="#38BDF8" text-anchor="middle">Stateful vs Stateless Verification</text>
          <rect x="470" y="240" width="360" height="50" rx="8" fill="#1E293B"/>
          <text x="650" y="272" font-family="Space Mono" font-size="15" fill="#22C55E" text-anchor="middle">High-Throughput Validation</text>
        </svg>
      `;
    }

    return `
      <div style="margin-top:20px;margin-bottom:20px;">
        <span style="font-family:var(--font-mono);font-size:14px;font-weight:700;color:var(--accent);letter-spacing:2px;text-transform:uppercase;">
          SYSTEM SCHEMATIC
        </span>
      </div>

      <h2 style="font-family:var(--font-brand);font-size:54px;font-weight:800;line-height:1.15;color:var(--text);margin-bottom:30px;">
        ${applySemanticAccents(slide.headline)}
      </h2>

      <!-- Visual Schematic Illustration -->
      <div style="margin-bottom:30px;">
        ${svgGraphic}
      </div>

      <div style="padding:28px 36px;border-left:4px solid var(--accent);background:rgba(30,41,59,0.4);border-radius:0 12px 12px 0;">
        <p style="font-family:var(--font-brand);font-size:30px;line-height:1.45;color:var(--subtext);">
          ${escapeHtml(slide.body)}
        </p>
      </div>
    `;
  }

  /**
   * Comparison Slide: Asymmetric dual-column architectural matrix with distinct visual weights,
   * completely avoiding identical gray cards.
   */
  private renderComparisonSlide(slide: CarouselPackage['slides'][number]): string {
    return `
      <div style="margin-top:20px;margin-bottom:16px;">
        <span style="font-family:var(--font-mono);font-size:14px;font-weight:700;color:var(--accent);letter-spacing:2px;text-transform:uppercase;">
          ARCHITECTURAL TRADEOFF MATRIX
        </span>
      </div>

      <h2 style="font-family:var(--font-brand);font-size:52px;font-weight:800;line-height:1.15;color:var(--text);margin-bottom:35px;">
        ${applySemanticAccents(slide.headline)}
      </h2>

      <!-- Side-by-side contrasting columns -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:28px;margin-bottom:40px;">
        <!-- Option A: Primary Blueprint -->
        <div style="background:#111C38;border:2px solid #2563EB;border-radius:20px;padding:36px;display:flex;flex-direction:column;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
            <span style="font-family:var(--font-mono);font-size:13px;font-weight:700;color:#60A5FA;letter-spacing:1px;text-transform:uppercase;">APPROACH A</span>
            <span style="background:#2563EB;color:#FFFFFF;padding:4px 10px;border-radius:6px;font-family:var(--font-mono);font-size:12px;font-weight:700;">CONVENTIONAL</span>
          </div>
          <h3 style="font-family:var(--font-brand);font-size:32px;font-weight:700;color:#FFFFFF;margin-bottom:16px;">Stateful &amp; Local</h3>
          <p style="font-family:var(--font-brand);font-size:24px;line-height:1.4;color:#94A3B8;margin-bottom:auto;">
            Centralized memory lookup requiring session affinity and server-side state.
          </p>
          <div style="margin-top:30px;padding-top:20px;border-top:1px solid rgba(96,165,250,0.2);display:flex;gap:10px;align-items:center;">
            <span style="color:#60A5FA;font-family:var(--font-mono);font-size:13px;font-weight:700;">PRO:</span>
            <span style="font-family:var(--font-brand);font-size:16px;color:#F8FAFC;">Instant revocation</span>
          </div>
        </div>

        <!-- Option B: Modern Stateless Blueprint -->
        <div style="background:#0c4a6e;border:2px solid #38BDF8;border-radius:20px;padding:36px;display:flex;flex-direction:column;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
            <span style="font-family:var(--font-mono);font-size:13px;font-weight:700;color:#38BDF8;letter-spacing:1px;text-transform:uppercase;">APPROACH B</span>
            <span style="background:#0284C7;color:#FFFFFF;padding:4px 10px;border-radius:6px;font-family:var(--font-mono);font-size:12px;font-weight:700;">DISTRIBUTED</span>
          </div>
          <h3 style="font-family:var(--font-brand);font-size:32px;font-weight:700;color:#FFFFFF;margin-bottom:16px;">Cryptographic &amp; Stateless</h3>
          <p style="font-family:var(--font-brand);font-size:24px;line-height:1.4;color:#BAE6FD;margin-bottom:auto;">
            Self-contained claims verified across any microservice edge without database roundtrips.
          </p>
          <div style="margin-top:30px;padding-top:20px;border-top:1px solid rgba(56,189,248,0.3);display:flex;gap:10px;align-items:center;">
            <span style="color:#38BDF8;font-family:var(--font-mono);font-size:13px;font-weight:700;">PRO:</span>
            <span style="font-family:var(--font-brand);font-size:16px;color:#FFFFFF;">Infinite horizontal scale</span>
          </div>
        </div>
      </div>

      <div style="background:rgba(15,23,42,0.8);border:1px solid var(--border);border-radius:16px;padding:32px 36px;">
        <p style="font-family:var(--font-brand);font-size:28px;line-height:1.45;color:var(--text);">
          ${escapeHtml(slide.body)}
        </p>
      </div>
    `;
  }

  /**
   * Code Slide: Unix/macOS IDE container with traffic-light buttons and syntax-colored code.
   */
  private renderCodeSlide(slide: CarouselPackage['slides'][number]): string {
    const slideWithCode = slide as { codeSnippet?: { code?: string; language?: string } };
    const code =
      slideWithCode.codeSnippet?.code ||
      `// DNS trace execution via CLI\n$ dig +trace elevateweb.io A\n\n;; global options: +cmd\n. 518400 IN NS a.root-servers.net.\nio. 172800 IN NS a0.nic.io.\nelevateweb.io. 300 IN A 104.21.55.2`;
    const lang = slideWithCode.codeSnippet?.language || 'bash';

    return `
      <div style="margin-top:20px;margin-bottom:16px;">
        <span style="font-family:var(--font-mono);font-size:14px;font-weight:700;color:var(--accent);letter-spacing:2px;text-transform:uppercase;">
          TERMINAL EXECUTION // ${lang.toUpperCase()}
        </span>
      </div>

      <h2 style="font-family:var(--font-brand);font-size:52px;font-weight:800;line-height:1.15;color:var(--text);margin-bottom:30px;">
        ${applySemanticAccents(slide.headline)}
      </h2>

      <!-- macOS/Unix Terminal Container -->
      <div style="background:#0B1120;border:1.5px solid #2B3950;border-radius:18px;overflow:hidden;box-shadow:0 20px 40px rgba(0,0,0,0.5);margin-bottom:35px;">
        <!-- Window Titlebar with buttons -->
        <div style="background:#161F30;padding:16px 24px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #1E293B;">
          <div style="display:flex;gap:10px;align-items:center;">
            <span style="width:14px;height:14px;border-radius:50%;background:#EF4444;display:inline-block;"></span>
            <span style="width:14px;height:14px;border-radius:50%;background:#F59E0B;display:inline-block;"></span>
            <span style="width:14px;height:14px;border-radius:50%;background:#22C55E;display:inline-block;"></span>
          </div>
          <span style="font-family:var(--font-mono);font-size:14px;color:#94A3B8;letter-spacing:1px;">elevateweb-terminal • 1080×1350</span>
          <span style="font-family:var(--font-mono);font-size:12px;color:var(--accent);font-weight:700;">UTF-8</span>
        </div>

        <!-- Syntax-highlighted code block -->
        <div style="padding:36px;font-family:var(--font-mono);font-size:24px;line-height:1.6;color:#E2E8F0;overflow-x:hidden;white-space:pre-wrap;">
          <code>${escapeHtml(code)}</code>
        </div>
      </div>

      <div style="padding:24px 32px;background:rgba(30,41,59,0.3);border-left:4px solid var(--accent);border-radius:0 10px 10px 0;">
        <p style="font-family:var(--font-brand);font-size:28px;line-height:1.45;color:var(--subtext);">
          ${escapeHtml(slide.body)}
        </p>
      </div>
    `;
  }

  /**
   * Process Slide: Sequenced execution steps with numbered nodes and connecting lines.
   */
  private renderProcessSlide(slide: CarouselPackage['slides'][number]): string {
    return `
      <div style="margin-top:20px;margin-bottom:16px;">
        <span style="font-family:var(--font-mono);font-size:14px;font-weight:700;color:var(--accent);letter-spacing:2px;text-transform:uppercase;">
          STEP-BY-STEP PROCESS FLOW
        </span>
      </div>

      <h2 style="font-family:var(--font-brand);font-size:52px;font-weight:800;line-height:1.15;color:var(--text);margin-bottom:40px;">
        ${applySemanticAccents(slide.headline)}
      </h2>

      <!-- Process Pipeline Grid -->
      <div style="display:flex;flex-direction:column;gap:24px;margin-bottom:40px;">
        <div style="display:flex;gap:24px;align-items:center;background:rgba(22,31,48,0.7);border:1px solid #1E293B;border-radius:16px;padding:26px 32px;">
          <div style="width:52px;height:52px;border-radius:50%;background:#2563EB;color:#FFFFFF;font-family:var(--font-mono);font-size:22px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;">1</div>
          <div>
            <h4 style="font-family:var(--font-brand);font-size:26px;font-weight:700;color:#F8FAFC;">Request Initiation &amp; Local Cache</h4>
            <p style="font-family:var(--font-brand);font-size:20px;color:#94A3B8;margin-top:4px;">Browser evaluates resident cache and OS resolver tables before network transit.</p>
          </div>
        </div>

        <div style="display:flex;gap:24px;align-items:center;background:rgba(22,31,48,0.7);border:1px solid #1E293B;border-radius:16px;padding:26px 32px;">
          <div style="width:52px;height:52px;border-radius:50%;background:#0284C7;color:#FFFFFF;font-family:var(--font-mono);font-size:22px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;">2</div>
          <div>
            <h4 style="font-family:var(--font-brand);font-size:26px;font-weight:700;color:#F8FAFC;">Hierarchical Upstream Query</h4>
            <p style="font-family:var(--font-brand);font-size:20px;color:#94A3B8;margin-top:4px;">Recursive lookup interrogates Root and TLD nameservers in strict hierarchy.</p>
          </div>
        </div>

        <div style="display:flex;gap:24px;align-items:center;background:rgba(22,31,48,0.7);border:1px solid #1E293B;border-radius:16px;padding:26px 32px;">
          <div style="width:52px;height:52px;border-radius:50%;background:#16A34A;color:#FFFFFF;font-family:var(--font-mono);font-size:22px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;">3</div>
          <div>
            <h4 style="font-family:var(--font-brand);font-size:26px;font-weight:700;color:#F8FAFC;">Authoritative Record Resolution</h4>
            <p style="font-family:var(--font-brand);font-size:20px;color:#94A3B8;margin-top:4px;">Final server yields canonical IP address with deterministic TTL expiration.</p>
          </div>
        </div>
      </div>

      <div style="padding:24px 32px;border-left:4px solid var(--accent);background:rgba(15,23,42,0.8);border-radius:0 10px 10px 0;">
        <p style="font-family:var(--font-brand);font-size:28px;line-height:1.45;color:var(--text);">
          ${escapeHtml(slide.body)}
        </p>
      </div>
    `;
  }

  /**
   * Takeaway Slide: High-impact punchy finish with giant statement typography,
   * inlined ElevateWeb Systems Engineering Seal, and clear CTA banner.
   */
  private renderTakeawaySlide(
    slide: CarouselPackage['slides'][number],
    carouselPackage: CarouselPackage,
  ): string {
    return `
      <div style="margin-top:70px;margin-bottom:30px;">
        <span style="display:inline-flex;align-items:center;gap:8px;padding:8px 18px;border-radius:9999px;background:rgba(34,197,94,0.15);border:1px solid rgba(34,197,94,0.3);font-family:var(--font-mono);font-size:14px;font-weight:700;color:#4ADE80;letter-spacing:2px;text-transform:uppercase;">
          <span style="width:8px;height:8px;border-radius:50%;background:#4ADE80;display:inline-block;"></span>
          KEY ARCHITECTURAL TAKEAWAY
        </span>
      </div>

      <h2 style="font-family:var(--font-brand);font-size:68px;font-weight:800;line-height:1.14;color:var(--text);letter-spacing:-0.5px;margin-bottom:40px;max-width:920px;">
        ${applySemanticAccents(slide.headline)}
      </h2>

      <!-- Systems Engineering Seal SVG Graphic -->
      <div style="display:flex;justify-content:center;align-items:center;margin:30px 0 50px 0;">
        <svg width="220" height="220" viewBox="0 0 220 220" xmlns="http://www.w3.org/2000/svg">
          <circle cx="110" cy="110" r="100" fill="none" stroke="#2563EB" stroke-width="3" stroke-dasharray="10 8"/>
          <circle cx="110" cy="110" r="84" fill="#172554" stroke="#38BDF8" stroke-width="2"/>
          <polygon points="110,48 164,79 164,141 110,172 56,141 56,79" fill="#1E293B" stroke="#60A5FA" stroke-width="2"/>
          <circle cx="110" cy="110" r="28" fill="#2563EB"/>
          <!-- Inner Mark -->
          <path d="M 100 110 L 108 118 L 122 102" fill="none" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>

      <div style="margin-bottom:50px;">
        <p style="font-family:var(--font-brand);font-size:32px;line-height:1.45;color:var(--text);font-weight:400;text-align:center;max-width:860px;margin:0 auto;">
          ${escapeHtml(slide.body)}
        </p>
      </div>

      <!-- High-impact Call to Action Banner -->
      <div style="margin-top:auto;margin-bottom:90px;background:linear-gradient(90deg, #172554 0%, #1E3A8A 100%);border:2px solid #38BDF8;border-radius:18px;padding:32px 40px;display:flex;align-items:center;justify-content:space-between;">
        <div>
          <span style="font-family:var(--font-mono);font-size:14px;color:var(--accent);font-weight:700;letter-spacing:1px;text-transform:uppercase;">ELEVATEWEB ENGINEERING</span>
          <p style="font-family:var(--font-brand);font-size:26px;font-weight:700;color:#FFFFFF;margin-top:4px;">
            ${escapeHtml(carouselPackage.cta || 'Save this guide and follow @elevateweb')}
          </p>
        </div>
        <div style="display:flex;align-items:center;gap:10px;">
          ${getElevateLogoSvg(36)}
        </div>
      </div>
    `;
  }
}
