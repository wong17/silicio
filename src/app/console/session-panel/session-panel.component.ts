import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LabSession, type Quality } from '../../laboratory/lab-session.service';

/** Session files, comfort settings and the keyboard shortcuts that drive the bench. */
@Component({
  selector: 'app-session-panel',
  imports: [FormsModule],
  templateUrl: './session-panel.component.html',
  styleUrl: './session-panel.component.scss',
})
export class SessionPanelComponent {
  readonly session = inject(LabSession);
  readonly shortcuts: [keys: string, action: string][] = [
    ['[  ]', 'Girar la vista'],
    ['+  −', 'Acercar y alejar'],
    ['0', 'Centrar el banco'],
    ['F', 'Enfocar la pieza seleccionada'],
    ['E', 'Abrir o cerrar el chip'],
    ['W', 'Alternar material y malla'],
    ['I', 'Inspección cercana'],
    ['L', 'Encender o apagar la lámpara'],
    ['M', 'Manipular objetos'],
    ['Esc', 'Cancelar manipulación'],
  ];

  quality(value: string): void {
    this.session.setQuality(value as Quality);
  }

  importFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (file) void this.session.importSession(file);
  }
}
