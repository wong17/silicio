import type { Routes } from '@angular/router';
import { ExperienceRouteComponent } from './navigation/experience-route.component';
export const routes: Routes = [
  { path: '', component: ExperienceRouteComponent },
  ...['8086', 'memory', 'time', 'apple', 'machine'].map((path) => ({
    path,
    component: ExperienceRouteComponent,
  })),
  { path: '**', redirectTo: '' },
];
