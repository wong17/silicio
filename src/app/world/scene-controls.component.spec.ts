import { TestBed } from '@angular/core/testing';
import { it, expect } from 'vitest';
import { SceneControlsComponent } from './scene-controls.component';
it('mobile_focus_closes_menu_before_framing', async () => {
  await TestBed.configureTestingModule({ imports: [SceneControlsComponent] }).compileComponents();
  const f = TestBed.createComponent(SceneControlsComponent);
  f.componentInstance.section = '8086';
  f.detectChanges();
  const details = (f.nativeElement as HTMLElement).querySelector('details')!;
  details.open = true;
  let menuAtFocus: boolean | undefined;
  f.componentInstance.command.subscribe((command) => {
    if (command === 'focus') menuAtFocus = details.open;
  });
  (details.querySelector('.tool-focus') as HTMLButtonElement).click();
  expect(menuAtFocus).toBe(false);
});
