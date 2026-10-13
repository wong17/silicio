import { Component, inject } from '@angular/core';
import { LabSession } from '../../../laboratory/lab-session.service';

interface Unit {
  id: string;
  area: string;
  label: string;
  count: string;
  color: string;
}

/** Published M5 base units as a floor plan, plus the CPU → GPU → CPU buffer dependency. */
@Component({
  selector: 'app-apple-panel',
  templateUrl: './apple-panel.component.html',
  styleUrl: './apple-panel.component.scss',
})
export class ApplePanelComponent {
  readonly session = inject(LabSession);
  readonly units: Unit[] = [
    { id: 'performance', area: 'perf', label: 'CPU rendimiento', count: '4', color: '#ae8356' },
    { id: 'efficiency', area: 'eff', label: 'CPU eficiencia', count: '6', color: '#688d73' },
    { id: 'gpu', area: 'gpu', label: 'GPU', count: 'hasta 10', color: '#68869d' },
    { id: 'neural', area: 'neural', label: 'Neural', count: '16', color: '#9477a1' },
    { id: 'unified', area: 'unified', label: 'Memoria unificada', count: '153 GB/s', color: '#a9aa79' },
  ];
}
