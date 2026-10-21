import { Component, computed, ElementRef, inject, output, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { COURSE_MAP, EMU8086_EQUIVALENCES, type CourseTopic } from '../../content/course-map';
import { GLOSSARY, searchGlossary } from '../../content/glossary';
import { LabSession, type Quality } from '../../laboratory/lab-session.service';
import { TermDirective } from '../../shared/term.directive';
import { LearningGuide } from '../guidance/learning-guide.service';
import { LEARNING_PATHS } from '../../content/learning-paths';

type HelpSection = 'start' | 'course' | 'emu' | 'glossary' | 'shortcuts' | 'session' | 'preferences' | 'scope';

/**
 * Ayuda, top right on every station: how to start, the topics of the course, the EMU8086 equivalences,
 * glossary, shortcuts, session files, preferences and the limits of the model. Opening it pauses the
 * simulation; closing it never resumes it on its own.
 */
@Component({
  selector: 'app-help-dialog',
  imports: [FormsModule, TermDirective],
  templateUrl: './help-dialog.component.html',
  styleUrl: './help-dialog.component.scss',
})
export class HelpDialogComponent {
  readonly session = inject(LabSession);
  private readonly router = inject(Router);
  readonly guide = inject(LearningGuide);
  /** Guides by actions; the usage tutorial of each chapter has its own button at the top. */
  readonly paths = LEARNING_PATHS.filter((p) => !p.id.endsWith('-tutorial'));
  /** The tutorial of the chapter on screen, if it has one. */
  readonly tutorial = computed(() => {
    const chapter = this.session.section() === 'apple' ? 'soc' : this.session.section();
    return LEARNING_PATHS.find((p) => p.id === chapter + '-tutorial');
  });
  readonly phases = [
    { n: 1, name: 'Traer', tech: 'La BIU forma CS:IP y trae los bytes de la instrucción a la cola.', everyday: 'Leer el paso de la receta.' },
    { n: 2, name: 'Avanzar', tech: 'IP avanza la longitud de la instrucción.', everyday: 'Mover el dedo al paso siguiente.' },
    { n: 3, name: 'Entender', tech: 'La unidad de control decodifica el código de operación.', everyday: 'Entender qué pide el paso.' },
    { n: 4, name: 'Datos', tech: 'Se resuelven los operandos: registro, memoria o valor inmediato.', everyday: 'Sacar los ingredientes.' },
    { n: 5, name: 'Operar', tech: 'La ALU calcula y fija los flags.', everyday: 'Cocinar.' },
    { n: 6, name: 'Guardar', tech: 'El resultado va al registro o a la memoria de destino.', everyday: 'Servir el plato.' },
    { n: 7, name: 'Interrupciones', tech: 'Se comprueba IF y las solicitudes pendientes.', everyday: 'Mirar si suena el timbre.' },
  ];
  /** Asks the shell to start the exhibition mode. */
  readonly tour = output<void>();

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private readonly trigger = viewChild.required<ElementRef<HTMLButtonElement>>('trigger');
  private readonly closeButton = viewChild.required<ElementRef<HTMLButtonElement>>('closeButton');

  readonly open = signal(false);
  readonly section = signal<HelpSection>('start');
  readonly sections: { id: HelpSection; label: string }[] = [
    { id: 'start', label: 'Empezar' },
    { id: 'course', label: 'Temas del curso' },
    { id: 'emu', label: 'De EMU8086 a SILICIO' },
    { id: 'glossary', label: 'Glosario' },
    { id: 'shortcuts', label: 'Atajos' },
    { id: 'session', label: 'Sesión' },
    { id: 'preferences', label: 'Preferencias' },
    { id: 'scope', label: 'Alcance del modelo' },
  ];
  readonly topics = COURSE_MAP;
  readonly equivalences = EMU8086_EQUIVALENCES;
  readonly query = signal('');
  readonly terms = computed(() => searchGlossary(this.query()));
  readonly total = GLOSSARY.length;
  readonly qualities: { value: Quality; label: string; hint: string }[] = [
    { value: 'high', label: 'Detalle', hint: 'Sombras y reflejos completos' },
    { value: 'balanced', label: 'Equilibrado', hint: 'Recomendado' },
    { value: 'low', label: 'Ligero', hint: 'Para equipos modestos' },
  ];
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
    ['T', 'Rotular piezas'],
    ['P', 'Bandeja de piezas'],
    ['B', 'Mapa del banco'],
    ['X', 'Modo exposición'],
    ['Esc', 'Soltar herramienta, salir de manipulación o cerrar un menú'],
  ];

  show(): void {
    this.session.pause();
    this.open.set(true);
    const dialog = this.dialog().nativeElement;
    if (typeof dialog.showModal === 'function') {
      if (!dialog.open) dialog.showModal();
    } else dialog.setAttribute('open', '');
    setTimeout(() => this.closeButton().nativeElement.focus(), 0);
  }

  hide(): void {
    const dialog = this.dialog().nativeElement;
    if (typeof dialog.close === 'function') dialog.close();
    else {
      dialog.removeAttribute('open');
      this.closed();
    }
  }

  /** Esc: the dialog closes through the same path as the close button. */
  cancel(event: Event): void {
    event.preventDefault();
    this.hide();
  }

  closed(): void {
    if (!this.open()) return;
    this.open.set(false);
    this.trigger().nativeElement.focus();
  }

  choose(section: HelpSection): void {
    this.section.set(section);
  }

  /** Up and down arrows move between sections, as in any vertical tab list. */
  tabKey(event: KeyboardEvent, index: number): void {
    const step = event.key === 'ArrowDown' || event.key === 'ArrowRight' ? 1 : event.key === 'ArrowUp' || event.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = (index + step + this.sections.length) % this.sections.length;
    this.section.set(this.sections[next].id);
    const list = (event.currentTarget as HTMLElement).parentElement;
    setTimeout(() => list?.querySelectorAll<HTMLElement>('[role="tab"]')[next]?.focus(), 0);
  }

  openTopic(topic: CourseTopic): void {
    this.hide();
    void this.router.navigate(['/', topic.station], { queryParams: topic.piece ? { pieza: topic.piece } : {} });
  }

  /** Starts a guide by actions; the dialog closes so the highlight is not behind it. */
  startGuide(id: string): void {
    this.hide();
    void this.guide.start(id);
  }

  startTour(): void {
    this.hide();
    this.tour.emit();
  }

  importFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (file) void this.session.importSession(file);
  }
}
