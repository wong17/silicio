import { Component, computed, inject } from '@angular/core';
import { LabSession } from '../../../laboratory/lab-session.service';
import { RAM_STEPS } from '../../../laboratory/memory-lesson.service';
import { hex } from '../../../simulation/cpu8086';
import { CachePanelComponent } from '../cache/cache-panel.component';
import { DimmPanelComponent } from '../dimm/dimm-panel.component';
import { aliasOf, bankOf, formatWord, windowOf, wordCycles } from '../../../simulation/memory-lesson';

/**
 * «Resultado» of the memory chapter: the cells and the word, the address being built step by step, the cache
 * table or the DDR4 module, according to the open exercise.
 */
@Component({
  selector: 'app-memory-result',
  imports: [CachePanelComponent, DimmPanelComponent],
  templateUrl: './memory-result.component.html',
  styleUrl: './memory-result.component.scss',
})
export class MemoryResultComponent {
  readonly session = inject(LabSession);
  readonly lesson = this.session.memoryLesson;
  readonly ramSteps = RAM_STEPS;
  readonly physical = this.session.physical;
  readonly low = computed(() => this.session.memoryByte(this.session.physical()));
  readonly high = computed(() => this.session.memoryByte(this.session.physical() + 1));
  readonly word = this.session.wordAtAddress;
  readonly formatted = computed(() => formatWord(this.word(), this.lesson.format()));
  readonly cycles = computed(() => wordCycles(this.physical()));
  readonly bank = computed(() => bankOf(this.physical()));
  readonly window = computed(() => windowOf(this.physical()));
  readonly alias = computed(() => aliasOf({ segment: this.session.segment(), offset: this.session.offset() }));
  readonly revealed = computed(() => this.lesson.progress().addresses);
  readonly stored = computed(() => this.lesson.progress().store);
  readonly built = this.lesson.built;
  /** Names of the program's variables over the cells they occupy (session origin only). */
  readonly names = computed(() => {
    this.session.revision();
    const map = new Map<number, string>();
    if (this.lesson.origin() !== 'session') return map;
    const ds = this.session.shownState().registers.DS;
    for (const v of this.session.cpu.program?.data ?? [])
      map.set((ds * 16 + v.address) & 0xfffff, v.name + (v.length > 1 ? '[0]' : ''));
    return map;
  });

  h(value: number, digits = 4): string {
    return hex(value, digits);
  }

  heat(value: number): string {
    return String(value / 255);
  }
}
