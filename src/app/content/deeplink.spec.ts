import { describe, expect, it } from 'vitest';
import { fromQuery, toQuery } from './deeplink';

describe('enlace por pieza', () => {
  it('url_restores_the_selected_piece', () => {
    const query = toQuery('pin-25', { azimuth: Math.PI / 4, distance: 12.34 });
    expect(query).toEqual({ pieza: 'pin-25', vista: '45,12.3' });
    const back = fromQuery(query as Record<string, string>);
    expect(back.piece).toBe('pin-25');
    expect(back.azimuth).toBeCloseTo(Math.PI / 4, 5);
    expect(back.distance).toBeCloseTo(12.3, 5);
  });
  it('malformed_values_are_ignored', () => {
    expect(fromQuery({ pieza: '../etc', vista: 'x,y' })).toEqual({});
    expect(fromQuery({ vista: '10,999' })).toEqual({});
    expect(fromQuery({ pieza: ['a', 'b'] })).toEqual({});
  });
  it('nothing_selected_writes_no_params', () => {
    expect(toQuery(undefined)).toEqual({ pieza: null, vista: null });
  });
});

import { readShot } from './deeplink';
describe('vistas fijas', () => {
  it('shot_names_a_station_and_a_piece', () => {
    expect(readShot({ shot: '8086-pin-25' })).toEqual({ station: '8086', piece: 'pin-25' });
    expect(readShot({ shot: 'memory' })).toEqual({ station: 'memory', piece: undefined });
  });
  it('malformed_shot_is_ignored', () => {
    expect(readShot({ shot: '../x' })).toBeUndefined();
    expect(readShot({})).toBeUndefined();
  });
});
