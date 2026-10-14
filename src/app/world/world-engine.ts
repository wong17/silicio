import { StationBuilder } from './models/station-builder';
import { firstInspectableHit } from './scene-picking';
import { GpuResources } from './gpu-resources';
import { releaseInstanceBuffers } from './instance-lifecycle';

import * as THREE from 'three';
import { AmbientDust } from './effects/ambient-dust';
import { IdleGovernor, ResolutionGovernor } from './render-governors';
import { HoverGlow } from './hover-glow';
import { SelectionMarker, selectionBounds } from './selection-marker';
import { ActivityChannel, IDLE_ACTIVITY, type StationActivity } from '../laboratory/station-activity';
import { EMPTY_TIMELINE, type TimelineState } from './timeline-layout';
import type { ChronoscopeRig } from './models/chronoscope.model';
import { INSTRUMENT_PARTS } from './internal-parts';
import { explodedOffset } from './exploded-layout';
import { familyOf } from './piece-families';
import { CameraRig } from './camera-rig';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { gsap } from 'gsap';
import { bindCancellation, applyInputPolicy } from './scene-input';
import { classifySubject, pieceDefinition } from './piece-catalog';
import { instanceContacts } from './static-instancing';
import { CAMERA_CLIP, framePose, ViewportRegion } from './camera-director';
import { EffectsPipeline, qualitySettings, QualityTier } from './effects/effects-pipeline';
import { GpuProfile } from './gpu-profile';
import { FrameProfile } from './frame-profile';
import { historyPieces } from './history-pieces';
import { InteractionRegistry } from './interaction-registry';
import { WorkbenchPhysics } from './physics/workbench-physics';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { WorkbenchRoomModel } from './models/workbench-room.model';
import { ArticulatedLampModel } from './models/articulated-lamp.model';
import { LampController, type LampTarget } from './lamp-controller';
import { LAMP_REACH, clampLampTarget, lampDistance } from './lamp-limits';
import { failingLightState } from './failing-light';
import { SurfaceLibrary, type SurfaceLook } from './textures/surface-library';
import { SceneLabels } from './textures/scene-labels';
import { BENCH } from './models/bench-layout';
import type { Reactions } from './models/workbench-props.model';
import type { Animator, WorkshopTools } from './workshop-tools';

import type { SceneInputs, SceneCallbacks, Section, PieceAnchor, ScreenAnchor } from './scene-inputs';
import { CPU_PARTS, APPLE_PARTS } from './models/station-layouts';

const HOVER_INTERVAL_MS = 70;
const LAMP_EMIT_INTERVAL_MS = 100;
/** Colour of the air beyond the room: the background and the fog share it, so distant walls blend in. */
const HAZE = '#3a403e';
/** Height of the lamp's grip above the lamp head's pivot; keep in step with ArticulatedLampModel. */
const LAMP_GRIP_OFFSET = 0.56;

/**
 * Three.js coordinator: renderer, camera, bench, selection and lifecycle. Models build geometry,
 * the lamp controller owns its pose, and the surface and label libraries own textures. This class
 * does not import Angular.
 */
/** Layer used by thumbnail renders: the piece and the thumbnail lights are the only members. */
const THUMBNAIL_LAYER = 7;

