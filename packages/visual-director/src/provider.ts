import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import type { IllustrationRequest, IllustrationAsset } from './schema.ts';

export interface IllustrationProvider {
  generateIllustration(request: IllustrationRequest): Promise<IllustrationAsset>;
}

export interface OpenAIIllustrationClient {
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

/**
 * Generates beautiful, clean, deterministic SVG vector illustrations for technical concepts.
 * Adheres strictly to the ElevateWeb brand palette with ZERO text, letters, or logos.
 * Runs completely offline without external network dependencies.
 */
export class DeterministicIllustrationProvider implements IllustrationProvider {
  private outputDir: string;

  constructor(outputDir?: string) {
    this.outputDir = outputDir ?? path.join(os.homedir(), '.cache', 'elevate', 'illustrations');
    fs.mkdirSync(this.outputDir, { recursive: true });
  }

  async generateIllustration(request: IllustrationRequest): Promise<IllustrationAsset> {
    const filename = `${request.id}.svg`;
    const filePath = path.join(this.outputDir, filename);

    const svgContent = this.createVectorIllustration(request);
    fs.writeFileSync(filePath, svgContent, 'utf-8');

    const dataUri = `data:image/svg+xml;base64,${Buffer.from(svgContent).toString('base64')}`;

    return {
      id: request.id,
      path: filePath,
      mimeType: 'image/svg+xml',
      width: 800,
      height: 800,
      dataUri,
    };
  }

