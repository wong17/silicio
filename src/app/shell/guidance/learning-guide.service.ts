import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { LabSession } from '../../laboratory/lab-session.service';
import { SimulationCoordinator } from '../../laboratory/controllers/simulation-coordinator';
import { WorkspaceService } from '../workspace/workspace.service';
import { LEARNING_PATHS, firstPending, pathById, type GuideContext, type LearningPath } from '../../content/learning-paths';
import { GUIDE_RENDERER } from './guide-renderer';

const ANCHOR_WAIT_MS = 1500;
const ANCHOR_POLL_MS = 50;
export const GUIDE_PATH_ROUTE: Record<string, string> = { '8086': '8086', memory: 'memory', machine: 'machine', apple: 'apple' };

/**
 * Guides the student by actions: each step highlights something, asks for one thing and moves on when the real
 * state shows it happened. It opens the panel a step needs, waits for the element to exist, skips a step whose
 * anchor is missing with a notice, and always leaves an exit.
 */
@Injectable({ providedIn: 'root' })
export class LearningGuide {
  private readonly session = inject(LabSession);
  private readonly coordinator = inject(SimulationCoordinator);
  private readonly workspace = inject(WorkspaceService);
  private readonly router = inject(Router);
  private readonly renderer = inject(GUIDE_RENDERER);
  readonly paths = LEARNING_PATHS;
  readonly active = signal<{ path: LearningPath; index: number } | undefined>(undefined);
  readonly notice = signal('');
  private opener?: HTMLElement | null;
  private serial = 0;

  /** The facts of the laboratory a step may check. */
  readonly context = computed<GuideContext>(() => {
    const s = this.session;
    const pc = s.pc;
    pc.revision();
    s.revision();
    const t = this.coordinator.transport();
    return {
      section: s.section(),
      missionNumber: s.missions[s.missionIndex()].number,
      sourceEdited: s.source !== s.missions[s.missionIndex()].source,
      assembled: s.source === s.loadedSource(),
      executed: s.cursor() + 1,
      halted: s.state().halted,
      ax: s.state().registers.AX,
      grain: this.coordinator.grain() ?? t?.unit,
      screen: s.io().screen,
      memoryActivity: s.memoryLesson.activity(),
      memoryStep: s.memoryLesson.step(),
      pcPowered: pc.powered(),
      pcSteps: pc.stepCount(),
      pcHalted: pc.halted(),
      pcMonitor: pc.state().monitor.text,
      socStage: s.bufferStage(),
      socCompleted: s.bufferView().completed,
    };
  });

  constructor() {
    // The state decides when a step is done.
    effect(() => {
      const c = this.context();
      const a = this.active();
      if (!a) return;
      untracked(() => {
        const step = a.path.steps[a.index];
        if (step?.done?.(c)) void this.goTo(a.path, firstPending(a.path, c, a.index + 1));
      });
    });
    // The exhibition mode and a guide never share the screen.
    effect(() => {
      if (this.session.tourIndex() !== null && untracked(() => this.active())) untracked(() => this.cancel());
    });
    // Leaving the chapter of the guide ends it.
    effect(() => {
      const section = this.session.section();
      const a = untracked(() => this.active());
      if (a && a.path.experience !== section) untracked(() => this.cancel());
    });
  }

  /** Starts (or repeats) a path. Refused while the exhibition mode is on, so the two never overlap. */
  async start(id: string): Promise<boolean> {
    const path = pathById(id);
    if (!path) return false;
    if (this.session.tourIndex() !== null) {
      this.notice.set('Cierra el modo exposición antes de empezar una guía.');
      return false;
    }
    this.cancel();
    this.notice.set('');
    this.opener = typeof document !== 'undefined' ? (document.activeElement as HTMLElement | null) : null;
    if (this.session.section() !== path.experience) {
      await this.router.navigateByUrl('/' + GUIDE_PATH_ROUTE[path.experience]);
      await new Promise((r) => setTimeout(r, 0));
    }
    this.active.set({ path, index: 0 });
    await this.goTo(path, firstPending(path, this.context(), 0));
    return true;
  }

  /** Ends the guide at any moment, clears the highlight and returns the focus to where it was. */
  cancel(): void {
    this.serial++;
    if (!this.active()) return;
    this.active.set(undefined);
    this.renderer.hide();
    const opener = this.opener;
    this.opener = undefined;
    if (opener && typeof opener.focus === 'function' && document.contains(opener)) opener.focus();
  }

  /** The student finished an informative step. */
  next(): void {
    const a = this.active();
    if (a) void this.goTo(a.path, firstPending(a.path, this.context(), a.index + 1));
  }

  private async goTo(path: LearningPath, index: number): Promise<void> {
    const mine = ++this.serial;
    if (index >= path.steps.length) {
      this.active.set(undefined);
      this.renderer.hide();
      this.notice.set('Guía completada: ' + path.goal);
      return;
    }
    this.active.set({ path, index });
    const step = path.steps[index];
    if (step.panel) this.workspace.reveal(step.panel);
    const waited = await this.waitFor(step.anchor, mine);
    if (mine !== this.serial) return;
    if (!waited) {
      this.notice.set('No encontré «' + step.title + '» en pantalla; sigo con el siguiente paso.');
      await this.goTo(path, index + 1);
      return;
    }
    try {
      await this.renderer.show({
        step,
        index,
        total: path.steps.length,
        manual: !step.done,
        reducedMotion: this.session.reduced(),
        onNext: () => this.next(),
        onExit: () => this.cancel(),
      });
    } catch {
      if (mine === this.serial) await this.goTo(path, index + 1);
    }
  }

  private async waitFor(selector: string, serial: number): Promise<boolean> {
    for (let waited = 0; waited <= ANCHOR_WAIT_MS; waited += ANCHOR_POLL_MS) {
      if (serial !== this.serial) return false;
      if (document.querySelector(selector)) return true;
      await new Promise((r) => setTimeout(r, ANCHOR_POLL_MS));
    }
    return false;
  }
}
