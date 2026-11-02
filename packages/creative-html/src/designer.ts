import type { CarouselPackage } from '../../types/src/index.ts';
import { getBundledFontFaceCss } from './fonts.ts';
import { getElevateBrandHeaderHtml } from './logo.ts';

export interface CreativeDesignerOptions {
  offline?: boolean;
  openAiApiKey?: string;
  theme?: 'dark' | 'light';
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
 * Applies semantic accent highlighting to 1-3 key technical phrases in a headline or text.
 */
function applySemanticAccents(text: string): string {
  // Common technical terms that communicate hierarchy
  const keywords = [
    'DNS',
    'Recursive Resolver',
    'Root Servers',
    'TLD',
    'Authoritative',
    'Nameservers',
    'JWT',
    'Cookie',
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
    'Encryption',
    'Payload',
  ];

  let formatted = escapeHtml(text);
  for (const kw of keywords) {
    const regex = new RegExp(`\\b(${kw})\\b`, 'i');
    if (regex.test(formatted)) {
      formatted = formatted.replace(
        regex,
        `<span class="accent-text" style="color:var(--accent);font-weight:700;">$1</span>`,
      );
      break; // Highlight primary keyword to maintain restraint
    }
  }

  return formatted;
}

/**
 * HTML Creative Designer: Art-directs and generates complete, responsive, self-contained HTML carousels.
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
    // If OpenAI is configured and offline is not forced, could invoke LLM API.
    // By default or in offline mode, uses the deterministic creative designer engine.
    if (!this.options.offline && this.options.openAiApiKey) {
      // LLM generation path fallback to deterministic
    }
    return this.generateDeterministicCreativeHtml(carouselPackage);
  }

  /**
   * Generates creative, art-directed HTML/CSS/SVG for all slides in the package.
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
      background-image:
        radial-gradient(ellipse at 80% 10%, rgba(37, 99, 235, 0.12) 0%, transparent 60%),
        radial-gradient(ellipse at 20% 90%, rgba(56, 189, 248, 0.08) 0%, transparent 50%);
      margin-bottom: 40px;
    }

    /* Safe Margins and Base Typography */
    .slide-body {
      width: 100%;
      height: 100%;
      padding: 170px 80px 100px 80px;
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
      padding: 0 80px 50px 80px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid var(--border);
      padding-top: 24px;
      font-family: var(--font-mono);
      font-size: 14px;
      color: var(--subtext);
      z-index: 10;
    }

    .slide-counter {
      background: #172554;
      color: var(--accent);
      padding: 4px 12px;
      border-radius: 6px;
      font-weight: 700;
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
    const headerHtml = getElevateBrandHeaderHtml(carouselPackage.topic.pillar);
    const contentHtml = this.renderSlideContent(slide, carouselPackage);

    const footerHtml = `
    <footer class="slide-footer">
      <span>ElevateWeb • ${escapeHtml(carouselPackage.topic.title)}</span>
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
        return this.renderSchematicSlide(slide);
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
   * Hook Slide: Asymmetric editorial typography, quotation mark watermark, strong brand accent bar.
   */
  private renderHookSlide(
    slide: CarouselPackage['slides'][number],
    _carouselPackage: CarouselPackage,
  ): string {
    return `
      <div style="margin-top:40px;margin-bottom:24px;">
        <span style="font-family:var(--font-mono);font-size:16px;font-weight:700;color:var(--accent);letter-spacing:2px;text-transform:uppercase;">THE CORE HOOK</span>
      </div>

      <div style="display:flex;gap:24px;align-items:flex-start;margin-bottom:50px;">
        <div style="width:6px;height:140px;background:linear-gradient(to bottom, var(--accent), var(--primary));border-radius:4px;flex-shrink:0;"></div>
        <div>
          <h1 style="font-family:var(--font-brand);font-size:54px;font-weight:800;line-height:1.18;color:var(--text);letter-spacing:-0.5px;">
            ${applySemanticAccents(slide.headline)}
          </h1>
        </div>
      </div>

      <div style="background:var(--card);border:1.5px solid var(--border);border-radius:18px;padding:44px 48px;position:relative;overflow:hidden;margin-top:auto;margin-bottom:80px;">
        <div style="position:absolute;top:-20px;right:20px;font-family:var(--font-brand);font-size:160px;font-weight:900;color:var(--border);opacity:0.3;pointer-events:none;line-height:1;">“</div>
        <p style="font-family:var(--font-brand);font-size:30px;line-height:1.45;color:var(--subtext);position:relative;z-index:2;">
          ${escapeHtml(slide.body)}
        </p>
        <div style="margin-top:30px;display:flex;align-items:center;gap:12px;">
          <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--success);"></span>
          <span style="font-family:var(--font-mono);font-size:14px;color:var(--accent);font-weight:700;letter-spacing:1px;text-transform:uppercase;">VERIFIED SYSTEMS BLUEPRINT</span>
        </div>
      </div>
    `;
  }

  /**
   * Schematic Slide: Headline on top, bespoke vector illustration schematic in middle, callout below.
   */
  private renderSchematicSlide(slide: CarouselPackage['slides'][number]): string {
    return `
      <div style="margin-top:10px;margin-bottom:16px;">
        <span style="font-family:var(--font-mono);font-size:15px;font-weight:700;color:var(--accent);letter-spacing:1.5px;text-transform:uppercase;">SYSTEM ARCHITECTURE</span>
      </div>

