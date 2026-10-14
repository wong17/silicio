import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { LabSession } from './lab-session.service';

describe('intención de la consola', () => {
  it('representation_control_dispatches_intent', () => {
    const session = TestBed.inject(LabSession);
    expect(session.viewMode()).toBe('material');
    session.applySceneState('representation');
    expect(session.viewMode()).toBe('wireframe');
    session.applySceneState('representation');
    expect(session.viewMode()).toBe('material');
  });

  it('scene_commands_never_change_academic_state', () => {
    const session = TestBed.inject(LabSession);
    session.source = 'MOV AX, 5\nHLT';
    session.load();
    session.step();
    const before = JSON.stringify(session.state());
    for (const c of ['representation', 'light', 'lamp-power', 'manipulate', 'explode', 'callouts'] as const)
      session.applySceneState(c);
    expect(JSON.stringify(session.state())).toBe(before);
  });
});
