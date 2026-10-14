import * as T from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
export type QualityTier = 'high' | 'balanced' | 'low';
export function qualitySettings(tier: QualityTier) {
  return tier === 'high'
    ? { dpr: 1.5, shadowSize: 1024, bloom: false, dust: 600 }
    : tier === 'balanced'
      ? { dpr: 1.25, shadowSize: 512, bloom: false, dust: 250 }
      : { dpr: 1, shadowSize: 0, bloom: false, dust: 0 };
}
/** Single linear-HDR path. OutputPass owns tone mapping/output transfer; no second gamma pass. */
export class EffectsPipeline {
  private composer: EffectComposer;
  private output: OutputPass;
  constructor(
    private renderer: T.WebGLRenderer,
    scene: T.Scene,
    camera: T.Camera,
  ) {
    const size = renderer.getSize(new T.Vector2()),
      target = new T.WebGLRenderTarget(Math.max(1, size.x), Math.max(1, size.y), {
        type: T.HalfFloatType,
        samples: 4,
      });
    this.composer = new EffectComposer(renderer, target);
    this.composer.addPass(new RenderPass(scene, camera));
    this.output = new OutputPass();
    this.composer.addPass(this.output);
  }
  render(): void {
    this.composer.render();
  }
  resize(w: number, h: number): void {
    this.composer.setPixelRatio(this.renderer.getPixelRatio());
    this.composer.setSize(w, h);
  }
  dispose(): void {
    this.output.dispose();
    this.composer.dispose();
  }
}
