import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  NgZone,
  OnDestroy,
  TemplateRef,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { gsap } from 'gsap';
import { EXPERIENCES } from './content/experiences';
import { LabSession, type Tab } from './laboratory/lab-session.service';
import { fromQuery, readShot, toQuery } from './content/deeplink';
import { initialTier } from './content/gpu-hint';
import { PerfMeterComponent } from './shell/perf-meter/perf-meter.component';
import { TourComponent } from './shell/tour/tour.component';
import { StationMissionComponent } from './console/station-mission/station-mission.component';
import { TOUR } from './content/tour';
import type { Section } from './world/scene-inputs';
import { AtriumSceneComponent } from './world/atrium-scene.component';
import { SceneToolbarComponent, type SceneCommand } from './world/scene-toolbar/scene-toolbar.component';
import { ExperienceNavComponent } from './shell/experience-nav/experience-nav.component';
import { AtriumPortalsComponent } from './console/atrium-portals/atrium-portals.component';
import { SceneHudComponent } from './world/scene-hud/scene-hud.component';
import { PieceInspectorComponent } from './console/piece-inspector/piece-inspector.component';
import { HelpDialogComponent } from './shell/help/help-dialog.component';
import { PhasesComponent } from './instruments/cpu/phases/phases.component';
import { SimulationTransportComponent } from './shell/transport/simulation-transport.component';
import { SimulationCoordinator } from './laboratory/controllers/simulation-coordinator';
import { experienceOf } from './laboratory/controllers/simulation-controller';
import { RegisterPanelComponent } from './instruments/cpu/register/register-panel.component';
import { AluPanelComponent } from './instruments/cpu/alu/alu-panel.component';
import { ProgramPanelComponent } from './instruments/cpu/program/program-panel.component';
import { TracePanelComponent } from './instruments/cpu/trace/trace-panel.component';
import { MemoryPanelComponent } from './instruments/memory/memory/memory-panel.component';
import { CachePanelComponent } from './instruments/memory/cache/cache-panel.component';
import { DimmPanelComponent } from './instruments/memory/dimm/dimm-panel.component';
import { ApplePanelComponent } from './instruments/apple/apple/apple-panel.component';
import { SignalPanelComponent } from './instruments/signal/signal/signal-panel.component';
import { MachineInstrumentComponent } from './instruments/machine/machine-instrument.component';
import { WorkspaceComponent } from './shell/workspace/workspace.component';
import { PanelsMenuComponent } from './shell/workspace/panels-menu.component';
import { OccludesDirective } from './shell/workspace/occludes.directive';
import { WorkspaceService } from './shell/workspace/workspace.service';
import { SceneViewportService } from './shell/workspace/scene-viewport.service';

export type Layout = 'scene' | 'shared' | 'instrument';

const CPU_PARTS = [
  { id: 'alu', label: 'ALU' },
  { id: 'registers', label: 'Registros' },
  { id: 'control', label: 'Control' },
  { id: 'biu', label: 'BIU' },
  { id: 'queue', label: 'Cola' },
];

const NARROW = '(max-width: 899px)';

/**
 * Application shell: routing, scene commands and motion. Session state lives in LabSession and the
 * place of each instrument in WorkspaceService; this component only composes the stage and the panels.
 */
