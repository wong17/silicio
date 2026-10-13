import { Component, Input, Output, EventEmitter } from '@angular/core';
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
  | 'reset-tools';
@Component({
  selector: 'app-scene-controls',
  templateUrl: './scene-controls.component.html',
  styleUrl: './scene-controls.component.scss',
  host: { 'aria-label': 'Herramientas del visor' },
})
export class SceneControlsComponent {
  @Input() section = 'atrium';
  @Input() exploded = false;
  @Input() viewMode = 'material';
  @Input() inspection = false;
  @Input() manipulate = false;
  @Output() command = new EventEmitter<SceneCommand>();
}