      <h2 style="font-family:var(--font-brand);font-size:46px;font-weight:800;line-height:1.2;color:var(--text);margin-bottom:20px;">
        ${applySemanticAccents(slide.headline)}
      </h2>

      <p style="font-family:var(--font-brand);font-size:26px;line-height:1.42;color:var(--subtext);margin-bottom:36px;">
        ${escapeHtml(slide.body)}
      </p>

      <!-- Technical Schematic Visual Canvas -->
      <div style="flex:1;background:var(--card);border:1.5px solid var(--border);border-radius:18px;padding:30px;display:flex;align-items:center;justify-content:center;position:relative;margin-bottom:60px;">
        <svg viewBox="0 0 860 380" style="width:100%;height:100%;max-height:360px;" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="glow_grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#2563EB" stop-opacity="0.8"/>
              <stop offset="100%" stop-color="#38BDF8" stop-opacity="0.8"/>
            </linearGradient>
          </defs>

          <!-- Node 1: Client / Ingress -->
          <rect x="40" y="130" width="200" height="120" rx="14" fill="#0D131F" stroke="#2563EB" stroke-width="2"/>
          <circle cx="90" cy="190" r="24" fill="#172554"/>
          <path d="M 82 190 L 98 190 M 90 182 L 90 198" stroke="#38BDF8" stroke-width="2.5" stroke-linecap="round"/>
          <text x="130" y="184" fill="#F8FAFC" font-family="'Outfit',sans-serif" font-size="18" font-weight="700">CLIENT / OS</text>
          <text x="130" y="206" fill="#94A3B8" font-family="'Space Mono',monospace" font-size="12">LOCAL CACHE</text>

          <!-- Connector 1 -->
          <line x1="240" y1="190" x2="330" y2="190" stroke="#38BDF8" stroke-width="2.5" stroke-dasharray="6,4"/>
          <polygon points="330,190 320,185 320,195" fill="#38BDF8"/>

          <!-- Node 2: Central Gateway / Resolver -->
          <rect x="330" y="100" width="220" height="180" rx="16" fill="#131C2E" stroke="#38BDF8" stroke-width="2.5"/>
          <circle cx="440" cy="160" r="32" fill="#1E293B" stroke="#38BDF8" stroke-width="2"/>
          <circle cx="440" cy="160" r="14" fill="#38BDF8"/>
          <text x="440" y="224" text-anchor="middle" fill="#F8FAFC" font-family="'Outfit',sans-serif" font-size="20" font-weight="700">RESOLVER ENGINE</text>
          <text x="440" y="248" text-anchor="middle" fill="#38BDF8" font-family="'Space Mono',monospace" font-size="12">DISTRIBUTED DISPATCH</text>

