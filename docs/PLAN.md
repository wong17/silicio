# SILICIO — Plan unificado: cierre de pendientes y siguiente nivel

> **Para agentes que ejecuten este plan:** SUB-SKILL REQUERIDA: `superpowers:subagent-driven-development` (recomendada) o `superpowers:executing-plans`. Las tareas usan casillas (`- [ ]`) para el seguimiento. Cada tarea termina con su prueba en verde y un commit propio.

**Objetivo:** cerrar lo que quedó abierto de las revisiones 2.0 y 3.0 y llevar la escena, los modelos y la consola a un nivel en el que el texto se lee, la cámara se mueve con suavidad, nada parpadea y cada animación explica el funcionamiento real del estado.

**Arquitectura:** se conserva la separación actual (Angular lee `LabSession`; `WorldEngine` no importa Angular; los modelos viven en `world/models/`). Se añaden cuatro piezas nuevas con dueño propio: un `CameraRig` para todo movimiento de cámara, una capa `scene-hud/` sobre el visor (mapa del banco y bandeja de piezas), un contrato `StationActivity` que lleva el estado académico a las animaciones, y un módulo `effects/ambient-dust.ts` para la atmósfera.

**Stack:** Angular 21, Three.js 0.186.1 (fijado), GSAP 3.14, Lenis 1.3, Rapier diferido, Vitest 4. Dependencia nueva aprobada: `camera-controls` 3.1.2 (peer `three >= 0.126.1`, comprobado en npm).

**Especificación:** este documento (secciones 2 a 4) y la petición del 13 de octubre de 2026. Los contratos académicos históricos (dialecto 8086, misiones M01–M12, fixtures F01–F06) siguen en `docs/archivo/plan/`; este plan los cita, no los repite.

Este es el único plan vivo. Sustituye a los 16 documentos de plan y estado anteriores, que pasaron a `docs/archivo/` (sección 9).

## Restricciones globales

- Tema oscuro exclusivamente. Arduino excluido.
- La física, una animación, el perfil gráfico o la navegación nunca cambian un resultado académico.
- **Regla nueva:** toda animación que explique funcionamiento deriva del estado real de la sesión. Un bucle libre solo se admite en ambiente (polvo, pilotos, traza analógica del osciloscopio).
- Con movimiento reducido se muestra el estado final, sin recorrido; ninguna función se pierde.
- Objetivos táctiles ≥ 44×44 px CSS, separación ≥ 8 px, lectura habitual 16 px.
- Cada pieza operable o de estudio tiene ID, nombre legible en español, respuesta y equivalente accesible fuera del WebGL.
- Componentes con `templateUrl` y `styleUrl`; posiciones del banco solo desde `models/bench-layout.ts`; animaciones registradas con `tools.animate(fn, 'room' | 'subject')`.
- No se inventan cotas de fabricante ni marcados reales: lo ilustrativo se rotula como tal.
- Carga inicial ≤ 900 kB (hoy 529,82 kB). Ningún efecto entra sin medir su coste en la GPU de referencia.
- La GPU de referencia es la del equipo de trabajo: **NVIDIA GeForce GT 730** (la escena la detecta en `canvas.dataset.gpu`).

## Foco de revisión

1. **GPU débil con todo activado.** Polvo, HUD, miniaturas y postproceso en la GT 730: la escena no puede ir peor que hoy. Cada efecto tiene coste medido y se apaga por perfil (tarea A1, L5).
2. **Tres orígenes de selección.** Clic en 3D, bandeja y mapa escriben un único `activePart`. Elegir desde la bandeja una pieza interna con el chip cerrado lo abre (H4).
3. **WebGL ausente o movimiento reducido.** Mapa, bandeja y registros siguen operables; las miniaturas caen a glifos SVG (H3).
4. **Cambio de estación a media transición.** Con la cámara en vuelo o miniaturas en cola no quedan tweens ni recursos vivos: diez recorridos dejan buffers, geometrías y texturas constantes (C2, H3, A2).
5. **Ventana estrecha.** El HUD no tapa título, barra ni pieza enfocada: `freeRegion()` descuenta toda superposición (H1).

---

## 1. Estado actual verificado (13 de octubre de 2026)

| Comprobación | Resultado | Cómo se obtuvo |
|---|---|---|
| Pruebas | 129 de 129 en 31 archivos | `npm test -- --watch=false` |
| Build de producción | Correcto; inicial 529,82 kB; escena diferida 758,29 kB; Rapier diferido 4,34 MB | `npm run build` |
| Rama | `codex/scene-instruments-mobile`, árbol limpio | `git status` |
| Estaciones | Atrio, Banco 8086, Memoria (2164A y DDR4), Cronoscopio, Apple Silicon, La máquina | Navegador integrado, las cinco rutas |

Los documentos anteriores decían 83 o 122 pruebas y «cambios sin commit»; ambas cosas estaban desfasadas.

**No medido en esta revisión:** FPS reales. El panel del navegador integrado no avanza `requestAnimationFrame`, así que las cifras de fotograma hay que tomarlas en Brave (tarea A1).

### Estado de la ejecución (14 de octubre de 2026)

Hecho y verificado con pruebas (303 en verde, build inicial 607 kB): fases Q, C (salvo C7), E, H, U (salvo U5), M, X, N y A2 a A7, más L1 a L4, L6 y L7.

Revisión posterior (14 de octubre): corregidos el temblor al alejar la cámara (el límite de la sala y el de zoom discrepaban), el parpadeo negro (el cambio de resolución vaciaba el lienzo al final del fotograma) y las recompilaciones de shaders al generar miniaturas; plano cercano dinámico; tubo del techo fijo; texto de los portales a la izquierda; HUD usable en móvil (bandeja compacta, mapa solo en pantallas anchas).

Pendiente, con la razón:

| Tarea | Estado |
|---|---|
| C7 · profundidad invertida | Disponible con `?depth=reversed` para comparar; falta medirla y decidir en la GT 730 |
| L5 · GTAO, bloom, viñeta | Pases construidos y desactivados; se encienden con `?fx=ao,bloom,vignette` para medirlos uno a uno y descartar los que pasen de 2 ms |
| U5 · tokens | `npm run check:tokens` cuenta los colores fuera de tokens (118 → 91 usos); falta el detector de Impeccable, que no está instalado |
| A1 · línea base de rendimiento | El panel integrado no avanza los fotogramas: medir en Brave con Mayús+D y anotar en `docs/qa/HOJA-DISPOSITIVOS.md` |

Desviaciones declaradas: C1 se resolvió con `OrbitControls` + `CameraRig` (la variante de reserva del plan), sin añadir `camera-controls`; E4 bajó el desgaste por defecto pero no subió a 256 px las superficies protagonistas.

## 2. Diagnóstico de lo que reportaste

