import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { pathOf } from '../../content/routes';
import { AtriumPortalsComponent } from './atrium-portals.component';
import { CHAPTERS as EXPERIENCES } from '../../content/experiences';

describe('portales del atrio', () => {
  it('portal_preview_matches_its_station', async () => {
    await TestBed.configureTestingModule({
      imports: [AtriumPortalsComponent],
      providers: [provideRouter([])],
    }).compileComponents();
    const asked: string[] = [];
    (URL as unknown as Record<string, unknown>)['createObjectURL'] = () => 'blob:x';
    (URL as unknown as Record<string, unknown>)['revokeObjectURL'] = () => {};
    const fixture = TestBed.createComponent(AtriumPortalsComponent);
    fixture.componentRef.setInput('thumbnailer', (section: string) => {
      asked.push(section);
      return Promise.resolve(new Blob([section]));
    });
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(asked).toEqual(EXPERIENCES.map((e) => e.id));
    const links = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('a.portal'));
    expect(links).toHaveLength(EXPERIENCES.length);
    for (const [i, link] of links.entries()) {
      expect(link.getAttribute('href')).toBe('/' + pathOf(EXPERIENCES[i].id));
      expect(link.querySelector('img')).not.toBeNull();
    }
  });

  it('cards_work_without_previews', async () => {
    await TestBed.configureTestingModule({
      imports: [AtriumPortalsComponent],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(AtriumPortalsComponent);
    fixture.componentRef.setInput('thumbnailer', () => Promise.resolve(null));
    fixture.detectChanges();
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('img')).toHaveLength(0);
  });
});