          <!-- Connector 2 -->
          <line x1="550" y1="190" x2="640" y2="190" stroke="#38BDF8" stroke-width="2.5" stroke-dasharray="6,4"/>
          <polygon points="640,190 630,185 630,195" fill="#38BDF8"/>

          <!-- Node 3: Canonical Truth -->
          <rect x="640" y="130" width="190" height="120" rx="14" fill="#0D131F" stroke="#22C55E" stroke-width="2"/>
          <circle cx="685" cy="190" r="24" fill="#052E16"/>
          <path d="M 677 190 L 683 196 L 694 184" stroke="#22C55E" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
          <text x="720" y="184" fill="#F8FAFC" font-family="'Outfit',sans-serif" font-size="18" font-weight="700">CANONICAL</text>
          <text x="720" y="206" fill="#22C55E" font-family="'Space Mono',monospace" font-size="12">DEFINITIVE TRUTH</text>
        </svg>
      </div>
    `;
  }

  /**
   * Comparison Slide: Side-by-side comparative cards with pros/cons styling.
   */
  private renderComparisonSlide(slide: CarouselPackage['slides'][number]): string {
    return `
      <div style="margin-top:10px;margin-bottom:16px;">
        <span style="font-family:var(--font-mono);font-size:15px;font-weight:700;color:var(--accent);letter-spacing:1.5px;text-transform:uppercase;">ARCHITECTURAL COMPARISON</span>
      </div>

      <h2 style="font-family:var(--font-brand);font-size:46px;font-weight:800;line-height:1.2;color:var(--text);margin-bottom:18px;">
        ${applySemanticAccents(slide.headline)}
      </h2>

      <p style="font-family:var(--font-brand);font-size:26px;line-height:1.42;color:var(--subtext);margin-bottom:34px;">
        ${escapeHtml(slide.body)}
      </p>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;flex:1;margin-bottom:60px;">
        <!-- Option A Card -->
        <div style="background:var(--card);border:2px solid #2563EB;border-radius:16px;padding:32px;display:flex;flex-direction:column;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
            <span style="font-family:var(--font-brand);font-size:22px;font-weight:700;color:#F8FAFC;">STATELESS MODEL</span>
            <span style="background:#1E3A8A;color:#93C5FD;font-family:var(--font-mono);font-size:12px;font-weight:700;padding:4px 8px;border-radius:6px;">CLIENT-STORED</span>
          </div>
          <p style="font-family:var(--font-brand);font-size:18px;line-height:1.45;color:var(--subtext);margin-bottom:24px;">
            Self-contained verification cryptographic signatures without centralized session lookup.
          </p>
          <ul style="list-style:none;margin-top:auto;display:flex;flex-direction:column;gap:12px;">
            <li style="display:flex;align-items:center;gap:10px;font-size:16px;color:#F8FAFC;">
              <span style="color:var(--success);font-weight:bold;">✓</span> Zero central database lookup
            </li>
            <li style="display:flex;align-items:center;gap:10px;font-size:16px;color:#F8FAFC;">
              <span style="color:var(--success);font-weight:bold;">✓</span> Instant horizontal scale
            </li>
            <li style="display:flex;align-items:center;gap:10px;font-size:16px;color:#94A3B8;">
              <span style="color:var(--warning);font-weight:bold;">!</span> Revocation requires blacklists
            </li>
          </ul>
        </div>