| # | Síntoma | Causa | Evidencia | Se arregla en |
|---|---|---|---|---|
| D1 | Las paredes se vuelven grises «como si dejaran de dibujarse» al girar | Al enfocar una pieza, `frameBounds` deja `camera.far = 60` y un `near` minúsculo; nada los restaura (`resetView`, `rotate` y `zoom` no los tocan). La sala mide 76 de ancho, así que las paredes a más de 60 unidades se recortan y se ve el color de fondo | Medido en la escena tras «Enfocar pieza»: `far = 60`, `near = 0,08`, offset de vista aún activo. `camera-director.ts:28-29`, `world-engine.ts:557-596` | Q1, C1 |
| D2 | Paredes oscuras lejos del banco | Solo las iluminan un hemisferio de 0,35 y el entorno de 0,45; los dos focos de techo apuntan hacia abajo y su luz decae antes de llegar a las paredes. Además la niebla empieza a 44 unidades, dentro de la sala | `world-engine.ts:198`, `:217-240` | L1, L2 |
| D3 | Texto 3D con poco contraste | Tres causas sumadas: (a) las etiquetas son `MeshBasicMaterial`, no reciben luz, así que bajo la lámpara la superficie se aclara y la tinta no; (b) tinta fija `#ede5ca` sobre cualquier fondo; (c) la tapa del 8086 es `#292d2c` con metalicidad 0,5, y la biblioteca de superficies la trata como metal desnudo: el desgaste expone `#c6c9cb` y la deja casi blanca | `scene-labels.ts:30-39`, `paintLabel` en `label-canvas.ts`, `resolveSurface` en `surface-library.ts`. En el navegador la tapa se ve blanca y el rótulo «INTEL 8086» desaparece | Q5, E1–E4 |
| D4 | «VENTANA LÓGICA / 32 BYTES» se ve cortada a trozos | El rótulo está a y = 0,15 de la estación; la alfombrilla queda a 0,155. El rótulo está 5 mm **debajo** de la alfombrilla y solo asoma por el `polygonOffset` | Medido: estación en y = −0,39; rótulo en −0,24; alfombrilla en −0,235. `station-builder.ts` (rótulo y celdas lógicas), `CLASSIC_BOARD_BASE = 0.155` | Q2, C4 |
| D5 | Parpadeos y artefactos | Verificado: D4. Sin auditar: la prueba de caras coplanares solo construye el banco (`coplanar-faces.spec.ts:94`), no las cinco estaciones ni las etiquetas. Hipótesis por comprobar en C4/A1: orden de transparencias (etiquetas, brillos de Apple, cono de la lámpara), saltos de la resolución adaptativa, y el tubo averiado, que parpadea a propósito | Planos a 1–2 mm en Apple (`top + 0.012`, `+0.0135`, `+0.02`) y en la máquina (pistas y rótulos a `PCB_TOP + 0.012`) | C4, C5, L3, A1 |
| D6 | Cámara brusca | Los botones de giro y zoom teletransportan la cámara (π/8 y ×0,85 de golpe); «Enfocar» coloca la cámara sin transición; la rueda no tiene amortiguación (OrbitControls solo amortigua el giro); el límite de la sala es un corte seco con `lookAt` | `world-engine.ts:447-462`, `:580-596`, `:899-901` | C1–C3 |
| D7 | La taza de café aparece en el selector | El catálogo pone primero los 16 objetos del banco y luego las piezas del modelo, en una sola lista de hasta 80 opciones | `accessibleCatalog` en `piece-definitions.ts`; `registerParts` en `world-engine.ts:620-629` | Q4, H3 |
| D8 | Registros sin explicación | `<select>` nativo con solo las siglas | `register-panel.component.html` | Q3, U1 |

**Hallazgos que no reportaste:**

| # | Hallazgo | Evidencia | Tarea |
|---|---|---|---|
| D9 | Nombres crudos en la interfaz: `alu`, `registers`, `control`, `biu`, `queue`, `performance`, `efficiency`, `gpu`, `neural`, `unified`, `initial` | Lista y título «Pieza seleccionada» en el navegador; faltan en `names` de `piece-definitions.ts` | Q4 |
| D10 | En el Cronoscopio aparecen «Circuitos de interfaz» y «Referencias de la placa» | `classifySubject` (`piece-catalog.ts`) clasifica por descarte como `logic` | M3 |
| D11 | El deslizador de altura llega a 4,4, pero el límite es 6 y el valor por defecto 5: al tocarlo la lámpara baja de golpe | `max="4.4"` en `light-pad.component.html`; `LAMP_LIMITS.height = [1.6, 6]` | Q3 |
| D12 | Animaciones «didácticas» que no reflejan el estado: los paquetes de la máquina van y vienen siempre; el cursor del Cronoscopio recorre los cuadros por reloj (`floor(t*2) % 16`); los bloques de Apple se encienden en ciclo fijo; `transfer()` mueve una esfera por la misma ruta en todas las estaciones | `machine-board.model.ts`, `chronoscope.model.ts` (`playhead`), `apple-soc.model.ts` (`blocks`), `world-engine.ts:408-431` | M0–M5 |
| D13 | La caja de selección de la lámpara abarca brazo, cono de luz y polvo | `BoxHelper` sobre el grupo entero (`world-engine.ts:249`, `:610-616`); visible en tus capturas | C5 |
| D14 | El polvo existe, pero solo con «Inspección cercana», y se recalcula en CPU cada fotograma | `updateDust` en `lamp-controller.ts` | L3 |
| D15 | El README anuncia un glosario que no existe en el código | Búsqueda de `glosario`/`glossary` en `src/` sin resultados | U3 |
| D16 | Todas las superficies llevan el mismo patrón de manchas claras (mesa, alfombrilla, paredes, tapa), que compite con el texto | Capturas; `wear` por defecto 0,5 en metales y 0,18 en el resto | E4 |

## 3. Pendientes heredados (unificados)

### 3.1 Se cierran en el repositorio

| ID | Pendiente | Origen | Tarea |
|---|---|---|---|
| P1 | Pruebas nombradas en el plan que no existen: `bit_selection_reports_weight`, `little_endian_visual_uses_real_bytes`, `value_change_does_not_rebuild_memory_model`, `restore_updates_all_instruments`, `reduced_motion_keeps_signal_state`, `ten_station_roundtrips_stabilize_resources`, `representation_control_dispatches_intent` | R03, R05, R09–R12 | A2 |
| P2 | Auditoría de z-fighting y apoyos de todas las estaciones y sus etiquetas | R07, NX09 | C4 |
| P3 | Coste aislado de cada pase y de CPU por estación; presupuesto por perfil | R11, R12, plan de ambientación | A1, L5 |
| P4 | Polvo, CRT y profundidad de campo «solo bajo restricciones» | R11 | L3, L5 |
| P5 | Contrato de la cola de prelectura: hoy es un bloque estático | R10 | M1 |
| P6 | El osciloscopio solo cambia de canal; captura y cursor no se controlan | R07 | M6 |
| P7 | Glosario | README, plan 2.0 | U3 |
| P8 | Paquete local sin red: verificar que no sale ninguna petición externa | R12, R24, NX14 | A3 |
| P9 | La sesión no sobrevive a recargar la página (solo se guardan preferencias en `silicio.preferences`) | R22 | A4 |
| P10 | Modo de presentación | Índice 2.0, §3 | X1 |
| P11 | 95 avisos del detector de Impeccable (paleta, tamaños, radios fuera de `DESIGN.md`) y rampas tonales sin definir | Evidencia rev. 3, `DESIGN.md` | U5 |
| P12 | Acciones repetibles con estado ocupado; sin dobles activaciones | R02 | H4 |
| P13 | Misiones por estación: las 8 actuales son programas del 8086. M01, M04, M06 y M07 del plan (atrio, memoria, cronoscopio, Apple) existen como estación con una pregunta de comprobación, no como misión con condición de éxito | Plan 2.0, R15 | X2 |

### 3.2 Necesitan un equipo o una persona (no se cierran solo con código)

