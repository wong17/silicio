import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { LabSession } from '../../../laboratory/lab-session.service';
import { LessonContext } from '../../../laboratory/lesson-context.service';
import { pcSceneActivity, type PcEventView } from '../../../laboratory/pc-activity';
import type { EventRole } from '../../../simulation/pc/pc-model';

const ROLES: Record<EventRole, { label: string; hint: string }> = {
  processing: { label: 'Procesamiento', hint: 'La CPU transforma datos' },
  storage: { label: 'Almacenamiento', hint: 'Un dato queda guardado' },
  transfer: { label: 'Transferencia', hint: 'Un dato viaja entre piezas' },
  control: { label: 'Control', hint: 'Se ordena o decide qué pasa' },
};
const PHASE = ['Encendido', 'Búsqueda 1', 'Búsqueda 2', 'Búsqueda 3', 'Ejecución 4', 'Ejecución 5', 'Ejecución 6', 'Ejecución 7'];
const BUS_LABEL = { address: 'Dirección', data: 'Dato', control: 'Control' } as const;
const PIECES: readonly { id: string; label: string }[] = [
  { id: 'cpu', label: 'CPU' },
  { id: 'rom', label: 'ROM' },
  { id: 'ram', label: 'RAM' },
  { id: 'ssd', label: 'SSD' },
  { id: 'keyboard', label: 'Teclado' },
  { id: 'monitor', label: 'Monitor' },
  { id: 'interrupt-controller', label: 'Interrupciones' },
];

/**
 * «Componentes y salida»: the registers of the cycle, the transfers of the step with their function (processing,
 * storage, transfer or control), RAM and SSD apart, and what the monitor shows. It reads the same activity as the
 * bench, so what is lit in 3D is listed here.
 */
@Component({
  selector: 'app-pc-components',
  templateUrl: './pc-components.component.html',
  styleUrl: './pc-components.component.scss',
})
export class PcComponentsComponent {
  readonly session = inject(LabSession);
  readonly pc = this.session.pc;
  private readonly router = inject(Router);
  private readonly lesson = inject(LessonContext);
  readonly pieces = PIECES;
  readonly roles = ROLES;
  readonly activity = computed(() => {
    this.pc.revision();
    return pcSceneActivity(this.pc.state(), this.pc.events());
  });
  readonly selected = this.session.activePart;
  readonly core = computed(() => {
    const r = this.activity().registers;
    return [
      { label: 'PC', text: this.hex(r.pc), piece: 'cpu-pc' },
      { label: 'IR', text: this.hex(r.ir, 8), piece: 'cpu-ir' },
      { label: 'MAR', text: this.hex(r.mar), piece: 'cpu-mar' },
      { label: 'MDR', text: this.hex(r.mdr, 8), piece: 'cpu-mdr' },
    ];
  });
  readonly rows = computed(() => this.activity().events.map((e, index) => ({ ...e, index, phaseLabel: PHASE[e.phase] ?? '' })));
  readonly changes = computed(() => {
    this.pc.revision();
    const map = new Map<string, { before: string; after: string }>();
    for (const e of this.pc.events()) for (const c of e.changes) map.set(c.label, { before: c.before, after: c.after });
    return map;
  });
  readonly regions = computed(() => {
    const ram = this.pc.state().ram;
    const dump = (words: readonly number[]) => words.slice(0, 6).map((w) => (w >>> 0).toString(16).toUpperCase().padStart(8, '0')).join(' ');
    return [
      { id: 'program', label: 'Programa', start: '1000h', words: this.activity().ram.program, dump: dump(ram.program) },
      { id: 'input', label: 'Entrada', start: '1100h', words: this.activity().ram.input, dump: dump(ram.input) },
      { id: 'work', label: 'Trabajo', start: '1500h', words: this.activity().ram.work, dump: dump(ram.work) },
      { id: 'framebuffer', label: 'Pantalla', start: '1600h', words: this.activity().ram.framebuffer, dump: dump(ram.framebuffer) },
    ];
  });
  readonly background = computed(() => {
    this.pc.revision();
    return this.pc.state().ram.work[0];
  });
  readonly files = computed(() => this.activity().ssd);
  readonly pixels = computed(() => this.activity().monitor.pixels);
  readonly bus = BUS_LABEL;

  hex(n: number, digits = 4): string {
    return (n >>> 0).toString(16).toUpperCase().padStart(digits, '0') + 'h';
  }

  change(label: string): { before: string; after: string } | undefined {
    return this.changes().get(label);
  }

  follow(row: PcEventView & { index: number }): void {
    this.pc.follow(this.pc.focus() === row.index ? undefined : row.index);
  }

  pick(id: string): void {
    this.session.part(id);
  }

  selectedIs(...ids: string[]): boolean {
    return ids.includes(this.selected());
  }

  /** Hands the mosaic to the SoC chapter, which compares it without asking for the values again. */
  compare(): void {
    const artifact = this.pc.imageArtifact();
    if (!artifact) {
      this.pc.message.set('Procesa primero la imagen: el mosaico y su resultado son lo que se compara.');
      return;
    }
    this.lesson.offer(artifact);
    void this.router.navigateByUrl('/soc');
  }
}