        <!-- Option B Card -->
        <div style="background:var(--card);border:2px solid #38BDF8;border-radius:16px;padding:32px;display:flex;flex-direction:column;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
            <span style="font-family:var(--font-brand);font-size:22px;font-weight:700;color:#F8FAFC;">STATEFUL MODEL</span>
            <span style="background:#083344;color:#67E8F9;font-family:var(--font-mono);font-size:12px;font-weight:700;padding:4px 8px;border-radius:6px;">SERVER-STORED</span>
          </div>
          <p style="font-family:var(--font-brand);font-size:18px;line-height:1.45;color:var(--subtext);margin-bottom:24px;">
            Opaque session identifier linked to Redis/PostgreSQL with instant invalidation control.
          </p>
          <ul style="list-style:none;margin-top:auto;display:flex;flex-direction:column;gap:12px;">
            <li style="display:flex;align-items:center;gap:10px;font-size:16px;color:#F8FAFC;">
              <span style="color:var(--success);font-weight:bold;">✓</span> Immediate session revocation
            </li>
            <li style="display:flex;align-items:center;gap:10px;font-size:16px;color:#F8FAFC;">
              <span style="color:var(--success);font-weight:bold;">✓</span> Minimal client footprint
            </li>
            <li style="display:flex;align-items:center;gap:10px;font-size:16px;color:#94A3B8;">
              <span style="color:var(--warning);font-weight:bold;">!</span> Central session store bottleneck
            </li>
          </ul>
        </div>
      </div>
    `;
  }

  /**
   * Code Slide: Clean terminal/IDE container with Space Mono code block.
   */
  private renderCodeSlide(slide: CarouselPackage['slides'][number]): string {
    const slideWithCode = slide as { codeSnippet?: { code?: string; language?: string } };
    const code =
      slideWithCode.codeSnippet?.code ||
      `// Canonical Configuration\nconst server = fastify();\nawait server.register(authPlugin);`;
    const lang = slideWithCode.codeSnippet?.language || 'typescript';

