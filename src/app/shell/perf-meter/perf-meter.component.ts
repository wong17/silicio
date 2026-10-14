import { Component, NgZone, OnDestroy, OnInit, inject, signal } from '@angular/core';

interface Reading {
  p50: string;
  p95: string;
  gpu: string;
  calls: string;
  triangles: string;
  scale: string;
  station: string;
  quality: string;
}

/**
 * On-screen meter (Shift+D): frame times, draw calls, triangles and resolution scale, read from the scene
 * canvas. It lets anyone note figures on any machine without opening developer tools.
 */
@Component({
  selector: 'app-perf-meter',
  template: `
    <aside class="meter" aria-label="Medidor de rendimiento">
      <p class="kicker">Medidor · Mayús+D</p>
      <dl>
        <div><dt>Fotograma p50 / p95</dt><dd>{{ r().p50 }} / {{ r().p95 }} ms</dd></div>
        <div><dt>GPU p50 / p95</dt><dd>{{ r().gpu }}</dd></div>
        <div><dt>Llamadas · triángulos</dt><dd>{{ r().calls }} · {{ r().triangles }}</dd></div>
        <div><dt>Escala de resolución</dt><dd>{{ r().scale }}</dd></div>
        <div><dt>Estación · perfil</dt><dd>{{ r().station }} · {{ r().quality }}</dd></div>
      </dl>
    </aside>
  `,
  styles: `
    .meter {
      position: absolute;
      left: 12px;
      top: 96px;
      z-index: 8;
      padding: 10px 12px;
      border: 1px solid #46514d;
      border-radius: 10px;
      background: rgba(10, 12, 13, 0.92);
      color: #e3ded2;
      font: 500 12px/1.5 'IBM Plex Mono', monospace;
      pointer-events: none;
    }
    .kicker {
      margin: 0 0 6px;
      color: #a4aaa0;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }
    dl {
      display: grid;
      gap: 2px;
      margin: 0;
    }
    div {
      display: flex;
      justify-content: space-between;
      gap: 16px;
    }
    dt {
      color: #a4aaa0;
    }
    dd {
      margin: 0;
      font-variant-numeric: tabular-nums;
    }
  `,
})
export class PerfMeterComponent implements OnInit, OnDestroy {
  private readonly zone = inject(NgZone);
  readonly r = signal<Reading>(PerfMeterComponent.read());
  private timer?: ReturnType<typeof setInterval>;

  /** Pure reader, exposed so it can be tested without a canvas context. */
  static read(canvas: HTMLElement | null = document.querySelector('canvas[data-station]')): Reading {
    const d = canvas?.dataset ?? {};
    const gpu = d['gpuP50'] && d['gpuP50'] !== 'unavailable' ? `${d['gpuP50']} / ${d['gpuP95']} ms` : 'sin medida';
    return {
      p50: d['frameP50'] ?? '—',
      p95: d['frameP95'] ?? '—',
      gpu,
      calls: d['drawCalls'] ?? '—',
      triangles: d['triangles'] ?? '—',
      scale: d['resolutionScale'] ?? '1.00',
      station: d['metricsStation'] ?? d['station'] ?? '—',
      quality: d['quality'] ?? '—',
    };
  }

  ngOnInit(): void {
    this.timer = setInterval(() => this.zone.run(() => this.r.set(PerfMeterComponent.read())), 500);
  }

  ngOnDestroy(): void {
    clearInterval(this.timer);
  }
}
