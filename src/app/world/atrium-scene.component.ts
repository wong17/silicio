import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  SimpleChanges,
  NgZone,
  OnChanges,
  OnDestroy,
  Output,
  ViewChild,
  signal,
} from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { gsap } from 'gsap';
import { bindCancellation, applyInputPolicy } from './scene-input';
import { historyPieces } from './history-pieces';
import { MemoryModels } from './models/memory-models';
import { InteractionRegistry, PieceDefinition } from './interaction-registry';
import { WorkbenchPhysics } from './physics/workbench-physics';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { ElectronicsWorkshop } from './electronics-workshop';

export type Section = 'atrium' | '8086' | 'memory' | 'time' | 'apple' | 'machine';
interface Part {
  id: string;
  label: string;
  color: string;
  x: number;
  z: number;
  w: number;
  d: number;
}
const CPU_PARTS: Part[] = [
  { id: 'alu', label: 'ALU · 16 BIT', color: '#b27e47', x: -0.95, z: 0.55, w: 1.5, d: 0.8 },
  { id: 'registers', label: 'AX BX CX DX', color: '#477c70', x: -0.95, z: -0.5, w: 1.5, d: 0.85 },
  { id: 'control', label: 'CONTROL · EU', color: '#6b7790', x: 0.9, z: 0.6, w: 1.6, d: 0.7 },
  { id: 'biu', label: 'BIU · BUS', color: '#9d684c', x: 0.9, z: -0.6, w: 1.6, d: 0.7 },
  { id: 'queue', label: 'COLA · 6 BYTES', color: '#70638c', x: 0, z: -1.55, w: 3.4, d: 0.45 },
];
const APPLE_PARTS: Part[] = [
  {
    id: 'performance',
    label: 'CPU · RENDIMIENTO',
    color: '#ae8356',
    x: -1.15,
    z: -0.8,
    w: 1.55,
    d: 1.15,
  },
  {
    id: 'efficiency',
    label: 'CPU · EFICIENCIA',
    color: '#688d73',
    x: -1.15,
    z: 0.65,
    w: 1.55,
    d: 0.95,
  },
  { id: 'gpu', label: 'GPU', color: '#68869d', x: 0.85, z: -0.6, w: 1.95, d: 1.6 },
  { id: 'neural', label: 'NEURAL ENGINE', color: '#9477a1', x: 0.8, z: 0.95, w: 1.9, d: 0.75 },
  { id: 'unified', label: 'MEMORIA UNIFICADA', color: '#a9aa79', x: 0, z: 2.05, w: 4, d: 0.65 },
];
@Component({
  selector: 'app-atrium-scene',
  template:
    '<canvas #canvas aria-label="Laboratorio 3D. Usa los controles de giro, zoom y selección disponibles en la interfaz."></canvas>@if(!supported()){<p class="fallback">Vista 3D no disponible. Los controles y simulaciones continúan funcionando.<button type="button" (click)="reloadScene()">Recargar escena</button></p>}',
  styles: [
    ':host,canvas{display:block;position:absolute;inset:0;width:100%;height:100%}canvas{touch-action:none}.fallback{position:absolute;top:45%;left:30%;max-width:20rem;padding:1rem;background:#252822;color:#f4e9d1}',
  ],
})
export class AtriumSceneComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('canvas', { static: true }) private canvasRef!: ElementRef<HTMLCanvasElement>;
  @Input() section: Section = 'atrium';
  @Input() exploded = false;
  @Input() activePart = '';
  @Input() tick = 0;
  @Input() memoryCells: { address: number; value: number }[] = [];
  @Input() history: { address: number; text: string; ax: number }[] = [];
  @Input() memoryBase = 0;
  @Input() viewMode: 'material' | 'wireframe' = 'material';
  @Input() manipulate = false;
  @Input() inspection = false;
  @Input() memoryModel: 'classic' | 'dimm' = 'classic';
  @Input() reduced = false;
  @Input() quality: 'high' | 'low' = 'high';
  @Input() signalChannel = 'ALE';
  @Input() readAccess = false;
  @Input() writeAccess = false;
  @Output() pieces = new EventEmitter<PieceDefinition[]>();
  private registry = new InteractionRegistry();
  private environmentParts = new Map<string, THREE.Object3D>();
  private physics?: WorkbenchPhysics;
  private light?: THREE.PointLight;
  private selectionBox?: THREE.BoxHelper;
  @Output() picked = new EventEmitter<string>();
  readonly supported = signal(true);
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer?: THREE.WebGLRenderer;
  private controls?: OrbitControls;
  private observer?: ResizeObserver;
  private pmrem?: THREE.PMREMGenerator;
  private environment?: THREE.WebGLRenderTarget;
  private frame = 0;
  private statsFrame = 0;
  private root = new THREE.Group();
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
  constructor(private zone: NgZone) {}
  ngAfterViewInit(): void {
    try {
      this.zone.runOutsideAngular(() => this.initialize());
    } catch {
      this.supported.set(false);
    }
  }
  ngOnChanges(changes: SimpleChanges): void {
    if (!this.renderer) return;
    if (this.root.userData['section'] !== this.section || changes['memoryModel'])
      this.buildSubject();
    if (changes['manipulate'] && !this.manipulate) this.onCancel();
    this.updateValues();
    this.updateScope();
    this.updateInputPolicy();
    if (this.light) this.light.intensity = this.inspection ? 46 : 22;
    this.scene.traverse((o) => {
      if (o.userData['detail']) o.visible = this.quality === 'high';
      if (o instanceof THREE.Mesh && o.material instanceof THREE.MeshStandardMaterial)
        o.material.wireframe = this.viewMode === 'wireframe';
    });
    if (changes['exploded']) this.updateParts();
    this.updateSelection();
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, this.quality === 'high' ? 1.5 : 1));
    this.renderer.shadowMap.enabled = this.quality === 'high';
    if (this.tick !== this.lastTick) {
      this.lastTick = this.tick;
      if (this.tick) this.transfer();
    }
  }
  private initialize(): void {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#101214');
    this.scene.fog = new THREE.Fog('#202727', 27, 55);
    this.camera = new THREE.PerspectiveCamera(38, 1, 0.25, 60);
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvasRef.nativeElement,
      antialias: true,
    });
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
    this.controls = new OrbitControls(this.camera, this.canvasRef.nativeElement);
    this.controls.enableDamping = true;
    this.controls.enablePan = false;
    this.controls.minDistance = 1.6;
    this.controls.maxDistance = 32;
    this.controls.minPolarAngle = 0.2;
    this.controls.maxPolarAngle = Math.PI * 0.48;
    this.controls.addEventListener('start', this.cancelCamera);
    this.canvasRef.nativeElement.addEventListener('pointerdown', this.onDown, true);
    this.canvasRef.nativeElement.addEventListener('pointermove', this.onMove);
    this.canvasRef.nativeElement.addEventListener('pointerup', this.onPick);
    this.releaseCancellation = bindCancellation(
      this.canvasRef.nativeElement,
      window,
      this.onCancel,
    );
    this.updateInputPolicy();
    this.canvasRef.nativeElement.addEventListener('webglcontextlost', this.onContextLost);
    document.addEventListener('visibilitychange', this.visibility);
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(this.canvasRef.nativeElement);
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
    this.materials.set(id, mat);
    return mat;
  }
  private box(
    parent: THREE.Object3D,
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    material: THREE.Material,
  ): THREE.Mesh {
    const mesh = new THREE.Mesh(
      this.track(new RoundedBoxGeometry(w, h, d, 2, Math.min(w, h, d) * 0.16)),
      material,
    );
    mesh.position.set(x, y, z);
    mesh.castShadow = mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
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
  private tiles(parts: Part[]): void {
    for (const p of parts) {
      const group = new THREE.Group();
      group.position.set(p.x, 0.96, p.z);
      group.userData['part'] = p.id;
      group.userData['restY'] = 0.96;
      this.box(group, p.w, 0.25, p.d, 0, 0, 0, this.material(p.id, p.color, 0.52, 0.36));
      // Fine etched paths establish die scale without faking transistor-level accuracy.
      for (let n = 0; n < 5; n++)
        this.box(
          group,
          p.w * 0.82,
          0.01,
          0.017,
          0,
          0.135,
          -p.d * 0.34 + n * p.d * 0.14,
          this.material('etch', '#d8ba7b', 0.45, 0.8),
        );
      this.label(group, p.label, 0, 0.158, 0, p.w * 0.85);
      const traces = new THREE.Group();
      const geom = this.track(new THREE.BoxGeometry(0.025, 0.008, 0.035));
      const cells = new THREE.InstancedMesh(
        geom,
        this.material('die-cells', '#8b907e', 0.72, 0.38),
        48,
      );
      const matrix = new THREE.Matrix4();
      for (let n = 0; n < 48; n++) {
        matrix.makeTranslation(
          -p.w * 0.37 + (n % 12) * p.w * 0.065,
          0.143,
          -p.d * 0.31 + Math.floor(n / 12) * p.d * 0.18,
        );
        cells.setMatrixAt(n, matrix);
      }
      cells.userData['detail'] = true;
      group.add(cells);

      this.parts.set(p.id, group);
      this.root.add(group);
    }
  }
  private clearSubject(): void {
    this.cameraMotion?.kill();
    this.explodedMotion?.kill();
    this.pulseMotion?.kill();
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
    this.root.clear();
    this.historySlots = [];
    this.parts.clear();
    this.packet = undefined;
  }
  private buildSubject(): void {
    const changed = this.root.userData['section'] !== this.section;
    this.clearSubject();
    this.root.userData['section'] = this.section;
    if (this.controls) this.controls.enabled = true;
    const green = this.material('pcb', '#314d40', 0.7, 0.19);
    const ceramic = this.material('ceramic', '#b9ad83', 0.58, 0.03);
    const dark = this.material('package', '#202426', 0.6, 0.25);
    if (this.section === '8086' || this.section === 'atrium') {
      new ElectronicsWorkshop({
        track: (r) => this.track(r),
        material: (id, c, r, m) => this.material(id, c, r, m),
        label: (p, t, x, y, z, w) => this.label(p, t, x, y, z, w),
      }).cpu(this.root, this.parts);
      if (this.section === '8086')
        this.tiles([
          { id: 'alu', label: 'ALU / 16 BIT', color: '#a97d45', x: -1.95, z: 0.1, w: 1.15, d: 0.8 },
          {
            id: 'registers',
            label: 'AX BX CX DX',
            color: '#496a5a',
            x: -0.48,
            z: 0.1,
            w: 1.5,
            d: 0.8,
          },
          { id: 'control', label: 'CONTROL', color: '#6d7982', x: 1, z: 0.1, w: 1.2, d: 0.8 },
          { id: 'biu', label: 'BIU', color: '#9d7450', x: 2.15, z: 0, w: 0.7, d: 1.05 },
          {
            id: 'queue',
            label: 'COLA / 6 BYTES',
            color: '#6e687e',
            x: -0.55,
            z: -0.62,
            w: 3.85,
            d: 0.26,
          },
        ]);
    } else if (this.section === 'apple') {
      new ElectronicsWorkshop({
        track: (r) => this.track(r),
        material: (id, c, r, m) => this.material(id, c, r, m),
        label: (p, t, x, y, z, w) => this.label(p, t, x, y, z, w),
      }).soc(this.root);
      this.tiles(APPLE_PARTS);
      const lid = this.box(this.root, 4.65, 0.15, 4.9, 0, 1.23, 0.2, dark);
      lid.userData['part'] = 'lid';
      lid.userData['restY'] = 1.23;
      this.parts.set('lid', lid);
      this.label(lid, 'APPLE SILICON / SoC', 0, 0.08, 0, 3.5);
    } else if (this.section === 'memory') {
      const models = new MemoryModels({
        track: (r) => this.track(r),
        material: (id, c, r, m) => this.material(id, c, r, m),
        label: (p, t, x, y, z, w) => this.label(p, t, x, y, z, w),
      });
      if (this.memoryModel === 'classic') models.classic(this.root, this.parts);
      else models.dimm(this.root, this.parts);
      const logical = new THREE.Group();
      logical.userData['part'] = 'memory-board';
      this.root.add(logical);
      this.label(logical, 'VENTANA LÓGICA / 32 BYTES', 0, 0.15, 3.65, 5.8);
      for (let n = 0; n < 32; n++) {
        const cell = this.box(
          logical,
          0.42,
          0.06,
          0.43,
          ((n % 16) - 7.5) * 0.46,
          0.14,
          4.15 + Math.floor(n / 16) * 0.48,
          this.material('logical-cell', '#35483c', 0.9, 0.02),
        );
        cell.userData['part'] = 'cell-' + n;
        this.parts.set('cell-' + n, cell);
        this.label(cell, '00', 0, 0.035, 0, 0.35);
      }
    } else if (this.section === 'time') {
      for (let i = 0; i < 16; i++) {
        const angle = i * 0.48;
        const tile = this.box(
          this.root,
          0.7,
          0.18,
          0.85,
          Math.cos(angle) * 2.35,
          0.4 + i * 0.15,
          Math.sin(angle) * 1.65,
          this.material('time', '#6a6885', 0.43, 0.5),
        );
        this.historySlots.push(tile);
        this.label(tile, 'INICIO', 0, 0.1, 0, 0.65);
      }
    } else {
      this.tiles([
        { id: 'cpu', label: 'PROCESADOR', color: '#b27e47', x: -1.7, z: 0, w: 1.8, d: 1.5 },
        { id: 'ram', label: 'MEMORIA RAM', color: '#477c70', x: 1.3, z: -1.1, w: 2, d: 1 },
        { id: 'io', label: 'ENTRADA / SALIDA', color: '#68869d', x: 1.3, z: 1.25, w: 2, d: 1 },
      ]);
      for (const z of [-0.35, 0, 0.35])
        this.box(
          this.root,
          3,
          0.06,
          0.08,
          0,
          0.35,
          z,
          this.material('copper', '#9d764d', 0.35, 0.83),
        );
      this.label(this.root, 'DIRECCIONES   /   DATOS   /   CONTROL', 0, 0.22, 2.5, 4.5);
    }
    this.packet = new THREE.Mesh(
      this.track(new THREE.SphereGeometry(0.095, 16, 8)),
      this.track(new THREE.MeshBasicMaterial({ color: '#ffe9a7' })),
    );
    this.packet.visible = false;
    this.root.add(this.packet);
    this.scene.traverse((o) => {
      if (o.userData['detail']) o.visible = this.quality === 'high';
    });
    this.registry.clear();
    for (const [id, o] of [...this.environmentParts, ...this.parts])
      this.registry.register(
        {
          id,
          name: id.replaceAll('-', ' '),
          role:
            id.startsWith('tool') || ['scope', 'power', 'lamp', 'probe', 'cable'].includes(id)
              ? 'operable'
              : 'academic',
          actions: ['inspect'],
        },
        [o],
      );
    this.root.traverse((o) => {
      if (o instanceof THREE.Mesh && !o.userData['part'] && o.parent === this.root)
        o.userData['role'] = 'environment';
    });
    this.batchStatic(this.root);
    this.statsFrame = 59;
    this.updateParts();
    this.updateValues();
    this.updateSelection();
    this.zone.run(() => this.pieces.emit(this.registry.listSelectable()));
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
  focusSelected(): void {
    const o = this.parts.get(this.activePart) || this.environmentParts.get(this.activePart);
    if (!o || !this.controls || !this.camera) return;
    this.cancelCamera();
    const b = new THREE.Box3().setFromObject(o),
      center = b.getCenter(new THREE.Vector3()),
      size = b.getSize(new THREE.Vector3()).length();
    this.controls.target.copy(center);
    this.camera.position
      .copy(center)
      .add(
        new THREE.Vector3(1, 1.5, 2)
          .normalize()
          .multiplyScalar(Math.min(24, Math.max(1.8, size * 1.9))),
      );
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
  }
  async dropTool(): Promise<void> {
    await this.ensurePhysics();
    if (!this.disposed) this.physics?.drop();
  }
  reloadScene(): void {
    location.reload();
  }
  resetView(): void {
    if (!this.camera || !this.controls) return;
    this.cameraMotion?.kill();
    this.controls.enabled = false;
    const mobile = matchMedia('(max-width:899px)').matches;
    const aspect =
      this.canvasRef.nativeElement.clientWidth /
      Math.max(1, this.canvasRef.nativeElement.clientHeight);
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
    if (
      this.dragPointer !== undefined &&
      this.canvasRef.nativeElement.hasPointerCapture(this.dragPointer)
    )
      this.canvasRef.nativeElement.releasePointerCapture(this.dragPointer);
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
      this.registry.register(
        {
          id,
          name: id.replaceAll('-', ' '),
          role:
            id.startsWith('tool') || ['scope', 'power', 'lamp', 'probe', 'cable'].includes(id)
              ? 'operable'
              : 'academic',
          actions: ['inspect'],
        },
        [o],
      );
    this.zone.run(() => this.pieces.emit(this.registry.listSelectable()));
  }
  private updateInputPolicy(): void {
    if (this.controls)
      applyInputPolicy(
        this.controls,
        this.canvasRef.nativeElement,
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
    const rect = this.canvasRef.nativeElement.getBoundingClientRect(),
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
    this.canvasRef.nativeElement.setPointerCapture(event.pointerId);
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
      this.canvasRef.nativeElement.releasePointerCapture(event.pointerId);
      if (this.controls) this.controls.enabled = true;
      return;
    }
    if (
      !this.camera ||
      Math.hypot(event.clientX - this.pointerStart.x, event.clientY - this.pointerStart.y) > 6
    )
      return;
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const pointer = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      (-(event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    const ray = new THREE.Raycaster();
    ray.setFromCamera(pointer, this.camera);
    const hit = ray.intersectObjects(
      [...this.parts.values(), ...this.environmentParts.values()],
      true,
    )[0];
    if (!hit) return;
    const id = this.registry.resolveHit(hit);
    if (id) this.zone.run(() => this.picked.emit(id));
  };
  private onContextLost = (e: Event) => {
    e.preventDefault();
    this.zone.run(() => this.supported.set(false));
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
  private resize(): void {
    if (!this.renderer) return;
    const { clientWidth: w, clientHeight: h } = this.canvasRef.nativeElement;
    if (!w || !h) return;
    this.updateInputPolicy();
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }
  private animate = () => {
    if (this.disposed || !this.renderer || document.hidden) return;
    const dt = this.clock.getDelta();
    this.physics?.step(dt);
    this.controls?.update(dt);
    if (this.selectionBox?.visible) this.updateSelection();
    this.renderer.render(this.scene, this.camera);
    if (++this.statsFrame % 60 === 0) {
      this.canvasRef.nativeElement.dataset['drawCalls'] = String(this.renderer.info.render.calls);
      this.canvasRef.nativeElement.dataset['triangles'] = String(
        this.renderer.info.render.triangles,
      );
      this.canvasRef.nativeElement.dataset['geometries'] = String(
        this.renderer.info.memory.geometries,
      );
      this.canvasRef.nativeElement.dataset['textures'] = String(this.renderer.info.memory.textures);
    }
    this.frame = requestAnimationFrame(this.animate);
  };
  ngOnDestroy(): void {
    this.disposed = true;
    this.releaseCancellation?.();
    this.physics?.dispose();
    cancelAnimationFrame(this.frame);
    this.observer?.disconnect();
    this.cameraMotion?.kill();
    this.explodedMotion?.kill();
    this.pulseMotion?.kill();
    this.controls?.removeEventListener('start', this.cancelCamera);
    this.controls?.dispose();
    document.removeEventListener('visibilitychange', this.visibility);
    const canvas = this.canvasRef.nativeElement;
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
  }
}