@Component({
  selector: 'app-root',
  imports: [
    RouterLink,
    ExperienceNavComponent,
    AtriumSceneComponent,
    SceneToolbarComponent,
    AtriumPortalsComponent,
    SceneHudComponent,
    PerfMeterComponent,
    TourComponent,
    StationMissionComponent,
    PieceInspectorComponent,
    HelpDialogComponent,
    PhasesComponent,
    SimulationTransportComponent,
    RegisterPanelComponent,
    AluPanelComponent,
    ProgramPanelComponent,
    TracePanelComponent,
    MemoryPanelComponent,
    CachePanelComponent,
    DimmPanelComponent,
    ApplePanelComponent,
    SignalPanelComponent,
    MachineInstrumentComponent,
    WorkspaceComponent,
    PanelsMenuComponent,
    OccludesDirective,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements AfterViewInit, OnDestroy {
  readonly session = inject(LabSession);
  readonly ws = inject(WorkspaceService);
  readonly viewport = inject(SceneViewportService);
  private readonly coordinator = inject(SimulationCoordinator);
  private readonly router = inject(Router);
  private readonly zone = inject(NgZone);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly layout = signal<Layout>('shared');
  readonly modes: { id: Layout; label: string }[] = [
    { id: 'scene', label: 'Escena' },
    { id: 'shared', label: 'Compartido' },
    { id: 'instrument', label: 'Instrumento' },
  ];
  readonly cpuParts = CPU_PARTS;
  readonly hoveredId = signal<string | null>(null);
  readonly hoverName = computed(() => {
    const id = this.hoveredId();
    return id ? this.pieceName(id) : '';
  });
  /** Tool in hand, reported by the scene; the release control is only enabled while it is set. */
  readonly holding = signal<string | null>(null);
  /** Result of the last "illuminate" request when the lamp could not reach the piece. */
  readonly aimNotice = signal<string | null>(null);
  readonly caption = computed(() => {
    const notice = this.aimNotice();
    if (notice) return notice;
    const held = this.holding();
    // One short line above the scene bar (40 characters or fewer when nothing is held).
    if (held) return `En la mano: ${this.pieceName(held)} · Esc la suelta`;
    return this.session.manipulate() ? 'Manipulación activa · arrastra un objeto' : 'Toca una pieza para inspeccionarla';
  });
  readonly current = computed(() => EXPERIENCES.find((e) => e.id === this.session.section()));
  readonly accent = computed(
    () => EXPERIENCES.find((e) => e.id === this.session.section())?.accent ?? '#d7ac6f',
  );
  private readonly world = viewChild<AtriumSceneComponent>('world');
  private readonly tip = viewChild<ElementRef<HTMLElement>>('tip');
  private readonly stage = viewChild.required<ElementRef<HTMLElement>>('stage');
  private readonly programPanel = viewChild.required<TemplateRef<unknown>>('programPanel');
  private readonly statePanel = viewChild.required<TemplateRef<unknown>>('statePanel');
  private readonly inspectorPanel = viewChild.required<TemplateRef<unknown>>('inspectorPanel');
  private readonly portalsPanel = viewChild.required<TemplateRef<unknown>>('portalsPanel');
  private readonly instrumentsPanel = viewChild.required<TemplateRef<unknown>>('instrumentsPanel');
  /** Content of each desk panel; the workspace places it, the shell only says what it contains. */
  readonly panelTemplates = computed<Record<string, TemplateRef<unknown>>>(() => ({
    program: this.programPanel(),
    state: this.statePanel(),
    inspector: this.inspectorPanel(),
    portals: this.portalsPanel(),
    instruments: this.instrumentsPanel(),
  }));
  private navigation?: Subscription;
  private context?: gsap.Context;
  private media?: MediaQueryList;
  private mediaChanged = () => {
    this.session.reduced.set(this.media?.matches ?? false);
  };

  constructor() {
    this.navigation = this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe(() => this.route());
    effect(() => this.world()?.setCallouts(this.session.callouts()));
    // The desk offers the panels of whatever station the session shows, however it got there.
    effect(() => this.ws.setExperience(this.session.section()));
    // Another chapter of the same exercise keeps its owner and its clock; any other one pauses it.
    effect(() => {
      const view = experienceOf(this.session.section());
      untracked(() => (view ? this.coordinator.changeView(view) : this.coordinator.pause()));
    });
    // A hidden tab never keeps the clock going.
    this.visibility = () => document.hidden && this.coordinator.pause();
    document.addEventListener('visibilitychange', this.visibility);
    effect(() => {
      this.session.section();
      this.session.activePart();
      this.session.cameraView();
      untracked(() => this.syncUrl());
    });
  }

  /** Frame-time meter, toggled with Shift+D. */
  readonly meter = signal(false);
  private lastSection?: Section;
  private urlTimer?: ReturnType<typeof setTimeout>;
  private visibility: () => void;

  private route(): void {
    const id = this.router.url.split('?')[0].split('/')[1] as Section;
    const section: Section = EXPERIENCES.some((e) => e.id === id) ? id : 'atrium';
    // Writing the piece into the address re-enters here; the station itself must not be reset by that.
    if (section === this.lastSection) return;
    this.lastSection = section;
    this.session.section.set(section);
    this.ws.setExperience(section);
    this.session.activePart.set(
      section === 'apple'
        ? 'performance'
        : section === 'machine'
          ? 'cpu'
          : section === '8086'
            ? 'alu'
            : section === 'memory'
              ? this.session.memoryModel() === 'classic'
                ? 'bank-even'
                : 'dimm'
              : section === 'time'
                ? 'initial'
                : 'lid',
    );
    // The 8086 and the SoC open by default; the memory modules start closed so their layers read as a choice.
    this.session.exploded.set(section === '8086' || section === 'apple');
    this.session.tab.set('state' as Tab);
    this.applyDeepLink();
  }

  /** A shared address names a piece and a view; both are applied once the station exists. */
  private applyDeepLink(): void {
    const params = this.router.parseUrl(this.router.url).queryParams;
    const shot = readShot(params);
    if (shot) {
      // Reference capture: frozen clock, no drawers, the named piece framed.
      this.session.reduced.set(true);
      this.session.setHud({ map: false, tray: false });
      this.session.callouts.set(false);
      document.body.dataset['shot'] = shot.station + (shot.piece ? '-' + shot.piece : '');
      if (shot.piece) {
        this.session.activePart.set(shot.piece);
        setTimeout(() => this.world()?.focusSelected(), 700);
      }
      return;
    }
    const link = fromQuery(params);
    if (link.piece) this.session.activePart.set(link.piece);
    if (link.azimuth !== undefined && link.distance !== undefined) {
      const { azimuth, distance } = link;
      setTimeout(() => this.world()?.setView(azimuth, distance), 600);
    }
  }

  /** Keeps the address in step with the selection and the view, without adding history entries. */
  private syncUrl(): void {
    clearTimeout(this.urlTimer);
    this.urlTimer = setTimeout(() => {
      const section = this.session.section();
      if (section === 'atrium') return;
      const piece = this.session.activePart();
      void this.router.navigate([], {
        queryParams: toQuery(piece, this.session.cameraView()),
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    }, 500);
  }

  ngAfterViewInit(): void {
    this.session.attachWorker();
    this.media = matchMedia('(prefers-reduced-motion: reduce)');
    this.session.loadPreferences(this.media.matches, matchMedia(NARROW).matches);
    this.session.restoreAutosave();
    // First visit on an old GPU: start with the light profile instead of waiting for the resolution to fall.
    setTimeout(() => {
      const gpu = document.querySelector('canvas[data-gpu]')?.getAttribute('data-gpu') ?? undefined;
      const nav = navigator as Navigator & { deviceMemory?: number };
      if (!this.session.qualityChosen)
        this.session.quality.set(
          initialTier({
            gpu,
            cores: nav.hardwareConcurrency,
            memory: nav.deviceMemory,
            narrow: matchMedia(NARROW).matches,
          }),
        );
    }, 1500);
    this.media.addEventListener('change', this.mediaChanged);
    this.viewport.attachStage(this.stage().nativeElement);
    this.zone.runOutsideAngular(() => {
      this.context = gsap.context(() => {
        if (this.session.reduced()) return;
        gsap
          .timeline({ defaults: { duration: 0.8, ease: 'power3.out' } })
          .from('.title-block', { y: 18, opacity: 0 }, 0)
          .from('app-experience-nav .links a', { y: 10, opacity: 0, stagger: 0.06 }, 0.2);
      }, this.host.nativeElement);
    });
  }

  setLayout(mode: Layout): void {
    this.layout.set(mode);
    this.session.manipulate.set(false);
  }

  /** Editing the program on a phone brings the instrument column forward. */
  editorFocus(): void {
    if (matchMedia(NARROW).matches) this.setLayout('instrument');
  }

  sceneCommand(command: SceneCommand): void {
    const world = this.world();
    switch (command) {
      case 'rotate-left':
        world?.rotate(-1);
        break;
      case 'rotate-right':
        world?.rotate(1);
        break;
      case 'zoom-in':
        world?.zoom(0.85);
        break;
      case 'zoom-out':
        world?.zoom(1.15);
        break;
      case 'reset':
        world?.resetView();
        break;
      case 'focus':
        world?.focusSelected();
        break;
      case 'drop':
        world?.releaseTool();
        break;
      case 'reset-tools':
        world?.resetTools();
        break;
      default:
        this.session.applySceneState(command);
    }
  }

  /** Keys that reproduce the toolbar, so the bench is operable without pointing. */
  @HostListener('document:keydown', ['$event'])
  keyboard(event: KeyboardEvent): void {
    const target = event.target;
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    // Typing in a field keeps its letters; the document itself is never a field.
    if (target instanceof Element && target.closest('input, textarea, select, dialog, [role="dialog"], [role="menu"], [contenteditable="true"]'))
      return;
    const commands: Record<string, SceneCommand> = {
      '[': 'rotate-left',
      ']': 'rotate-right',
      '+': 'zoom-in',
      '=': 'zoom-in',
      '-': 'zoom-out',
      '−': 'zoom-out',
      '0': 'reset',
      f: 'focus',
      e: 'explode',
      w: 'representation',
      i: 'light',
      l: 'lamp-power',
      m: 'manipulate',
      t: 'callouts',
      p: 'tray',
      x: 'tour',
      b: 'map',
    };
    if (event.shiftKey && event.key.toLowerCase() === 'd') {
      event.preventDefault();
      this.meter.set(!this.meter());
      return;
    }
    // In exhibition mode the arrows and the space bar move through the talk.
    if (this.session.tourIndex() !== null) {
      if (event.key === 'ArrowRight' || event.key === ' ') {
        event.preventDefault();
        this.tourGo(1);
        return;
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        this.tourGo(-1);
        return;
      }
      if (event.key === 'Escape') {
        this.tourExit();
        return;
      }
    }
    // Escape lets go of a tool in hand first; a second press leaves manipulation.
    if (event.key === 'Escape' && this.holding()) {
      this.world()?.releaseTool();
      return;
    }
    if (event.key === 'Escape' && this.session.manipulate()) {
      this.session.manipulate.set(false);
      return;
    }
    const command = commands[event.key.toLowerCase()] ?? commands[event.key];
    if (!command) return;
    event.preventDefault();
    this.sceneCommand(command);
  }

  /** Moves the exhibition one step and puts the station, the chip, the piece and the camera in place. */
  tourGo(delta: number): void {
    const current = this.session.tourIndex() ?? 0;
    const next = Math.min(TOUR.length - 1, Math.max(0, current + delta));
    this.session.tourIndex.set(next);
    const step = TOUR[next];
    // The talk needs a clear scene: drawers and legends stay out of the way while it runs.
    this.session.hud.set({ map: false, tray: false });
    this.session.callouts.set(false);
    if (step.memoryModel) this.session.memoryModel.set(step.memoryModel);
    const place = () => {
      this.session.part(step.piece);
      if (step.tab) {
        this.session.tab.set(step.tab);
        // Programa and Estado are both on the desk; the step only makes sure its panel is open.
        if (this.session.section() === '8086') this.ws.open(step.tab === 'program' ? 'program' : 'state', false);
      }
      if (step.open !== undefined) {
        this.session.exploded.set(step.open);
        if (step.open && this.session.explodeAmount() === 0) this.session.explodeAmount.set(100);
      }
      setTimeout(() => this.world()?.focusSelected(step.view), 450);
    };
    if (this.session.section() === step.station) place();
    else {
      void this.router.navigateByUrl('/' + step.station).then(() => setTimeout(place, 400));
    }
  }

  tourExit(): void {
    this.session.tourIndex.set(null);
  }

  /** The scene measured its own frames; an automatic change never overrides a profile the student chose. */
  suggestQuality(tier: 'high' | 'balanced' | 'low'): void {
    if (this.session.qualityChosen) return;
    this.session.quality.set(tier);
    const names = { high: 'Detalle', balanced: 'Equilibrado', low: 'Ligero' };
    this.session.notice.set(`Gráficos ajustados automáticamente a «${names[tier]}». Puedes cambiarlo en Gráficos.`);
  }

  /** A piece chosen by the student; the first choice opens the inspector, a minimized one stays minimized. */
  pick(id: string): void {
    this.aimNotice.set(null);
    this.session.part(id);
    const inspector = this.ws.layout().panels.find((p) => p.id === 'inspector');
    if (inspector && !inspector.open) this.ws.open('inspector', false);
  }

  focusSelected(): void {
    this.world()?.focusSelected();
  }

  /** Double click on a map marker or tray card: select, then frame. */
  focusPiece(id: string): void {
    this.pick(id);
    queueMicrotask(() => this.world()?.focusSelected());
  }

  orbitTo(azimuth: number): void {
    this.world()?.orbitTo(azimuth);
  }

  /** The scene is deferred, so a picture request waits (up to a few seconds) until it exists. */
  private async whenWorld(): Promise<AtriumSceneComponent | undefined> {
    for (let i = 0; i < 100; i++) {
      const world = this.world();
      if (world) return world;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    return undefined;
  }
  readonly stationThumbnailer = async (section: Section) =>
    (await this.whenWorld())?.stationThumbnail(section) ?? null;
  readonly thumbnailer = async (id: string, size: number) =>
    (await this.whenWorld())?.thumbnail(id, size) ?? null;

  /** Lights the selected piece. The lamp is switched on too, because an unlit lamp shows nothing. */
  aimSelected(): void {
    const id = this.session.activePart();
    this.session.lampOn.set(true);
    const result = this.world()?.aimLampAt(id) ?? 'missing';
    if (result === 'aimed') this.aimNotice.set(null);
    else if (result === 'limit')
      this.aimNotice.set(
        `${this.pieceName(id)} queda fuera del alcance del brazo: la luz se detiene en el borde.`,
      );
    else this.aimNotice.set('Selecciona una pieza del banco para iluminarla.');
  }

  private pieceName(id: string): string {
    return this.session.catalogPieces().find((p) => p.id === id)?.name ?? id;
  }

  /** The hover label follows the pointer through the DOM, without a change-detection pass per move. */
  moveTip(event: PointerEvent): void {
    const tip = this.tip()?.nativeElement;
    if (!tip) return;
    const stage = (event.currentTarget as HTMLElement).getBoundingClientRect();
    tip.style.transform = `translate(${event.clientX - stage.left + 14}px, ${event.clientY - stage.top + 16}px)`;
  }

  ngOnDestroy(): void {
    this.session.dispose();
    this.navigation?.unsubscribe();
    document.removeEventListener('visibilitychange', this.visibility);
    this.context?.revert();
    this.viewport.detachStage();
    this.media?.removeEventListener('change', this.mediaChanged);
  }
}
