import { Component, computed, ElementRef, HostListener, inject, signal, viewChild } from '@angular/core';
import { WorkspaceService } from './workspace.service';
import type { Preset } from './workspace-layout';

/** «Paneles»: which instruments are open, the three distributions and a way back to the default one. */
@Component({
  selector: 'app-panels-menu',
  templateUrl: './panels-menu.component.html',
  styleUrl: './panels-menu.component.scss',
})
export class PanelsMenuComponent {
  readonly ws = inject(WorkspaceService);
  readonly open = signal(false);
  private readonly button = viewChild.required<ElementRef<HTMLButtonElement>>('button');
  private readonly menu = viewChild<ElementRef<HTMLElement>>('menu');
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  readonly presets: { id: Preset; label: string; hint: string }[] = [
    { id: 'study', label: 'Estudiar', hint: 'Escena arriba, instrumentos abajo' },
    { id: 'explore', label: 'Explorar', hint: 'Escena amplia, instrumentos minimizados' },
    { id: 'compare', label: 'Comparar', hint: 'Más espacio para los instrumentos' },
  ];
  readonly panels = computed(() => {
    const states = new Map(this.ws.layout().panels.map((p) => [p.id, p]));
    return this.ws.specs().map((s) => {
      const state = states.get(s.id);
      return { id: s.id, title: s.title, open: !!state?.open && !state.minimized, minimized: !!state?.open && !!state?.minimized };
    });
  });
  readonly desk = computed(() => this.ws.arrangement().mode === 'absolute');

  toggle(): void {
    this.open.update((v) => !v);
    if (this.open()) setTimeout(() => this.menu()?.nativeElement.querySelector<HTMLElement>('button')?.focus(), 0);
  }

  close(returnFocus = true): void {
    if (!this.open()) return;
    this.open.set(false);
    if (returnFocus) this.button().nativeElement.focus();
  }

  togglePanel(id: string, minimized: boolean): void {
    if (minimized) this.ws.restore(id);
    else this.ws.toggle(id);
  }

  choose(preset: Preset): void {
    this.ws.preset(preset);
    this.close();
  }

  reset(): void {
    this.ws.reset();
    this.close();
  }

  @HostListener('keydown.escape', ['$event'])
  escape(event: Event): void {
    if (!this.open()) return;
    event.stopPropagation();
    this.close();
  }

  @HostListener('document:pointerdown', ['$event'])
  outside(event: PointerEvent): void {
    if (this.open() && !this.host.contains(event.target as Node)) this.close(false);
  }
}
