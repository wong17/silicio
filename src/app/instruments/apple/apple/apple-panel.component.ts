import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TermDirective } from '../../../shared/term.directive';
import { TileEditorComponent } from '../../../shared/tile-editor/tile-editor.component';
import { LabSession } from '../../../laboratory/lab-session.service';
import { LessonContext } from '../../../laboratory/lesson-context.service';
import { APPLE_UNITS } from '../../../content/apple-m5';
import { compare } from '../../../simulation/risc/load-store-model';

interface Unit {
  id: string;
  area: string;
  label: string;
  count: string;
  color: string;
}

/**
 * The SoC chapter: first the same task written for a CISC (the 8086) and for a load/store RISC, then the shared
 * buffer with a mosaic that comes out inverted, shared or copied. The published M5 units stay as a map to explore.
 */
@Component({
  imports: [TermDirective, TileEditorComponent],
  selector: 'app-apple-panel',
  templateUrl: './apple-panel.component.html',
  styleUrl: './apple-panel.component.scss',
})
export class ApplePanelComponent {
  readonly session = inject(LabSession);
  private readonly lesson = inject(LessonContext);
  private readonly router = inject(Router);
  readonly units: Unit[] = APPLE_UNITS.map(({ id, area, label, count, color }) => ({ id, area, label, count, color }));
  readonly task = signal<'sum' | 'store'>('sum');
  /** Values of the mission: they come from the 8086 when the student sends them. */
  readonly accumulator = signal(7);
  readonly word = signal(5);
  readonly received = signal('');
  readonly comparison = computed(() => compare(this.task(), this.accumulator(), this.word()));
  readonly copies = computed(() => {
    this.session.bufferStage();
    return this.session.bufferCopies;
  });
  readonly mode = computed(() => (this.session.separateMemory() ? 'separate' : 'shared'));
  readonly notice = this.session.bufferNotice;
  readonly tile = computed(() => this.session.bufferView().input.values);
  readonly result = computed(() => this.session.bufferView().output.values);

  hex(n: number): string {
    return n.toString(16).toUpperCase().padStart(2, '0');
  }

  setTask(task: 'sum' | 'store'): void {
    this.task.set(task);
  }

  /** Takes the task the student sent from mission 01 of the 8086, if there is one. */
  receiveTask(): void {
    try {
      const task = this.lesson.receive('word-task', 'soc');
      this.accumulator.set(task.accumulator);
      this.word.set(task.word);
      this.received.set('Recibida del 8086: AX = ' + task.accumulator + ' y la palabra de [10] = ' + task.word + '.');
    } catch (e) {
      this.received.set((e as Error).message + ' Envíala desde la misión 01 del Banco 8086.');
    }
  }

  /** Takes the mosaic the student sent from the PC, with no retyping. */
  receiveTile(): void {
    try {
      const tile = this.lesson.receive('tile-image', 'soc');
      this.session.setBufferTile(tile.pixels);
      this.received.set('Mosaico recibido del PC: 64 valores. Recorre la dependencia para invertirlo.');
    } catch (e) {
      this.received.set((e as Error).message + ' Procésalo en La máquina y usa «Comparar este resultado en el SoC».');
    }
  }

  editTile(values: number[]): void {
    this.session.setBufferTile(values);
  }

  setMode(mode: 'shared' | 'separate'): void {
    this.session.setBufferMode(mode);
  }

  backToPc(): void {
    void this.router.navigateByUrl('/machine');
  }
}