  private createVectorIllustration(request: IllustrationRequest): string {
    const concept = (request.visualConcept + ' ' + request.purpose).toLowerCase();

    // 1. DNS / Network / Routing
    if (
      concept.includes('dns') ||
      concept.includes('resolver') ||
      concept.includes('domain') ||
      concept.includes('lookup')
    ) {
      return `
        <svg width="800" height="800" viewBox="0 0 800 800" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="grad-blue" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#38BDF8"/>
              <stop offset="100%" stop-color="#2563EB"/>
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="8" result="blur"/>
              <feComposite in="SourceGraphic" in2="blur" operator="over"/>
            </filter>
          </defs>
          <!-- Background subtle grid aura -->
          <circle cx="400" cy="400" r="320" fill="#1E293B" fill-opacity="0.2"/>
          <circle cx="400" cy="400" r="240" fill="#1E293B" fill-opacity="0.3"/>
          <circle cx="400" cy="400" r="160" fill="#172554" fill-opacity="0.4"/>

          <!-- Orbit paths -->
          <circle cx="400" cy="400" r="280" stroke="#334155" stroke-width="2" stroke-dasharray="6 6" fill="none"/>
          <circle cx="400" cy="400" r="180" stroke="#2563EB" stroke-width="2" fill="none" opacity="0.6"/>

          <!-- Central Core Node (DNS Resolver Core) -->
          <circle cx="400" cy="400" r="64" fill="url(#grad-blue)" filter="url(#glow)"/>
          <circle cx="400" cy="400" r="48" fill="#0A0E17"/>
          <circle cx="400" cy="400" r="24" fill="#38BDF8"/>

          <!-- Satellite Nodes (Browser Client, Root Server, TLD Server) -->
          <!-- Client Node Left -->
          <line x1="180" y1="400" x2="336" y2="400" stroke="#38BDF8" stroke-width="4" stroke-dasharray="8 6"/>
          <circle cx="180" cy="400" r="44" fill="#1E293B" stroke="#38BDF8" stroke-width="3"/>
          <rect x="160" y="380" width="40" height="40" rx="8" fill="#2563EB"/>

          <!-- Top Root Nameserver Node -->
          <line x1="400" y1="180" x2="400" y2="336" stroke="#2563EB" stroke-width="4" stroke-dasharray="8 6"/>
          <circle cx="400" cy="180" r="44" fill="#1E293B" stroke="#2563EB" stroke-width="3"/>
          <polygon points="400,160 420,195 380,195" fill="#38BDF8"/>

          <!-- Right Authoritative Node -->
          <line x1="464" y1="400" x2="620" y2="400" stroke="#38BDF8" stroke-width="4" stroke-dasharray="8 6"/>
          <circle cx="620" cy="400" r="44" fill="#1E293B" stroke="#38BDF8" stroke-width="3"/>
          <circle cx="620" cy="400" r="22" fill="#2563EB"/>

          <!-- Bottom Cache / Record Node -->
          <line x1="400" y1="464" x2="400" y2="620" stroke="#2563EB" stroke-width="4" stroke-dasharray="8 6"/>
          <circle cx="400" cy="620" r="44" fill="#1E293B" stroke="#2563EB" stroke-width="3"/>
          <rect x="382" y="602" width="36" height="36" rx="6" fill="#38BDF8"/>
        </svg>
      `.trim();
    }

    // 2. Containers / Docker / Isolation / Virtualization
    if (
      concept.includes('container') ||
      concept.includes('docker') ||
      concept.includes('isolation') ||
      concept.includes('process tree')
    ) {
      return `
        <svg width="800" height="800" viewBox="0 0 800 800" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="box-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#1D4ED8"/>
              <stop offset="100%" stop-color="#0F172A"/>
            </linearGradient>
          </defs>
          <!-- Base Host Platform / Kernel Shelf -->
          <rect x="100" y="620" width="600" height="40" rx="10" fill="#1E293B" stroke="#334155" stroke-width="2"/>
          <line x1="140" y1="640" x2="660" y2="640" stroke="#38BDF8" stroke-width="3" stroke-linecap="round"/>

          <!-- Isolated Container Unit 1 (Left) -->
          <g transform="translate(140, 240)">
            <!-- Outer Isolation Boundary -->
            <rect x="0" y="0" width="220" height="340" rx="16" fill="url(#box-grad)" stroke="#38BDF8" stroke-width="3" stroke-dasharray="10 6"/>
            <!-- Internal process stack -->
            <rect x="30" y="50" width="160" height="50" rx="8" fill="#1E293B" stroke="#38BDF8" stroke-width="1.5"/>
            <rect x="30" y="120" width="160" height="50" rx="8" fill="#1E293B" stroke="#38BDF8" stroke-width="1.5"/>
            <rect x="30" y="190" width="160" height="50" rx="8" fill="#1E293B" stroke="#38BDF8" stroke-width="1.5"/>
            <!-- Container Seal Cap -->
            <circle cx="110" cy="285" r="20" fill="#2563EB"/>
          </g>

          <!-- Isolated Container Unit 2 (Right) -->
          <g transform="translate(440, 200)">
            <!-- Outer Isolation Boundary -->
            <rect x="0" y="0" width="220" height="380" rx="16" fill="url(#box-grad)" stroke="#2563EB" stroke-width="3"/>
            <!-- Internal process stack -->
            <rect x="30" y="60" width="160" height="50" rx="8" fill="#172554" stroke="#2563EB" stroke-width="1.5"/>
            <rect x="30" y="130" width="160" height="50" rx="8" fill="#172554" stroke="#2563EB" stroke-width="1.5"/>
            <rect x="30" y="200" width="160" height="50" rx="8" fill="#172554" stroke="#2563EB" stroke-width="1.5"/>
            <rect x="30" y="270" width="160" height="50" rx="8" fill="#172554" stroke="#2563EB" stroke-width="1.5"/>
          </g>

          <!-- Dynamic Inter-Connecting Bus -->
          <path d="M 250 200 L 250 140 L 550 140 L 550 160" fill="none" stroke="#38BDF8" stroke-width="3" stroke-linecap="round"/>
        </svg>
      `.trim();
    }

    // 3. Security / Auth / JWT / Cookies / Tokens
    if (
      concept.includes('jwt') ||
      concept.includes('token') ||
      concept.includes('cookie') ||
      concept.includes('auth') ||
      concept.includes('security')
    ) {
      return `
        <svg width="800" height="800" viewBox="0 0 800 800" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="shield-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#2563EB"/>
              <stop offset="100%" stop-color="#1E1B4B"/>
            </linearGradient>
          </defs>
          <!-- Central Cryptographic Shield -->
          <path d="M 400 120 L 580 200 L 580 440 C 580 560 400 660 400 660 C 400 660 220 560 220 440 L 220 200 Z"
                fill="url(#shield-grad)" stroke="#38BDF8" stroke-width="4"/>
          <!-- Inner geometric core -->
          <path d="M 400 170 L 540 230 L 540 430 C 540 520 400 610 400 610 C 400 610 260 520 260 430 L 260 230 Z"
                fill="#0A0E17" stroke="#2563EB" stroke-width="2"/>

          <!-- Key / Digital Signature Hologram -->
          <circle cx="400" cy="350" r="50" fill="none" stroke="#38BDF8" stroke-width="8"/>
          <rect x="392" y="390" width="16" height="110" rx="8" fill="#38BDF8"/>
          <rect x="408" y="440" width="30" height="16" rx="4" fill="#38BDF8"/>
          <rect x="408" y="475" width="22" height="16" rx="4" fill="#38BDF8"/>

          <!-- Ambient token rings -->
          <circle cx="160" cy="300" r="30" fill="#1E293B" stroke="#38BDF8" stroke-width="2"/>
          <circle cx="640" cy="300" r="30" fill="#1E293B" stroke="#2563EB" stroke-width="2"/>
        </svg>
      `.trim();
    }

    // 4. API / Request Flow / Gateway / Pipeline
    if (
      concept.includes('api') ||
      concept.includes('request') ||
      concept.includes('http') ||
      concept.includes('flow') ||
      concept.includes('pipeline')
    ) {
      return `
        <svg width="800" height="800" viewBox="0 0 800 800" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="pipe-grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#38BDF8"/>
              <stop offset="50%" stop-color="#2563EB"/>
              <stop offset="100%" stop-color="#1D4ED8"/>
            </linearGradient>
          </defs>
          <!-- Flow Conduits -->
          <path d="M 200 400 C 200 250, 600 250, 600 400 C 600 550, 200 550, 200 400 Z"
                fill="none" stroke="#1E293B" stroke-width="36"/>
          <path d="M 200 400 C 200 250, 600 250, 600 400"
                fill="none" stroke="url(#pipe-grad)" stroke-width="12" stroke-linecap="round"/>

          <!-- Traveling Data Packets -->
          <circle cx="280" cy="275" r="16" fill="#38BDF8"/>
          <circle cx="400" cy="250" r="22" fill="#60A5FA"/>
          <circle cx="520" cy="275" r="16" fill="#38BDF8"/>

          <!-- Gateway Node Left -->
          <rect x="140" y="340" width="120" height="120" rx="20" fill="#0A0E17" stroke="#38BDF8" stroke-width="3"/>
          <rect x="165" y="365" width="70" height="70" rx="10" fill="#2563EB"/>

          <!-- Server / Service Node Right -->
          <rect x="540" y="340" width="120" height="120" rx="20" fill="#0A0E17" stroke="#2563EB" stroke-width="3"/>
          <circle cx="600" cy="400" r="32" fill="#38BDF8"/>
        </svg>
      `.trim();
    }

    // 5. Default Clean Architectural Isometric Metaphor
    return `
      <svg width="800" height="800" viewBox="0 0 800 800" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="cube-top" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#38BDF8"/>
            <stop offset="100%" stop-color="#2563EB"/>
          </linearGradient>
          <linearGradient id="cube-left" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#1D4ED8"/>
            <stop offset="100%" stop-color="#0F172A"/>
          </linearGradient>
          <linearGradient id="cube-right" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#1E293B"/>
            <stop offset="100%" stop-color="#0A0E17"/>
          </linearGradient>
        </defs>

        <!-- Ambient Concentric Halos -->
        <circle cx="400" cy="420" r="280" fill="#1E293B" fill-opacity="0.25"/>
        <circle cx="400" cy="420" r="200" stroke="#334155" stroke-width="2" stroke-dasharray="8 6" fill="none"/>

        <!-- Central Isometric Cube Structure -->
        <!-- Top Face -->
        <polygon points="400,220 560,310 400,400 240,310" fill="url(#cube-top)"/>
        <!-- Left Face -->
        <polygon points="240,310 400,400 400,580 240,490" fill="url(#cube-left)"/>
        <!-- Right Face -->
        <polygon points="400,400 560,310 560,490 400,580" fill="url(#cube-right)"/>

        <!-- Inner Circuit Spine -->
        <line x1="400" y1="400" x2="400" y2="240" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round"/>
        <circle cx="400" cy="240" r="8" fill="#FFFFFF"/>
      </svg>
    `.trim();
  }
}

/**
 * OpenAI DALL-E 3 Illustration Provider.
 * Enforces editorial constraints and saves generated assets locally.
 */
export class OpenAIIllustrationProvider implements IllustrationProvider {
  private client: OpenAIIllustrationClient;
  private outputDir: string;
  private fallbackProvider: DeterministicIllustrationProvider;