export class WorldEngine implements SceneInputs {
  section: Section = 'atrium';
  exploded = false;
  /** How far the chip is open, 0 to 1; only meaningful while `exploded` is true. */
  explodedAmount = 1;
  activity: StationActivity = IDLE_ACTIVITY;
  activePart = '';
  tick = 0;
  memoryCells: { address: number; value: number }[] = [];
  history: { address: number; text: string; ax: number; changed: string }[] = [];
  timeline: TimelineState = EMPTY_TIMELINE;
  private timelineRig?: ChronoscopeRig;
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
  lamp: LampTarget = { x: -0.8, z: 0.6, height: 5 };
  lampOn = true;
  private registry = new InteractionRegistry();
  private environmentParts = new Map<string, THREE.Object3D>();
  private physics?: WorkbenchPhysics;
  private selectionBox?: SelectionMarker;
  private selectedId = '';
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
  private lampController?: LampController;
  private reactions: Reactions = new Map();
  private focusedObject?: THREE.Object3D;
  private root = new THREE.Group();
  private contactBatches: THREE.InstancedMesh[] = [];
  private parts = new Map<string, THREE.Object3D>();
  private resources = new Set<THREE.Material | THREE.BufferGeometry | THREE.Texture>();
  private surfaces = new SurfaceLibrary((r) => this.track(r));
  private labels = new SceneLabels((r) => this.track(r));
  private readonly tools: WorkshopTools = {
    track: (r) => this.track(r),
    material: (id, c, r, m, look?: SurfaceLook) => this.surfaces.material(id, c, r, m, look),
    label: (p, t, x, y, z, w, o) => this.labels.create(p, t, x, y, z, w, o),
    relabel: (l, t) => this.labels.rewrite(l, t),
    onActivity: (fn) => this.activityUnsubscribers.push(this.activityChannel.subscribe(fn)),
    animate: (update, scope = 'room') => this.animators.push({ update, scope }),
  };
  private animators: { update: Animator; scope: 'room' | 'subject' }[] = [];
  /** Scene time for animators; it advances with the frame delta and stays at zero under reduced motion. */
  private clock = 0;
  private rig?: CameraRig;
  private dust?: AmbientDust;
  private readonly resolutionGovernor = new ResolutionGovernor();
  private readonly idleGovernor = new IdleGovernor();
  private readonly hoverGlow = new HoverGlow();
  private readonly activityChannel = new ActivityChannel();
  private activityUnsubscribers: (() => void)[] = [];
  private activitySession = '';
  /** Floating legends over the main pieces; switched from the toolbar. */
  private calloutsOn = false;
  private calloutsDirty = true;
  private telemetryClock = 0;
  private lastView = { azimuth: Number.NaN, distance: Number.NaN };
  private thumbnails = new Map<string, Blob>();
  private thumbnailQueue: {
    id: string;
    size: number;
    station?: Section;
    resolve: (b: Blob | null) => void;
  }[] = [];
  private thumbnailRig?: {
    camera: THREE.PerspectiveCamera;
    target: THREE.WebGLRenderTarget;
    lights: THREE.Light[];
  };
  private explodedMotion?: gsap.core.Timeline;
  private pulseMotion?: gsap.core.Timeline;
  private packet?: THREE.Mesh;
  private pointerStart = new THREE.Vector2();
  private disposed = false;
  private dragPointer?: number;
  private dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.8);
  /** Horizontal plane through the grip while the lamp is dragged; set when the drag starts. */
  private gripPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private lampDragging = false;
  private lastLampEmit = 0;
  private hoverId: string | null = null;
  private reportedHolding: string | null = null;
  private lastHover = 0;
  private physicsReady?: Promise<void>;
  private releaseCancellation?: () => void;
  private historySlots: THREE.Mesh[] = [];
  private lastTick = -1;
  private lastFrame = performance.now();
  private shadowsOn = true;
  /** Adaptive resolution: 1 keeps the tier’s pixel ratio; the frame-time guard lowers it when the frame runs long. */
  private resolutionScale = 1;
  constructor(
    private readonly canvas: HTMLCanvasElement,
    inputs: SceneInputs,
    private readonly callbacks: SceneCallbacks,
  ) {
    Object.assign(this, inputs);
  }
  update(inputs: SceneInputs, changed: ReadonlySet<keyof SceneInputs>): void {
    Object.assign(this, inputs);
    this.idleGovernor.touch(performance.now());
    if (!this.renderer) return;
    if (this.root.userData['section'] !== this.section || changed.has('memoryModel'))
      this.buildSubject();
    if (changed.has('manipulate') && !this.manipulate) {
      this.onCancel();
      this.releaseTool();
    }
    if (changed.has('lamp') && !this.lampDragging) this.lampController?.setTarget(this.lamp);
    this.lampController?.setPower(this.lampOn);
    this.lampController?.setBoost(this.inspection ? 1.6 : 1);
    this.updateValues();
    this.updateScope();
    this.updateInputPolicy();
    this.scene.traverse((o) => {
      if (o.userData['detail']) o.visible = this.quality === 'high';
      if (o instanceof THREE.Mesh && o.material instanceof THREE.MeshStandardMaterial)
        o.material.wireframe = this.viewMode === 'wireframe';
    });
    if (this.activity && (changed.has('activity') || changed.size === 0)) this.publishActivity();
    if (changed.has('exploded') || changed.has('explodedAmount'))
      this.updateParts(changed.has('exploded') ? 0.8 : 0.15);
    this.updateSelection();
    this.updateQuality();
  }
  /**
   * A ceiling spot with a visible housing and a lens. It casts no shadows, so the lamp stays the only shadow caster.
   * Returns the light and the lens, so an animator can make the spot flicker together with its lens.
   */
  private ceilingSpot(
    from: THREE.Vector3,
    to: THREE.Vector3,
    angle: number,
    power: number,
  ): { light: THREE.SpotLight; lens: THREE.MeshStandardMaterial } {
    const housing = new THREE.Mesh(
      this.track(new THREE.CylinderGeometry(0.9, 0.9, 0.9, 24)),
      this.tools.material('ceiling-spot-housing', '#3a4143', 0.5, 0.4, { finish: 'steel', size: 64 }),
    );
    housing.position.set(from.x, from.y + 0.45, from.z);
    const lens = this.track(
      new THREE.MeshStandardMaterial({ color: '#f4f8f5', emissive: '#f4f8f5', emissiveIntensity: 1.2, side: THREE.DoubleSide }),
    );
    const disc = new THREE.Mesh(this.track(new THREE.CircleGeometry(0.72, 28)), lens);
    disc.rotation.x = Math.PI / 2;
    disc.position.set(from.x, from.y - 0.03, from.z);
    const target = new THREE.Object3D();
    target.position.copy(to);
    const light = new THREE.SpotLight('#eef6f1', power, 0, angle, 0.9, 2);
    light.position.copy(from);
    light.target = target;
    this.scene.add(housing, disc, light, target);
    return { light, lens };
  }

  initialize(): void {
    this.scene = new THREE.Scene();
    // A lit room rather than a void: the walls fall off into a dim warm haze.
    // The far walls of the closed room fade into a warm grey haze, never into a black void.
    this.scene.background = new THREE.Color(HAZE);
    // The fog starts beyond the far wall of the room (76 wide), so it never greys the walls themselves.
    this.scene.fog = new THREE.Fog(HAZE, 70, 220);
    // Far enough for the far corners of the closed room, which the camera can see from the bench.
    this.camera = new THREE.PerspectiveCamera(38, 1, CAMERA_CLIP.near, CAMERA_CLIP.far);
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
    this.renderer.toneMappingExposure = 1;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.pmrem = new THREE.PMREMGenerator(this.renderer);
    const room = new RoomEnvironment();
    this.environment = this.pmrem.fromScene(room, 0.04);
    this.scene.environment = this.environment.texture;
    this.scene.environmentIntensity = 0.45;
    room.dispose();

    // Fill light only: the lamp is the single shadow caster, so shadow passes stay bounded. The room is kept well
    // below the lamp, so the lamp reads as the brightest light on the bench: a dim cool sky, two ceiling spots of
    // equal power, a faint key and a rim.
    this.scene.add(new THREE.HemisphereLight('#e4efea', '#434a47', 0.35));
    // Spot one is a torch over the bench and a little around it. Spot two lights the other half of the room, behind
    // the camera, and flickers like a tube that is failing. Both housings hang from the ceiling.
    const spotPower = 260;
    this.ceilingSpot(new THREE.Vector3(0, BENCH.ceiling - 1, 0.5), new THREE.Vector3(0, BENCH.top, 0.5), 0.8, spotPower);
    const failing = this.ceilingSpot(new THREE.Vector3(0, BENCH.ceiling - 1, 28), new THREE.Vector3(0, BENCH.floor, 28), 0.78, spotPower);
    this.tools.animate((seconds) => {
      const state = failingLightState(seconds, spotPower);
      failing.light.intensity = state.light;
      failing.lens.emissiveIntensity = state.lens;
    }, 'room');
    const key = new THREE.DirectionalLight('#eef4f0', 0.35);
    key.position.set(-4, 8, 5);
    this.scene.add(key);
    this.keyLight = key;
    const rim = new THREE.DirectionalLight('#8fb9ce', 0.3);
    rim.position.set(5, 4, -5);
    this.scene.add(rim);

    const reactions = new WorkbenchRoomModel(this.tools).build(this.scene, this.environmentParts);
    this.reactions = reactions;
    const lampRig = new ArticulatedLampModel(this.tools).build(this.scene, this.environmentParts);
    this.lampController = new LampController(lampRig, this.scene, (r) => this.track(r));
    this.lampController.setTarget(this.lamp);
    this.lampController.setPower(this.lampOn);

    // Floating dust: one points draw, lit only where a light cone crosses it.
    this.dust = new AmbientDust(
      600,
      new THREE.Box3(new THREE.Vector3(-12, BENCH.top + 0.3, -7), new THREE.Vector3(12, BENCH.ceiling - 0.4, 12)),
      (r) => this.track(r),
    );
    this.scene.add(this.dust.points);

    this.selectionBox = new SelectionMarker('#d7ac6f');
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
    this.rig = new CameraRig(this.camera, this.controls);
    // The wheel dollies through the rig, so it eases like the buttons instead of stepping.
    this.canvas.addEventListener('wheel', this.onWheel, { capture: true, passive: false });
    this.canvas.addEventListener('pointerdown', this.onDown, true);
    this.canvas.addEventListener('pointermove', this.onMove);
    this.canvas.addEventListener('pointermove', this.onHover);
    this.canvas.addEventListener('pointerleave', this.onLeave);
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
  private clearSubject(): void {
    this.rig?.cancel();
    this.explodedMotion?.kill();
    this.pulseMotion?.kill();
    this.physics?.clearMechanisms();
    releaseInstanceBuffers(this.root);
    this.labels.release(this.root);
    // Dynamic geometry is disposed here; pooled materials/textures remain owned by the surface library.
    this.root.traverse((o) => {
      gsap.killTweensOf(o.position);
      gsap.killTweensOf(o.scale);
      if (o instanceof THREE.Mesh) {
        this.resources.delete(o.geometry);
        o.geometry.dispose();
        const material = o.material;
        if (!Array.isArray(material) && !this.surfaces.owns(material)) {
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
    for (const stop of this.activityUnsubscribers) stop();
    this.activityUnsubscribers = [];
    this.releaseThumbnails();
    this.profiler.reset();
    this.gpuProfiler?.reset();
    this.contactBatches = [];
    this.root.clear();
    this.animators = this.animators.filter((a) => a.scope !== 'subject');
    this.historySlots = [];
    this.timelineRig = undefined;
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
    const subject = new StationBuilder(this.tools).build(
      this.section,
      this.memoryModel,
      this.root,
      this.parts,
    );
    this.packet = subject.packet;
    this.historySlots = subject.historySlots;
    this.timelineRig = subject.timeline;
    this.scene.traverse((o) => {
      if (o.userData['detail']) o.visible = this.quality === 'high';
    });
    this.ground(this.root, subject.datum);
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
  /**
   * Each station is authored around its own origin. Its bearing surface (the underside of its board)
   * is lowered onto the anti-static mat, so boards and frames rest on the bench instead of hovering.
   * Pins that protrude below the board sink into the mat, as they would on a soft mat.
   */
  private ground(root: THREE.Group, datum: number): void {
    root.position.y = BENCH.matTop - datum;
    root.updateMatrixWorld(true);
  }
  private publishActivity(): void {
    const a = this.activity;
    if (a.sessionId !== this.activitySession) {
      this.activitySession = a.sessionId;
      this.activityChannel.begin(a.sessionId);
    }
    this.activityChannel.publish(a);
  }
  /** Feeds the dust with the cones of the lamp and the two ceiling spots, and the profile's mote count. */
  private updateDust(): void {
    const dust = this.dust;
    const lamp = this.lampController;
    if (!dust || !lamp) return;
    dust.setActive(qualitySettings(this.quality).dust);
    dust.update(this.reduced ? 0 : this.clock);
    const light = lamp.light;
    const direction = new THREE.Vector3().subVectors(light.target.position, light.position).normalize();
    const beams = [
      {
        origin: light.position.clone(),
        direction,
        cosAngle: Math.cos(light.angle),
        strength: lamp.powered ? 1.4 : 0,
      },
      {
        origin: new THREE.Vector3(0, BENCH.ceiling - 1, 0.5),
        direction: new THREE.Vector3(0, -1, 0),
        cosAngle: Math.cos(0.8),
        strength: 0.8,
      },
    ];
    dust.setBeams(beams);
  }
  private updateParts(duration = 0.8): void {
    this.explodedMotion?.kill();
    this.explodedMotion = gsap.timeline({
      defaults: { duration: this.reduced ? 0 : duration, ease: 'power3.inOut', overwrite: 'auto' },
    });
    const amount = this.exploded ? this.explodedAmount : 0;
    for (const [id, object] of this.parts) {
      const rest = object.userData['restY'] as number | undefined;
      const offset = explodedOffset(id, this.section, amount);
      const restZ = object.userData['restZ'] as number | undefined;
      if (restZ !== undefined) this.explodedMotion.to(object.position, { z: restZ + offset.z }, 0);
      if (rest !== undefined && !id.startsWith('tool')) {
        this.explodedMotion.to(object.position, { y: rest + offset.y }, 0);
        if (id === 'lid')
          this.explodedMotion.to(
            object.position,
            { x: offset.x, z: this.section === 'apple' ? 0.2 - 2.7 * (offset.x / 1.2) : offset.z },
            0,
          );
      }
      object.visible =
        !(
          [...CPU_PARTS, ...APPLE_PARTS].some((p) => p.id === id) &&
          ['8086', 'apple'].includes(this.section)
        ) || amount > 0;
    }
  }
  /** Area of the viewport that the overlays leave free: below the title, above the toolbar. */
  private freeRegion(): ViewportRegion {
    const canvas = this.canvas,
      r = canvas.getBoundingClientRect(),
      host = canvas.closest('.stage');
    const title = host?.querySelector('.title-block')?.getBoundingClientRect();
    // The toolbar is either the wide bar or the compact dock; whichever is displayed limits the frame.
    const toolbar = ['.bar', '.dock']
      .map((selector) => host?.querySelector<HTMLElement>(selector))
      .find((element) => element && element.offsetParent !== null)
      ?.getBoundingClientRect();
    let top = Math.min(r.height * 0.32, Math.max(12, (title?.bottom ?? r.top) - r.top + 12));
    let bottomEdge = (toolbar?.top ?? r.bottom) - r.top - 14;
    // Any overlay marked data-occludes (HUD map, tray) takes the band it covers: top half pushes down, bottom half up.
    host?.querySelectorAll<HTMLElement>('[data-occludes]').forEach((element) => {
      if (element.offsetParent === null) return;
      const box = element.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) return;
      const middle = (box.top + box.bottom) / 2 - r.top;
      if (middle < r.height / 2) top = Math.max(top, Math.min(r.height * 0.4, box.bottom - r.top + 8));
      else bottomEdge = Math.min(bottomEdge, box.top - r.top - 8);
    });
    const bottom = Math.max(top + 64, bottomEdge);
    return { x: 16, y: top, width: Math.max(64, r.width - 32), height: Math.max(64, bottom - top) };
  }
  private fitObject(o: THREE.Object3D): void {
    if (!this.controls || !this.camera || !this.rig) return;
    const b = new THREE.Box3().setFromObject(o);
    if (b.isEmpty()) return;
    const canvas = this.canvas;
    const pose = framePose(
      this.camera.fov,
      b,
      this.freeRegion(),
      { width: canvas.clientWidth, height: canvas.clientHeight },
      this.camera.position.clone().sub(this.controls.target),
    );
    this.controls.minDistance = Math.max(0.3, b.getBoundingSphere(new THREE.Sphere()).radius * 0.7);
    this.rig.setReduced(this.reduced);
    this.rig.moveTo(pose);
  }
  focusSelected(): void {
    const o = this.parts.get(this.activePart) || this.environmentParts.get(this.activePart);
    if (!o || !o.visible) return;
    this.focusedObject = o;
    this.fitObject(o);
  }
  /**
   * Aims the lamp at the centre of a bench piece, keeping the head height. `limit` means the arm
   * cannot reach that point, so the light stops at the edge of its reach.
   */
  aimLampAt(id: string): 'aimed' | 'limit' | 'missing' {
    const object = this.parts.get(id) || this.environmentParts.get(id);
    if (!object) return 'missing';
    const box = new THREE.Box3().setFromObject(object);
    if (box.isEmpty()) return 'missing';
    const center = box.getCenter(new THREE.Vector3());
    const reachable = lampDistance(center.x, center.z) <= LAMP_REACH;
    // The stored target must change too: emitting a stale copy would send the lamp back on the next input.
    this.lamp = clampLampTarget({ ...this.lamp, x: center.x, z: center.z });
    this.lampController?.setTarget(this.lamp);
    this.emitLamp(true);
    return reachable ? 'aimed' : 'limit';
  }
  /** Puts every tool back in its tray place and empties the hand. */
  resetTools(): void {
    this.physics?.reset();
    this.reportHolding();
  }
  /** Lets go of the tool in hand; with an empty hand nothing moves. */
  releaseTool(): void {
    this.physics?.release();
    this.reportHolding();
  }
  /** Tells the page which tool is in hand, once per change. */
  private reportHolding(): void {
    const id = this.physics?.heldId ?? null;
    if (id === this.reportedHolding) return;
    this.reportedHolding = id;
    this.callbacks.holding(id);
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
  /** Safe framing: a canvas that is still hidden reports zero size, which must not yield NaN. */
  private viewAspect(): number {
    const w = this.canvas.clientWidth,
      h = this.canvas.clientHeight;
    return w > 0 && h > 0 ? w / h : this.camera?.aspect || 1;
  }
  resetView(): void {
    if (!this.camera || !this.controls || !this.rig) return;
    this.focusedObject = undefined;
    this.controls.minDistance = 1.6;
    const mobile = matchMedia('(max-width:899px)').matches;
    const framing = Math.min(4, Math.max(1, 0.95 / this.viewAspect()));
    this.rig.setReduced(this.reduced);
    this.rig.moveTo({
      position: new THREE.Vector3(5.8 * framing, 9.2 * framing, (mobile ? 13 : 10.8) * framing),
      target: new THREE.Vector3(mobile ? 0 : -0.45, mobile ? 2.2 : 0.7, 0),
    });
  }
  rotate(direction: number): void {
    this.rig?.setReduced(this.reduced);
    this.rig?.orbitBy((direction * Math.PI) / 8);
  }
  zoom(direction: number): void {
    this.rig?.setReduced(this.reduced);
    this.rig?.dollyBy(direction);
  }
  private onWheel = (event: WheelEvent) => {
    this.idleGovernor.touch(performance.now());
    if (!this.rig || !this.controls?.enabled) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const unit = event.deltaMode === 1 ? 16 : 1;
    this.rig.setReduced(this.reduced);
    this.rig.dollyBy(Math.exp(event.deltaY * unit * 0.0012));
  };
  private cancelCamera = () => {
    this.rig?.cancel();
  };
  private onCancel = () => {
    this.pointerStart.set(Infinity, Infinity);
    this.cancelCamera();
    if (this.dragPointer !== undefined && this.canvas.hasPointerCapture(this.dragPointer))
      this.canvas.releasePointerCapture(this.dragPointer);
    this.dragPointer = undefined;
    this.lampDragging = false;
    this.physics?.suspend();
  };
  /** The SoC lid turns see-through while an internal piece is hovered or selected, so what is under it reads. */
  private updateLidGhost(): void {
    const lid = this.parts.get('lid');
    const material = lid?.userData['ghostMaterial'] as THREE.MeshStandardMaterial | undefined;
    if (!material) return;
    const internal = (id: string | null) => !!id && INSTRUMENT_PARTS.includes(id);
    const ghost = internal(this.hoverId) || internal(this.activePart);
    material.opacity = ghost ? 0.28 : 1;
    material.depthWrite = !ghost;
    material.needsUpdate = true;
  }
  private updateSelection(): void {
    this.updateLidGhost();
    const o = this.parts.get(this.activePart) || this.environmentParts.get(this.activePart);
    if (this.selectionBox) {
      this.selectionBox.fit(o);
      if (o && this.selectedId !== this.activePart) this.selectionBox.flash();
      this.selectedId = o ? this.activePart : '';
    }
  }
  private rewriteLabel(object: THREE.Object3D, text: string): void {
    this.labels.rewrite(object, text);
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
    this.callbacks.anchors(this.collectAnchors());
  }
  private collectAnchors(): PieceAnchor[] {
    const out: PieceAnchor[] = [];
    const centre = new THREE.Vector3();
    const box = new THREE.Box3();
    const add = (id: string, object: THREE.Object3D, scope: 'model' | 'bench') => {
      selectionBounds(object, box);
      if (box.isEmpty()) return;
      box.getCenter(centre);
      out.push({ id, name: pieceDefinition(id, this.section).name, x: centre.x, z: centre.z, scope });
    };
    for (const [id, o] of this.parts) add(id, o, 'model');
    for (const [id, o] of this.environmentParts) add(id, o, 'bench');
    return out;
  }
  setCallouts(on: boolean): void {
    this.calloutsOn = on;
    this.telemetryClock = 1;
    this.calloutsDirty = true;
    if (!on) this.callbacks.callouts([]);
  }
  setView(azimuth: number, distance: number): void {
    this.rig?.setReduced(this.reduced);
    this.rig?.setView(azimuth, distance);
  }
  orbitTo(azimuth: number): void {
    this.rig?.setReduced(this.reduced);
    this.rig?.orbitTo(azimuth);
  }
  /** Camera view and callout anchors, throttled to 10 Hz and sent only when something moved. */
  private emitTelemetry(dt: number): void {
    this.telemetryClock += dt;
    if (this.telemetryClock < 0.1 || !this.rig) return;
    this.telemetryClock = 0;
    const azimuth = this.rig.azimuth,
      distance = this.rig.distance;
    const moved =
      Math.abs(azimuth - this.lastView.azimuth) > 0.002 || Math.abs(distance - this.lastView.distance) > 0.01;
    if (moved) {
      this.lastView = { azimuth, distance };
      this.callbacks.view({ azimuth, distance });
    }
    if (this.calloutsOn && (moved || this.rig.moving || this.calloutsDirty))
      this.callbacks.callouts(this.projectCallouts());
    this.calloutsDirty = false;
  }
  private projectCallouts(): ScreenAnchor[] {
    const w = this.canvas.clientWidth,
      h = this.canvas.clientHeight;
    const out: ScreenAnchor[] = [];
    const v = new THREE.Vector3();
    const box = new THREE.Box3();
    this.camera.updateMatrixWorld();
    for (const [id, o] of this.parts) {
      if (!o.visible || familyOf(id)) continue;
      selectionBounds(o, box);
      if (box.isEmpty()) continue;
      box.getCenter(v).project(this.camera);
      if (v.z > 1 || Math.abs(v.x) > 1.1 || Math.abs(v.y) > 1.1) continue;
      out.push({ id, name: pieceDefinition(id, this.section).name, x: ((v.x + 1) / 2) * w, y: ((1 - v.y) / 2) * h });
    }
    return out;
  }
  /**
   * 3D thumbnail of one piece, drawn alone with its own lights (layer 7) so the room never shows through.
   * Requests are served one per frame and cached for the station; null means no WebGL result.
   */
  thumbnail(id: string, size = 128): Promise<Blob | null> {
    const hit = this.thumbnails.get(id);
    if (hit) return Promise.resolve(hit);
    if (!this.renderer || this.disposed) return Promise.resolve(null);
    return new Promise((resolve) => {
      const queued = this.thumbnailQueue.find((q) => q.id === id);
      if (queued) {
        const first = queued.resolve;
        queued.resolve = (b) => {
          first(b);
          resolve(b);
        };
      } else this.thumbnailQueue.push({ id, size, resolve });
    });
  }
  /**
   * Picture of a whole station, for the atrium portals. The station is built apart, drawn once with the
   * thumbnail lights and disposed in the same frame, so the visible bench never changes.
   */
  stationThumbnail(section: Section, size = 160): Promise<Blob | null> {
    const key = 'station:' + section;
    const hit = this.thumbnails.get(key);
    if (hit) return Promise.resolve(hit);
    if (!this.renderer || this.disposed) return Promise.resolve(null);
    return new Promise((resolve) => this.thumbnailQueue.push({ id: key, size, station: section, resolve }));
  }
  private buildTemporaryStation(section: Section): { group: THREE.Group; dispose: () => void } {
    const group = new THREE.Group();
    const owned: (THREE.Material | THREE.BufferGeometry | THREE.Texture)[] = [];
    const tools: WorkshopTools = {
      track: (r) => {
        owned.push(r);
        return this.track(r);
      },
      material: this.tools.material,
      label: this.tools.label,
      relabel: this.tools.relabel,
      animate: () => {},
    };
    const parts = new Map<string, THREE.Object3D>();
    new StationBuilder(tools).build(section, 'classic', group, parts);
    this.scene.add(group);
    group.updateMatrixWorld(true);
    return {
      group,
      dispose: () => {
        this.scene.remove(group);
        this.labels.release(group);
        for (const r of owned) {
          if (r instanceof THREE.Material && this.surfaces.owns(r)) continue;
          this.resources.delete(r);
          r.dispose();
        }
      },
    };
  }
  private serveThumbnail(): void {
    const job = this.thumbnailQueue.shift();
    if (!job || !this.renderer) return;
    let cleanup: (() => void) | undefined;
    let object: THREE.Object3D | undefined;
    if (job.station) {
      const temporary = this.buildTemporaryStation(job.station);
      object = temporary.group;
      cleanup = temporary.dispose;
    } else object = this.parts.get(job.id) ?? this.environmentParts.get(job.id);
    const box = object ? selectionBounds(object, new THREE.Box3()) : undefined;
    if (!object || !box || box.isEmpty()) {
      cleanup?.();
      return job.resolve(null);
    }
    const rig = (this.thumbnailRig ??= this.createThumbnailRig(job.size));
    const pose = framePose(
      rig.camera.fov,
      box,
      { x: 0, y: 0, width: job.size, height: job.size },
      { width: job.size, height: job.size },
      new THREE.Vector3(1, 1.1, 1.5),
    );
    rig.camera.position.copy(pose.position);
    rig.camera.lookAt(pose.target);
    rig.camera.updateMatrixWorld();
    object.traverse((o) => o.layers.enable(THUMBNAIL_LAYER));
    const previousTarget = this.renderer.getRenderTarget();
    const previousShadow = this.renderer.shadowMap.enabled;
    const previousBackground = this.scene.background;
    const previousFog = this.scene.fog;
    this.scene.background = null;
    this.scene.fog = null;
    this.renderer.shadowMap.enabled = false;
    this.renderer.setRenderTarget(rig.target);
    this.renderer.setClearColor('#14161a', 1);
    this.renderer.clear();
    this.renderer.render(this.scene, rig.camera);
    const pixels = new Uint8Array(job.size * job.size * 4);
    this.renderer.readRenderTargetPixels(rig.target, 0, 0, job.size, job.size, pixels);
    this.renderer.setRenderTarget(previousTarget);
    this.renderer.shadowMap.enabled = previousShadow;
    this.scene.background = previousBackground;
    this.scene.fog = previousFog;
    object.traverse((o) => o.layers.disable(THUMBNAIL_LAYER));
    cleanup?.();
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = job.size;
    const context = canvas.getContext('2d');
    if (!context) return job.resolve(null);
    const image = context.createImageData(job.size, job.size);
    for (let y = 0; y < job.size; y++)
      image.data.set(
        pixels.subarray((job.size - 1 - y) * job.size * 4, (job.size - y) * job.size * 4),
        y * job.size * 4,
      );
    context.putImageData(image, 0, 0);
    canvas.toBlob((blob) => {
      if (blob && !this.disposed) this.thumbnails.set(job.id, blob);
      job.resolve(blob);
    }, 'image/png');
  }
  private createThumbnailRig(size: number) {
    const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 80);
    camera.layers.set(THUMBNAIL_LAYER);
    const target = new THREE.WebGLRenderTarget(size, size, { depthBuffer: true });
    target.texture.colorSpace = THREE.SRGBColorSpace;
    const key = new THREE.DirectionalLight('#fff1d8', 2.6),
      fill = new THREE.HemisphereLight('#dfe8ff', '#403a30', 1.1);
    key.position.set(3, 6, 4);
    for (const l of [key, fill]) {
      l.layers.set(THUMBNAIL_LAYER);
      this.scene.add(l);
    }
    return { camera, target, lights: [key, fill] };
  }
  private releaseThumbnails(): void {
    for (const job of this.thumbnailQueue) job.resolve(null);
    this.thumbnailQueue = [];
    this.thumbnails.clear();
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
      for (const o of this.historySlots) {
        o.visible = false;
        o.userData['filled'] = false;
      }
      for (const p of historyPieces(this.history.length)) {
        const o = this.historySlots[p.slot];
        if (!o) continue;
        o.visible = true;
        o.userData['filled'] = true;
        o.userData['part'] = p.id;
        this.parts.set(p.id, o);
        const entry = this.history[p.index];
        const text = o.userData['textLabel'] as THREE.Object3D | undefined;
        const change = o.userData['changeLabel'] as THREE.Object3D | undefined;
        if (text) this.rewriteLabel(text, entry ? entry.text.slice(0, 11) : 'INICIO');
        if (change) this.rewriteLabel(change, entry ? entry.changed : '');
      }
      this.timelineRig?.setTimeline(
        this.timeline,
        this.history.map((h) => h.text),
      );
      this.registerParts();
    }
  }
  /** The bus strobe is painted by the scope's own animator; the engine only states the active channel. */
  private updateScope(): void {
    const scope = this.environmentParts.get('scope');
    if (!scope) return;
    const active =
      this.signalChannel === 'RD' ? this.readAccess : this.signalChannel === 'WR' ? this.writeAccess : true;
    scope.userData['strobe'] = { channel: this.signalChannel, active };
  }
  /** Merge only static siblings with the same material and semantic owner; moving parts stay separate. */
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
          o.userData['dynamic'] ||
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
    this.idleGovernor.touch(performance.now());
    this.pointerStart.set(event.clientX, event.clientY);
    const hit = this.rayAt(event).intersectObjects([...this.environmentParts.values()], true)[0];
    if (hit?.object.userData['lampHandle']) {
      // The grip moves in its own horizontal plane, so the head follows the pointer one-to-one.
      this.gripPlane.constant = -(BENCH.top + this.lamp.height + LAMP_GRIP_OFFSET);
      this.beginDrag(event);
      this.lampDragging = true;
      return;
    }
    if (!this.manipulate) return;
    const id = hit && this.registry.resolveHit(hit);
    if (!id?.startsWith('tool')) return;
    this.beginDrag(event);
    void this.ensurePhysics()
      .then(() => {
        if (this.disposed || this.dragPointer !== event.pointerId) return;
        this.physics?.beginDrag(id);
        this.reportHolding();
        this.onMove(event);
      })
      .catch(() => this.onCancel());
  };
  private beginDrag(event: PointerEvent): void {
    event.stopImmediatePropagation();
    event.preventDefault();
    this.dragPointer = event.pointerId;
    this.canvas.setPointerCapture(event.pointerId);
    if (this.controls) this.controls.enabled = false;
  }
  private onMove = (event: PointerEvent) => {
    if (this.dragPointer !== event.pointerId) return;
    if (this.lampDragging) {
      const target = new THREE.Vector3();
      if (this.rayAt(event).ray.intersectPlane(this.gripPlane, target)) this.moveLamp(target);
      return;
    }
    const target = new THREE.Vector3();
    if (this.rayAt(event).ray.intersectPlane(this.dragPlane, target))
      this.physics?.moveDrag(target);
  };
  private moveLamp(point: THREE.Vector3): void {
    if (!this.lampController) return;
    const next = clampLampTarget({ x: point.x, z: point.z, height: this.lamp.height });
    this.lamp = { ...this.lamp, x: next.x, z: next.z };
    this.lampController.setTarget(this.lamp);
    this.emitLamp(false);
  }
  /** Lamp target goes back to Angular at a limited rate; the final value is always sent. */
  private emitLamp(force: boolean): void {
    const now = performance.now();
    if (!force && now - this.lastLampEmit < LAMP_EMIT_INTERVAL_MS) return;
    this.lastLampEmit = now;
    this.callbacks.lampMoved({ ...this.lamp });
  }
  private onHover = (event: PointerEvent) => {
    if (this.dragPointer !== undefined || event.pointerType === 'touch' || !this.camera) return;
    const now = performance.now();
    if (now - this.lastHover < HOVER_INTERVAL_MS) return;
    this.lastHover = now;
    const ray = this.rayAt(event);
    const hit = firstInspectableHit(
      ray,
      [...this.parts.values(), ...this.environmentParts.values()],
      this.contactBatches,
      this.registry,
    );
    const id = hit?.id ?? null;
    this.canvas.style.cursor = id ? (hit?.hit.object.userData['lampHandle'] ? 'grab' : 'pointer') : '';
    if (id !== this.hoverId) {
      this.hoverId = id;
      this.updateLidGhost();
      this.hoverGlow.show(id ? (this.parts.get(id) ?? this.environmentParts.get(id)) : undefined);
      this.callbacks.hovered(id);
    }
  };
  private onLeave = () => {
    this.canvas.style.cursor = '';
    if (this.hoverId !== null) {
      this.hoverId = null;
      this.updateLidGhost();
      this.hoverGlow.clear();
      this.callbacks.hovered(null);
    }
  };
  private onPick = (event: PointerEvent) => {
    if (this.dragPointer === event.pointerId) {
      const wasLamp = this.lampDragging;
      this.dragPointer = undefined;
      this.lampDragging = false;
      if (wasLamp) this.emitLamp(true);
      else {
        // The tool stays in hand until it is released; only the lamp drag ends with the pointer.
        this.physics?.hold();
        this.reportHolding();
      }
      this.canvas.releasePointerCapture(event.pointerId);
      if (this.controls) this.controls.enabled = true;
      return;
    }
    if (
      !this.camera ||
      Math.hypot(event.clientX - this.pointerStart.x, event.clientY - this.pointerStart.y) > 6
    )
      return;
    const ray = this.rayAt(event);
    const result = firstInspectableHit(
      ray,
      [...this.parts.values(), ...this.environmentParts.values()],
      this.contactBatches,
      this.registry,
    );
    if (!result) return;
    if (!this.reduced) this.reactions.get(result.id)?.();
    this.callbacks.picked(result.id);
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
      this.frameDelta();
      this.animate();
    }
  };
  private updateQuality(): void {
    if (!this.renderer || this.profileTier === this.quality) return;
    this.profileTier = this.quality;
    const p = qualitySettings(this.quality);
    this.applyPixelRatio();
    this.shadowsOn = p.shadowSize > 0;
    this.renderer.shadowMap.enabled = this.shadowsOn;
    this.lampController?.setShadowQuality(p.shadowSize || 512);
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
  /** Seconds since the previous frame; a plain timer avoids the deprecated THREE.Clock. */
  private frameDelta(): number {
    const now = performance.now();
    const seconds = (now - this.lastFrame) / 1000;
    this.lastFrame = now;
    return seconds;
  }
  /** Pixel ratio of the quality tier, scaled by the adaptive resolution and never above the device’s own. */
  private applyPixelRatio(): void {
    if (!this.renderer) return;
    const tier = qualitySettings(this.quality).dpr;
    this.renderer.setPixelRatio(Math.max(0.5, Math.min(devicePixelRatio, tier) * this.resolutionScale));
  }
  /** Frame-time guard: steps of 0.05 inside a dead band, and it stops after three reversals so it settles. */
  private adaptResolution(): void {
    const profile = this.profiler.result;
    if (profile.samples < 60) return;
    const next = this.resolutionGovernor.update(profile.p50);
    if (next === this.resolutionScale) return;
    this.resolutionScale = next;
    this.profiler.reset();
    this.applyPixelRatio();
  }
  private animate = () => {
    if (this.disposed || !this.renderer || document.hidden) return;
    const now = performance.now();
    const busy =
      !!this.rig?.moving ||
      (this.physics?.awakeCount ?? 0) > 0 ||
      this.thumbnailQueue.length > 0 ||
      !!this.explodedMotion?.isActive() ||
      !!this.pulseMotion?.isActive() ||
      this.dragPointer !== undefined;
    // After a few quiet seconds the bench is drawn at half rate; the first event brings the full rate back.
    if (!this.idleGovernor.frameAllowed(now, busy)) {
      this.frame = requestAnimationFrame(this.animate);
      return;
    }
    const dt = Math.min(this.frameDelta(), 0.1);
    this.profiler.sample(dt);
    this.physics?.step(dt);
    this.rig?.setReduced(this.reduced);
    this.rig?.update(dt);
    this.updateDust();
    this.emitTelemetry(dt);
    if (this.thumbnailQueue.length) this.serveThumbnail();
    this.controls?.update(dt);
    this.lampController?.update(dt, this.reduced, this.shadowsOn);
    this.clock += dt;
    const seconds = this.reduced ? 0 : this.clock;
    for (const a of this.animators) a.update(seconds);
    if (this.selectionBox?.visible) this.updateSelection();
    this.selectionBox?.update(dt, this.reduced);
    this.hoverGlow.update(dt, this.reduced);
    this.renderer.info.reset();
    if (this.statsFrame % 30 === 0) this.gpuProfiler?.begin();
    if (this.effects && this.viewMode === 'material') this.effects.render();
    else this.renderer.render(this.scene, this.camera);
    this.gpuProfiler?.end();
    if (++this.statsFrame % 60 === 0) {
      this.adaptResolution();
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
      this.canvas.dataset['resolutionScale'] = this.resolutionScale.toFixed(2);
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
    this.releaseThumbnails();
    this.hoverGlow.dispose();
    this.thumbnailRig?.target.dispose();
    cancelAnimationFrame(this.frame);
    this.observer?.disconnect();
    this.rig?.cancel();
    this.explodedMotion?.kill();
    this.pulseMotion?.kill();
    this.controls?.removeEventListener('start', this.cancelCamera);
    this.canvas.removeEventListener('wheel', this.onWheel, true);
    this.rig?.dispose();
    this.controls?.dispose();
    document.removeEventListener('visibilitychange', this.visibility);
    const canvas = this.canvas;
    canvas.removeEventListener('pointerdown', this.onDown, true);
    canvas.removeEventListener('pointermove', this.onMove);
    canvas.removeEventListener('pointermove', this.onHover);
    canvas.removeEventListener('pointerleave', this.onLeave);
    canvas.removeEventListener('pointerup', this.onPick);
    canvas.removeEventListener('webglcontextlost', this.onContextLost);
    this.root.traverse((o) => {
      gsap.killTweensOf(o.position);
      gsap.killTweensOf(o.scale);
    });
    this.labels.dispose();
    for (const r of this.resources) r.dispose();
    this.environment?.dispose();
    this.pmrem?.dispose();
    this.renderer?.dispose();
    this.gpuResources?.dispose();
  }
}
