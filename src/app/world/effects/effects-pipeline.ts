import * as T from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
export type QualityTier = 'high' | 'balanced' | 'low';
export function qualitySettings(tier: QualityTier) {
  return tier === 'high'
    ? { dpr: 1.5, shadowSize: 1024, bloom: false, dust: 600 }
    : tier === 'balanced'
      ? { dpr: 1.25, shadowSize: 512, bloom: false, dust: 250 }
      : { dpr: 1, shadowSize: 0, bloom: false, dust: 0 };
}
export type FxName = 'ao' | 'bloom' | 'vignette';

/**
 * Optional passes are off until their cost is measured on the reference GPU (plan L5: drop any that passes
 * 2 ms). They are switched on for measurement with `?fx=ao,bloom,vignette` and each can be disabled alone.
 */
export function parseFx(search: string): Set<FxName> {
  const raw = new URLSearchParams(search).get('fx') ?? '';
  const out = new Set<FxName>();
  for (const name of raw.split(',')) if (name === 'ao' || name === 'bloom' || name === 'vignette') out.add(name);
  return out;
}

const VIGNETTE = {
  uniforms: { tDiffuse: { value: null as T.Texture | null }, strength: { value: 0.28 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader:
    'uniform sampler2D tDiffuse; uniform float strength; varying vec2 vUv;' +
    'void main(){ vec4 c = texture2D(tDiffuse, vUv); vec2 d = vUv - 0.5; float v = smoothstep(0.85, 0.2, length(d) * 1.25);' +
    'gl_FragColor = vec4(c.rgb * mix(1.0 - strength, 1.0, v), c.a); }',
};

/** Single linear-HDR path. OutputPass owns tone mapping/output transfer; no second gamma pass. */
export class EffectsPipeline {
  private composer: EffectComposer;
  private output: OutputPass;
  private readonly optional = new Map<FxName, { enabled: boolean }>();
  constructor(
    private renderer: T.WebGLRenderer,
    scene: T.Scene,
    camera: T.Camera,
    fx: Set<FxName> = new Set(),
  ) {
    const size = renderer.getSize(new T.Vector2()),
      target = new T.WebGLRenderTarget(Math.max(1, size.x), Math.max(1, size.y), {
        type: T.HalfFloatType,
        samples: 4,
      });
    this.composer = new EffectComposer(renderer, target);
    this.composer.addPass(new RenderPass(scene, camera));
    if (fx.has('ao')) {
      const ao = new GTAOPass(scene, camera, Math.max(1, size.x), Math.max(1, size.y));
      ao.output = GTAOPass.OUTPUT.Default;
      this.composer.addPass(ao);
      this.optional.set('ao', ao);
    }
    if (fx.has('bloom')) {
      // Threshold above 1: only emitters (LEDs, lens, packets) bloom, never lit surfaces.
      const bloom = new UnrealBloomPass(new T.Vector2(size.x / 2, size.y / 2), 0.35, 0.5, 1.2);
      this.composer.addPass(bloom);
      this.optional.set('bloom', bloom);
    }
    if (fx.has('vignette')) {
      const vignette = new ShaderPass(VIGNETTE);
      this.composer.addPass(vignette);
      this.optional.set('vignette', vignette);
    }
    this.output = new OutputPass();
    this.composer.addPass(this.output);
  }
  /** Switches one optional pass without rebuilding the pipeline; returns false when it was not created. */
  setEnabled(name: FxName, on: boolean): boolean {
    const pass = this.optional.get(name);
    if (pass) pass.enabled = on;
    return !!pass;
  }

  get passes(): FxName[] {
    return [...this.optional.keys()];
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