| Pendiente | Qué hace falta | Quién |
|---|---|---|
| Teléfono y tableta reales, teclado virtual | Recorrer las cinco estaciones en un Android o iPhone | Tú, con la lista de la tarea A5 |
| Zoom 200 % y lector de pantalla | NVDA en Windows y zoom del navegador | Tú o yo con tu navegador (Claude in Chrome) |
| FPS en el equipo de exposición | Abrir el medidor (tarea A1) en ese equipo y anotar p50/p95 | Tú |
| Comprensión y aceptación docente | Enseñarlo al docente con el guion | Tú |
| Arrastre con ratón real a 30 y 60 FPS | Prueba manual de herramientas y lámpara | Tú |

### 3.3 Se cierran por decisión

| Pendiente | Propuesta |
|---|---|
| Cotas mecánicas exactas del lote 2164A y del DIMM (R00, R06) | Cerrar como «aproximación declarada»: el catálogo ya lo dice. No hay plano de lote y no aporta al objetivo docente |
| Temporización eléctrica real (R09) | Cerrar como fuera de alcance: el laboratorio es didáctico y lo declara |
| Inventario por pin de la RAM (R02) | Cerrar: sin pinout verificado no se inventa |

### 3.4 Ampliaciones P1 y P2 del plan histórico

| ID | Ampliación | Misión | Recomendación |
|---|---|---|---|
| EXT-03 | Pila, CALL y RET | M08 | **Aprobada.** Fase N, tarea N1 |
| EXT-01 | Caché de 4 y 8 líneas con costes | M09 | **Aprobada.** Fase N, tarea N2 |
| EXT-04 | Sondeo e interrupción | M10 | Después de EXT-03 |
| EXT-02 | Variantes M5 Pro/Max | — | Solo si el docente lo pide |
| EXT-05 | Fundición: dos organizaciones `generic16` | M11 | En espera |
| EXT-06 | Especulación y ejecución fuera de orden | M12 | En espera |
| EXT-07 | Constructor libre de CPU | — | **Retirado del alcance** (decisión del 13 de octubre de 2026) |
| EXT-08 | Modo cooperativo en red | — | **Retirado del alcance** (decisión del 13 de octubre de 2026) |

## 4. Plan de trabajo

Orden: **Q** (arreglos inmediatos) → **C** (cámara y render estable) → **E** (texto) → **L** (luz y atmósfera) → **H** (HUD de escena) → **U** (consola) → **M** (modelos y animaciones) → **X** (propuestas) → **N** (ampliaciones aprobadas) → **A** (aceptación). A1 se adelanta: se mide antes de tocar luz o efectos.

### Fase Q — Arreglos inmediatos

Cinco cambios pequeños que quitan los defectos más visibles antes del trabajo grande.

- [x] **Q1 · Planos de recorte fijos.** `camera-director.ts`: exportar `CAMERA_CLIP = { near: 0.1, far: 140 }`; `frameBounds` deja de escribir `near` y `far`. `world-engine.ts`: la cámara nace con `CAMERA_CLIP` y `resetView` lo reaplica. Prueba en `camera-director.spec.ts`: `framing_never_clips_the_room` (tras `frameBounds` con una caja de radio 0,2, `camera.far >= 140` y `camera.near >= 0.05`).
- [x] **Q2 · Rótulo y celdas sobre la alfombrilla.** `station-builder.ts`: el rótulo «VENTANA LÓGICA» pasa a `CLASSIC_BOARD_BASE + 0.006`; las celdas apoyan su base en `CLASSIC_BOARD_BASE`. Prueba en `bench-clearance.spec.ts`: `logical_window_rests_on_the_mat`.
- [x] **Q3 · Controles coherentes.** `light-pad.component.html`: `min` y `max` del deslizador salen de `LAMP_LIMITS.height`. `register-panel.component.html`: opciones «AX · Acumulador» agrupadas con `<optgroup>` (Datos, Punteros e índices, Segmentos, Control), con los textos de la tarea U1. Prueba: `height_slider_spans_the_lamp_limits`.
- [x] **Q4 · Nombres y orden de piezas.** `piece-definitions.ts`: nombres para los 11 IDs crudos (D9) y `scope: 'model' | 'bench'` en `PieceDefinition`. `piece-inspector.component.html`: primero las piezas del modelo, y el banco en un `<optgroup label="Banco de trabajo">`. Pruebas en `piece-catalog.spec.ts`: `every_piece_has_a_human_name` (ningún nombre igual a su ID en las seis estaciones y dos variantes de memoria) y `model_pieces_come_before_bench_objects`.
- [x] **Q5 · Tapa del 8086 legible.** `intel-8086.model.ts`: la tapa declara su acabado (`finish: 'paint'`, `metal: false`, `wear: 0.12`) para que no se exponga metal claro; rótulos con tinta clara de peso 600. Prueba en `surface-maps.spec.ts`: `cpu_lid_stays_dark` (luminancia media del albedo < 0,12).

### Fase C — Cámara y render estable

Skills: `threejs-camera-direction`, `threejs-procedural-geometry` (parpadeo coplanar, holguras), `threejs-interaction`, `threejs-debugging`.

- [x] **C1 · `CameraRig`.** `npm install camera-controls@3.1.2`. Crear `world/camera-rig.ts` sobre esa biblioteca; `world-engine.ts` deja de usar `OrbitControls` directamente.
  - Primer paso: migrar `applyInputPolicy` (`scene-input.ts`) a la configuración de botones y toques de `camera-controls`, con la prueba existente `mobile_starts_with_scroll_and_explicit_orbit` en verde antes de seguir. En móvil sin «Manipular», un dedo desplaza la página y no orbita.
  - Se conservan: el inicio de arrastre que cancela transiciones (`cancelCamera`), la desactivación de la cámara al arrastrar la lámpara o una herramienta (`beginDrag`), y el ángulo polar entre 0,2 y 0,48π.
  - Produce: `class CameraRig { constructor(camera: PerspectiveCamera, canvas: HTMLElement); orbitBy(azimuth: number, polar?: number): void; orbitTo(azimuth: number): void; dollyBy(factor: number): void; frame(bounds: Box3, region: ViewportRegion): void; home(mobile: boolean, aspect: number): void; setReduced(reduced: boolean): void; update(dt: number): boolean; readonly azimuth: number; readonly distance: number; dispose(): void }`.
  - Valores: `smoothTime` 0,22 s para rueda y arrastre, 0,6 s para `frame` y `home`, 0 con movimiento reducido; zoom hacia el cursor; distancia 1,6–32.
  - Pruebas en `camera-rig.spec.ts`: `orbit_command_eases_instead_of_jumping` (tras `orbitBy(Math.PI / 8)` y un `update(1/60)`, el acimut avanzó más de 0 y menos de π/8), `reduced_motion_reaches_the_pose_in_one_update`, `a_new_command_retargets_a_running_transition`.
