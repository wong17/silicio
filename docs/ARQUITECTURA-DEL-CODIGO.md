# Organización de SILICIO

La interfaz Angular recibe el estado académico y comunica intenciones. Three.js construye y presenta objetos; sus animaciones y la física no escriben registros o memoria.

## Capas y propietarios

| Área | Archivos | Responsabilidad |
|---|---|---|
| Shell | src/app/app.ts, app.html, app.scss | Navegación, editor, instrumentos y estado de la sesión. HTML y SCSS son externos. |
| Fachada | laboratory/laboratory.facade.ts y laboratory.types.ts | Proyecciones, comandos, época de sesión y rechazo de respuestas tardías. |
| Motor académico | simulation/cpu8086.ts, cpu8086.worker.ts, session-codec.ts | Instrucciones/bytes, registros/flags/memoria, ejecución fuera de UI y validación de sesiones. |
| Contenido | content/experiences.ts, missions.ts, checkpoints.ts, component-descriptions.ts | Recorridos, ejercicios y explicaciones del contenido. |
| Adaptador Angular del visor | world/atrium-scene.component.ts, .html, .scss | Inputs/outputs, lifecycle y callbacks a zona Angular. No fabrica modelos ni posee el bucle de dibujo. |
| Motor Three.js | world/world-engine.ts | Renderer, recursos, estación, renderloop, integración de cámara, selección y herramientas. No importa Angular. |
| Contratos de escena | world/scene-inputs.ts y workshop-tools.ts | Estado de entrada y API de materiales/geometrías/etiquetas. |
| Construcción de estaciones | models/station-builder.ts y station-layouts.ts | Composición de geometría física y diagramas funcionales. |
| Modelos físicos | models/intel-8086.model.ts, intel-2164a-memory.model.ts, kingston-dimm.model.ts, apple-soc.model.ts, workbench-room.model.ts | Cada referencia o ambiente tiene un constructor independiente. Las fábricas electronics-workshop.ts y memory-models.ts mantienen una API pequeña. |
| Operaciones geométricas | models/workshop-geometry.ts y memory-geometry.ts | Primitivas, perfiles, biseles e instancias. CPU_ASSEMBLY contiene datums de contacto compartidos. |
| Cámara y selección | camera-director.ts, scene-picking.ts, interaction-registry.ts, static-instancing.ts | Encuadre, raycast, IDs y registro de instancias. Metadatos en piece-definitions.ts existen sin WebGL. |
| Física | physics/workbench-physics.ts | Rapier diferido; herramientas dinámicas, mecanismos cinemáticos, paso fijo y liberación. GSAP escribe la pose visual del mecanismo; Rapier sigue esa pose y no la sobrescribe. |
| Salida y medición | effects/effects-pipeline.ts, frame-profile.ts, gpu-profile.ts, gpu-resources.ts | Salida de color única, tres perfiles y mediciones de frame/GPU/buffers. |
| Instrumento de máquina | instruments/machine-experiment.ts y machine-instrument.component.ts, machine-instrument.html, machine-instrument.scss | Modelo conceptual independiente y presentación de transferencias con valores reales del ejemplo. |

## Reglas para ampliar

1. Un componente de producción usa templateUrl y styleUrl. Los marcadores de navegación también tienen archivos externos; los mocks de pruebas pueden usar plantillas vacías.
2. Un nuevo hardware pertenece a models/. Sus hechos y límites van al catálogo; no se inventan cotas de fabricante.
3. Una regla del 8086 pertenece al motor académico, no a una malla o una animación.
4. Toda instancia conserva un ID semántico y se libera con InstancedMesh.dispose además de sus geometrías/materiales.
5. Un contacto geométrico tiene una cota compartida y una prueba. No se corrige deformando el modelo según el viewport.
6. La galería DDR4 no muestra bancos o direcciones 8086. La ventana de bytes pertenece a la placa clásica.

## Límites de esta separación

App sigue coordinando la sesión de la entrega y el motor gráfico sigue siendo el coordinador de su lifecycle. No se ha creado una capa por cada método ni un servicio global por cada pieza. Las proyecciones académicas, modelos, física y efectos sí tienen propietarios independientes.