  constructor(client: OpenAIIllustrationClient, outputDir?: string) {
    this.client = client;
    this.outputDir = outputDir ?? path.join(os.homedir(), '.cache', 'elevate', 'illustrations');
    this.fallbackProvider = new DeterministicIllustrationProvider(this.outputDir);
    fs.mkdirSync(this.outputDir, { recursive: true });
  }

  async generateIllustration(request: IllustrationRequest): Promise<IllustrationAsset> {
    if (!this.client?.images?.generate) {
      return this.fallbackProvider.generateIllustration(request);
    }

    const enhancedPrompt = `
Clean modern technical editorial vector-style illustration of: ${request.visualConcept}.
Purpose: ${request.purpose}.
Style: ${request.style}, simple geometric forms, clean silhouettes, professional, subtle depth.
Color palette: Dark editorial background (#0A0E17), royal blue (#2563EB), bright cyan (#38BDF8), slate neutrals.
STRICT NEGATIVE CONSTRAINTS:
- ABSOLUTELY NO TEXT
- NO WORDS
- NO LETTERS
- NO HEADLINES
- NO LABELS
- NO NUMBERS
- NO LOGOS
- NO WATERMARKS
- Pure visual iconography and diagrammatic metaphors only.
    `.trim();

    try {
      const response = await this.client.images.generate({
        model: 'dall-e-3',
        prompt: enhancedPrompt,
        n: 1,
        size: '1024x1024',
        response_format: 'b64_json',
      });

      const b64 = response.data?.[0]?.b64_json;
      if (b64) {
        const filePath = path.join(this.outputDir, `${request.id}.png`);
        fs.writeFileSync(filePath, Buffer.from(b64, 'base64'));

        return {
          id: request.id,
          path: filePath,
          mimeType: 'image/png',
          width: 1024,
          height: 1024,
          dataUri: `data:image/png;base64,${b64}`,
        };
      }
    } catch {
      // Fallback seamlessly on any API failure
      return this.fallbackProvider.generateIllustration(request);
    }

    return this.fallbackProvider.generateIllustration(request);
  }
}

/**
 * Controllable Mock Illustration Provider for automated testing.
 */
export class MockIllustrationProvider implements IllustrationProvider {
  public calls: IllustrationRequest[] = [];
  public shouldFail = false;
  private fallback: DeterministicIllustrationProvider;

  constructor() {
    this.fallback = new DeterministicIllustrationProvider();
  }

  async generateIllustration(request: IllustrationRequest): Promise<IllustrationAsset> {
    this.calls.push(request);
    if (this.shouldFail) {
      throw new Error('MockIllustrationProvider simulated failure');
    }
    return this.fallback.generateIllustration(request);
  }
}
