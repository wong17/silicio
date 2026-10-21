import type { GuideStep, LearningPath } from './learning-paths';

/**
 * «Tutorial de uso»: recorre la interfaz de cada capítulo, una zona tras otra. Cada paso dice el término técnico
 * y, en una frase, su equivalente cotidiano. Son pasos informativos: avanzan con su propio «Siguiente» y no
 * cambian ningún resultado. `visual` añade un dibujo pequeño solo donde aclara algo que se ve en pantalla.
 */
const common = (chapter: string): GuideStep[] => [
  {
    id: 'capitulos',
    anchor: '[data-guide="experience-nav"]',
    title: 'Los capítulos',
    text: 'Cuatro escalas del mismo laboratorio, como los pisos de un edificio. Estás en «' + chapter + '».',
  },
  {
    id: 'barra',
    anchor: '[data-guide="transport-bar"]',
    title: 'La barra de control',
    text: 'Es el control remoto: Paso avanza cuadro a cuadro, Ejecutar es play, Atrás rebobina. La velocidad solo cambia el ritmo, nunca el resultado.',
    visual: 'transport',
  },
  {
    id: 'escena',
    anchor: '[data-guide="scene"]',
    title: 'El banco en 3D',
    text: 'El hardware sobre una mesa de laboratorio. Se ilumina la pieza que trabaja; tócala para leer su ficha.',
  },
  {
    id: 'dock',
    anchor: '[data-guide="scene-dock"]',
    title: 'Herramientas de la escena',
    text: 'Gira y acerca la cámara, abre el chip por capas y muestra rótulos. Como dar vueltas a un juguete para verlo por todos lados.',
  },
  {
    id: 'paneles',
    anchor: '[data-guide="panels-button"]',
    title: 'Los paneles',
    text: 'Eliges qué instrumentos ver y dónde ponerlos. Como decidir qué papeles dejas abiertos en tu escritorio.',
    visual: 'panels',
  },
  {
    id: 'ayuda',
    anchor: '[data-guide="help-button"]',
    title: 'La ayuda',
    text: 'Tutoriales, glosario, atajos y tu sesión. Si un término no te suena, búscalo aquí.',
    visual: 'help',
  },
];

