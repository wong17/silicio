import { TestBed } from '@angular/core/testing';
import { expect, it } from 'vitest';
import { LightPadComponent } from './light-pad.component';
import { LAMP_LIMITS } from '../../world/lamp-limits';

it('height_slider_spans_the_lamp_limits', async () => {
  await TestBed.configureTestingModule({ imports: [LightPadComponent] }).compileComponents();
  const fixture = TestBed.createComponent(LightPadComponent);
  fixture.detectChanges();
  const input = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('#lamp-height')!;
  expect(Number(input.min)).toBe(LAMP_LIMITS.height[0]);
  expect(Number(input.max)).toBe(LAMP_LIMITS.height[1]);
});
