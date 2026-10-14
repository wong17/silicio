# Organización de SILICIO

La interfaz Angular recibe el estado académico y comunica intenciones. Three.js construye y presenta objetos; sus animaciones y la física no escriben registros o memoria. Cada archivo de presentación tiene su propio HTML, SCSS y TypeScript; no hay plantillas ni estilos en línea en componentes de producción.

## Capas y propietarios

| Área | Archivos | Responsabilidad |
|---|---|---|
| Shell | app.ts, app.html, app.scss | Rutas, modos de distribución, comandos de escena, atajos de teclado y movimiento. Compone la consola y el escenario; no guarda estado del laboratorio. |
| Navegación | shell/experience-nav/ | Marca y experiencias. En móvil la fila de enlaces se desplaza sin barra visible. |
| Estado de sesión | laboratory/lab-session.service.ts | Programa, cursor, ramas, línea base, memoria, bus, búfer, lámpara y preferencias. Única fuente para la consola y el escenario. |
| Fachada de worker | laboratory/laboratory.facade.ts y laboratory.types.ts | Proyecciones, época de sesión y rechazo de respuestas tardías del worker. |
| Descripciones | laboratory/piece-descriptions.ts | Texto explicativo de cada pieza, sin Angular ni WebGL. |
| Motor académico | simulation/cpu8086.ts, cpu8086.worker.ts, session-codec.ts | Instrucciones/bytes, registros/flags/memoria, ejecución fuera de UI y validación de sesiones. |
| Contenido | content/experiences.ts, missions.ts, checkpoints.ts, component-descriptions.ts | Recorridos, ejercicios y explicaciones del contenido. |
| Adaptador del visor | world/atrium-scene.component.ts, .html, .scss | Entradas, salidas y callbacks dentro de la zona Angular. No fabrica modelos ni posee el bucle de dibujo. |
| Motor Three.js | world/world-engine.ts | Renderer, recursos, estación, bucle de render, cámara (acotada a la sala por room-bounds.ts), selección, arrastre, retención de herramientas, anclaje de estaciones y registro de animaciones. No importa Angular. |
| Barra de escena | world/scene-toolbar/ | Iconos con tooltip. Barra centrada bajo el banco en escenario ancho; dock con menú «más» en escenario estrecho. «Soltar herramienta» se deshabilita sin nada en la mano. |
| Lámpara | world/lamp-rig.ts, lamp-controller.ts, lamp-limits.ts, models/articulated-lamp.model.ts | Cinemática de dos segmentos, alcance circular, foco con sombra, cono y polvo. lamp-limits.ts no importa Three.js para que el panel de luz quede fuera del bundle de escena. |
| Texturas y materiales | world/textures/ | Ruido determinista, mapas coherentes de desgaste (parches, sin contornos), acabado de baldosa, biblioteca de materiales, etiquetas que se ajustan al texto, pantallas de instrumentos y planos de papel. |
| Distribución del banco | models/bench-layout.ts | Alturas (mesa, mat, suelo, techo), posiciones compartidas de objetos y cámara. |
| Sala de laboratorio | models/lab-room.model.ts | Suelo, la única pared (la del fondo), techo a 18 unidades con tubos, mueble base que sostiene la mesa, almacenaje, estantería, carro, taburete, extintor, reloj y tuberías. Decorativo: no entra en los mapas de piezas. |
| Entorno del banco | models/workbench-room.model.ts, workbench-props.model.ts | Mesa, panel perforado, mat, bandeja, herramientas, osciloscopio, fuente, sonda, cables y objetos de sobremesa con sus reacciones y animaciones. |
| Planos de pared | models/wall-blueprints.model.ts, textures/blueprint-sheets.ts | Hojas de esquema pegadas a las paredes, con sello «CONCEPTUAL · NO A ESCALA». |
| Contratos de escena | world/scene-inputs.ts y workshop-tools.ts | Estado de entrada, callbacks (incluye «herramienta en la mano») y API de materiales, etiquetas y animaciones. |
| Construcción de estaciones | models/station-builder.ts y station-layouts.ts | Composición de geometría física, datum de apoyo de cada estación y diagramas funcionales. |
| Modelos físicos | models/intel-8086.model.ts, intel-2164a-memory.model.ts, kingston-dimm.model.ts, apple-soc.model.ts, machine-board.model.ts, chronoscope.model.ts | Cada referencia tiene su constructor. Las fábricas electronics-workshop.ts y memory-models.ts mantienen una API pequeña. |
| Operaciones geométricas | models/workshop-geometry.ts y memory-geometry.ts | Primitivas, perfiles, biseles e instancias. CPU_ASSEMBLY contiene datums de contacto compartidos. |
| Cámara y selección | camera-director.ts, scene-picking.ts, interaction-registry.ts, static-instancing.ts | Encuadre, raycast, IDs y registro de instancias. Metadatos en piece-definitions.ts existen sin WebGL. |
| Física | physics/workbench-physics.ts | Rapier diferido. Herramientas dinámicas; la herramienta en la mano es cinemática y se suelta con `release()`. Suelo del banco, mat, bandeja y suelo de la sala como colisionadores. |
| Consola | console/ | Lectura de la sesión: cabecera, portales del atrio, panel de luz, inspector de piezas y ajustes de sesión. |
| Instrumentos | instruments/cpu/, memory/, apple/, signal/, machine/ | Un componente por instrumento con su HTML y SCSS. Leen LabSession; no calculan reglas del 8086. |
| Kit visual | shared/console-kit.scss | Paneles, LEDs, lecturas, etiquetas y tooltip compartidos por la consola. |
| Salida y medición | effects/effects-pipeline.ts, frame-profile.ts, gpu-profile.ts, gpu-resources.ts | Salida de color única, tres perfiles y mediciones de frame/GPU/buffers. |
| Modelo de máquina | instruments/machine-experiment.ts | Modelo conceptual independiente de la sesión del 8086. |

