export interface RenderEngineOptions {
  width?: number;
  height?: number;
  deviceScaleFactor?: number;
}

export interface RenderEngine {
  name: string;
  isAvailable(): Promise<boolean> | boolean;
  renderSvgToPng(svg: string, options?: RenderEngineOptions): Promise<Buffer> | Buffer;
}
