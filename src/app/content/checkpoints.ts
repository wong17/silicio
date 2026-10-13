export const CHECKPOINTS: Record<
  string,
  { question: string; options: string[]; correct: number; explanation: string }
> = {
  '8086': {
    question: '¿Qué modifica CMP AX, 7?',
    options: ['AX y la memoria', 'Los flags, conservando AX', 'Solo el segmento DS'],
    correct: 1,
    explanation:
      'CMP calcula una resta para actualizar flags y descarta el resultado. Un salto condicional puede usar esos flags.',
  },
  memory: {
    question: '¿Cómo queda 1234h en memoria little endian?',
    options: ['12h y después 34h', '34h y después 12h', 'Un único byte 1234h'],
    correct: 1,
    explanation: 'Una palabra tiene dos bytes. El menos significativo ocupa la dirección menor.',
  },
  time: {
    question: '¿Qué recupera una instantánea del laboratorio?',
    options: ['Solo la imagen del chip', 'Registros, flags y memoria', 'El tiempo eléctrico real'],
    correct: 1,
    explanation:
      'La instantánea restaura el estado lógico. Esta simulación no reproduce la temporización eléctrica del procesador.',
  },
  apple: {
    question: '¿Qué sigue siendo necesario al compartir memoria?',
    options: [
      'Sincronizar los accesos',
      'Copiar siempre todos los datos',
      'Eliminar el planificador',
    ],
    correct: 0,
    explanation:
      'CPU y GPU pueden compartir almacenamiento; una dependencia debe completarse antes de que otra unidad use su resultado.',
  },
  machine: {
    question: '¿Qué bus transporta el valor leído de RAM?',
    options: ['Direcciones', 'Datos', 'Control'],
    correct: 1,
    explanation:
      'Direcciones selecciona la ubicación; control indica la operación; datos lleva el valor transferido.',
  },
};
