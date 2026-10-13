import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  NgZone,
  OnDestroy,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { gsap } from 'gsap';
import Lenis from 'lenis';
import { EXPERIENCES } from './content/experiences';
import { LabSession, type Tab } from './laboratory/lab-session.service';
import type { Section } from './world/scene-inputs';
import { AtriumSceneComponent } from './world/atrium-scene.component';
import { SceneToolbarComponent, type SceneCommand } from './world/scene-toolbar/scene-toolbar.component';
import { ExperienceNavComponent } from './shell/experience-nav/experience-nav.component';
import { ConsoleHeaderComponent } from './console/console-header/console-header.component';
import { AtriumPortalsComponent } from './console/atrium-portals/atrium-portals.component';
import { LightPadComponent } from './console/light-pad/light-pad.component';
import { PieceInspectorComponent } from './console/piece-inspector/piece-inspector.component';
import { SessionPanelComponent } from './console/session-panel/session-panel.component';
import { TransportComponent } from './instruments/cpu/transport/transport.component';
import { RegisterPanelComponent } from './instruments/cpu/register/register-panel.component';
import { AluPanelComponent } from './instruments/cpu/alu/alu-panel.component';
import { ProgramPanelComponent } from './instruments/cpu/program/program-panel.component';
import { TracePanelComponent } from './instruments/cpu/trace/trace-panel.component';
import { MemoryPanelComponent } from './instruments/memory/memory/memory-panel.component';
import { DimmPanelComponent } from './instruments/memory/dimm/dimm-panel.component';
import { ApplePanelComponent } from './instruments/apple/apple/apple-panel.component';
import { SignalPanelComponent } from './instruments/signal/signal/signal-panel.component';
import { MachineInstrumentComponent } from './instruments/machine/machine-instrument.component';

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
 * Application shell: routing, layout modes, scene commands and motion. Session state lives in
 * LabSession; instruments read it directly, so this component only composes them.
 */
@Component({
  selector: 'app-root',
  imports: [
    RouterLink,
    ExperienceNavComponent,
    AtriumSceneComponent,
    SceneToolbarComponent,
    ConsoleHeaderComponent,
    AtriumPortalsComponent,
    LightPadComponent,
    PieceInspectorComponent,
    SessionPanelComponent,
    TransportComponent,
    RegisterPanelComponent,
    AluPanelComponent,
    ProgramPanelComponent,
    TracePanelComponent,
    MemoryPanelComponent,
    DimmPanelComponent,
    ApplePanelComponent,
    SignalPanelComponent,
    MachineInstrumentComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements AfterViewInit, OnDestroy {
  readonly session = inject(LabSession);
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
    if (held) return `En la mano: ${this.pieceName(held)} · Soltar herramienta la deja caer`;
    return this.session.manipulate()
      ? 'Manipulación activa · arrastra la vista o un objeto'
      : 'Selecciona una pieza · arrastra el anillo de la lámpara para iluminar';
  });
  readonly current = computed(() => EXPERIENCES.find((e) => e.id === this.session.section()));
  readonly accent = computed(
    () => EXPERIENCES.find((e) => e.id === this.session.section())?.accent ?? '#d7ac6f',
  );
  private readonly world = viewChild<AtriumSceneComponent>('world');
  private readonly tip = viewChild<ElementRef<HTMLElement>>('tip');
  private readonly consoleEl = viewChild.required<ElementRef<HTMLElement>>('console');
  private readonly consoleInner = viewChild.required<ElementRef<HTMLElement>>('consoleInner');
  private navigation?: Subscription;
  private lenis?: Lenis;
  private context?: gsap.Context;
  private media?: MediaQueryList;
  private ticker = (seconds: number) => this.lenis?.raf(seconds * 1000);
  private mediaChanged = () => {
    this.session.reduced.set(this.media?.matches ?? false);
  };

  constructor() {
    this.navigation = this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe(() => this.route());
    // Motion follows the preference whichever control changed it: the system setting or the panel.
    effect(() => this.applyMotion(this.session.reduced()));
  }

  private route(): void {
    this.session.pause();
    const id = this.router.url.split('?')[0].split('/')[1] as Section;
    const section: Section = EXPERIENCES.some((e) => e.id === id) ? id : 'atrium';
    this.session.section.set(section);
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
    this.session.tab.set('state' as Tab);
    this.consoleEl().nativeElement.scrollTo(0, 0);
  }

  ngAfterViewInit(): void {
    this.session.attachWorker();
    this.media = matchMedia('(prefers-reduced-motion: reduce)');
    this.session.loadPreferences(this.media.matches, matchMedia(NARROW).matches);
    this.media.addEventListener('change', this.mediaChanged);
    this.zone.runOutsideAngular(() => {
      if (!matchMedia(NARROW).matches)
        this.lenis = new Lenis({
          wrapper: this.consoleEl().nativeElement,
          content: this.consoleInner().nativeElement,
          autoRaf: false,
          duration: 0.85,
          prevent: (node) => node.tagName === 'TEXTAREA',
        });
      gsap.ticker.add(this.ticker);
      this.applyMotion(this.session.reduced());
      this.context = gsap.context(() => {
        if (this.session.reduced()) return;
        gsap
          .timeline({ defaults: { duration: 0.8, ease: 'power3.out' } })
          .from('.title-block', { y: 18, opacity: 0 }, 0)
          .from('app-experience-nav .links a', { y: 10, opacity: 0, stagger: 0.06 }, 0.2);
      }, this.host.nativeElement);
    });
  }

  private applyMotion(reduced: boolean): void {
    if (!this.lenis) return;
    if (reduced) this.lenis.stop();
    else this.lenis.start();
  }

  setLayout(mode: Layout): void {
    this.layout.set(mode);
    this.session.manipulate.set(false);
    this.lenis?.resize();
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
    if (target instanceof Element && target.closest('input, textarea, select, [contenteditable="true"]'))
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
    };
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

  pick(id: string): void {
    this.aimNotice.set(null);
    this.session.part(id);
  }

  focusSelected(): void {
    this.world()?.focusSelected();
  }

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
    this.context?.revert();
    gsap.ticker.remove(this.ticker);
    this.lenis?.destroy();
    this.media?.removeEventListener('change', this.mediaChanged);
  }
}
