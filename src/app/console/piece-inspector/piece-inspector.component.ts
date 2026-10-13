import { Component, computed, inject, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LabSession } from '../../laboratory/lab-session.service';

/**
 * Accessible equivalent of clicking in the 3D bench: every selectable piece is listed here, and the
 * description explains what the selected piece is for.
 */
@Component({
  selector: 'app-piece-inspector',
  imports: [FormsModule],
  templateUrl: './piece-inspector.component.html',
  styleUrl: './piece-inspector.component.scss',
})
export class PieceInspectorComponent {
  readonly session = inject(LabSession);
  readonly focus = output<void>();
  readonly name = computed(() => {
    const id = this.session.activePart();
    return this.session.catalogPieces().find((p) => p.id === id)?.name ?? id.replaceAll('-', ' ');
  });
}
