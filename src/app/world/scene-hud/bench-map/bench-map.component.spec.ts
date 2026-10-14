import { TestBed } from '@angular/core/testing';
import { expect, it } from 'vitest';
import { BenchMapComponent } from './bench-map.component';
import { LAMP_LIMITS } from '../../lamp-limits';

it('height_slider_spans_the_lamp_limits', async () => {
  await TestBed.configureTestingModule({ imports: [BenchMapComponent] }).compileComponents();
  const fixture = TestBed.createComponent(BenchMapComponent);
  fixture.detectChanges();
  const input = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('#lamp-height')!;
  expect(Number(input.min)).toBe(LAMP_LIMITS.height[0]);
  expect(Number(input.max)).toBe(LAMP_LIMITS.height[1]);
});
