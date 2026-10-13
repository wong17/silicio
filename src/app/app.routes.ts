import { Component } from '@angular/core';
import { Routes } from '@angular/router';
@Component({ template: '' }) class ExperienceRoute {}
export const routes: Routes = [
  { path: '', component: ExperienceRoute },
  ...['8086', 'memory', 'time', 'apple', 'machine'].map(path => ({ path, component: ExperienceRoute })),
  { path: '**', redirectTo: '' },
];
