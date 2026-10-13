# SILICIO — Dirección de arte, producción 3D e interacción

> **Revisión 3.0 vigente:** [Escena, instrumentos y móvil](./SILICIO-AMPLIACION-ESCENA-PANEL-Y-MOVIL.md) y [tareas futuras](./SILICIO-IMPLEMENTACION-ESCENA-INSTRUMENTOS-MOVIL.md). Esta revisión modifica solo documentos; no ejecuta implementación.

Versión 2.0 · 12 de octubre de 2026 · Especificaciones de diseño; presupuestos sujetos a medición al construir.

[Índice](./SILICIO-INDICE.md) · [Plan maestro](./SILICIO-PLAN-MAESTRO.md) · [Experiencias](./SILICIO-EXPERIENCIAS-Y-MISIONES.md) · [Verificación](./SILICIO-VERIFICACION-Y-TRAZABILIDAD.md)

## Contenido

- [1. Dirección visual](#1-dirección-visual)
- [2. Espacio y escala](#2-espacio-y-escala)
- [3. Color y tipografía](#3-color-y-tipografía)
- [4. Biblioteca de materiales](#4-biblioteca-de-materiales)
- [5. Inventario de recursos](#5-inventario-de-recursos)
- [6. Pipeline de producción](#6-pipeline-de-producción)
- [7. Renderizado y efectos](#7-renderizado-y-efectos)
- [8. Movimiento e interacción](#8-movimiento-e-interacción)
- [9. Sonido](#9-sonido)
- [10. Perfiles y presupuesto](#10-perfiles-y-presupuesto)
- [11. Revisión visual](#11-revisión-visual)

## 1. Dirección visual

**Un laboratorio operativo que conserva huellas de muchas horas de uso.** Mesas y equipos están mantenidos, las superficies cuentan dónde se apoyaron manos y herramientas, y las marcas tienen una causa reconocible. El mundo debe sostener un primer plano de un procesador y una vista general del espacio.

Las referencias se separan por finalidad: fotografías de encapsulados y placas para geometría; superficies reales para material; instrumentos de laboratorio para interacción; diagramas académicos para relaciones funcionales. Una imagen atractiva generada por IA puede orientar el ambiente, pero no determina pines, conexiones o arquitectura.

El gesto distintivo es la transición de escala: una pieza física usada se abre y pasa a ser un espacio funcional explorable. Esta transición conserva orientación y selección; el visitante siempre puede volver al encapsulado o al atrio.

### Reglas de dirección

1. La mayor parte de la luz procede de fuentes que se entienden dentro del lugar.
2. El desgaste se concentra en superficies expuestas y manipuladas.
3. Un material se reconoce por su respuesta a la luz, no únicamente por su color.
4. El componente estudiado tiene más detalle que la decoración distante.
5. Las señales de actividad son legibles con bloom desactivado.
6. Las representaciones funcionales ampliadas se identifican como tales.
7. Los datos exactos conservan una capa 2D accesible y estable.

## 2. Espacio y escala

### 2.1 Plano inicial

Se propone una nave de aproximadamente 12 × 10 × 3,2 m como escala de diseño del entorno, con estaciones visibles desde el atrio. Son dimensiones artísticas del laboratorio virtual. No describen el tamaño de una instalación existente.

```text
                  PARED POSTERIOR
  ┌─────────────────────────────────────────────────┐
  │ Galería de memoria   Cronoscopio   Apple Silicon │
  │                                                 │
  │ Banco 8086         Banco central      Buses/E/S  │
  │                                                 │
  │                 Atrio / entrada                 │
  └─────────────────────────────────────────────────┘
```

La Fundición se carga como otra sala cuando esté implementada. El modo cooperativo reutiliza un banco didáctico. El plano es la referencia visual y de navegación; no obliga a cargar todas las estaciones detalladas al mismo tiempo.

### 2.2 Convención espacial

- Mundo exterior: una unidad equivale a un metro, eje Y hacia arriba y origen en el banco central.
- Cada estación tiene un origen local y una caja límite registrada en el manifiesto.
- Componentes físicos: modelado con unidades correctas y escala aplicada antes de exportar.
- Interior funcional: grupo de escala educativa separado. Sus proporciones favorecen lectura y no se interpretan como un floorplan exacto.
- Los recorridos usan cámaras por estación. Se ajustan planos near/far para la escala activa y se evita perder precisión al intentar cubrir a la vez kilómetros y micrómetros.
- La base 2.0 no exigía colisiones. La revisión 3.0 exige física acotada para manipulación; cámaras y transiciones siguen teniendo límites definidos.

### 2.3 Anclajes de cámara

Los nombres son contratos; las coordenadas siguientes son valores iniciales de composición que podrán ajustarse tras ver la geometría. La posición final se conserva en datos, no dispersa en componentes Angular.

| ID | Posición inicial orientativa | Mira hacia | Uso |
|---|---|---|---|
| CAM-ATRIO | (0;1,65;4,8) | (0;1;0) | Vista general y selección. |
| CAM-8086 | (−2,6;1,4;1,2) | (−3;1;0) | Encapsulado sobre el banco. |
| CAM-MEM | (−2,5;1,7;−1,4) | (−3;1,2;−3) | Ventana de memoria. |
| CAM-TIEMPO | (0,4;1,65;−1,3) | (0;1,1;−3) | Cronología espacial. |
| CAM-APPLE | (3,4;1,5;−1,4) | (3;1,1;−3) | Encapsulado contemporáneo. |
| CAM-BUSES | (3,4;1,5;1,3) | (3;1;0) | Transferencias del banco general. |
| CAM-INSPECT | Relativa al volumen seleccionado | Centro semántico del objeto | Inspección y órbita. |

Al encuadrar, la distancia se calcula a partir de la caja del objeto, el aspecto del viewport y el FOV. No se usa una distancia fija que recorte piezas al cambiar tamaño de pantalla. El modo de exposición guarda encuadres ya revisados.

## 3. Color y tipografía

| Token | Valor | Aplicación |
|---|---|---|
| `paint-aged` | #486560 | Esmalte del mobiliario. |
| `pcb` | #254C3E | Placas, con variación de material. |
| `warm-resin` | #493C32 | Resinas y mandos apropiados. |
| `technical-paper` | #D8CCAF | Etiquetas y papeles de trabajo. |
| `aged-metal` | #9A8058 | Detalles, no color universal de todo metal. |
| `graphite` | #252D2E | Instrumentos y superficies de lectura. |

Los colores semánticos de lectura, escritura, selección y error pertenecen a la interfaz y a las señales. Se combinan con patrones y texto: lectura con flecha entrante; escritura con flecha saliente y destino; selección con contorno; alerta con icono y mensaje. No se depende de distinguir rojo y verde.

IBM Plex Sans para contenido, botones y títulos; IBM Plex Mono para código, bytes, direcciones y registros. Tamaños iniciales de la interfaz: cuerpo 16 px, dato principal 18–20 px, título contextual 24–28 px y título de entrada 40–56 px según viewport. Etiquetas secundarias pueden usar 14 px; nunca los valores esenciales de un ejercicio.

Objetivos de contraste: 4,5:1 para texto normal y 3:1 para elementos gráficos necesarios y texto grande. Se comprobarán sobre la composición efectiva, incluyendo fondo variable del canvas. Los paneles de lectura usan una superficie suficientemente opaca para conservar contraste.

## 4. Biblioteca de materiales

Los rangos numéricos son puntos de partida artísticos para parámetros de material. No son mediciones certificadas de esos objetos; se ajustan bajo iluminación neutra y después en escena.

| ID | Material | Metalness base | Roughness orientativa | Desgaste |
|---|---|---|---|---|
| MAT-01 | Acero pintado | 0 en pintura; 1 en metal expuesto | 0,45–0,75 | Bordes levantados y marcas alrededor de tornillos. |
| MAT-02 | Aluminio con acabado usado | Ajustado al acabado y a su capa superficial | 0,25–0,50 | Arañazos finos y contacto pulido. |
| MAT-03 | Resina de encapsulado | 0 | 0,55–0,85 | Variación pequeña, impresión gastada y marcas de manipulación. |
| MAT-04 | Máscara de PCB | 0 | 0,35–0,65 | Polvo localizado, serigrafía y zonas de montaje. |
| MAT-05 | Contactos metálicos | 1 en superficie metálica limpia | 0,20–0,55 | Trayectorias de inserción; acabado según metal de referencia. |
| MAT-06 | Goma de mandos | 0 | 0,65–0,95 | Brillo leve en zonas de roce y bordes redondeados. |
| MAT-07 | Papel técnico | 0 | 0,75–1 | Amarilleo localizado, pliegues y bordes; texto principal preservado. |
| MAT-08 | Vidrio de instrumento | Material físico solo donde aporta | 0,05–0,18 | Huellas tenues y polvo en perímetro. |
| MAT-09 | Soldadura | 1 en metal expuesto | 0,30–0,65 | Irregularidad moderada y escala correcta. |
| MAT-10 | Interior funcional educativo | Material base propio del bloque | 0,35–0,70 | Limpieza suficiente para leer conexiones; no polvo ambiental sobre silicio protegido. |

El metal pintado necesita máscaras que separen pintura de metal. Oxidación, polvo y adhesivos son capas distintas; no se reduce uniformemente la rugosidad para simular que todo está viejo. Oro, aluminio y acero no comparten una textura de óxido rojo.

### 4.1 Capas de desgaste

| Capa | Escala | Uso | Técnica preferida |
|---|---|---|---|
| Macro | Silueta y piezas | Esquina golpeada o etiqueta levantada protagonista | Geometría escasa y controlada. |
| Media | Zonas de contacto | Pintura gastada, manchas y marcas de mantenimiento | Máscaras, atlas y decals. |
| Micro | Superficie cercana | Microarañazos, poros y huellas suaves | Normal y roughness; evitar detalle que produzca aliasing. |

Cada recurso recibe una semilla visual fija para que sus marcas no cambien al recargar. Las variantes «mantenido», «usado» y «muy utilizado» reutilizan la biblioteca, variando intensidad y distribución. La variante por defecto es «usado».

### 4.2 Reglas para texturas

- Mapas de color/emisión etiquetados con su espacio de color; normal, roughness y metalness tratados como datos.
- Revisar el sentido del normal map y la exportación para evitar relieve invertido.
- 1K para utilería y 2K para protagonistas como base; más resolución solo donde el encuadre demuestre la necesidad.
- Densidad de texel coherente entre piezas comparables. Un chip en primer plano puede usar un atlas propio de mayor densidad que una pared.
- Hornear detalle que no cambia la silueta ni requiere interacción.
- Conservar un margen de UV suficiente para mipmaps y comprobar costuras en glancing angles.
- Los decals no deben pelear con la superficie por profundidad ni multiplicar materiales sin control.

La [gestión de color de Three.js](https://threejs.org/manual/pages/color-management.html) distingue los mapas de color de las texturas de datos y explica la conversión de salida. El proyecto comprobará ese flujo antes de corregir una imagen incorrecta aumentando intensidades de luz.

## 5. Inventario de recursos

Las cifras geométricas son máximos orientativos por recurso de detalle medio. La aceptación se decide también por draw calls, texturas, transparencias y tiempo de fotograma.

| ID | Recurso | Piezas separadas | Presupuesto inicial | Prioridad |
|---|---|---|---|---|
| AS-01 | Kit de nave | Pared, suelo, techo, molduras | 25–40 mil triángulos reutilizables | P0 |
| AS-02 | Banco modular | Mesa, cajones, soportes, lámpara | 20–35 mil | P0 |
| AS-03 | 8086 exterior | Cuerpo, cubierta, terminales, impresión | 15–25 mil; terminales instanciados cuando convenga | P0 |
| AS-04 | Placa clásica | PCB, zócalo, conectores y piezas repetidas | 40–60 mil | P0 |
| AS-05 | 8086 funcional | BIU, EU, registros, ALU, cola y rutas | 15–30 mil | P0 |
| AS-06 | Memoria física/lógica | Módulo, soporte y casilla reutilizable | 10–20 mil más instancias | P0 |
| AS-07 | Cronoscopio | Mesa, selector y marcas temporales | 10–20 mil | P0 |
| AS-08 | Apple exterior | Encapsulado, soporte y placa | 25–45 mil | P0 |
| AS-09 | Apple funcional | Bloques y rutas documentadas | 15–35 mil | P0 |
| AS-10 | Buses y periférico | Cables, conectores y entrada simple | 10–20 mil | P0 |
| AS-11 | Instrumentos y utilería | Selector, pantalla, herramientas y etiquetas | 15–25 mil compartidos | P0 |
| AS-12 | Atlas de decals | Marcas, números, etiquetas y mantenimiento | 1–2 atlas compactos | P0 |
| AS-13 | Entorno de iluminación | HDR/procesado y luces de escena | Resolución elegida tras medir | P0 |
| AS-14 | Sonidos | Interruptor, confirmación, transferencia y ambiente | 4–6 efectos y un ambiente corto | P0 opcional para uso |
| AS-15 | Fundición | Bloques modulares y conexiones | Reutiliza AS-05/06/11 | P1/P2 |
| AS-16 | Señales de cooperación | Roles, turnos y conexiones | Reutiliza banco general | P2 |

No se suman todos esos modelos como carga residente simultánea. El atrio puede mostrar versiones simplificadas de las estaciones. Acercarse adquiere el detalle de la escena activa; salir lo libera según referencias compartidas.

### 5.1 Nombres y semántica

Ejemplos de nodos: `intel8086.body`, `intel8086.cover`, `intel8086.eu`, `intel8086.biu`, `intel8086.register.ax`, `intel8086.queue.slot.0`, `apple.cpu`, `apple.gpu`, `apple.neural-engine`, `apple.memory`, `world.bench.8086`.

El manifiesto mapea esos nodos a IDs semánticos como `cpu.ax`. La lógica no depende del orden de hijos de un GLB ni de encontrar «Cube.014». Terminales y núcleos repetidos conservan un índice de instancia que permite selección sin duplicar materiales.

### 5.2 Criterios específicos de protagonistas

**8086 exterior:** cuarenta terminales, orientación y muesca correctas para la referencia elegida, dimensiones proporcionadas y etiquetas legibles. Antes de modelar el pinout se registra el encapsulado de referencia; no se rotulan pines a partir de una imagen generada.

**Interior 8086:** separación BIU/EU comprensible, registros asociados con sus valores, cola de seis bytes y conexiones activas que siguen eventos. El despiece funcional no se confunde con una fotografía de la matriz de silicio.

**Apple:** exterior contemporáneo y bloques funcionales con jerarquía. Un contador de núcleos aparece solo cuando la variante/configuración lo respalda. El detalle del interior conserva el mismo nivel de abstracción dentro de cada vista.

## 6. Pipeline de producción

1. Ficha de recurso: función, ID, escala, encuadres, piezas móviles, fuente y prioridad.
2. Geometría simple: validar selección, foco, despiece y ocupación de pantalla.
3. Modelado: resolver silueta, biseles, terminales y piezas que recibirán primeros planos.
4. UV y materiales: crear máscaras separadas de pintura, metal y suciedad; revisar repetición.
5. Horneado: generar normales/oclusiones necesarias y eliminar geometría que no aporta al uso.
6. Exportación GLB: aplicar transformaciones, comprobar nombres, normales, jerarquía y unidades.
7. Optimización: Meshopt para mallas y KTX2 para texturas cuando el flujo validado lo soporte; incluir decodificadores locales.
8. Integración: probar bajo luz neutra y luz definitiva; comprobar escenas de despiece.
9. Medición: peso comprimido, tiempo de carga, draw calls y recursos estimados.
10. Registro: licencia, origen, autor/modificaciones, versión y capturas de aceptación.

Blender es la herramienta preferida de modelado. Si no está disponible al comenzar, la alternativa P0 es geometría paramétrica con Three.js para encapsulados, placas, bloques y mobiliario, manteniendo la misma ficha de materiales y niveles de detalle. La ruta alternativa preserva el mundo 3D y concentra el acabado en los objetos protagonistas.

Los recursos externos de [Poly Haven](https://polyhaven.com/license) y [ambientCG](https://docs.ambientcg.com/license/) pueden aportar superficies y entornos. Se registra su procedencia. No se necesita comprar modelos para que el plan sea ejecutable.

## 7. Renderizado y efectos

### 7.1 Selección de herramientas

| Opción | Decisión | Aplicación |
|---|---|---|
| Three.js + addons | Base elegida | Renderer, carga, controles, instancias y composición. |
| EffectComposer de Three.js | Elegido | Mantener un sistema de pases y una versión común. |
| `pmndrs/postprocessing` | Evaluado, fuera de P0 | Alternativa de efectos; no mezclar compositores durante la semana. |
| GTAO | Condicional por perfil | Contacto y profundidad si el coste medido lo permite. |
| Bloom | Intensidad baja y selectiva en contenido | Actividad visible; no ocultar superficies con halos. |
| Ray tracing/path tracing en navegador | Fuera de P0 | La calidad se obtiene primero con material, luz y geometría. |
| Shaders propios | Acotados | Rutas de señal, selección y máscaras que no resuelvan los materiales estándar. |
| Física Rapier | Requerida en la ampliación 3.0 | Manipulación acotada y cuerpos cinemáticos; cámara y CPU separados. |
| BVH | Solo si el perfilado lo exige | Acelerar selección sobre geometría detallada. |

Fuentes de las alternativas: [postprocesamiento de Three.js](https://threejs.org/manual/pages/how-to-use-post-processing.html), [pmndrs/postprocessing](https://github.com/pmndrs/postprocessing) y [guía WebGPURenderer](https://threejs.org/manual/pages/webgpurenderer). WebGPU se mantiene como migración posterior con materiales y efectos revisados.

### 7.2 Pipeline elegido

Escena PBR → sombras/contacto → AO opcional → bloom controlado → OutputPass. El antialiasing se configura en el render target compatible; no se apilan varias técnicas sin medir. Se revisan color y exposición con los efectos desactivados antes de componerlos.

Una luz ambiental procesada da respuesta coherente a los materiales. Máximo inicial de dos luces con sombras relevantes en la estación activa; otras luces son aproximaciones sin sombra o detalle horneado. El banco clásico usa una lámpara de temperatura visual cálida; Apple, iluminación más neutra. No se cambia exposición para cada objeto aislado.

La profundidad de campo se limita a introducciones opcionales. Al estudiar código, pines o conexiones se conserva foco útil. Partículas de ambiente son escasas, apagables y sin responsabilidad académica.

### 7.3 Propiedad y liberación

`AssetRegistry` mantiene referencias de geometrías, materiales y texturas compartidos. Cada escena libera sus adquisiciones al salir; el recurso solo se destruye cuando deja de tener consumidores. Se cancelan timelines, listeners, peticiones y callbacks propios de la escena.

Se liberan explícitamente geometrías, materiales, texturas y render targets; retirar una malla del grafo no basta. ImageBitmap y recursos de CPU tienen su propio ciclo de vida. El [manual de liberación de recursos](https://threejs.org/manual/pages/how-to-dispose-of-objects.html) respalda esta separación.

## 8. Movimiento e interacción

### 8.1 Gramática de movimiento

| Acción | Duración inicial | Tratamiento | Movimiento reducido |
|---|---|---|---|
| Selección | 120–180 ms | Cambio de contorno/material, sin rebote | Cambio directo. |
| Abrir inspector | 180–240 ms | Desplazamiento corto y opacidad | Aparición directa. |
| Enfocar pieza | 650–900 ms | Cámara hacia encuadre estable | Corte conservando selección. |
| Cambiar estación | 900–1200 ms | Traslado dirigido sin giros abruptos | Corte o fundido breve. |
| Abrir encapsulado | 800–1100 ms | Separación física controlada | Estado abierto directo. |
| Transferencia de dato | 400–900 ms según velocidad elegida | Recorrido origen-destino con identificador | Resaltar extremos y mostrar el paso. |
| Restaurar estado | Hasta 200 ms de transición visual | Modelo restaurado antes de presentarlo | Cambio directo. |

No se usa el tiempo de estas animaciones como tiempo de CPU. Todas admiten terminar inmediatamente en su estado final. Un nuevo foco cancela o concluye el anterior; no deja dos timelines escribiendo la misma cámara.

### 8.2 Entrada y controles

| Contexto | Gesto | Resultado |
|---|---|---|
| Mundo sin panel activo | Clic/tap | Seleccionar objeto. |
| Inspección | Arrastrar | Orbitar dentro de límites. |
| Inspección | Rueda/pinza | Acercar dentro del rango permitido. |
| Panel de lectura | Rueda/táctil | Desplazar contenido; Lenis solo en ese contenedor si está habilitado. |
| Editor | Teclas y rueda | Editar/desplazar código; no mover cámara. |
| Navegación por teclado | Tab, Enter, Escape | Recorrer controles, activar y salir del contexto. |
| Laboratorio con foco fuera de editor | Atajos anunciados | Paso, pausa y restablecimiento según estado. |

El InputRouter asigna un propietario por gesto. Un modal captura su foco y lo devuelve al control anterior al cerrar. No se usa pointer lock en P0. Hover aporta una ayuda opcional, pero no es la única forma de descubrir una pieza.

GSAP y Lenis comparten ticker con conversión de segundos a milisegundos para Lenis y `autoRaf:false`, conforme a su [integración oficial](https://github.com/darkroomengineering/lenis#gsap-scrolltrigger). ScrollTrigger solo gobierna recorridos habilitados; la navegación ordinaria no secuestra el scroll de toda la página.

### 8.3 Presentación 2D

```text
┌ Misión / lugar actual ───────────── Estado / ajustes ┐
│                                                    │
│                 MUNDO 3D                           │
│                                     ┌────────────┐ │
│  Pieza seleccionada                 │ Inspector  │ │
│                                     │ y fuentes  │ │
│                                     └────────────┘ │
├ Ejecutar · Pausar · Paso · Atrás · Restablecer ──────┤
│ Editor o cronología, expandible según la actividad  │
└────────────────────────────────────────────────────┘
```

En escritorio, el inspector ocupa aproximadamente 320–380 px; el editor se abre en una bandeja inferior regulable. Se ofrece modo de concentración que amplía editor/inspector conservando un visor 3D. Los valores no se anclan únicamente como texto diminuto sobre una malla.

En pantallas estrechas, el inspector pasa a una bandeja inferior y el editor a una vista ampliada. Cambiar de vista conserva selección, programa e índice. Los controles esenciales tienen objetivos táctiles de al menos 44 px. El 3D sigue disponible; la lectura precisa se reorganiza según el espacio.

## 9. Sonido

Audio desactivado hasta consentimiento mediante una acción del usuario; controles de silencio y volumen persistentes. El ambiente es tenue, sin bucle musical obligatorio. Selección, confirmación y error se distinguen sin depender del sonido.

Las transferencias pueden producir un pulso sonoro didáctico a baja velocidad. A velocidad alta se limita la cantidad de eventos sonoros por segundo; no se emite un sonido por cada instrucción de un lote. El retroceso y los cambios de escena no repiten sonidos históricos de forma accidental.

No se representan los MHz reales como frecuencia audible literal. El contenido expresa la relación entre ritmo didáctico y explicación cuando activa sonificación.

## 10. Perfiles y presupuesto

| Perfil | Objetivo en equipo de referencia | Presupuesto inicial de escena activa | Efectos |
|---|---|---|---|
| Reducido | 30 FPS, resolución interna cercana a 720p | 150 mil triángulos, 100 draw calls, DPR≤1 | AO apagado, sombras limitadas, textura 1K predominante. |
| Equilibrado | Intentar 60 FPS a 1080p | 400 mil triángulos, 200 draw calls, DPR≤1,5 | Sombras seleccionadas, AO solo si cabe. |
| Alto | Mantener el objetivo con más detalle | 700 mil triángulos, 300 draw calls, DPR≤1,75 | Textura y efectos ampliados según medida. |

DPR es un máximo, no una obligación; el coordinador reduce resolución interna para respetar el presupuesto. Se registra resolución CSS y resolución real del buffer al medir. El conteo de triángulos no acredita por sí solo rendimiento.

Objetivos de carga: conjunto inicial hasta unos 8 MiB comprimidos y JavaScript inicial en torno a 1,5 MiB comprimido; contenido y editor diferidos. Un manifiesto permite saber qué está cargado, cuánto falta y qué puede reintentarse. El estado «listo» requiere que los recursos interactivos esenciales estén disponibles.

### Ajuste adaptativo

Medir una ventana estable de al menos cinco segundos. Si el tiempo de frame supera de forma sostenida el objetivo, reducir primero DPR, después sombras y AO, y finalmente LOD. Mantener histéresis y un periodo de estabilización para evitar cambios constantes. En modo de exposición se usa un perfil fijado tras el ensayo.

Una degradación conserva selección, texto y significado de las señales. No elimina registros ni rutas necesarias para aprobar una misión. Un error de WebGL se trata como error; no se sustituye silenciosamente por un video afirmando que sigue siendo una simulación 3D.

## 11. Revisión visual

Capturas obligatorias futuras: atrio completo; 8086 exterior; 8086 abierto durante ADD; memoria mostrando dos bytes; comparación A/B; Apple exterior e interior; lectura de un panel en pantalla estrecha. Cada captura registra versión, resolución, perfil y escena.

| Aspecto | Criterio de aceptación |
|---|---|
| Material | Reconocible con luz neutra y final. |
| Desgaste | Distribución causal; no textura repetida idéntica sobre todas las piezas. |
| Primer plano | Silueta, normales, UV y etiquetas sin defectos evidentes. |
| Lectura | Valores, botones y nombres siguen legibles con efectos activos. |
| Selección | Pieza elegida inequívoca y estado coincidente con inspector. |
| Cámara | Sin atraviesos de geometría, recortes accidentales ni saltos de orientación. |
| Movimiento | Se puede omitir y reducir; no impide controlar una sesión. |
| Calidad reducida | Conserva materiales básicos y todo el contenido académico. |
| Escala | Exterior físico y ampliación educativa diferenciados y conectados visualmente. |

La aprobación del arte ocurre al final del día 3 sobre un primer plano representativo, antes de reproducir el acabado en todos los recursos. Si hace falta ajustar, se concentra el detalle en 8086 y Apple, reutilizando el kit del laboratorio.


## 12. Especificación visual y de uso vigente: revisión 3.0

Consultar [Escena, instrumentos y móvil](./SILICIO-AMPLIACION-ESCENA-PANEL-Y-MOVIL.md), secciones3–11. Sus referencias de memoria, toolbar, rack, móvil, física yefectos prevalecen sobre formulaciones genéricas de la base2.0.

El modelado no se acepta por número de piezas/polígonos. Fichas, planos, uniones, apoyos, acabado y primeros planos son obligatorios. RAM clásica y DIMM tienen identidades distintas; la cuadrícula lógica permanece como instrumento, no como sustituto de la pieza física.

El rack deja de ser una columna de párrafos. Los controles de representación, cámara ydespiece se agrupan dentro del visor; en móvil se usa consola inferior y control explícito de órbita. No hay información necesaria en microtexto o detrás de la interfaz.

La física se limita a mecanismos ymanipulación. Efectos deben mantener baseline legible y preservar acciones en el nivel ligero.
