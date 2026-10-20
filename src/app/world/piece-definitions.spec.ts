import { pieceDefinition } from './piece-definitions';

describe('nombres de piezas', () => {
  it('los nombres largos tienen una versión breve y conservan el completo', () => {
    const cases: [string, string, string][] = [
      ['clock', 'Oscilador de referencia', 'Oscilador'],
      ['biu', 'Unidad de interfaz de bus', 'Interfaz de bus'],
      ['registers', 'Banco de registros', 'Registros'],
      ['alu', 'Unidad aritmético-lógica', 'ALU'],
      ['passives', 'Desacoplo y terminación', 'Desacoplo'],
      ['supports', 'Separadores y fijaciones', 'Separadores'],
    ];
    for (const [id, name, short] of cases) {
      const piece = pieceDefinition(id, '8086');
      expect(piece.name).toBe(name);
      expect(piece.shortName).toBe(short);
    }
    expect(pieceDefinition('control', '8086').shortName).toBe('Control');
  });
});