- [x] **C2 · Encuadre con transición.** `camera-director.ts`: `framePose(...)` devuelve `{ position, target, focalOffset }` sin mutar la cámara; `CameraRig.frame` la interpola. `freeRegion()` descuenta cualquier elemento con `data-occludes` (título, barra, HUD). Pruebas: `framing_pose_is_pure` y la existente `expanded_panel_keeps_selected_bounds_in_free_region`.
- [x] **C3 · Límites blandos.** `room-bounds.ts` entrega la caja a `CameraRig.setBoundary`; se elimina el `lookAt` de `keepCameraInRoom`. Pruebas existentes de `room-bounds.spec.ts` más `boundary_never_flips_the_view`.
- [x] **C4 · Auditoría de planos en las estaciones.** Extender `coplanar-faces.spec.ts` para construir las seis variantes con `StationBuilder` y registrar cada etiqueta como cara. Reglas: ninguna pareja visible coplanar con solape > 0,05; toda etiqueta entre 0,004 y 0,03 por encima de la superficie que la sostiene; ninguna bajo otra superficie. Corregir lo que salga (previsto: brillos y rótulos de Apple, pistas y rótulos de la máquina, serigrafía y tornillos del 8086). Pruebas: `stations_have_no_coplanar_faces`, `labels_sit_above_their_host_surface`.
- [x] **C5 · Marca de selección.** Crear `world/selection-marker.ts`: ocho esquinas en L en lugar de la caja completa, más un pulso de emisión de 300 ms al seleccionar. Las mallas con `userData.noBounds` (cono, polvo, anillo de luz) quedan fuera de la caja. Prueba: `lamp_selection_ignores_beam_and_dust`.
- [x] **C6 · Orden de transparencias.** `renderOrder` explícito por clase: superficie → brillo → etiqueta → anillo de luz → cono → polvo. Prueba: `transparent_layers_have_a_fixed_order`.
- [ ] **C7 · Profundidad invertida (evaluar).** Probar `reversedDepthBuffer: true` en el renderer; adoptar solo si sombras y postproceso siguen correctos en la GT 730. Evidencia: comparación de vistas fijas (A6).

### Fase E — Texto legible en la escena

Skills: `threejs-materials`, `threejs-textures`, `dannaway-practical-ui` (contraste medido, no a ojo).

- [x] **E1 · Etiquetas con luz.** `scene-labels.ts`: `MeshStandardMaterial` (rugosidad 0,85, sin metal) en lugar de `MeshBasicMaterial`. La tinta y la superficie reciben la misma luz, así que su relación de contraste no cambia al mover la lámpara. Prueba: `labels_are_lit_like_their_surface`.
- [x] **E2 · Tinta según la superficie.** Crear `textures/label-ink.ts` con `contrastRatio(a: number, b: number): number` y `pickInk(surfaceLuminance: number): { ink: string; outline: string }`. `tools.label(..., options?: LabelOptions)` con `interface LabelOptions { ink?: 'auto' | 'light' | 'dark'; plate?: boolean; host?: string }`. Por defecto `auto`. Pruebas: `auto_ink_reaches_4_5_to_1` sobre el albedo medio de cada superficie rotulada; `dark_ink_on_light_ceramic`.
- [x] **E3 · Nitidez.** `label-canvas.ts`: lienzo 1024×192, peso 600, contorno de 2 px en el tono opuesto al 35 %, anisotropía 8. Opción `plate` para superficies con mucho desgaste: placa impresa detrás del texto. Se actualizan las pruebas de `label-canvas`.
- [x] **E4 · Desgaste que no compite.** `surface-maps.ts`: bajar la amplitud de los parches en las superficies que llevan texto y en paredes; 256 px en las superficies protagonistas. Evidencia: vistas fijas antes y después (A6).
- [x] **E5 · Rótulos flotantes.** Botón «Rotular piezas» (tecla T) en la barra: etiquetas HTML con línea guía sobre las piezas principales del modelo, de tamaño constante en pantalla. Resuelve la lectura a distancia sin agrandar la serigrafía. El motor emite las anclas proyectadas a 10 Hz como máximo. Pruebas: `callouts_follow_their_piece`, `callouts_stay_inside_the_free_region`.

### Fase L — Luz y atmósfera

Skills: `threejs-lighting`, `threejs-procedural-vfx`, `threejs-particles`, `threejs-shaders`, `threejs-image-pipeline`, `threejs-screen-space-ambient-occlusion`, `threejs-bloom`, `threejs-exposure-color-grading`. A1 va antes.

- [x] **L1 · Cáscara de la sala con luz horneada.** `lab-room.model.ts`: paredes, techo y suelo lejano usan un material barato con un mapa de luz procedural (charcos bajo cada luminaria, oscurecimiento en esquinas y zócalo). Las paredes dejan de depender de las luces dinámicas: nunca quedan negras y cuestan menos por píxel. Pruebas: `room_shell_ignores_dynamic_lights`, `wall_luminance_stays_above_floor` (luminancia mínima del mapa > 0,18).
- [x] **L2 · Niebla fuera de la sala.** `world-engine.ts`: la niebla empieza en 70 y termina en 220; el fondo conserva el color por seguridad. Evidencia: vistas fijas desde tres esquinas.
- [x] **L3 · Polvo en el aire.** Crear `world/effects/ambient-dust.ts`.
  - Produce: `interface DustBeam { origin: Vector3; direction: Vector3; cosAngle: number; strength: number }` y `class AmbientDust { constructor(count: number, volume: Box3, track: WorkshopTools['track']); readonly points: Points; setBeams(beams: DustBeam[]): void; update(seconds: number): void }`.
  - Un solo `Points` con shader: la deriva se calcula en el vértice (sin trabajo de CPU por fotograma) y cada mota brilla solo al cruzar un haz (lámpara y los dos focos de techo), como el polvo real. Se desvanece cerca de la cámara. Cantidad por perfil: 600 / 250 / 0. Sustituye el polvo en CPU de `lamp-controller.ts`.
  - Pruebas: `dust_stays_inside_its_volume`, `dust_is_frozen_under_reduced_motion`, `low_tier_has_no_dust`.
- [x] **L4 · Haz de la lámpara.** `articulated-lamp.model.ts`: el cono plano pasa a un shader con caída por distancia y bordes difuminados; desaparece el triángulo duro que cruza la escena en primer plano. Evidencia: vista fija rasante.
- [ ] **L5 · Postproceso medido, solo en «Detalle».** `effects-pipeline.ts`: oclusión ambiental GTAO a media resolución, bloom con umbral HDR ≥ 1,2 (solo emisores: LEDs, lente, paquetes), viñeta y grano leves. Cada pase se mide aislado y se descarta si pasa de 2 ms en la GT 730. Pruebas: `quality_tiers_lower_only_render_cost` (existente) y `each_pass_can_be_disabled`.
- [x] **L6 · Sombras.** Penumbra de la lámpara con `shadow.radius`; frustum de sombra ajustado al cono; revisar `bias` para quitar el temblor al mover la cabeza. Evidencia: vista fija con la lámpara en movimiento.
- [x] **L7 · Tubo averiado: se queda, verificado.** El foco de techo que está detrás de la cámara parpadea a propósito, como un fluorescente viejo (`failing-light.ts`). Se conserva tal cual. La tarea solo comprueba que no esconde un defecto: su lente y su luz cambian en el mismo fotograma, no proyecta sombra, y con el tubo fijo (movimiento reducido) la vista fija de esa mitad de la sala no muestra ningún otro parpadeo. Prueba: `failing_tube_lens_and_light_change_together`.

### Fase H — HUD de escena: mapa del banco y bandeja de piezas

Skills: `impeccable`, `dannaway-practical-ui`, `threejs-interaction`, `threejs-accessibility`, `frontend-design`.

**Idea central.** Una sola capa `scene-hud/` sobre el visor, común a todas las estaciones, con dos piezas plegables. El panel derecho queda para leer y operar el instrumento; lo que sirve para moverse por la escena vive en la escena.

