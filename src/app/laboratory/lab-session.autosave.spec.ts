import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { LabSession } from './lab-session.service';

const KEY = 'silicio.autosave';

describe('sesión persistente', () => {
  beforeEach(() => localStorage.clear());

  it('reload_restores_program_and_cursor', () => {
    const first = TestBed.inject(LabSession);
    first.source = 'MOV AX, 5\nADD AX, 3\nHLT';
    first.load();
    first.step();
    first.step();
    first.restore(0);
    localStorage.setItem(KEY, first.serializeSession());

    TestBed.resetTestingModule();
    const second = TestBed.inject(LabSession);
    expect(second.restoreAutosave()).toBe(true);
    expect(second.source).toBe('MOV AX, 5\nADD AX, 3\nHLT');
    expect(second.cursor()).toBe(0);
    expect(second.trace()).toHaveLength(2);
    expect(second.state().registers.AX).toBe(5);
    expect(second.notice()).toContain('recuperó');
  });

  it('corrupt_autosave_is_discarded_with_a_notice', () => {
    localStorage.setItem(KEY, '{"version":2,"current":');
    const session = TestBed.inject(LabSession);
    expect(session.restoreAutosave()).toBe(false);
    expect(localStorage.getItem(KEY)).toBeNull();
    expect(session.notice()).toContain('descartó');
    expect(session.source).toContain('ADD AX');
  });

  it('a_forged_autosave_cannot_load_unsupported_code', () => {
    localStorage.setItem(KEY, JSON.stringify({ version: 1, source: 'INT 21h', state: {}, trace: [], cursor: 0, missionIndex: 0 }));
    const session = TestBed.inject(LabSession);
    expect(session.restoreAutosave()).toBe(false);
    expect(session.notice()).toContain('descartó');
  });

  it('without_an_autosave_nothing_changes', () => {
    const session = TestBed.inject(LabSession);
    expect(session.restoreAutosave()).toBe(false);
    expect(session.notice()).toBe('');
  });
});
