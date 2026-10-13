import { StationBuilder } from './models/station-builder';
import { firstInspectableHit } from './scene-picking';
import { GpuResources } from './gpu-resources';
import { releaseInstanceBuffers } from './instance-lifecycle';

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { gsap } from 'gsap';
import { bindCancellation, applyInputPolicy } from './scene-input';
import { classifySubject, pieceDefinition } from './piece-catalog';
import { instanceContacts } from './static-instancing';
import { frameBounds, ViewportRegion } from './camera-director';
import { EffectsPipeline, qualitySettings, QualityTier } from './effects/effects-pipeline';
import { GpuProfile } from './gpu-profile';
import { FrameProfile } from './frame-profile';
import { historyPieces } from './history-pieces';
import { MemoryModels } from './models/memory-models';
import { InteractionRegistry, PieceDefinition } from './interaction-registry';
import { WorkbenchPhysics } from './physics/workbench-physics';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { ElectronicsWorkshop } from './electronics-workshop';

import type { SceneInputs, SceneCallbacks, Section } from './scene-inputs';
import { CPU_PARTS, APPLE_PARTS, type Part } from './models/station-layouts';
export class WorldEngine implements SceneInputs {
  section: Section = 'atrium';
  exploded = false;
  activePart = '';
  tick = 0;
  memoryCells: { address: number; value: number }[] = [];
  history: { address: number; text: string; ax: number }[] = [];
  memoryBase = 0;
  viewMode: 'material' | 'wireframe' = 'material';
  manipulate = false;
  inspection = false;
  memoryModel: 'classic' | 'dimm' = 'classic';
  reduced = false;
  quality: QualityTier = 'high';
  signalChannel = 'ALE';
  readAccess = false;
  writeAccess = false;
  private registry = new InteractionRegistry();
  private environmentParts = new Map<string, THREE.Object3D>();
  private physics?: WorkbenchPhysics;
  private light?: THREE.PointLight;
  private selectionBox?: THREE.BoxHelper;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer?: THREE.WebGLRenderer;
  private controls?: OrbitControls;
  private observer?: ResizeObserver;
  private pmrem?: THREE.PMREMGenerator;
  private environment?: THREE.WebGLRenderTarget;
  private frame = 0;
  private statsFrame = 0;
  private profiler = new FrameProfile();
  private gpuProfiler?: GpuProfile;
  private gpuResources?: GpuResources;
  private effects?: EffectsPipeline;
  private profileTier?: QualityTier;
  private keyLight?: THREE.DirectionalLight;
  private focusedObject?: THREE.Object3D;
  private root = new THREE.Group();
  private contactBatches: THREE.InstancedMesh[] = [];
  private parts = new Map<string, THREE.Object3D>();
  private resources = new Set<THREE.Material | THREE.BufferGeometry | THREE.Texture>();
  private materials = new Map<string, THREE.MeshStandardMaterial>();
  private cameraMotion?: gsap.core.Timeline;
  private explodedMotion?: gsap.core.Timeline;
  private pulseMotion?: gsap.core.Timeline;
  private packet?: THREE.Mesh;
  private pointerStart = new THREE.Vector2();
  private disposed = false;
  private dragPointer?: number;
  private dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.8);
  private physicsReady?: Promise<void>;
  private releaseCancellation?: () => void;
  private historySlots: THREE.Mesh[] = [];
  private lastTick = -1;
  private clock = new THREE.Clock();
  constructor(
    private readonly canvas: HTMLCanvasElement,
    inputs: SceneInputs,
    private readonly callbacks: SceneCallbacks,
  ) {
    Object.assign(this, inputs);
  }
  update(inputs: SceneInputs, changed: ReadonlySet<keyof SceneInputs>): void {
    Object.assign(this, inputs);
    if (!this.renderer) return;
    if (this.root.userData['section'] !== this.section || changed.has('memoryModel'))
      this.buildSubject();
    if (changed.has('manipulate') && !this.manipulate) this.onCancel();
    this.updateValues();
    this.updateScope();
    this.updateInputPolicy();
    if (this.light) this.light.intensity = this.inspection ? 46 : 22;
    this.scene.traverse((o) => {
      if (o.userData['detail']) o.visible = this.quality === 'high';
      if (o instanceof THREE.Mesh && o.material instanceof THREE.MeshStandardMaterial)
        o.material.wireframe = this.viewMode === 'wireframe';
    });
    if (changed.has('exploded')) this.updateParts();
    this.updateSelection();
    this.updateQuality();
    if (this.tick !== this.lastTick) {
      this.lastTick = this.tick;
      if (this.tick) this.transfer();
    }
  }
  initialize(): void {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#101214');
    this.scene.fog = new THREE.Fog('#202727', 27, 55);
    this.camera = new THREE.PerspectiveCamera(38, 1, 0.25, 60);
    this.camera.position.set(5.8, 9.2, 10.8);
    this.camera.lookAt(-0.45, 0.7, 0);
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
    });
    this.gpuResources = new GpuResources(this.renderer.getContext() as WebGL2RenderingContext);
    this.renderer.info.autoReset = false;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.82;
    this.renderer.shadowMap.enabled = this.quality === 'high';
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, this.quality === 'high' ? 1.5 : 1));
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.pmrem = new THREE.PMREMGenerator(this.renderer);
    const room = new RoomEnvironment();
    this.environment = this.pmrem.fromScene(room, 0.04);
    this.scene.environment = this.environment.texture;
    this.scene.environmentIntensity = 0.45;
    room.dispose();

    this.scene.add(new THREE.HemisphereLight('#c4d6c8', '#242120', 0.8));
    const key = new THREE.DirectionalLight('#ffe0ac', 2.2);
    key.position.set(-4, 8, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    Object.assign(key.shadow.camera, {
      left: -9,
      right: 9,
      top: 8,
      bottom: -8,
      near: 0.1,
      far: 30,
    });
    key.shadow.bias = -0.00015;
    key.shadow.normalBias = 0.012;
    this.scene.add(key);
    this.keyLight = key;
    const rim = new THREE.DirectionalLight('#8fb9ce', 1.1);
    rim.position.set(5, 4, -5);
    this.scene.add(rim);

    new ElectronicsWorkshop({
      track: (r) => this.track(r),
      material: (id, c, r, m) => this.material(id, c, r, m),
      label: (p, t, x, y, z, w) => this.label(p, t, x, y, z, w),
    }).room(this.scene, this.environmentParts);
    const taskLight = new THREE.PointLight('#ffe6bf', 22, 14, 2);
    taskLight.position.set(0, 4.35, -2.3);
    this.scene.add(taskLight);
    this.light = taskLight;
    this.selectionBox = new THREE.BoxHelper(this.root, '#d7ac6f');
    this.scene.add(this.selectionBox);
    this.track(this.selectionBox.geometry);
    this.track(this.selectionBox.material as THREE.Material);
    this.scene.add(this.root);
    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enableDamping = true;
    this.controls.enablePan = false;
    this.controls.minDistance = 1.6;
    this.controls.maxDistance = 32;
    this.controls.minPolarAngle = 0.2;
    this.controls.maxPolarAngle = Math.PI * 0.48;
    this.controls.addEventListener('start', this.cancelCamera);
    this.canvas.addEventListener('pointerdown', this.onDown, true);
    this.canvas.addEventListener('pointermove', this.onMove);
    this.canvas.addEventListener('pointerup', this.onPick);
    this.releaseCancellation = bindCancellation(this.canvas, window, this.onCancel);
    this.updateInputPolicy();
    this.canvas.addEventListener('webglcontextlost', this.onContextLost);
    document.addEventListener('visibilitychange', this.visibility);
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(this.canvas);
    this.updateQuality();
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    this.gpuProfiler = new GpuProfile(gl);
    const gpu = gl.getExtension('WEBGL_debug_renderer_info');
    if (gpu) this.canvas.dataset['gpu'] = String(gl.getParameter(gpu.UNMASKED_RENDERER_WEBGL));
    this.buildSubject();
    this.updateScope();
    this.batchStatic(this.scene);
    this.resize();
    this.animate();
  }
  private track<T extends THREE.Material | THREE.BufferGeometry | THREE.Texture>(resource: T): T {
    this.resources.add(resource);
    return resource;
  }
  private material(
    id: string,
    color: string,
    roughness: number,
    metalness: number,
  ): THREE.MeshStandardMaterial {
    if (this.materials.has(id)) return this.materials.get(id)!;
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const c = canvas.getContext('2d')!;
    c.fillStyle = color;
    c.fillRect(0, 0, size, size);
    const roughCanvas = document.createElement('canvas');
    roughCanvas.width = roughCanvas.height = size;
    const r = roughCanvas.getContext('2d')!;
    r.fillStyle = '#b5b5b5';
    r.fillRect(0, 0, size, size);
    let seed = [...id].reduce((a, b) => a * 31 + b.charCodeAt(0), 17) >>> 0;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    for (let i = 0; i < 110; i++) {
      const x = random() * size,
        y = random() * size,
        length = random() * 20;
      // One scratch field affects albedo, roughness and shallow relief together.
      for (const [ctx, stroke] of [
        [c, 'rgba(222,207,171,.065)'],
        [r, '#e2e2e2'],
      ] as const) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 0.5 + random();
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + length, y + length * 0.13);
        ctx.stroke();
      }
    }
    for (const ctx of [c, r]) {
      ctx.strokeStyle = ctx === c ? 'rgba(200,190,149,.10)' : '#ededed';
      ctx.lineWidth = 2;
      ctx.strokeRect(1, 1, size - 2, size - 2);
    }
    const texture = this.track(new THREE.CanvasTexture(canvas));
    texture.colorSpace = THREE.SRGBColorSpace;
    const wear = this.track(new THREE.CanvasTexture(roughCanvas));
    const mat = this.track(
      new THREE.MeshStandardMaterial({
        map: texture,
        roughnessMap: wear,
        bumpMap: wear,
        bumpScale: 0.006,
        roughness,
        metalness,
      }),
    );
    mat.name = id;
    this.materials.set(id, mat);
    return mat;
  }
  private label(
    parent: THREE.Object3D,
    text: string,
    x: number,
    y: number,
    z: number,
    width = 1.3,
  ): void {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 96;
    const c = canvas.getContext('2d')!;
    c.fillStyle = '#ede5ca';
    c.font = '26px monospace';
    c.textAlign = 'center';
    c.fillText(text, 256, 58);
    const texture = this.track(new THREE.CanvasTexture(canvas));
    texture.colorSpace = THREE.SRGBColorSpace;
    const material = this.track(
      new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
        side: THREE.FrontSide,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      }),
    );
    const label = new THREE.Mesh(
      this.track(new THREE.PlaneGeometry(width, width * 0.1875)),
      material,
    );
    label.userData['labelCanvas'] = canvas;
    label.userData['labelText'] = text;
    label.rotation.x = -Math.PI / 2;
    label.position.set(x, y, z);
    parent.add(label);
  }
  private clearSubject(): void {
    this.cameraMotion?.kill();
    this.explodedMotion?.kill();
    this.pulseMotion?.kill();
    this.physics?.clearMechanisms();
    releaseInstanceBuffers(this.root);
    // Dynamic geometry is disposed here; pooled materials/textures remain owned by the renderer.
    this.root.traverse((o) => {
      gsap.killTweensOf(o.position);
      gsap.killTweensOf(o.scale);
      if (o instanceof THREE.Mesh) {
        this.resources.delete(o.geometry);
        o.geometry.dispose();
        const material = o.material;
        if (
          !Array.isArray(material) &&
          ![...this.materials.values()].includes(material as THREE.MeshStandardMaterial)
        ) {
          if ('map' in material && material.map instanceof THREE.Texture) {
            this.resources.delete(material.map);
            material.map.dispose();
          }
          this.resources.delete(material);
          material.dispose();
        }
      }
    });
    this.focusedObject = undefined;
    this.profiler.reset();
    this.gpuProfiler?.reset();
    this.contactBatches = [];
    this.root.clear();
    this.historySlots = [];
    this.parts.clear();
    this.packet = undefined;
  }
  private buildSubject(): void {
    const changed = this.root.userData['section'] !== this.section;
    this.clearSubject();
    this.statsFrame = 59;
    this.canvas.dataset['station'] = this.section;
    this.root.userData['section'] = this.section;
    if (this.controls) this.controls.enabled = true;
    const subject = new StationBuilder({
      track: (r) => this.track(r),
      material: (id, c, r, m) => this.material(id, c, r, m),
      label: (p, t, x, y, z, w) => this.label(p, t, x, y, z, w),
    }).build(this.section, this.memoryModel, this.root, this.parts);
    this.packet = subject.packet;
    this.historySlots = subject.historySlots;
    this.scene.traverse((o) => {
      if (o.userData['detail']) o.visible = this.quality === 'high';
    });
    classifySubject(this.root, this.parts);
    this.registerParts();
    this.bindMechanisms();
    this.contactBatches = instanceContacts(this.root, this.registry, (g) => this.track(g));
    this.batchStatic(this.root);
    this.statsFrame = 59;
    this.updateParts();
    this.updateValues();
    this.updateSelection();
    const coverage = this.registry.auditCoverage(this.root);
    this.canvas.dataset['unclassifiedPieces'] = String(coverage.missing.length);
    this.canvas.dataset['classifiedPieces'] = String(coverage.classified);
    this.callbacks.pieces(this.registry.listSelectable());
    if (changed) this.resetView();
  }
  private updateParts(): void {
    this.explodedMotion?.kill();
    this.explodedMotion = gsap.timeline({
      defaults: { duration: this.reduced ? 0 : 0.8, ease: 'power3.inOut', overwrite: 'auto' },
    });
    for (const [id, object] of this.parts) {
      const rest = object.userData['restY'] as number | undefined;
      if (rest !== undefined && !id.startsWith('tool'))
        this.explodedMotion.to(
          object.position,
          {
            y:
              rest +
              (id === 'lid' && this.exploded && this.section !== 'atrium'
                ? 2.1
                : id !== 'lid' && this.exploded && ['8086', 'apple'].includes(this.section)
                  ? 0.6
                  : 0),
          },
          0,
        );
      object.visible =
        !(
          [...CPU_PARTS, ...APPLE_PARTS].some((p) => p.id === id) &&
          ['8086', 'apple'].includes(this.section)
        ) || this.exploded;
      if (id === 'lid')
        this.explodedMotion.to(
          object.position,
          {
            x: this.exploded && this.section !== 'atrium' ? 1.2 : 0,
            z:
              this.exploded && this.section !== 'atrium'
                ? -2.5
                : this.section === 'apple'
                  ? 0.2
                  : 0,
          },
          0,
        );
    }
  }
  transfer(): void {
    if (!this.packet) return;
    this.pulseMotion?.kill();
    this.packet.visible = true;
    this.packet.position.set(-2.2, 1.1, 0);
    this.pulseMotion = gsap.timeline({
      onComplete: () => {
        if (this.packet) this.packet.visible = false;
      },
    });
    this.pulseMotion
      .to(this.packet.position, {
        x: 0,
        z: -0.55,
        duration: this.reduced ? 0 : 0.45,
        ease: 'power1.inOut',
      })
      .to(this.packet.position, {
        x: 1.7,
        z: 0.5,
        duration: this.reduced ? 0 : 0.45,
        ease: 'power1.inOut',
      });
  }
  private freeRegion(): ViewportRegion {
    const canvas = this.canvas,
      r = canvas.getBoundingClientRect(),
      host = canvas.closest('.stage');
    const title = host?.querySelector('.title-block')?.getBoundingClientRect(),
      tools = host?.querySelector('.camera-tools')?.getBoundingClientRect();
    const top = Math.min(r.height * 0.32, Math.max(12, (title?.bottom ?? r.top) - r.top + 12)),
      bottom = Math.max(top + 64, (tools?.top ?? r.bottom) - r.top - 14);
    return { x: 16, y: top, width: Math.max(64, r.width - 32), height: Math.max(64, bottom - top) };
  }
  private fitObject(o: THREE.Object3D): void {
    if (!this.controls || !this.camera) return;
    this.cancelCamera();
    const b = new THREE.Box3().setFromObject(o);
    if (b.isEmpty()) return;
    const canvas = this.canvas;
    frameBounds(
      this.camera,
      b,
      this.freeRegion(),
      { width: canvas.clientWidth, height: canvas.clientHeight },
      this.camera.position.clone().sub(this.controls.target),
    );
    this.controls.target.copy(b.getCenter(new THREE.Vector3()));
    this.controls.minDistance = Math.max(0.3, b.getBoundingSphere(new THREE.Sphere()).radius * 0.7);
  }
  focusSelected(): void {
    const o = this.parts.get(this.activePart) || this.environmentParts.get(this.activePart);
    if (!o || !o.visible) return;
    this.focusedObject = o;
    this.fitObject(o);
  }
  resetTools(): void {
    this.physics?.reset();
  }
  private async ensurePhysics(): Promise<void> {
    if (!this.physics) {
      this.physics = new WorkbenchPhysics();
      this.physicsReady = this.physics.initialize(this.environmentParts);
    }
    await this.physicsReady;
    if (this.disposed) this.physics?.dispose();
    else this.bindMechanisms();
  }
  private bindMechanisms(): void {
    for (const id of ['lid', 'latch-left', 'latch-right']) {
      const owner = this.parts.get(id);
      if (!owner) continue;
      owner.updateWorldMatrix(true, true);
      const inverse = owner.matrixWorld.clone().invert(),
        bounds = new THREE.Box3();
      owner.traverse((mesh) => {
        if (!(mesh instanceof THREE.Mesh) || !(mesh.material instanceof THREE.MeshStandardMaterial))
          return;
        mesh.geometry.computeBoundingBox();
        if (mesh.geometry.boundingBox)
          bounds.union(
            mesh.geometry.boundingBox
              .clone()
              .applyMatrix4(inverse.clone().multiply(mesh.matrixWorld)),
          );
      });
      if (!bounds.isEmpty())
        this.physics?.registerMechanism(
          id,
          owner,
          bounds.getSize(new THREE.Vector3()).multiplyScalar(0.5),
          bounds.getCenter(new THREE.Vector3()),
        );
    }
  }
  toggleLatch(id: string): void {
    const object = this.parts.get(id);
    if (!object || !id.startsWith('latch-')) return;
    object.userData['open'] = !object.userData['open'];
    gsap.to(object.rotation, {
      z: object.userData['open'] ? ((id === 'latch-left' ? 1 : -1) * Math.PI) / 5 : 0,
      duration: this.reduced ? 0 : 0.45,
      ease: 'power2.out',
      overwrite: true,
    });
    void this.ensurePhysics();
  }
  async dropTool(): Promise<void> {
    await this.ensurePhysics();
    if (!this.disposed) this.physics?.drop();
  }
  resetView(): void {
    if (!this.camera || !this.controls) return;
    this.cameraMotion?.kill();
    this.focusedObject = undefined;
    this.camera.clearViewOffset();
    this.controls.minDistance = 1.6;
    this.controls.enabled = false;
    const mobile = matchMedia('(max-width:899px)').matches;
    const aspect = this.canvas.clientWidth / Math.max(1, this.canvas.clientHeight);
    const framing = Math.max(1, 0.95 / aspect);
    this.cameraMotion = gsap.timeline({
      defaults: { duration: this.reduced ? 0 : 1.25, ease: 'power3.inOut', overwrite: 'auto' },
      onComplete: () => {
        if (this.controls) this.controls.enabled = true;
      },
    });
    this.cameraMotion
      .to(
        this.camera.position,
        { x: 5.8 * framing, y: 9.2 * framing, z: (mobile ? 13 : 10.8) * framing },
        0,
      )
      .to(this.controls.target, { x: mobile ? 0 : -0.45, y: mobile ? 2.2 : 0.7, z: 0 }, 0);
  }
  rotate(direction: number): void {
    if (!this.camera || !this.controls) return;
    this.cameraMotion?.kill();
    this.controls.enabled = true;
    const relative = this.camera.position.clone().sub(this.controls.target);
    relative.applyAxisAngle(new THREE.Vector3(0, 1, 0), (direction * Math.PI) / 8);
    this.camera.position.copy(relative.add(this.controls.target));
  }
  zoom(direction: number): void {
    if (!this.camera || !this.controls) return;
    this.cameraMotion?.kill();
    this.controls.enabled = true;
    const relative = this.camera.position.clone().sub(this.controls.target);
    relative.setLength(THREE.MathUtils.clamp(relative.length() * direction, 5, 32));
    this.camera.position.copy(relative.add(this.controls.target));
  }
  private cancelCamera = () => {
    this.cameraMotion?.kill();
    if (this.controls) this.controls.enabled = true;
  };
  private onCancel = () => {
    this.pointerStart.set(Infinity, Infinity);
    this.cancelCamera();
    if (this.dragPointer !== undefined && this.canvas.hasPointerCapture(this.dragPointer))
      this.canvas.releasePointerCapture(this.dragPointer);
    this.dragPointer = undefined;
    this.physics?.suspend();
  };
  private updateSelection(): void {
    const o = this.parts.get(this.activePart) || this.environmentParts.get(this.activePart);
    if (this.selectionBox) {
      this.selectionBox.visible = !!o;
      if (o) this.selectionBox.setFromObject(o);
    }
  }
  private rewriteLabel(object: THREE.Object3D, text: string): void {
    object.traverse((o) => {
      const canvas = o.userData['labelCanvas'] as HTMLCanvasElement | undefined;
      if (!canvas || o.userData['labelText'] === text) return;
      o.userData['labelText'] = text;
      const c = canvas.getContext('2d')!;
      c.clearRect(0, 0, 512, 96);
      c.fillStyle = '#ede5ca';
      c.font = '26px monospace';
      c.textAlign = 'center';
      c.fillText(text, 256, 58);
      const m = (o as THREE.Mesh).material as THREE.MeshBasicMaterial;
      if (m.map) m.map.needsUpdate = true;
    });
  }
  private registerParts(): void {
    this.registry.clear();
    for (const [id, o] of [...this.environmentParts, ...this.parts])
      this.registry.register(pieceDefinition(id, this.section), [o]);
    this.root.traverse((o) => {
      const id = o.userData['part'];
      if (id && this.parts.has(id)) this.registry.register(pieceDefinition(id, this.section), [o]);
    });
    this.callbacks.pieces(this.registry.listSelectable());
  }
  private updateInputPolicy(): void {
    if (this.controls)
      applyInputPolicy(
        this.controls,
        this.canvas,
        matchMedia('(max-width:899px)').matches,
        this.manipulate,
      );
  }
  private updateValues(): void {
    if (this.section === 'memory')
      for (let n = 0; n < 32; n++) {
        const o = this.parts.get('cell-' + n);
        if (o)
          this.rewriteLabel(
            o,
            (this.memoryCells[n]?.value ?? 0).toString(16).toUpperCase().padStart(2, '0'),
          );
      }
    if (this.section === 'time') {
      for (const key of [...this.parts.keys()])
        if (key === 'initial' || key.startsWith('frame-')) this.parts.delete(key);
      for (const o of this.historySlots) o.visible = false;
      for (const p of historyPieces(this.history.length)) {
        const o = this.historySlots[p.slot];
        if (!o) continue;
        o.visible = true;
        o.userData['part'] = p.id;
        this.parts.set(p.id, o);
        this.rewriteLabel(
          o,
          this.history[p.index]?.ax.toString(16).toUpperCase().padStart(4, '0') ?? 'INICIO',
        );
      }
      this.registerParts();
    }
  }
  private updateScope(): void {
    const scope = this.environmentParts.get('scope');
    const line = scope?.getObjectByName('scope-signal') as THREE.Line | undefined;
    if (!line) return;
    const attr = line.geometry.getAttribute('position');
    for (let n = 0; n < attr.count; n++) {
      const active =
        this.signalChannel === 'ALE'
          ? n > 10 && n < 35
          : this.signalChannel === 'RD'
            ? this.readAccess && n > 45 && n < 80
            : this.writeAccess && n > 45 && n < 80;
      attr.setY(n, this.signalChannel === 'ALE' ? (active ? 1.45 : 0.77) : active ? 0.77 : 1.45);
    }
    attr.needsUpdate = true;
    line.geometry.computeBoundingSphere();
  }
  /** Merge only siblings with the same material and semantic owner; moving assemblies remain separate. */
  private batchStatic(parent: THREE.Object3D): void {
    const walk = (group: THREE.Object3D) => {
      for (const child of [...group.children]) if (!(child instanceof THREE.Mesh)) walk(child);
      const sets = new Map<string, THREE.Mesh[]>();
      for (const o of group.children) {
        if (
          !(o instanceof THREE.Mesh) ||
          o instanceof THREE.InstancedMesh ||
          Array.isArray(o.material) ||
          !(o.material instanceof THREE.MeshStandardMaterial) ||
          o.userData['part'] ||
          !o.visible ||
          o.userData['instanceEligible'] ||
          o.userData['detail'] ||
          o === this.packet
        )
          continue;
        const key = o.material.uuid;
        const list = sets.get(key) ?? [];
        list.push(o);
        sets.set(key, list);
      }
      for (const meshes of sets.values()) {
        if (meshes.length < 2) continue;
        const copies = meshes.map((o) => {
          o.updateMatrix();
          return (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()).applyMatrix4(
            o.matrix,
          );
        });
        const merged = mergeGeometries(copies, false);
        copies.forEach((g) => g.dispose());
        if (!merged) continue;
        const m = new THREE.Mesh(this.track(merged), meshes[0].material);
        m.castShadow = m.receiveShadow = true;
        group.add(m);
        for (const o of meshes) {
          group.remove(o);
          this.resources.delete(o.geometry);
          o.geometry.dispose();
        }
      }
    };
    walk(parent);
  }

  private rayAt(event: PointerEvent): THREE.Raycaster {
    const rect = this.canvas.getBoundingClientRect(),
      ray = new THREE.Raycaster();
    ray.setFromCamera(
      new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        (-(event.clientY - rect.top) / rect.height) * 2 + 1,
      ),
      this.camera,
    );
    return ray;
  }
  private onDown = (event: PointerEvent) => {
    this.pointerStart.set(event.clientX, event.clientY);
    if (!this.manipulate) return;
    const hit = this.rayAt(event).intersectObjects([...this.environmentParts.values()], true)[0],
      id = hit && this.registry.resolveHit(hit);
    if (!id?.startsWith('tool')) return;
    event.stopImmediatePropagation();
    event.preventDefault();
    this.dragPointer = event.pointerId;
    this.canvas.setPointerCapture(event.pointerId);
    if (this.controls) this.controls.enabled = false;
    void this.ensurePhysics()
      .then(() => {
        if (this.disposed || this.dragPointer !== event.pointerId) return;
        this.physics?.beginDrag(id);
        this.onMove(event);
      })
      .catch(() => this.onCancel());
  };
  private onMove = (event: PointerEvent) => {
    if (this.dragPointer !== event.pointerId) return;
    const target = new THREE.Vector3();
    if (this.rayAt(event).ray.intersectPlane(this.dragPlane, target))
      this.physics?.moveDrag(target);
  };
  private onPick = (event: PointerEvent) => {
    if (this.dragPointer === event.pointerId) {
      this.dragPointer = undefined;
      this.physics?.endDrag();
      this.canvas.releasePointerCapture(event.pointerId);
      if (this.controls) this.controls.enabled = true;
      return;
    }
    if (
      !this.camera ||
      Math.hypot(event.clientX - this.pointerStart.x, event.clientY - this.pointerStart.y) > 6
    )
      return;
    const rect = this.canvas.getBoundingClientRect();
    const pointer = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      (-(event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    const ray = new THREE.Raycaster();
    ray.setFromCamera(pointer, this.camera);
    const result = firstInspectableHit(
      ray,
      [...this.parts.values(), ...this.environmentParts.values()],
      this.contactBatches,
      this.registry,
    );
    if (result) this.callbacks.picked(result.id);
  };
  private onContextLost = (e: Event) => {
    e.preventDefault();
    this.callbacks.unavailable();
    cancelAnimationFrame(this.frame);
  };
  private visibility = () => {
    if (document.hidden) {
      cancelAnimationFrame(this.frame);
      this.physics?.suspend();
      this.onCancel();
    } else {
      this.clock.getDelta();
      this.animate();
    }
  };
  private updateQuality(): void {
    if (!this.renderer || this.profileTier === this.quality) return;
    this.profileTier = this.quality;
    const p = qualitySettings(this.quality);
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, p.dpr));
    this.renderer.shadowMap.enabled = p.shadowSize > 0;
    if (this.keyLight) {
      this.keyLight.shadow.mapSize.set(p.shadowSize || 512, p.shadowSize || 512);
      this.keyLight.shadow.map?.dispose();
      this.keyLight.shadow.map = null;
    }
    this.effects?.dispose();
    this.effects = undefined;
    if (this.quality === 'high' && this.renderer.extensions.has('EXT_color_buffer_float')) {
      this.effects = new EffectsPipeline(this.renderer, this.scene, this.camera);
      const s = this.renderer.getSize(new THREE.Vector2());
      this.effects.resize(Math.max(1, s.x), Math.max(1, s.y));
    }
    this.profiler.reset();
    this.gpuProfiler?.reset();
  }
  private resize(): void {
    if (!this.renderer) return;
    const { clientWidth: w, clientHeight: h } = this.canvas;
    if (!w || !h) return;
    this.updateInputPolicy();
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
    this.effects?.resize(w, h);
    if (this.focusedObject) this.fitObject(this.focusedObject);
  }
  private animate = () => {
    if (this.disposed || !this.renderer || document.hidden) return;
    const dt = this.clock.getDelta();
    this.profiler.sample(dt);
    this.physics?.step(dt);
    this.controls?.update(dt);
    if (this.selectionBox?.visible) this.updateSelection();
    this.renderer.info.reset();
    if (this.statsFrame % 30 === 0) this.gpuProfiler?.begin();
    if (this.effects && this.viewMode === 'material') this.effects.render();
    else this.renderer.render(this.scene, this.camera);
    this.gpuProfiler?.end();
    if (++this.statsFrame % 60 === 0) {
      this.gpuProfiler?.poll();
      const gpu = this.gpuProfiler?.profile.result,
        profile = this.profiler.result;
      Object.assign(this.canvas.dataset, {
        gpuP50: gpu?.samples ? gpu.p50.toFixed(2) : 'unavailable',
        gpuP95: gpu?.samples ? gpu.p95.toFixed(2) : 'unavailable',
        gpuSamples: String(gpu?.samples ?? 0),
        metricsStation: this.section,
        gpuBuffers: String(this.gpuResources?.bufferCount ?? 0),
        quality: this.quality,
        frameSamples: String(profile.samples),
        frameP50: profile.p50.toFixed(2),
        frameP95: profile.p95.toFixed(2),
        awakeBodies: String(this.physics?.awakeCount ?? 0),
      });
      this.canvas.dataset['drawCalls'] = String(this.renderer.info.render.calls);
      this.canvas.dataset['triangles'] = String(this.renderer.info.render.triangles);
      this.canvas.dataset['geometries'] = String(this.renderer.info.memory.geometries);
      this.canvas.dataset['textures'] = String(this.renderer.info.memory.textures);
    }
    this.frame = requestAnimationFrame(this.animate);
  };
  dispose(): void {
    this.disposed = true;
    this.releaseCancellation?.();
    this.physics?.dispose();
    this.effects?.dispose();
    this.gpuProfiler?.dispose();
    cancelAnimationFrame(this.frame);
    this.observer?.disconnect();
    this.cameraMotion?.kill();
    this.explodedMotion?.kill();
    this.pulseMotion?.kill();
    this.controls?.removeEventListener('start', this.cancelCamera);
    this.controls?.dispose();
    document.removeEventListener('visibilitychange', this.visibility);
    const canvas = this.canvas;
    canvas.removeEventListener('pointerdown', this.onDown, true);
    canvas.removeEventListener('pointermove', this.onMove);
    canvas.removeEventListener('pointerup', this.onPick);
    canvas.removeEventListener('webglcontextlost', this.onContextLost);
    this.root.traverse((o) => {
      gsap.killTweensOf(o.position);
      gsap.killTweensOf(o.scale);
    });
    for (const r of this.resources) r.dispose();
    this.environment?.dispose();
    this.pmrem?.dispose();
    this.renderer?.dispose();
    this.gpuResources?.dispose();
  }
}