**Mapa del banco** (esquina inferior derecha del visor; plegado es un botón de 44 px con el piloto de la lámpara). Es el minimapa actual convertido en radar, con tres capas:

- **Luz:** el punto de luz se arrastra como hoy, con el anillo de alcance y un deslizador vertical de altura.
- **Piezas:** un punto por pieza del modelo; clic para seleccionar, doble clic para enfocar.
- **Cámara:** una cuña en el borde muestra desde dónde miras; arrastrarla orbita la vista.

**Bandeja de piezas** (cajón sobre la barra de herramientas; tecla P). Sustituye el desplegable:

- Interruptor **Modelo | Banco**: la taza y los instrumentos quedan en «Banco».
- Carrusel de tarjetas con **miniatura 3D** de cada pieza, generada por el propio motor.
- Las piezas repetidas se agrupan en una tarjeta de familia («Terminales ×40», «2164A ×16», «Bytes ×32», «Estados ×16»). Al abrirla aparece un **selector con la forma real**: el contorno del DIP-40 con sus dos filas de 20 pines, la rejilla 2×8 de memorias, la ventana 2×16 con sus valores en vivo, o la cinta de estados.

| Decisión | Problema | Principio | Coste | Verificación |
|---|---|---|---|---|
| Mapa en el visor, no en la consola | Ocupa 330 px de consola en cada estación y está lejos de lo que controla | Acercar el control a su objeto | Tapa una esquina de la escena | Plegado ocupa 44 px; `freeRegion` lo descuenta |
| Familias con selector de forma real | 40 pines y 32 bytes entierran al resto en una lista | Agrupar lo relacionado; reconocer en vez de recordar | Un paso más para llegar a un pin | Llegar a ALE: 2 clics, antes una lista de 80 |
| Modelo y Banco separados | El selector mezcla la taza con la ALU | Una prioridad por contexto | Un interruptor más | La vista por defecto no lista objetos de banco |
| Miniaturas del motor | Un nombre no dice cómo es la pieza | Mostrar, no describir | Una pasada de render por pieza al cargar | Repartidas una por fotograma; glifo SVG sin WebGL |

- [x] **H1 · Capa `scene-hud`.** Crear `world/scene-hud/scene-hud.component.{ts,html,scss}`: anfitrión con ranuras `map` y `tray`, estado plegado en preferencias (`LabSession.hud`), `data-occludes` en lo desplegado. En móvil el mapa abre como hoja inferior. Pruebas: `hud_state_survives_station_change`, `hud_never_covers_the_toolbar` (390×844 y 1440×900).
- [x] **H2 · Mapa del banco.** Crear `scene-hud/bench-map/` a partir de `console/light-pad/` (se retira de `app.html`).
  - Consume del motor (`SceneCallbacks`): `anchors: (a: PieceAnchor[]) => void` con `interface PieceAnchor { id: string; x: number; z: number; scope: 'model' | 'bench' }`, y `view: (v: { azimuth: number; distance: number }) => void` a 10 Hz como máximo. Usa `CameraRig.orbitTo`.
  - Pruebas: `dragging_the_spot_moves_the_lamp`, `clicking_a_marker_selects_the_piece`, `camera_wedge_follows_the_azimuth`, `arrow_keys_nudge_the_spot`.
- [x] **H3 · Bandeja de piezas.** Crear `scene-hud/piece-tray/` y `world/piece-families.ts`.
  - Produce: `family?: { id: string; label: string; index: number; layout: 'dip40' | 'grid' | 'timeline' | 'list'; columns?: number }` en `PieceDefinition`; `groupPieces(pieces: PieceDefinition[]): TrayItem[]`; `WorldEngine.thumbnail(id: string, size?: number): Promise<Blob | null>` (objetivo de 128 px, pieza aislada por capas, una por fotograma libre, caché por estación).
  - Accesible: `role="listbox"`, flechas, tabulador único; cada instancia es un botón con nombre («Pin 25 · ALE»).
  - Pruebas: `forty_pins_collapse_into_one_family`, `bench_objects_live_in_their_own_scope`, `tray_follows_a_3d_pick`, `thumbnails_fall_back_to_glyphs_without_webgl`, `thumbnails_are_released_on_station_change`.
- [x] **H4 · Pieza seleccionada.** `console/piece-inspector/`: pierde el `<select>`; queda la tarjeta con nombre, descripción y acciones (Enfocar, Iluminar, Abrir chip si la pieza es interna). Las acciones muestran estado ocupado mientras dura la transición. Pruebas: `selecting_an_internal_piece_opens_the_chip` (existente), `busy_action_ignores_a_second_activation`.
- [x] **H5 · Despiece graduable.** El botón «Abrir o cerrar chip» gana un deslizador de 0 a 100 %: las capas se separan en orden, con sus rótulos (E5). Las posiciones salen de una función pura `explodedOffset(id: string, amount: number): Vector3`. Prueba: `exploded_layers_never_interpenetrate` al 25, 50 y 100 %.

### Fase U — Consola

Skills: `impeccable`, `dannaway-practical-ui`, `redesign-existing-projects`.

- [x] **U1 · Banco de registros.** Crear `content/registers.ts` y rehacer `register-panel`: los 13 registros a la vista como celdas con sigla y valor en vivo, en cuatro grupos. Al elegir uno, bajo la lectura aparece su nombre y su papel, y en AX–DX una llave marca la mitad alta y la baja (AH/AL).

  | Grupo | Registro | Nombre | Papel |
  |---|---|---|---|
  | Datos | AX | Acumulador | Operando y resultado implícito de multiplicar, dividir y de la entrada/salida |
  | Datos | BX | Base | Puntero base para direccionar memoria |
  | Datos | CX | Contador | Cuenta de LOOP, desplazamientos y repeticiones |
  | Datos | DX | Datos | Mitad alta en multiplicar y dividir; puerto de entrada/salida |
  | Punteros e índices | SP | Puntero de pila | Cima de la pila, dentro de SS |
  | Punteros e índices | BP | Puntero base | Base del marco de pila; usa SS por defecto |
  | Punteros e índices | SI | Índice fuente | Origen en operaciones de cadena |
  | Punteros e índices | DI | Índice destino | Destino en operaciones de cadena |
  | Segmentos | CS | Segmento de código | Con IP localiza la siguiente instrucción |
  | Segmentos | DS | Segmento de datos | Segmento por defecto de los datos |
  | Segmentos | SS | Segmento de pila | Segmento de SP y BP |
  | Segmentos | ES | Segmento extra | Destino de las operaciones de cadena |
  | Control | IP | Puntero de instrucción | Desplazamiento de la próxima instrucción en CS |

  Pruebas: `every_register_has_name_and_role`, `bit_selection_reports_weight` (P1), `high_and_low_halves_match_the_word`.
