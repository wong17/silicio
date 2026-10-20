import { Component, ElementRef, EventEmitter, HostListener, inject, Input, Output, signal } from '@angular/core';
import { LabSession, type Quality } from '../../laboratory/lab-session.service';
import { OccludesDirective } from '../../shell/workspace/occludes.directive';

export type SceneCommand =
  | 'rotate-left'
  | 'rotate-right'
  | 'zoom-in'
  | 'zoom-out'
  | 'reset'
  | 'focus'
  | 'explode'
  | 'representation'
  | 'light'
  | 'manipulate'
  | 'drop'
  | 'reset-tools'
  | 'lamp-power'
  | 'callouts'
  | 'tray'
  | 'map'
  | 'tour';

export interface SceneTool {
  command: SceneCommand;
  label: string;
  icon: string;
  /** Keyboard shortcut shown in the tooltip; empty when the action has none. */
  key: string;
  /** Pressed-state tools expose aria-pressed. */
  toggle?: boolean;
  /** Only meaningful on stations whose chip can be opened. */
  chipOnly?: boolean;
}

export interface SceneToolGroup {
  id: string;
  label: string;
  tools: SceneTool[];
}

/**
 * Two groups of scene commands: the camera, then what can be inspected or done on the bench. The third
 * group of the bar, Vistas (Piezas, Mapa, Gráficos), is built in the template from the HUD state.
 */
export const SCENE_TOOL_GROUPS: SceneToolGroup[] = [
  {
    id: 'camera',
    label: 'Cámara',
    tools: [
      { command: 'rotate-left', label: 'Girar a la izquierda', icon: 'rotate-left', key: '[' },
      { command: 'rotate-right', label: 'Girar a la derecha', icon: 'rotate-right', key: ']' },
      { command: 'zoom-in', label: 'Acercar', icon: 'zoom-in', key: '+' },
      { command: 'zoom-out', label: 'Alejar', icon: 'zoom-out', key: '−' },
      { command: 'reset', label: 'Centrar banco', icon: 'frame', key: '0' },
      { command: 'focus', label: 'Enfocar pieza', icon: 'focus', key: 'F' },
    ],
  },
  {
    id: 'inspect',
    label: 'Inspección',
    tools: [
      { command: 'explode', label: 'Abrir o cerrar chip', icon: 'chip', key: 'E', toggle: true, chipOnly: true },
      { command: 'representation', label: 'Malla y material', icon: 'wire', key: 'W', toggle: true },
      { command: 'light', label: 'Inspección cercana', icon: 'magnifier', key: 'I', toggle: true },
      { command: 'callouts', label: 'Rotular piezas', icon: 'label', key: 'T', toggle: true },
      { command: 'lamp-power', label: 'Lámpara encendida', icon: 'bulb', key: 'L', toggle: true },
      { command: 'manipulate', label: 'Manipular objetos', icon: 'move', key: 'M', toggle: true },
      { command: 'drop', label: 'Soltar herramienta', icon: 'drop', key: '' },
      { command: 'reset-tools', label: 'Ordenar bandeja', icon: 'tray', key: '' },
      { command: 'tour', label: 'Modo exposición', icon: 'present', key: 'X', toggle: true },
    ],
  },
];

@Component({
  selector: 'app-scene-toolbar',
  imports: [OccludesDirective],
  templateUrl: './scene-toolbar.component.html',
  styleUrl: './scene-toolbar.component.scss',
  host: { role: 'toolbar', 'aria-label': 'Herramientas del visor', class: 'scene-toolbar' },
})
export class SceneToolbarComponent {
  @Input() section = 'atrium';
  @Input() exploded = false;
  @Input() viewMode: 'material' | 'wireframe' = 'material';
  @Input() inspection = false;
  @Input() manipulate = false;
  @Input() lampOn = true;
  @Input() callouts = false;
  @Input() tour = false;
  /** The memory station shows the DIMM, whose layers can be opened too. */
  @Input() dimm = false;
  /** True while a tool is in hand; the release command has nothing to do otherwise. */
  @Input() holding = false;
  @Output() command = new EventEmitter<SceneCommand>();
  readonly session = inject(LabSession);
  readonly qualities: { value: Quality; label: string; hint: string }[] = [
    { value: 'high', label: 'Detalle', hint: 'Sombras y reflejos completos' },
    { value: 'balanced', label: 'Equilibrado', hint: 'Recomendado' },
    { value: 'low', label: 'Ligero', hint: 'Para equipos modestos' },
  ];
  readonly groups = SCENE_TOOL_GROUPS;
  /** Quality menu of the Gráficos tool: the single place where the graphics profile is chosen. */
  readonly graphicsOpen = signal(false);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  visible(tool: SceneTool): boolean {
    return !tool.chipOnly || this.section === '8086' || this.section === 'apple' || this.section === 'machine' || (this.section === 'memory' && this.dimm);
  }

  pressed(tool: SceneTool): boolean | null {
    if (!tool.toggle) return null;
    switch (tool.command) {
      case 'explode':
        return this.exploded;
      case 'representation':
        return this.viewMode === 'wireframe';
      case 'light':
        return this.inspection;
      case 'manipulate':
        return this.manipulate;
      case 'lamp-power':
        return this.lampOn;
      case 'callouts':
        return this.callouts;
      case 'tour':
        return this.tour;
      default:
        return null;
    }
  }

  /** Releasing with an empty hand is refused, so the control reads as unavailable instead of doing nothing. */
  disabled(tool: SceneTool): boolean {
    return tool.command === 'drop' && !this.holding;
  }

  label(tool: SceneTool): string {
    if (tool.command === 'drop' && !this.holding) return 'Sin herramienta en la mano';
    if (tool.command === 'explode' && this.section === 'machine') return 'Abrir o cerrar el equipo';
    return tool.label;
  }

  chooseQuality(value: Quality): void {
    this.session.setQuality(value);
    this.graphicsOpen.set(false);
  }

  toggleGraphics(): void {
    this.graphicsOpen.update((open) => !open);
  }

  @HostListener('document:keydown.escape')
  closeGraphics(): void {
    this.graphicsOpen.set(false);
  }

  @HostListener('document:pointerdown', ['$event'])
  outside(event: PointerEvent): void {
    const target = event.target as HTMLElement | null;
    if (this.graphicsOpen() && !target?.closest('.views')) this.graphicsOpen.set(false);
    const menu = this.host.querySelector<HTMLDetailsElement>('details.more');
    if (menu?.open && !target?.closest('details.more')) menu.open = false;
  }

  /** Keeps a tooltip inside the scene: it slides sideways instead of overflowing the edge. */
  @HostListener('pointerover', ['$event'])
  @HostListener('focusin', ['$event'])
  placeTip(event: Event): void {
    const tool = (event.target as HTMLElement | null)?.closest<HTMLElement>('.tool');
    const tip = tool?.querySelector<HTMLElement>('.tip');
    const stage = this.host.parentElement;
    if (!tool || !tip || !stage) return;
    tool.style.setProperty('--tip-shift', '0px');
    const bounds = stage.getBoundingClientRect();
    const box = tip.getBoundingClientRect();
    const left = box.left - bounds.left - 8,
      right = bounds.right - box.right - 8;
    tool.style.setProperty('--tip-shift', `${left < 0 ? -left : right < 0 ? right : 0}px`);
  }

  /** The disclosure closes before a command runs, so the view is never framed behind the menu. */
  run(command: SceneCommand, event?: Event): void {
    const menu = (event?.currentTarget as HTMLElement | null)?.closest('details');
    if (menu) menu.open = false;
    this.command.emit(command);
  }
}