    return `
      <div style="margin-top:10px;margin-bottom:16px;">
        <span style="font-family:var(--font-mono);font-size:15px;font-weight:700;color:var(--accent);letter-spacing:1.5px;text-transform:uppercase;">IMPLEMENTATION SPEC</span>
      </div>

      <h2 style="font-family:var(--font-brand);font-size:46px;font-weight:800;line-height:1.2;color:var(--text);margin-bottom:18px;">
        ${applySemanticAccents(slide.headline)}
      </h2>

      <p style="font-family:var(--font-brand);font-size:26px;line-height:1.42;color:var(--subtext);margin-bottom:34px;">
        ${escapeHtml(slide.body)}
      </p>

      <!-- Terminal / Code Editor Container -->
      <div style="background:#0D1117;border:1.5px solid var(--border);border-radius:16px;overflow:hidden;flex:1;display:flex;flex-direction:column;margin-bottom:60px;">
        <div style="background:#161B22;padding:14px 20px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--border);">
          <div style="display:flex;gap:8px;">
            <span style="width:12px;height:12px;border-radius:50%;background:#EF4444;display:inline-block;"></span>
            <span style="width:12px;height:12px;border-radius:50%;background:#F59E0B;display:inline-block;"></span>
            <span style="width:12px;height:12px;border-radius:50%;background:#22C55E;display:inline-block;"></span>
          </div>
          <span style="font-family:var(--font-mono);font-size:12px;color:var(--subtext);">${lang.toUpperCase()}</span>
        </div>
        <div style="padding:28px 32px;overflow:hidden;flex:1;">
          <pre style="font-family:var(--font-mono);font-size:20px;line-height:1.6;color:#E6EDF3;white-space:pre-wrap;word-break:break-all;">${escapeHtml(code)}</pre>
        </div>
      </div>
    `;
  }

  /**
   * Process Flow Slide: Sequenced step containers with connecting visual indicators.
   */
  private renderProcessSlide(slide: CarouselPackage['slides'][number]): string {
    return `
      <div style="margin-top:10px;margin-bottom:16px;">
        <span style="font-family:var(--font-mono);font-size:15px;font-weight:700;color:var(--accent);letter-spacing:1.5px;text-transform:uppercase;">EXECUTION FLOW</span>
      </div>

      <h2 style="font-family:var(--font-brand);font-size:46px;font-weight:800;line-height:1.2;color:var(--text);margin-bottom:18px;">
        ${applySemanticAccents(slide.headline)}
      </h2>

      <p style="font-family:var(--font-brand);font-size:26px;line-height:1.42;color:var(--subtext);margin-bottom:34px;">
        ${escapeHtml(slide.body)}
      </p>

      <div style="display:flex;flex-direction:column;gap:18px;flex:1;margin-bottom:60px;">
        <div style="background:var(--card);border:1.5px solid var(--border);border-radius:14px;padding:24px 28px;display:flex;align-items:center;gap:24px;">
          <div style="width:48px;height:48px;border-radius:50%;background:#172554;color:var(--accent);font-family:var(--font-mono);font-size:18px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;">01</div>
          <div>
            <div style="font-family:var(--font-brand);font-size:20px;font-weight:700;color:var(--text);margin-bottom:4px;">DISPATCH &amp; CACHE INSPECTION</div>
            <div style="font-family:var(--font-mono);font-size:14px;color:var(--subtext);">Query arrives at recursive resolver, checking local memory TTL.</div>
          </div>
        </div>

        <div style="background:var(--card);border:2px solid var(--primary);border-radius:14px;padding:24px 28px;display:flex;align-items:center;gap:24px;">
          <div style="width:48px;height:48px;border-radius:50%;background:var(--primary);color:#FFFFFF;font-family:var(--font-mono);font-size:18px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;">02</div>
          <div>
            <div style="font-family:var(--font-brand);font-size:20px;font-weight:700;color:var(--text);margin-bottom:4px;">HIERARCHICAL RESOLUTION</div>
            <div style="font-family:var(--font-mono);font-size:14px;color:var(--accent);">Root (.) -> TLD (.com) -> Authoritative traversal.</div>
          </div>
        </div>

        <div style="background:var(--card);border:1.5px solid var(--border);border-radius:14px;padding:24px 28px;display:flex;align-items:center;gap:24px;">
          <div style="width:48px;height:48px;border-radius:50%;background:#172554;color:var(--accent);font-family:var(--font-mono);font-size:18px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;">03</div>
          <div>
            <div style="font-family:var(--font-brand);font-size:20px;font-weight:700;color:var(--text);margin-bottom:4px;">RETURN &amp; CLIENT CACHING</div>
            <div style="font-family:var(--font-mono);font-size:14px;color:var(--subtext);">IP records returned and cached at client OS socket.</div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Takeaway Slide: High-contrast green/emerald accent, success seal, summary conclusion.
   */
  private renderTakeawaySlide(
    slide: CarouselPackage['slides'][number],
    carouselPackage: CarouselPackage,
  ): string {
    return `
      <div style="margin-top:10px;margin-bottom:16px;">
        <span style="font-family:var(--font-mono);font-size:15px;font-weight:700;color:var(--success);letter-spacing:2px;text-transform:uppercase;">KEY ENGINEERING TAKEAWAY</span>
      </div>

      <h2 style="font-family:var(--font-brand);font-size:48px;font-weight:800;line-height:1.2;color:var(--text);margin-bottom:32px;">
        ${applySemanticAccents(slide.headline)}
      </h2>

      <!-- Focal Summary Box -->
      <div style="background:var(--card);border:2px solid var(--success);border-radius:20px;padding:48px;display:flex;flex-direction:column;justify-content:space-between;flex:1;margin-bottom:60px;">
        <div style="display:flex;align-items:center;gap:18px;margin-bottom:28px;">
          <div style="width:48px;height:48px;border-radius:50%;background:#052E16;border:2px solid var(--success);display:flex;align-items:center;justify-content:center;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22C55E" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
          <span style="font-family:var(--font-mono);font-size:18px;font-weight:700;color:var(--success);">CORE PRINCIPLE</span>
        </div>

        <p style="font-family:var(--font-brand);font-size:32px;line-height:1.45;color:var(--text);font-weight:500;">
          ${escapeHtml(slide.body)}
        </p>

        <div style="margin-top:40px;padding-top:24px;border-top:1px solid #1E293B;display:flex;align-items:center;justify-content:space-between;">
          <span style="font-family:var(--font-mono);font-size:14px;color:var(--subtext);">ElevateWeb • Verified System Architecture</span>
          <span style="font-family:var(--font-brand);font-size:18px;font-weight:700;color:var(--accent);">${escapeHtml(carouselPackage.cta || 'Save & Share')}</span>
        </div>
      </div>
    `;
  }
}