- [x] **U2 · Flags con nombre y motivo.** Crear `content/flags.ts`: CF Acarreo, PF Paridad, AF Acarreo auxiliar, ZF Cero, SF Signo, OF Desbordamiento. Tras cada paso, los seis explican por qué quedaron así (hoy solo CF y OF). Prueba: `every_flag_explains_its_last_value`.
- [x] **U3 · Glosario contextual.** Crear `content/glossary.ts` y la directiva `shared/term.directive.ts` (`[appTerm]`): subrayado punteado, definición al pasar el cursor o enfocar, y un panel «Glosario» con búsqueda en Sesión. Términos iniciales: ALE, RD, WR, BIU, EU, BHE, segmento, offset, dirección física, little endian, DIR, DATO, CTRL, B0, B1, SoC, DRAM, RAS, CAS, SPD. Pruebas: `every_abbreviation_in_the_console_has_a_term`, `term_is_reachable_by_keyboard`.
- [x] **U4 · Fases en el transporte.** `transport.component`: cuatro pasos con nombre (Buscar → Decodificar → Ejecutar → Escribir) bajo los botones, para detener la explicación en cada fase del viaje de instrucción (M1). Consume `StationActivity.phase`.
- [ ] **U5 · Tokens.** Pasar el detector de Impeccable; llevar los 95 avisos a tokens de `DESIGN.md` y definir las rampas tonales pendientes. Evidencia: informe del detector antes y después.

### Fase M — Modelos y animaciones que explican

Skills: `threejs-procedural-geometry`, `threejs-procedural-animation`, `threejs-procedural-materials`, `threejs-geometry`, `gsap-timeline`, `threejs-visual-validation`.

- [x] **M0 · Contrato `StationActivity`.** Crear `laboratory/station-activity.ts`.
  - Produce: `type Phase = 'idle' | 'fetch' | 'decode' | 'execute' | 'write'`; `interface StationActivity { phase: Phase; revision: number; blocks: string[]; address?: number; data?: number; rd: boolean; wr: boolean; ale: boolean; bytes: number[]; changed: string[] }`; `projectActivity(view: LaboratoryView, phase: Phase): StationActivity`. Entra al motor como entrada `activity`; los modelos se suscriben con `tools.onActivity(fn)`. Se elimina el `transfer()` genérico.
  - Pruebas: `activity_bits_match_the_physical_address`, `idle_activity_lights_nothing`, `reduced_motion_keeps_signal_state` (P1), `late_activity_from_an_old_session_is_dropped`.
- [x] **M1 · Banco 8086: el viaje de una instrucción.**
  - Animación: en *Buscar*, los pines de dirección se encienden con los bits reales de CS×16+IP, ALE pulsa y el latch de la placa retiene la dirección; los bytes del código entran en la cola de seis posiciones. En *Decodificar*, el bloque de control muestra el mnemónico. En *Ejecutar*, los operandos viajan de registros a la ALU y vuelve el resultado; una tira de flags se actualiza sobre el bloque. En *Escribir*, pulsan RD o WR y los pines llevan el dato. Así se ve la multiplexación de dirección y datos, que es lo que distingue al 8086.
  - Detalle: hilos de unión a los 40 contactos (hoy 18, en un lado); punto del pin 1; chips de soporte con su nombre histórico del sistema en modo mínimo (8284 generador de reloj, 8282 latch de direcciones, 8286 transceptor) en lugar de «LOGIC»; buses agrupados hasta ellos. El marcado de la tapa se rotula como ilustrativo.
  - Cierra P5: la cola se alimenta de los bytes reales y se declara sin tiempos eléctricos.
  - Pruebas: `address_pins_show_the_fetched_address`, `queue_holds_the_real_opcode_bytes`, `all_40_pads_have_a_bond_wire`, más las de `cpu-fit.spec.ts`.
- [x] **M2 · Memoria.**
  - Placa 2164A: al acceder, una lupa se eleva sobre el chip activo con su matriz; se ilumina la fila (RAS), luego la columna (CAS) y parpadea la celda. Una palabra se ve como dos bytes que caen en un chip de cada banco, con A0 y BHE indicados. Una regla sumadora en la placa muestra segmento × 16 + offset, y dos pares distintos aterrizando en la misma celda.
  - Galería DDR4: despiece por capas, SPD destacado y los ocho carriles de bytes, uno por chip.
  - Pruebas: `little_endian_visual_uses_real_bytes` (P1), `value_change_does_not_rebuild_memory_model` (P1), `row_and_column_address_the_selected_cell`.
- [x] **M3 · Cronoscopio: una cinta de tiempo.** Rediseño del modelo. Hoy, sin historia, es un eje con quince varillas vacías.
  - Cada instrucción ejecutada es un cuadro de la cinta, con su mnemónico y el registro que cambió. Una ventanilla fija marca el cursor real; retroceder hace girar el carrete hasta ese cuadro. Al crear una rama, un segundo carril se bifurca desde ese cuadro (A ámbar, B lavanda) y los cuadros que difieren llevan marca. La aguja del dial indica paso actual sobre total, no el reloj.
  - Piezas con nombre propio (base, eje, dial, ventanilla, cuadro N, rama) en lugar de «Circuitos de interfaz».
  - Pruebas: `playhead_sits_on_the_cursor_frame`, `restore_updates_all_instruments` (P1), `branch_forks_at_its_origin_frame`, `chronoscope_pieces_have_their_own_names`.
- [x] **M4 · Apple Silicon.** Cerrado, hoy es una losa negra.
  - Tapa translúcida al pasar el cursor o seleccionar una pieza interna. Núcleos individuales dentro de cada grupo (4 de rendimiento, 6 de eficiencia, como en la ficha), GPU y Neural Engine como mosaicos.
  - El buffer B0 es una pieza física en la franja de memoria unificada. «CPU prepara»: se enciende el enlace núcleo→B0. «GPU procesa»: la GPU lee **el mismo** B0, que no se mueve, y escribe B1. «CPU recibe»: solo tras la señal de fin. Interruptor «Memoria separada (referencia conceptual)» que muestra la copia viajando entre dos memorias, para contrastar.
  - Pruebas: `buffer_tile_never_moves_between_units`, `cpu_waits_for_completion_signal` (existente), `core_counts_match_the_panel`.
- [x] **M5 · La máquina.** Los buses dejan de moverse solos.
  - Cada uno de los ocho pasos enciende solo su bus, en su sentido, con el valor viajando como rótulo (0000h por direcciones, RD por control, 0007h por datos de la RAM al procesador). Cada chip lleva una pantalla pequeña con su valor (ALU 0007→000C, celdas de RAM, salida). Los buses se trazan como pistas paralelas ortogonales. En espera, buses apagados.
  - Pruebas: `only_the_active_bus_lights`, `machine_cycle_transfers_actual_data_before_output` (existente), `chip_displays_match_the_experiment`.
- [x] **M6 · Banco e instrumentos.** Las tres «Herramienta N» reciben el nombre de lo que son. El osciloscopio gana captura y cursor además del canal (cierra P6). Prueba: `scope_cursor_reads_the_selected_step`.
- [x] **M7 · Atrio.** Los portales de estación usan las miniaturas del motor (H3) y, al elegir una, la cámara viaja hacia el banco en lugar de cortar. Prueba: `portal_preview_matches_its_station`.

### Movimiento de la interfaz (skill `find-animation-opportunities`)

