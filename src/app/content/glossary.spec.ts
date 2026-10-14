import { TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { describe, expect, it } from 'vitest';
import { findTerm, GLOSSARY, searchGlossary } from './glossary';
import { TermDirective } from '../shared/term.directive';

const CONSOLE_ABBREVIATIONS = [
  'ALE', 'RD', 'WR', 'BIU', 'EU', 'BHE', 'segmento', 'offset', 'dirección física', 'little endian',
  'DIR', 'DATO', 'CTRL', 'B0', 'B1', 'SoC', 'DRAM', 'RAS', 'CAS', 'SPD',
];

@Component({ imports: [TermDirective], template: '<span appTerm="ALE">ALE</span>' })
class Host {}

describe('glosario', () => {
  it('every_abbreviation_in_the_console_has_a_term', () => {
    for (const a of CONSOLE_ABBREVIATIONS) {
      const t = findTerm(a);
      expect(t, a).toBeDefined();
      expect(t!.definition.length, a).toBeGreaterThan(20);
    }
    expect(new Set(GLOSSARY.map((t) => t.term)).size).toBe(GLOSSARY.length);
  });

  it('term_is_reachable_by_keyboard', async () => {
    await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const el = (fixture.nativeElement as HTMLElement).querySelector('span')!;
    expect(el.getAttribute('tabindex')).toBe('0');
    expect(el.getAttribute('data-term')).toContain('Address Latch Enable');
    expect(el.getAttribute('aria-description')).toBeTruthy();
  });

  it('search_ignores_case_and_accents', () => {
    expect(searchGlossary('DIRECCION').map((t) => t.term)).toContain('dirección física');
    expect(searchGlossary('')).toHaveLength(GLOSSARY.length);
    expect(searchGlossary('zzz')).toHaveLength(0);
  });
});