## Reglas para ampliar

1. Un componente de producción usa templateUrl y styleUrl. Los estilos compartidos entran por `@use` de shared/console-kit.scss.
2. Un nuevo hardware pertenece a models/. Sus hechos y límites van al catálogo; no se inventan cotas de fabricante.
3. Una regla del 8086 pertenece al motor académico y a laboratory/, no a una malla, un componente o una animación.
4. Un objeto del banco que responde al clic tiene ID en piece-definitions.ts, una reacción en el modelo y aparece en el inspector. Un objeto decorativo de la sala no tiene ID.
5. Toda instancia conserva un ID semántico y se libera con InstancedMesh.dispose además de sus geometrías/materiales.
6. Un contacto geométrico tiene una cota compartida y una prueba (bench-clearance.spec.ts o cpu-fit.spec.ts). No se corrige deformando el modelo según el viewport.
7. La galería DDR4 no muestra bancos o direcciones 8086. La ventana de bytes pertenece a la placa clásica.
8. Las posiciones del banco se toman de models/bench-layout.ts; no se repiten números en otros archivos.
9. Una animación se registra con `tools.animate(fn, 'room' | 'subject')`. Una pantalla o un LED no escribe en la sesión; con movimiento reducido recibe tiempo cero.
10. Un modelo de estación declara su datum (la base de su placa o de su pie). El motor la apoya en el mat; no se calcula por el punto más bajo, que puede ser una pata de zócalo.

## Límites de esta separación

El motor gráfico sigue coordinando su propio ciclo de vida. El estado del laboratorio vive en LabSession; App solo compone. Las proyecciones académicas, modelos, física, texturas, animaciones y lámpara tienen propietarios independientes.

## Piezas añadidas en la revisión 4

- **`world/camera-rig.ts`**: todo movimiento de cámara programático (giro, zoom, encuadre, inicio, enlaces). Interpola hacia una meta esférica con `smoothTime` de 0,22 s (entrada) o 0,6 s (encuadre); con movimiento reducido llega en un `update`. Usa `OrbitControls` para la entrada del usuario: no se añadió `camera-controls` porque la política táctil de `scene-input.ts` ya cumple el contrato y el riesgo del plan se resolvió con la variante prevista. `camera-director.ts` ofrece `framePose` (puro) y `CAMERA_CLIP` (planos fijos 0,1–140).
- **`world/scene-hud/`**: capa sobre el visor, común a todas las estaciones: `bench-map/` (luz, piezas y cuña de cámara), `piece-tray/` (modelo | banco, familias con selector de forma real y miniaturas del motor) y rótulos flotantes (`callout-layout.ts`). Los cajones abiertos llevan `data-occludes`; `WorldEngine.freeRegion()` los descuenta.
- **`laboratory/station-activity.ts`**: contrato `StationActivity` (fase, bloques, bus, bytes, registros cambiados, y los campos de buffer, máquina y memoria). Los modelos que explican se suscriben con `tools.onActivity`; ninguno anima en bucle libre. `ActivityChannel` descarta actividad de una sesión anterior.
- **`world/models/*-activity.ts`**: `CpuActivityView` (pines con la dirección real, cola con los bytes del código, mnemónico y flags), `MemoryActivityView` (regla segmento × 16 + offset, lupa fila/columna, bytes por banco, carriles del DIMM, ranuras de caché), `AppleActivityView` (núcleos, buffers B0/B1 fijos, enlaces por etapa, contraste de memoria separada).
- **`world/effects/ambient-dust.ts`**: una sola llamada de dibujo; la deriva se calcula en el vértice y cada mota brilla solo dentro de un haz. Cantidad por perfil: 600, 250, 0.
- **`world/textures/room-light-map.ts`**: luz horneada de paredes y techo (material sin iluminación dinámica).
- **`world/render-governors.ts`**: `ResolutionGovernor` (pasos de 0,05, se estabiliza tras tres inversiones) e `IdleGovernor` (medio ritmo tras 3 s sin eventos).
- **`world/selection-marker.ts`, `hover-glow.ts`, `exploded-layout.ts`, `piece-families.ts`, `timeline-layout.ts`**: funciones puras con sus pruebas.
- **`simulation/cache-model.ts` y `cache-lesson.ts`**: caché de mapeo directo de 4 y 8 líneas, separada del 8086, y la misión M09.

Reglas nuevas: (11) toda animación que explique funcionamiento deriva de `StationActivity`; (12) un material se identifica por id, color, rugosidad y metalicidad (dos modelos usaron `cpu-lid` con colores distintos); (13) el modelo de una estación nunca importa Angular; (14) `tools.relabel` repinta una etiqueta, no se recrea.