| # | Lugar | Hoy | Propósito | Frecuencia | Movimiento propuesto |
|---|---|---|---|---|---|
| 1 | Botones de giro y zoom | La cámara salta | Respuesta | Decenas al día | `smoothTime` 0,22 s, reorientable (C1) |
| 2 | Mapa del banco | No existe plegado | Coherencia espacial | Ocasional | Crece desde su botón: `scale(0.96)` y opacidad, 180 ms `cubic-bezier(0.23, 1, 0.32, 1)`, origen en la esquina |
| 3 | Selector de familia en la bandeja | No existe | Indicar estado | Ocasional | Altura y opacidad, 200 ms, misma curva |
| 4 | Cambio de estación | Reconstrucción instantánea | Evitar un cambio brusco | Ocasional | Fundido de 250 ms al color del aire y la transición de cámara existente |
| 5 | Lectura del registro | Parpadean los bits que cambian | Respuesta | Por paso | El dígito hexadecimal cambiado destella 120 ms; apagado mientras el programa corre |
| 6 | Despiece | Todo a la vez | Explicación | Ocasional | Escalonado de 40 ms por capa, gobernado por el deslizador (H5) |
| 7 | Misión resuelta | Sin señal | Deleite | Rara | Un barrido ámbar sobre el resultado y el piloto, una sola vez |

Con movimiento reducido: solo opacidad, sin desplazamiento.

**Descartadas a propósito:**

- Pestañas Estado / Programa / Traza: se usan decenas de veces y con teclado. Sin animación.
- Botón «Paso» mientras el programa corre: cientos de veces. Sin animación.
- Información al pasar por los bits: debe ser inmediata.
- Trazas y tablas de memoria: son datos que se leen; moverlos estorba.
- Desplazamiento suave (Lenis) en la consola: es un panel de trabajo denso y el suavizado añade retraso a la rueda. Se mide en A1 y, si retrasa la rueda, se deja el desplazamiento nativo.

**Veredicto:** la interfaz 2D necesita muy poco movimiento; el presupuesto va a la cámara y a las animaciones que explican. La fila 1 es la de mayor efecto.

### Fase X — Propuestas adicionales

- [x] **X1 · Modo exposición** (cierra P10). El guion de 8 minutos se vuelve un recorrido: cada paso coloca la cámara, selecciona la pieza, abre el instrumento y muestra una línea de apoyo; avanza con flechas o barra espaciadora. Crear `content/tour.ts` a partir de `docs/GUIA-DE-EXPOSICION.md`. Prueba: `every_tour_step_targets_an_existing_piece`.
- [x] **X2 · Misiones por estación** (cierra P13). Memoria (dos direcciones, un mismo lugar), Cronoscopio (el segmento equivocado), Apple (compartir sin copiar) y Máquina (seguir un dato hasta la salida), con condición de éxito comprobada sobre el estado real. Prueba: `every_station_has_a_checked_mission`.
- [x] **X3 · Medidor en pantalla.** Mayús+D muestra p50/p95, llamadas de dibujo, triángulos y escala de resolución: sirve para que anotes cifras en cualquier equipo.
- [x] **X4 · Resolución adaptativa estable.** Pasos de 0,05 con histéresis y bloqueo tras tres inversiones, para que no oscile. Prueba: `resolution_scale_settles`.
- [x] **X5 · Ritmo en reposo.** Sin interacción ni animación académica durante 3 s, la escena baja a 30 FPS y vuelve a 60 al primer evento. Prueba: `idle_frame_rate_recovers_on_input`.
- [x] **X6 · Resaltado al pasar el cursor.** La pieza bajo el puntero se aclara levemente (90 ms), además de la etiqueta flotante. Prueba: `hover_highlight_clears_on_leave`.
- [x] **X7 · Enlace por pieza.** La URL guarda estación, pieza y vista (`/8086?pieza=pin-25`), para abrir una explicación ya encuadrada. Prueba: `url_restores_the_selected_piece`.

### Fase N — Ampliaciones aprobadas

Contratos de origen: `docs/archivo/plan/SILICIO-ESPECIFICACION-TECNICA.md` (§8.3) y `SILICIO-EXPERIENCIAS-Y-MISIONES.md` (M08, M09). Van después de M1 y M2, porque reutilizan el viaje de instrucción y la placa de memoria.

- [x] **N1 · Pila, CALL y RET (EXT-03, misión M08).**
  - Motor (`simulation/cpu8086.ts`): cuatro formas nuevas, todas de 16 bits y cercanas. `PUSH r16` (opcode `50h + registro`), `POP r16` (`58h + registro`), `CALL etiqueta` (`E8h` + desplazamiento relativo de 16 bits), `RET` (`C3h`). PUSH resta 2 a SP y escribe la palabra en SS:SP; POP lee y suma 2; CALL apila el IP de la instrucción siguiente y salta; RET desapila IP. Ninguna toca los flags. Cualquier otra forma (lejana, con inmediato, `RET n`) se rechaza con error, sin cambio parcial de estado.
  - Sesión: se añaden a la lista de instrucciones admitidas del panel de Sesión y a la matriz del ensamblador. El códec v2 no cambia: las instrucciones viajan como bytes.
  - Escena: en *Escribir*, el viaje de instrucción (M1) muestra la palabra bajando a la pila; en la placa de memoria, una marca «SP» señala la cima y se mueve con cada PUSH y POP.
  - Misión M08 en `content/missions.ts`: programa con una rutina pequeña; éxito cuando IP vuelve a la instrucción posterior a CALL y SP recupera su valor inicial. Pista: mostrar la dirección de la rutina y la de retorno antes de la llamada, que es lo que se suele confundir.
  - Pruebas en `cpu8086.spec.ts`: `push_then_pop_restores_register_and_sp`, `call_stores_the_next_ip_on_the_stack`, `ret_returns_after_the_call_and_restores_sp` (caso T62), `stack_instructions_preserve_flags`, `far_call_is_rejected_without_partial_change`, `encodes_push_pop_call_ret_bytes`. En `missions.spec.ts`, la misión nueva entra en el recorrido de misiones académicas.
- [x] **N2 · Caché comparable (EXT-01, misión M09).**
  - Modelo nuevo y separado, `simulation/cache-model.ts`; no se añade una caché ficticia al 8086.
  - Produce: `interface CacheConfig { lines: 4 | 8; blockBytes: 16 }`; `interface CacheAccess { address: number; block: number; index: number; tag: number; hit: boolean; cost: number }`; `runCache(config: CacheConfig, addresses: number[]): { accesses: CacheAccess[]; hits: number; cost: number }`.
  - Reglas fijadas: mapeo directo; `block = floor(address / 16)`; `index = block mod lines`; `tag = floor(block / lines)`; acierto 1 unidad, fallo 11; estado inicial vacío; un acceso que cruza dos bloques se divide en dos consultas. Solo lecturas.
  - Instrumento nuevo `instruments/memory/cache/cache-panel.component.{ts,html,scss}` en la estación Memoria: las dos cachés lado a lado, la traza anotada acceso por acceso (índice, etiqueta, acierto o fallo) y la suma de costes. La traza sale de las lecturas de la última ejecución del 8086 o de la traza fija de la misión.
  - Escena: sobre la placa 2164A, las líneas de la caché como una fila de ranuras; cada acceso ilumina su ranura en verde (acierto) o ámbar (fallo y carga), gobernado por `StationActivity`.
  - Misión M09: predecir cada acierto o fallo antes de verlo; éxito al completar la comparación. El texto declara que los costes son del modelo, no latencias de un producto.
  - Pruebas en `cache-model.spec.ts`: `four_lines_give_miss_hit_miss_miss_and_cost_34` y `eight_lines_give_miss_hit_miss_hit_and_cost_24` (traza 0000h, 0002h, 0040h, 0000h; caso T61), `both_configurations_read_the_same_data`, `access_across_two_blocks_is_two_lookups`, `cold_cache_always_misses_first`.

### Fase A — Aceptación

