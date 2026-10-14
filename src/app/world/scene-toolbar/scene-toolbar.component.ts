import { Component, EventEmitter, Input, Output } from '@angular/core';

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

/** Ordered like a 3D editor: view first, then the object, then bench tools. */
export const SCENE_TOOL_GROUPS: SceneToolGroup[] = [
  {
    id: 'view',
    label: 'Vista',
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
    id: 'object',
    label: 'Objeto',
    tools: [
      { command: 'explode', label: 'Abrir o cerrar chip', icon: 'chip', key: 'E', toggle: true, chipOnly: true },
      { command: 'representation', label: 'Malla y material', icon: 'wire', key: 'W', toggle: true },
      { command: 'light', label: 'Inspección cercana', icon: 'magnifier', key: 'I', toggle: true },
      { command: 'callouts', label: 'Rotular piezas', icon: 'label', key: 'T', toggle: true },
    ],
  },
  {
    id: 'bench',
    label: 'Banco',
    tools: [
      { command: 'lamp-power', label: 'Lámpara encendida', icon: 'bulb', key: 'L', toggle: true },
      { command: 'manipulate', label: 'Manipular objetos', icon: 'move', key: 'M', toggle: true },
      { command: 'drop', label: 'Soltar herramienta', icon: 'drop', key: '' },
      { command: 'reset-tools', label: 'Ordenar bandeja', icon: 'tray', key: '' },
      { command: 'tour', label: 'Modo exposición', icon: 'present', key: 'X', toggle: true },
    ],
  },
];

/** Shown directly in the narrow dock; the rest live in the "more" disclosure. */
export const PRIMARY_COMMANDS: SceneCommand[] = [
  'rotate-left',
  'rotate-right',
  'zoom-in',
  'zoom-out',
  'reset',
  'focus',
];

@Component({
  selector: 'app-scene-toolbar',
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
  readonly groups = SCENE_TOOL_GROUPS;
  /** The narrow dock shows these in the order of PRIMARY_COMMANDS. */
  readonly primaryTools = PRIMARY_COMMANDS.map((command) =>
    SCENE_TOOL_GROUPS.flatMap((group) => group.tools).find((tool) => tool.command === command),
  ).filter((tool): tool is SceneTool => !!tool);

  /** Every tool except the primary dock ones, in group order, for the mobile disclosure. */
  readonly secondaryGroups = SCENE_TOOL_GROUPS.map((group) => ({
    ...group,
    tools: group.tools.filter((tool) => !PRIMARY_COMMANDS.includes(tool.command)),
  })).filter((group) => group.tools.length);

  visible(tool: SceneTool): boolean {
    return !tool.chipOnly || this.section === '8086' || this.section === 'apple' || (this.section === 'memory' && this.dimm);
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
    return tool.label;
  }

  /** The mobile disclosure closes before a command runs, so the view is never framed behind the menu. */
  run(command: SceneCommand, event?: Event): void {
    const menu = (event?.currentTarget as HTMLElement | null)?.closest('details');
    if (menu) menu.open = false;
    this.command.emit(command);
  }
}
