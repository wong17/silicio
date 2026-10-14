import { Component, computed, ElementRef, HostListener, inject, input, output, signal } from '@angular/core';
import { LabSession, type Quality } from '../../laboratory/lab-session.service';
import { BenchMapComponent } from './bench-map/bench-map.component';
import { PieceTrayComponent, type Thumbnailer } from './piece-tray/piece-tray.component';
import { layoutCallouts } from './callout-layout';

/**
 * Layer over the 3D view, shared by every station: the bench map, the piece tray and the floating
 * legends. Open drawers carry `data-occludes`, so the camera frames pieces in what they leave free.
 */
@Component({
  selector: 'app-scene-hud',
  imports: [BenchMapComponent, PieceTrayComponent],
  templateUrl: './scene-hud.component.html',
  styleUrl: './scene-hud.component.scss',
})
export class SceneHudComponent {
  readonly session = inject(LabSession);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly thumbnailer = input<Thumbnailer | null>(null);
  readonly picked = output<string>();
  readonly focused = output<string>();
  readonly orbit = output<number>();
  readonly aimSelected = output<void>();

  readonly hud = this.session.hud;
  readonly graphicsOpen = signal(false);
  readonly qualities: { value: Quality; label: string; hint: string }[] = [
    { value: 'high', label: 'Detalle', hint: 'Sombras y reflejos completos' },
    { value: 'balanced', label: 'Equilibrado', hint: 'Recomendado' },
    { value: 'low', label: 'Ligero', hint: 'Para equipos modestos' },
  ];
  /** Legends laid out inside the area the drawers and the title leave free. */
  readonly legends = computed(() => {
    if (!this.session.callouts()) return [];
    const stage = this.host.nativeElement.parentElement;
    const width = stage?.clientWidth || 800,
      height = stage?.clientHeight || 500;
    const top = 96,
      bottom = this.session.hud().tray ? 330 : 96;
    return layoutCallouts(this.session.calloutAnchors(), {
      x: 12,
      y: top,
      width: Math.max(160, width - 24),
      height: Math.max(80, height - top - bottom),
    });
  });

  chooseQuality(value: Quality): void {
    this.session.setQuality(value);
    this.graphicsOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  closeGraphics(): void {
    this.graphicsOpen.set(false);
  }

  toggleMap(): void {
    this.session.setHud({ map: !this.hud().map });
  }

  toggleTray(): void {
    this.session.setHud({ tray: !this.hud().tray });
  }
}
