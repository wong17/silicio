import { Component, computed, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LabSession } from '../../../laboratory/lab-session.service';
import { SimulationCoordinator } from '../../../laboratory/controllers/simulation-coordinator';
import { LAB_MISSIONS, MISSION_LEVELS } from '../../../content/missions';
import { hex, type DataSymbol } from '../../../simulation/cpu8086';
import { Router } from '@angular/router';
import { LessonContext } from '../../../laboratory/lesson-context.service';
import { createArtifact } from '../../../simulation/learning-artifact';

/** Mission selector, numbered editor with breakpoints, the listing the instruction pointer walks and the variables. */
@Component({
  selector: 'app-program-panel',
  imports: [FormsModule],
  templateUrl: './program-panel.component.html',
  styleUrl: './program-panel.component.scss',
})
export class ProgramPanelComponent {
  readonly session = inject(LabSession);
  private readonly coordinator = inject(SimulationCoordinator);
  private readonly lesson = inject(LessonContext);
  private readonly router = inject(Router);
  /** Editing on a narrow screen asks the shell to show the instrument column. */
  readonly editorFocus = output<void>();
  readonly levels = MISSION_LEVELS.map((l) => ({
    level: l.level,
    missions: l.numbers.map((n) => ({ index: n - 1, title: LAB_MISSIONS[n - 1].title })),
  }));
  readonly mission = computed(() => this.session.missions[this.session.missionIndex()]);
  /** Bumped on each keystroke so the gutter follows the text. */
  private readonly edits = signal(0);
  readonly lineNumbers = computed(() => {
    this.session.revision();
    this.edits();
    return Array.from({ length: this.session.source.split('\n').length }, (_, i) => i + 1);
  });
  readonly errorLine = computed(() => {
    const m = /^Línea (\d+):/.exec(this.session.error());
    return m ? Number(m[1]) : undefined;
  });
  readonly pendingAssembly = computed(() => this.session.source !== this.session.loadedSource());
  readonly variables = computed(() => {
    this.session.revision();
    return this.session.cpu.program?.data ?? [];
  });
  readonly expansions = computed(() => {
    this.session.revision();
    return this.session.cpu.program?.macroExpansions ?? [];
  });

  h(value: number, digits = 4): string {
    return hex(value, digits);
  }

  typed(): void {
    this.edits.update((n) => n + 1);
  }

  syncScroll(gutter: HTMLElement, event: Event): void {
    gutter.scrollTop = (event.target as HTMLTextAreaElement).scrollTop;
  }

  /** Current value of a variable: its bytes or words as they are in the memory on show. */
  valueOf(v: DataSymbol): string {
    this.session.revision();
    const memory = this.session.shownState().memory;
    const base = (this.session.shownState().registers.DS * 16 + v.address) & 0xfffff;
    const count = Math.min(v.length, 8);
    const parts: string[] = [];
    for (let n = 0; n < count; n++) {
      if (v.type === 'byte') parts.push(hex(memory[(base + n) & 0xfffff] ?? 0, 2));
      else parts.push(hex((memory[(base + n * 2) & 0xfffff] ?? 0) | ((memory[(base + n * 2 + 1) & 0xfffff] ?? 0) << 8)));
    }
    return parts.join(' ') + (v.length > count ? ' …' : '');
  }

  /** Mission 01 goes to the SoC chapter as a task (AX and the word at [10]), without retyping it. */
  compareInSoc(): void {
    const regs = this.session.cpu.registers;
    this.lesson.offer(createArtifact('word-task', '8086', { accumulator: this.session.trace()[0]?.before.registers.AX ?? regs.AX, word: this.session.cpu.readWord(regs.DS, 10) }));
    void this.router.navigateByUrl('/apple');
  }

  assembleAndContinue(): void {
    this.session.load();
    if (!this.session.error()) void this.coordinator.step();
  }
}
