import { Component, effect, input, OnDestroy, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EXPERIENCES } from '../../content/experiences';
import type { Section } from '../../world/scene-inputs';

/** Entry cards for the five experiences, shown on the atrium before any station is opened. */
@Component({
  selector: 'app-atrium-portals',
  imports: [RouterLink],
  templateUrl: './atrium-portals.component.html',
  styleUrl: './atrium-portals.component.scss',
})
export class AtriumPortalsComponent implements OnDestroy {
  readonly experiences = EXPERIENCES;
  /** Renders a station to a picture; null falls back to the numbered card without one. */
  readonly thumbnailer = input<((section: Section) => Promise<Blob | null>) | null>(null);
  readonly previews = signal<Record<string, string>>({});
  private urls: string[] = [];
  private requested = false;

  constructor() {
    effect(() => {
      const load = this.thumbnailer();
      if (!load || this.requested) return;
      this.requested = true;
      for (const e of EXPERIENCES) {
        void load(e.id as Section).then((blob) => {
          if (!blob) return;
          const url = URL.createObjectURL(blob);
          this.urls.push(url);
          this.previews.update((p) => ({ ...p, [e.id]: url }));
        });
      }
    });
  }

  ngOnDestroy(): void {
    for (const url of this.urls) URL.revokeObjectURL(url);
  }
}
