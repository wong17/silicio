import type { Routes } from '@angular/router';
import { ExperienceRouteComponent } from './navigation/experience-route.component';
export const routes: Routes = [
  { path: '', component: ExperienceRouteComponent },
  ...['8086', 'memory', 'soc', 'machine'].map((path) => ({
    path,
    component: ExperienceRouteComponent,
  })),
  // Old addresses keep working: the SoC used to be /apple, and the chronoscope's comparison now lives in the 8086.
  { path: 'apple', redirectTo: 'soc' },
  { path: 'time', redirectTo: '8086' },
  { path: '**', redirectTo: '' },
];