Skills: `threejs-visual-validation`, `threejs-debug-profiler`, `threejs-performance`, `threejs-qa-release`, `verification-before-completion`, `code-review`.

- [ ] **A1 · Línea base de rendimiento (va antes de L).** En Brave, con el medidor: p50/p95, llamadas de dibujo, triángulos y escala de resolución en las cinco estaciones y tres vistas, por perfil. Se anota en este documento. Hipótesis por confirmar: en la GT 730 a 1640×920 la resolución adaptativa baja la escala, y eso también emborrona el texto 3D.
- [x] **A2 · Pruebas pendientes (P1).** Las siete de 3.1 que no cubran otras tareas, y `ten_station_roundtrips_stabilize_resources` automatizada.
- [x] **A3 · Paquete sin red (P8).** Build, `npm run preview` y recorrido con la red bloqueada: cero peticiones fuera de `127.0.0.1`.
- [x] **A4 · Sesión persistente (P9).** Autoguardado del programa, cursor y ramas con el códec v2 existente; recuperación al recargar. Pruebas: `reload_restores_program_and_cursor`, `corrupt_autosave_is_discarded_with_a_notice`.
- [x] **A5 · Lista para dispositivos reales.** Hoja de comprobación de una página para teléfono, tableta, zoom 200 % y NVDA (3.2).
- [x] **A6 · Vistas fijas.** Modo `?shot=<estación>-<vista>` con reloj y semilla fijos; quince capturas en `docs/qa/vistas/` como referencia de antes y después para C, E, L y M.
- [x] **A7 · Documentación.** Actualizar `ARQUITECTURA-DEL-CODIGO.md` (CameraRig, scene-hud, StationActivity, ambient-dust), `DESIGN.md` (HUD, tinta de etiquetas), `GUIA-DE-EXPOSICION.md` (modo exposición) y `README.md`.

## 5. Dependencias y puertas

```
Q ──► C ──► E ──► H ──► U
      │           ▲
      └─► A1 ─► L ┘
M0 ──► M1…M5 (necesita C y E; M3–M5 son independientes entre sí)
M1 ──► N1      M2 ──► N2
H3 ──► M7, X1          A6 acompaña a C, E, L y M
```

| Puerta | Condición |
|---|---|
| G1 | Tras Q y C: ninguna pared recortada, ninguna pareja coplanar, cámara con transición en todos los comandos |
| G2 | Tras E: contraste ≥ 4,5:1 medido en cada rótulo; tapa del 8086 legible con la lámpara encima |
| G3 | Tras L: la escena cuesta lo mismo o menos que la línea base A1 en «Equilibrado» |
| G4 | Tras H y U: llegar a cualquier pieza en dos clics; cada sigla con definición |
| G5 | Tras M: ninguna animación académica en bucle libre |
| G5b | Tras N: T61 y T62 en verde; las misiones M08 y M09 se resuelven de principio a fin |
| G6 | Tras A: diez recorridos con recursos constantes; paquete sin red; lista de dispositivos entregada |

## 6. Riesgos

| Riesgo | Respuesta |
|---|---|
| `camera-controls` no encaja con la política de entrada móvil (`applyInputPolicy`) | C1 empieza migrando esa política con su prueba. Si no encaja, se vuelve a OrbitControls con transiciones de GSAP sobre coordenadas esféricas, sin cambiar la interfaz de `CameraRig` |
| Las miniaturas cuestan memoria o tiempo en la GT 730 | 128 px, una por fotograma libre, caché por estación; glifos SVG si el presupuesto no da |
| Etiquetas iluminadas quedan oscuras en zonas sin luz | El mapa horneado de L1 sube el mínimo; E5 da lectura independiente de la luz |
| El rediseño del Cronoscopio rompe `history-pieces` y el códec | M3 conserva `historyPieces()` y los IDs `frame-N` |
| La fase M es grande | Cada estación es una tarea independiente con su puerta; se puede entregar por partes |

## 7. Decisiones

Tomadas el 13 de octubre de 2026:

| Decisión | Resultado |
|---|---|
| Cámara | Se añade `camera-controls` 3.1.2 (C1) |
| Ampliaciones | Entran pila/CALL/RET y caché (fase N). Constructor libre y modo cooperativo salen del alcance. El resto queda en espera |
| Tubo averiado | Se conserva como está; solo se verifica que no oculte un defecto (L7) |
| Alcance de este encargo | Solo el plan. La implementación empieza cuando se pida |

Abiertas, con valor por defecto si no se dice otra cosa:

| Decisión | Por defecto |
|---|---|
| Lenis en la consola | Se mide en A1; se quita solo si retrasa la rueda |
| `docs/archivo/` | Se conserva |

## 8. Skills por fase

| Fase | Skills |
|---|---|
| Plan y ejecución | `writing-plans`, `executing-plans` o `subagent-driven-development`, `test-driven-development`, `verification-before-completion` |
| Q, C | `threejs-skill-router`, `threejs-camera-direction`, `threejs-procedural-geometry`, `threejs-interaction`, `threejs-debugging`, `systematic-debugging` |
| E | `threejs-materials`, `threejs-textures`, `dannaway-practical-ui` |
| L | `threejs-lighting`, `threejs-procedural-vfx`, `threejs-particles`, `threejs-shaders`, `threejs-image-pipeline`, `threejs-screen-space-ambient-occlusion`, `threejs-bloom`, `threejs-exposure-color-grading` |
| H, U | `impeccable`, `dannaway-practical-ui`, `frontend-design`, `redesign-existing-projects`, `threejs-accessibility`, `find-animation-opportunities`, `improve-animations` |
| M | `threejs-procedural-geometry`, `threejs-procedural-animation`, `threejs-procedural-materials`, `threejs-geometry`, `gsap-timeline`, `gsap-performance` |
| A | `threejs-visual-validation`, `threejs-debug-profiler`, `threejs-performance`, `threejs-qa-release`, `threejs-testing`, `code-review`, `documentation-and-adrs` |

Usadas para redactar este plan: `writing-plans`, `threejs-skill-router`, `dannaway-practical-ui` y `find-animation-opportunities`. El resto del catálogo (.NET, MSBuild, PixiJS, Phaser, SQL, documentos de oficina, APA, logotipos) no aplica a este proyecto.

## 9. Documentos archivados

En `docs/archivo/`, con su estructura original:

- `plan/`: los once documentos de las revisiones 2.0 y 3.0 (plan maestro, ejecución, especificación técnica, experiencias y misiones, dirección 3D, verificación, propuesta académica, ampliación, implementación R00–R12, índice, README).
- `CONTINUAR-AQUI.md`, `IMPLEMENTACION.md`, `PLAN-AMBIENTACION-Y-RENDIMIENTO.md`.
- `qa/PROGRESO-REVISION-3.md`, `qa/PAQUETE-REVISION-3.md`.

Siguen vigentes fuera del archivo: `README.md`, `PRODUCT.md`, `DESIGN.md`, `docs/ARQUITECTURA-DEL-CODIGO.md`, `docs/GUIA-DE-EXPOSICION.md`, `docs/assets/SILICIO-ASSET-CATALOG.md` y la evidencia de `docs/qa/` (JSON e imágenes).

El registro `.superpowers/sdd/SILICIO-IMPLEMENTACION-ESCENA-INSTRUMENTOS-MOVIL/progress.md` no está en git y duplica `qa/PROGRESO-REVISION-3.md`; se dejó intacto y su puntero al plan se actualizó a la ruta archivada.
