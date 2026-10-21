import { Injectable, computed, signal } from '@angular/core';
import { asText, importFile, importText, kindOf } from '../simulation/pc/pc-files';
import {
  boot,
  powerOff,
  powerOn,
  pressKey,
  stepPc,
  typeText,
  type PcEvent,
  type PcState,
} from '../simulation/pc/pc-model';
import { PC_PROGRAMS, freshPc, programById, type PcProgram } from '../simulation/pc/pc-programs';
import { createArtifact, type LearningArtifact } from '../simulation/learning-artifact';

const HISTORY_LIMIT = 4000;

/**
 * The PC exercise: its state, the history that «Atrás» walks and the events of the last step. The state is
 * immutable, so each step keeps the whole previous machine (RAM, SSD, queues and monitor) at no cost.
 */
@Injectable({ providedIn: 'root' })
export class PcSession {
  readonly programs = PC_PROGRAMS;
  readonly programId = signal<PcProgram['id']>('hola-sondeo');
  readonly state = signal<PcState>(freshPc('hola-sondeo'));
  /** States before each step, oldest first. */
  private readonly past = signal<readonly PcState[]>([]);
  /** Events of the last step, in the order they happened. */
  readonly events = signal<readonly PcEvent[]>([]);
  readonly waiting = signal(false);
  /** Transfer of the last step being followed one by one (grain «transfer»), or undefined for the whole step. */
  readonly focus = signal<number | undefined>(undefined);
  readonly message = signal('');
  readonly revision = signal(0);

  readonly program = computed(() => programById(this.programId()));
  /** The machine as it was before the last step, to compare what the step changed. */
  readonly before = computed(() => this.past().at(-1));
  readonly canBack = computed(() => this.past().length > 0);
  readonly stepCount = computed(() => this.past().length);
  readonly powered = computed(() => this.state().power === 'on');
  readonly halted = computed(() => this.state().halted);
  /** The CPU is still running the loader, not yet the program. */
  readonly booting = computed(() => this.powered() && this.state().pc < 0x1000);
  readonly files = computed(() => Object.keys(this.state().ssd));

  /** What the session file keeps of the PC: the exercise and the whole machine (the undo history is not saved). */
  toPart() {
    return { programId: this.programId(), state: this.state() };
  }

  fromPart(part: { programId: PcProgram['id']; state: PcState }): void {
    this.programId.set(part.programId);
    this.past.set([]);
    this.state.set(part.state);
    this.events.set([]);
    this.focus.set(undefined);
    this.waiting.set(false);
    this.message.set('');
    this.revision.update((n) => n + 1);
  }

  private commit(next: PcState, events: readonly PcEvent[]): void {
    this.past.update((h) => [...h.slice(-(HISTORY_LIMIT - 1)), this.state()]);
    this.state.set(next);
    this.events.set(events);
    this.focus.set(undefined);
    this.waiting.set(false);
    this.revision.update((n) => n + 1);
  }

  /** The next step: switching on first, then each instruction. Returns false when nothing happened. */
  step(): boolean {
    this.message.set('');
    const current = this.state();
    if (current.power === 'off') {
      const on = powerOn(current);
      this.commit(on.state, on.events);
      return true;
    }
    const out = stepPc(current);
    if (out.kind === 'waiting') {
      this.waiting.set(true);
      this.message.set('Esperando teclado');
      return false;
    }
    if (out.kind === 'fault') {
      this.message.set(out.message);
      return false;
    }
    this.commit(out.state, out.events);
    return out.kind === 'executed' || out.kind === 'halted';
  }

  /**
   * Grain «transfer»: shows the transfers of one instruction one after another without running it again.
   * After the last one, the next call runs the following instruction and starts at its first transfer.
   */
  nextTransfer(): boolean {
    const total = this.events().length;
    const at = this.focus();
    if (at !== undefined && at < total - 1) {
      this.focus.set(at + 1);
      return true;
    }
    const moved = this.step();
    if (moved && this.events().length) this.focus.set(0);
    return moved;
  }

  backTransfer(): boolean {
    const at = this.focus();
    if (at !== undefined && at > 0) {
      this.focus.set(at - 1);
      return true;
    }
    if (!this.back()) return false;
    const total = this.events().length;
    this.focus.set(undefined);
    return total >= 0;
  }

  /** Chooses one transfer of the last step to follow; undefined goes back to the whole step. */
  follow(index: number | undefined): void {
    this.focus.set(index !== undefined && index >= 0 && index < this.events().length ? index : undefined);
  }

  /** Undoes one step, restoring RAM, SSD, queues and monitor exactly as they were. */
  back(): boolean {
    const past = this.past();
    if (!past.length) return false;
    this.state.set(past[past.length - 1]);
    this.past.set(past.slice(0, -1));
    this.events.set([]);
    this.focus.set(undefined);
    this.waiting.set(false);
    this.message.set('');
    this.revision.update((n) => n + 1);
    return true;
  }

  /** Switches on and runs the loader at once: the program is in RAM and the PC at its start. */
  bootNow(): void {
    const result = boot(this.state().power === 'on' ? { ...this.state(), power: 'off' } : this.state());
    this.commit(result.state, result.events.flat());
  }

  /** Switching off erases RAM, registers and screen; the SSD keeps its files. */
  shutDown(): void {
    if (!this.powered()) return;
    this.commit(powerOff(this.state()), []);
  }

  /** «Reiniciar ejercicio»: the machine as the fixture leaves it, files included. Different from switching off. */
  resetExercise(): void {
    this.past.set([]);
    this.state.set(freshPc(this.programId()));
    this.events.set([]);
    this.waiting.set(false);
    this.message.set('');
    this.revision.update((n) => n + 1);
  }

  choose(id: PcProgram['id']): void {
    this.programId.set(id);
    this.resetExercise();
  }

  /** A key of the real keyboard; the program that waits for one can go on. */
  press(code: number): void {
    this.apply(() => pressKey(this.state(), code));
  }

  type(text: string): void {
    this.apply(() => typeText(this.state(), text));
  }

  /** Brings text in as a file of the SSD (an action of its own, apart from reading it into RAM). */
  importText(name: string, text: string): void {
    this.apply(() => ({ ...this.state(), ssd: importText(this.state().ssd, name, text) }));
  }

  importBytes(name: string, bytes: readonly number[]): void {
    this.apply(() => ({ ...this.state(), ssd: importFile(this.state().ssd, name, bytes) }));
  }

  fileText(name: string): string | undefined {
    this.revision();
    try {
      return asText(this.state().ssd, name);
    } catch {
      return undefined;
    }
  }

  kind(name: string) {
    return kindOf(name);
  }

  /** The mosaic on the monitor (or the one in the SSD) as an artifact the SoC can take. */
  imageArtifact(): LearningArtifact<'tile-image'> | undefined {
    const s = this.state();
    const pixels = s.monitor.mode === 'image' ? s.monitor.pixels : undefined;
    const source = asText(s.ssd, 'imagen.csv');
    const input = source?.split(',').map(Number);
    if (!input || input.length !== 64) return undefined;
    return createArtifact('tile-image', 'machine', {
      width: 8,
      height: 8,
      pixels: input,
      ...(pixels && pixels.length === 64 ? { result: [...pixels] } : {}),
    });
  }

  /** Applies a change that may be refused; the explanation goes to `message` and the machine stays as it was. */
  private apply(change: () => PcState): void {
    try {
      const next = change();
      this.state.set(next);
      this.waiting.set(false);
      this.message.set('');
      this.revision.update((n) => n + 1);
    } catch (e) {
      this.message.set((e as Error).message);
    }
  }
}
