import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LabSession } from '../../../laboratory/lab-session.service';
import { SimulationCoordinator } from '../../../laboratory/controllers/simulation-coordinator';
import { MAX_FILE_BYTES, MAX_TEXT_CHARS, asText, kindOf, parseCsv } from '../../../simulation/pc/pc-files';
import { decode, format } from '../../../simulation/pc/pc-isa';
import { PROGRAM_BASE, describeKey } from '../../../simulation/pc/pc-model';
import { programWords } from '../../../simulation/pc/pc-programs';
import { TileEditorComponent } from '../../../shared/tile-editor/tile-editor.component';

const ECHO_LIMIT = 40;

/**
 * «Programa y entradas»: which exercise, the machine's power, the program as the processor reads it, the real
 * keyboard and the files of the SSD. Bringing a file in (to the SSD) is a different action from reading it into
 * RAM, which only the program does with READ_FILE.
 */
@Component({
  selector: 'app-pc-program',
  imports: [FormsModule, TileEditorComponent],
  templateUrl: './pc-program.component.html',
  styleUrl: './pc-program.component.scss',
})
export class PcProgramComponent {
  readonly session = inject(LabSession);
  readonly pc = this.session.pc;
  private readonly coordinator = inject(SimulationCoordinator);
  readonly maxText = MAX_TEXT_CHARS;
  readonly selectedFile = signal('nota.txt');
  /** Text being typed for the selected file; empty until the student edits. */
  readonly draft = signal<string | undefined>(undefined);
  /** What the keyboard field shows: the keys sent since the last Enter. */
  readonly echo = signal('');
  readonly editable = ['datos.csv', 'nota.txt', 'imagen.csv'] as const;

  readonly listing = computed(() => {
    this.pc.revision();
    const state = this.pc.state();
    const fromRam = state.power === 'on' && state.ram.program.some((w) => w !== 0);
    const words = fromRam ? state.ram.program : programWords(this.pc.program());
    const length = programWords(this.pc.program()).length;
    return {
      where: fromRam ? 'RAM · región de programa' : 'SSD · programa.bin (aún no está en la RAM)',
      lines: Array.from(words.slice(0, length), (w, i) => ({ address: PROGRAM_BASE + i, word: w >>> 0, text: format(decode(w)) })),
    };
  });
  readonly queue = computed(() => {
    this.pc.revision();
    return this.pc.state().keyboard.map(describeKey);
  });
  readonly files = computed(() => {
    this.pc.revision();
    return Object.entries(this.pc.state().ssd).map(([name, bytes]) => {
      let preview = '';
      try {
        preview = kindOf(name) === 'program' ? bytes.length / 4 + ' palabras' : (asText(this.pc.state().ssd, name) ?? '').slice(0, 48);
      } catch {
        preview = '(no es texto válido)';
      }
      return { name, bytes: bytes.length, preview };
    });
  });
  readonly fileText = computed(() => {
    this.pc.revision();
    return this.draft() ?? this.pc.fileText(this.selectedFile()) ?? '';
  });
  readonly tileValues = computed(() => {
    this.pc.revision();
    try {
      return parseCsv(this.pc.fileText('imagen.csv') ?? '');
    } catch {
      return Array(64).fill(0);
    }
  });
  readonly isTile = computed(() => this.selectedFile() === 'imagen.csv');

  choose(id: string): void {
    this.pc.choose(id as never);
    this.draft.set(undefined);
    this.selectedFile.set(this.pc.program().id === 'suma-archivo' ? 'datos.csv' : this.pc.program().id === 'imagen-inversa' ? 'imagen.csv' : 'nota.txt');
  }

  /** The first step switches on; the loader then runs by itself, instruction by instruction, as the PC does. */
  powerOn(): void {
    if (!this.pc.powered()) this.pc.bootNow();
  }

  select(name: string): void {
    this.selectedFile.set(name);
    this.draft.set(undefined);
  }

  saveText(): void {
    this.pc.importText(this.selectedFile(), this.fileText());
    if (!this.pc.message()) this.draft.set(undefined);
  }

  saveTile(values: number[]): void {
    this.pc.importText('imagen.csv', values.join(','));
  }

  async upload(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      this.pc.message.set('El archivo supera 64 KiB (' + file.size + ' bytes).');
      return;
    }
    this.pc.importBytes(this.selectedFile(), [...new Uint8Array(await file.arrayBuffer())]);
    if (!this.pc.message()) this.draft.set(undefined);
  }

  /**
   * Characters typed in the capture field go to the keyboard controller; Enter is its own key. The field keeps
   * what was sent (like a terminal line) so the student sees it; a key already sent cannot be taken back.
   */
  onInput(event: Event): void {
    const field = event.target as HTMLInputElement;
    const sent = this.echo();
    if (field.value.length > sent.length && field.value.startsWith(sent)) {
      this.pc.type(field.value.slice(sent.length));
      this.echo.set(field.value.length >= ECHO_LIMIT ? '' : field.value);
    }
    field.value = this.echo();
  }

  onKey(event: KeyboardEvent): void {
    if (event.key !== 'Enter' || event.ctrlKey || event.metaKey || event.altKey) return;
    event.preventDefault();
    this.pc.press(10);
    this.echo.set('');
    (event.target as HTMLInputElement).value = '';
  }

  typeSample(): void {
    const keys = this.pc.program().keys;
    if (!keys) return;
    this.pc.type(keys);
    this.echo.set(keys.replace(/[\r\n]/g, ''));
  }

  restart(): void {
    void this.coordinator.restart();
  }
}
