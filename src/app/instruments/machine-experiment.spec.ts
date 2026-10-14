import { it, expect } from 'vitest';
import { MachineExperiment } from './machine-experiment';
it('machine_cycle_transfers_actual_data_before_output', () => {
  const m = new MachineExperiment();
  m.advance();
  m.advance();
  expect(m.accumulator).toBe(0);
  m.advance();
  expect(m.accumulator).toBe(7);
  m.advance();
  expect(m.accumulator).toBe(12);
  m.advance();
  m.advance();
  expect(m.memory[1]).toBe(0);
  m.advance();
  expect(m.memory[1]).toBe(12);
  expect(m.output).toBe(0);
  m.advance();
  expect(m.output).toBe(12);
});
it('machine_reset_restores_data_and_bus_state', () => {
  const m = new MachineExperiment();
  for (let i = 0; i < 8; i++) m.advance();
  m.reset();
  expect(m.memory).toEqual([7, 0]);
  expect(m.accumulator).toBe(0);
  expect(m.stage).toBe(0);
});

import { machineActivity } from './machine-experiment';
it('only_the_active_bus_is_reported', () => {
  const m = new MachineExperiment();
  const buses: (string | null)[] = [machineActivity(m).bus];
  for (let i = 0; i < 8; i++) {
    m.advance();
    buses.push(machineActivity(m).bus);
  }
  expect(buses).toEqual([null, 'address', 'control', 'data', null, 'address', 'control', 'data', 'control']);
});
it('value_travels_with_the_bus', () => {
  const m = new MachineExperiment();
  for (let i = 0; i < 3; i++) m.advance();
  const a = machineActivity(m);
  expect(a).toMatchObject({ bus: 'data', direction: 'in', value: '0007h' });
  m.advance();
  expect(machineActivity(m)).toMatchObject({ bus: null, accumulator: 12, aluFrom: 7 });
});