export const TUTORIALS: readonly LearningPath[] = [
  {
    id: '8086-tutorial',
    experience: '8086',
    title: 'Tutorial: cómo usar el Banco 8086',
    goal: 'Conocer cada zona de la pantalla y para qué sirve.',
    steps: [
      ...common('Banco 8086'),
      {
        id: 'panel',
        anchor: '[data-guide="step-viewer"]',
        title: 'Paso a paso',
        text: 'Un solo panel con tres columnas: el experimento, los pasos y los datos. Una receta con la mesa de trabajo al lado.',
      },
      {
        id: 'experimento',
        anchor: '[data-guide="mission-select"]',
        title: 'El experimento',
        text: 'Cada misión es un ejercicio corto. «Predicción» te pide apostar el resultado antes de ejecutar, como adivinar el marcador.',
      },
      {
        id: 'instrucciones',
        anchor: '[data-guide="editor"]',
        title: 'Las instrucciones',
        text: 'Órdenes mínimas en ensamblador, como «suma esto». Ensamblar las traduce a bytes, igual que pasar la receta al idioma del cocinero.',
      },
      {
        id: 'pasos',
        anchor: '[data-guide="step-cards"]',
        title: 'Los pasos',
        text: 'Cada instrucción tiene siete fases: tres de búsqueda y cuatro de ejecución. Como leer la receta y luego cocinar. La tarjeta abierta es la fase actual.',
        visual: 'phases',
      },
      {
        id: 'datos',
        anchor: '[data-guide="step-state"]',
        title: 'Los datos',
        text: 'Los registros son las manos del procesador: lo que usa ahora mismo. Lo que cambia se marca, y la columna salta sola al lugar donde ocurre cada fase.',
      },
    ],
  },
  {
    id: 'memory-tutorial',
    experience: 'memory',
    title: 'Tutorial: cómo usar Memoria',
    goal: 'Entender qué se muestra en cada zona del capítulo de memoria.',
    steps: [
      ...common('Memoria'),
      {
        id: 'niveles',
        anchor: '[data-guide="memory-levels"]',
        panel: 'operation',
        title: 'La jerarquía',
        text: 'Registros, caché, RAM y disco: cuanto más cerca del procesador, más rápido y más pequeño. Como tener el libro en la mano, en el escritorio, en la estantería o en la biblioteca.',
      },
      {
        id: 'operacion',
        anchor: '[data-guide="memory-tabs"]',
        panel: 'operation',
        title: 'Las actividades',
        text: 'Eliges una pregunta a la vez: guardar y leer, armar una dirección o ver la caché. Cada dato vive en una dirección, como un apartamento con su número de puerta.',
      },
      {
        id: 'origen',
        anchor: '[data-guide="memory-origin"]',
        panel: 'operation',
        title: 'De dónde vienen los datos',
        text: 'Bytes del ejercicio o los de tu sesión 8086. Es practicar con los ejemplos del libro o con tus propios apuntes.',
      },
      {
        id: 'siguiente',
        anchor: '[data-guide="memory-next"]',
        panel: 'operation',
        title: 'Avanzar',
        text: 'Cada pulsación hace una sola cosa: formar la dirección, elegir el banco, leer los bytes. Ves el recorrido, no solo la respuesta.',
      },
      {
        id: 'resultado',
        anchor: '[data-guide="memory-result"]',
        panel: 'result',
        title: 'El resultado',
        text: 'Las celdas y la dirección física final. Segmento por 16 más desplazamiento es como convertir «piso 3, puerta 5» en un solo número de casa.',
      },
    ],
  },
  {
    id: 'machine-tutorial',
    experience: 'machine',
    title: 'Tutorial: cómo usar La máquina',
    goal: 'Seguir un programa en un PC completo, del teclado al monitor.',
    steps: [
      ...common('La máquina'),
      {
        id: 'panel',
        anchor: '[data-guide="step-viewer"]',
        title: 'Paso a paso',
        text: 'A la izquierda lo que le das al PC, en el centro lo que hace y a la derecha lo que queda: el tablero de mando.',
      },
      {
        id: 'ejercicio',
        anchor: '[data-guide="pc-exercise"]',
        title: 'El ejercicio',
        text: 'Elige el programa: escribir y ver, sumar un archivo, editar y guardar o invertir una imagen. Debajo dice qué enseña cada uno.',
      },
      {
        id: 'encendido',
        anchor: '[data-guide="pc-power"]',
        title: 'Encender',
        text: 'La ROM arranca y copia tu programa del SSD a la RAM. Apagar borra la RAM, pero el SSD conserva sus archivos: una pizarra frente a una libreta.',
      },
      {
        id: 'listado',
        anchor: '[data-guide="pc-listing"]',
        title: 'El programa',
        text: 'Dirección, instrucción y su palabra de 32 bits. La fila marcada es la que apunta el contador de programa (PC), como el dedo sobre la receta.',
      },
      {
        id: 'teclado',
        anchor: '[data-guide="pc-keyboard"]',
        title: 'El teclado',
        text: 'Cada tecla va al controlador y espera su turno. Si el programa pide una tecla, se detiene hasta que escribas, como quien espera una respuesta.',
      },
      {
        id: 'pasos',
        anchor: '[data-guide="step-cards"]',
        title: 'Los pasos',
        text: 'Cada tarjeta es una transferencia: de dónde sale el dato, a dónde va y por qué línea del bus. Como el correo interno: remitente, destinatario y sobre.',
      },
      {
        id: 'cpu',
        anchor: '[data-guide="pc-cpu"]',
        title: 'El procesador',
        text: 'Sus registros del ciclo: contador, instrucción y datos en mano. Son los apuntes que el cocinero lleva en el delantal.',
      },
      {
        id: 'ram',
        anchor: '[data-guide="pc-ram"]',
        title: 'La RAM',
        text: 'La mesa de trabajo: rápida, pero se despeja al apagar. Aquí vive el programa mientras corre.',
      },
      {
        id: 'ssd',
        anchor: '[data-guide="pc-ssd"]',
        title: 'El SSD',
        text: 'El armario: más lento, pero guarda los archivos aunque apagues el PC.',
      },
      {
        id: 'interrupcion',
        anchor: '[data-guide="pc-irq"]',
        title: 'Interrupción o sondeo',
        text: 'Sondeo es mirar el buzón cada minuto; interrupción, que suene el timbre cuando llega algo. Aquí ves cuánto trabajo se ahorra la CPU.',
      },
      {
        id: 'monitor',
        anchor: '[data-guide="pc-monitor"]',
        title: 'La salida',
        text: 'El monitor muestra lo que el programa dejó en la memoria de pantalla, como una foto del cuaderno donde escribió.',
      },
    ],
  },
  {
    id: 'soc-tutorial',
    experience: 'apple',
    title: 'Tutorial: cómo usar el SoC',
    goal: 'Comparar cómo trabajan CPU y GPU con memoria compartida.',
    steps: [
      ...common('SoC'),
      {
        id: 'comparacion',
        anchor: '[data-guide="soc-compare"]',
        panel: 'instruments',
        title: 'CISC frente a RISC',
        text: 'La misma tarea escrita de dos maneras: CISC con una orden larga y compleja, RISC con varias cortas y simples. Una frase larga frente a varias breves.',
      },
      {
        id: 'lados',
        anchor: '[data-guide="soc-sides"]',
        panel: 'instruments',
        title: 'Qué se compara',
        text: 'Instrucciones, bytes y accesos a memoria de cada lado. El resultado es el mismo; cambia cuánto se escribe y cuántas veces se toca la memoria.',
      },
      {
        id: 'modo',
        anchor: '[data-guide="soc-mode"]',
        panel: 'instruments',
        title: 'Memoria compartida o separada',
        text: 'Compartida: CPU y GPU trabajan sobre la misma mesa. Separada: cada una tiene la suya y hay que fotocopiar los datos.',
      },
      {
        id: 'etapas',
        anchor: '[data-guide="soc-stages"]',
        panel: 'instruments',
        title: 'Las etapas del buffer',
        text: 'La CPU prepara la entrada, la GPU la procesa y avisa al terminar. Como pasar un plato: no lo tocas hasta que te dicen «listo».',
      },
      {
        id: 'copias',
        anchor: '[data-guide="soc-copies"]',
        panel: 'instruments',
        title: 'Las copias',
        text: 'Cuenta los bytes que viajan de ida y vuelta. Con memoria compartida bajan a cero: nadie fotocopia nada.',
      },
      {
        id: 'unidades',
        anchor: '[data-guide="soc-units"]',
        panel: 'instruments',
        title: 'Las unidades del chip',
        text: 'Núcleos de CPU, GPU y motor neuronal en un mismo chip. Es un modelo conceptual, no una medición del chip real.',
      },
    ],
  },
];
