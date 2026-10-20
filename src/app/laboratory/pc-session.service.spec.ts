import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { PcSession } from './pc-session.service';

const until = (pc: PcSession, done: () => boolean, limit = 3000) => {
  for (let n = 0; n < limit && !done(); n++) if (!pc.step()) break;
};

describe('sesión del PC', () => {
  let pc: PcSession;
  beforeEach(() => (pc = TestBed.inject(PcSession)));

  it('Atrás restaura SSD, RAM, cola del teclado y monitor paso a paso', () => {
    pc.choose('editar-guardar');
    until(pc, () => pc.halted());
    expect(pc.fileText('nota.txt')).toBe('HOLA');
    expect(pc.state().monitor.text).toBe('HOLA');
    pc.back(); // HALT
    pc.back(); // DISPLAY
    expect(pc.state().monitor.mode).toBe('off');
    expect(pc.fileText('nota.txt')).toBe('HOLA');
    pc.back(); // WRITE_FILE
    expect(pc.fileText('nota.txt')).toBe('Hola');
    while (pc.canBack()) pc.back();
    expect(pc.powered()).toBe(false);
    expect(pc.state().ram.input.every((w) => w === 0)).toBe(true);
  });

  it('la cola del teclado y su registro vuelven con Atrás', () => {
    pc.choose('hola-sondeo');
    until(pc, () => pc.state().pc >= 0x1000);
    const base = pc.stepCount();
    pc.type('Ho');
    until(pc, () => pc.state().monitor.text.length >= 2, 60);
    expect(pc.state().keyboard).toHaveLength(0);
    expect(pc.state().monitor.text).toBe('Ho');
    while (pc.stepCount() > base) pc.back();
    expect(pc.state().keyboard).toHaveLength(2);
    expect(pc.state().monitor.mode).toBe('off');
    expect(pc.state().inputs).toHaveLength(2);
  });

  it('esperar el teclado se anuncia, no avanza y se limpia al escribir', () => {
    pc.choose('hola-sondeo');
    until(pc, () => pc.state().pc >= 0x1000);
    // Polling never blocks: force INPUT by running a program that reads at once.
    pc.state.update((s) => ({ ...s, ram: { ...s.ram, program: [...s.ram.program].map((w, i) => (i === 3 ? 0x01000000 + 0 : w)) }, pc: 0x1003 }));
    const steps = pc.stepCount();
    expect(pc.step()).toBe(false);
    expect(pc.waiting()).toBe(true);
    expect(pc.message()).toBe('Esperando teclado');
    expect(pc.stepCount()).toBe(steps);
    pc.press(65);
    expect(pc.waiting()).toBe(false);
    expect(pc.step()).toBe(true);
  });

  it('apagar y encender conserva el SSD; Reiniciar ejercicio lo devuelve de fábrica', () => {
    pc.choose('editar-guardar');
    until(pc, () => pc.halted());
    pc.shutDown();
    expect(pc.powered()).toBe(false);
    expect(pc.fileText('nota.txt')).toBe('HOLA');
    pc.resetExercise();
    expect(pc.fileText('nota.txt')).toBe('Hola');
    expect(pc.canBack()).toBe(false);
  });

  it('el mosaico se ofrece como artefacto con su resultado cuando ya se procesó', () => {
    pc.choose('imagen-inversa');
    expect(pc.imageArtifact()?.payload.result).toBeUndefined();
    until(pc, () => pc.halted());
    const a = pc.imageArtifact()!;
    expect(a.kind).toBe('tile-image');
    expect(a.payload.pixels).toHaveLength(64);
    expect(a.payload.result![0]).toBe(255);
  });

  it('un archivo rechazado no deja rastro', () => {
    pc.choose('suma-archivo');
    const before = JSON.stringify(pc.state());
    pc.importText('datos.csv', '1,2,,3');
    expect(pc.message()).toContain('campo vacío');
    expect(JSON.stringify(pc.state())).toBe(before);
    pc.importText('datos.csv', '5,6');
    expect(pc.message()).toBe('');
    expect(pc.fileText('datos.csv')).toBe('5,6');
  });
});
