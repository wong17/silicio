export const DESCRIPTIONS: Record<string, string> = {
  lid: 'El encapsulado protege el circuito integrado y conduce sus señales hacia 40 terminales. La muesca y la marca del pin 1 permiten orientar el componente correctamente.',
  socket:
    'El zócalo permite montar y sustituir el procesador sin soldar directamente sus terminales. Sus contactos conectan cada pin con las pistas de la placa didáctica.',
  clock:
    'La señal CLK marca el avance de los ciclos del procesador. El ritmo del reloj no equivale al número de instrucciones por segundo: cada instrucción puede necesitar varios ciclos.',
  alu: 'La unidad aritmético-lógica opera sobre los operandos de 16 bits. ADD y SUB producen un resultado y actualizan los flags aritméticos.',
  registers:
    'AX, BX, CX y DX guardan valores de 16 bits. El simulador también incluye SP, BP, SI y DI.',
  control:
    'La unidad de ejecución interpreta instrucciones, coordina operandos y decide el siguiente paso.',
  biu: 'La unidad de interfaz de bus forma direcciones físicas y comunica el procesador con memoria y entrada/salida.',
  queue:
    'El 8086 tiene una cola de prelectura de seis bytes. Este modelo muestra su ubicación conceptual; no simula los tiempos eléctricos de prefetch.',
  performance:
    'Los núcleos de rendimiento ejecutan trabajo exigente. Esta distribución es una representación conceptual, no una fotografía del die de un modelo concreto.',
  efficiency:
    'Los núcleos de eficiencia atienden trabajo con un perfil de consumo diferente. El planificador decide cómo repartirlo.',
  gpu: 'La GPU procesa trabajo paralelo. En el ejemplo recibe el buffer compartido después de que la CPU termine de prepararlo.',
  neural:
    'El Neural Engine acelera operaciones compatibles de aprendizaje automático. No toda operación de IA se ejecuta aquí.',
  unified:
    'CPU y GPU pueden acceder a un mismo conjunto de memoria. Compartir almacenamiento no elimina la necesidad de sincronizar el acceso.',
  cpu: 'El procesador busca instrucciones, interpreta operaciones y transforma datos.',
  ram: 'La memoria principal conserva instrucciones y datos mientras la máquina está encendida.',
  io: 'La entrada/salida comunica la máquina con su entorno. Una operación necesita dirección, datos y señales de control.',
};
