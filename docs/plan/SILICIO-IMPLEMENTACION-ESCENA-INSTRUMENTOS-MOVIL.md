# SILICIO: escena, instrumentos y móvil — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development or executing-plans to implement this plan task-by-task, La implementación fue autorizada y reanudada por el usuario.

**Goal:** Convertir SILICIO en un banco de electrónica detallado y operable, con modelos identificados, física acotada, consola gráfica y experiencia móvil completa.

**Architecture:** La fachada Angular coordina selección, snapshot y evento académico. Mundo, física, cámara e instrumentos consumen ese estado y envían intenciones; ningún gráfico replica las reglas del CPU. Separar responsabilidades actualmente concentradas en App y AtriumSceneComponent, preservando rutas y sesiones.

**Tech Stack:** Angular/TypeScript, Three.js y sus addons, GSAP, Lenis donde corresponda; Rapier diferido para manipulación; HTML/SVG para instrumentos, Canvas2D solo en trazas densas. Versiones compatibles determinadas por el lockfile existente al implementar.

**Spec:** [SILICIO-AMPLIACION-ESCENA-PANEL-Y-MOVIL.md](./SILICIO-AMPLIACION-ESCENA-PANEL-Y-MOVIL.md)

## Global Constraints
- Implementación autorizada. Estado y evidencia por paquete en [PROGRESO-REVISION-3.md](../qa/PROGRESO-REVISION-3.md); varias puertas de aceptación siguen abiertas.
- Oscuro exclusivamente; Arduino excluido.
- No cambiar un resultado académico mediante física, animación, perfil gráfico o navegación.
- Material/malla y herramientas de cámara/despiece pertenecen al área de escena.
- Lectura habitual16 px; targets táctiles≥44×44 CSS px; separación≥8 px en barra.
- Cada pieza de estudio/operable tiene ID, respuesta y equivalente accesible.
- Referencias RAM diferenciadas: Intel2164A en placa clásica; KingstonKVR26N19S8/8 en galería moderna; memoria Apple en su propio escenario.
- Conversión de escala una sola vez; física en metros, Y arriba.
- 1/60 s, ≤4 subpasos, acumulador≤0,1 s; no escritores simultáneos de transform.
- Estado «pendiente» hasta que exista implementación y evidencia; un texto no cierra la tarea.

## Review Focus
1. Teléfono con teclado virtual abierto: ejecutar/pausar y editar deben seguir accesibles.
2. Gesto interrumpido o consola expandida durante manipulación: no dejar órbita/drag capturado.
3. Cámara cercana y despiece máximo: sin interpenetración, z-fighting, apoyos falsos o partes ocultas bajo UI.
4. Worker con respuesta tardía/cambio de sesión: instrumento y pieza nunca muestran estados de sesiones distintas.
5. Perfil ligero, WebGL ausente o movimiento reducido: mismas acciones académicas mediante equivalentes accesibles.

## 1. Archivos y responsabilidades previstos

Arquitectura prevista originalmente. Los propietarios reales y diferencias están registrados en [ARQUITECTURA-DEL-CODIGO.md](../ARQUITECTURA-DEL-CODIGO.md).

| Archivo | Función |
|---|---|
| src/app/laboratory/laboratory.types.ts | View models, intenciones, IDs y metadatos de piezas. |
| src/app/laboratory/laboratory.facade.ts | Selección y sincronización de eventos, snapshots y comandos; adapta el motor actual. |
| src/app/world/world-engine.ts | Renderer, activos, estación y lifecycle. |
| src/app/world/interaction-registry.ts | Mallas/instancias→IDs, acciones y alternativas. |
| src/app/world/camera-director.ts | Encuadre según pieza y área libre del visor. |
| src/app/world/scene-controls.component.ts | Toolbar HTML de escena. |
| src/app/world/physics/workbench-physics.ts | Rapier, cuerpos, colliders, joints, step/reset/dispose. |
| src/app/world/assets/asset-manifest.ts | Referencias, medidas, partes, materiales y presupuesto. |
| src/app/world/models/memory-classic.model.ts | Placa didáctica por bancos con2164A. |
| src/app/world/models/dimm-kvr26n19s8.model.ts | Módulo moderno y componentes identificados. |
| src/app/world/models/workbench-instruments.model.ts | Osciloscopio, fuente, sonda, lámpara y acciones. |
| src/app/instruments/instrument-host.component.ts | Rack, pestañas, expansiones y conclusión contextual. |
| src/app/instruments/register/register-instrument.component.ts | Bits, bases numéricas y delta. |
| src/app/instruments/alu/alu-instrument.component.ts | Operandos, operación, resultado y flags. |
| src/app/instruments/memory/memory-instrument.component.ts | Dirección, alias, bytes, bancos y acceso. |
| src/app/instruments/trace/trace-instrument.component.ts | Cinta, restauración, búsqueda y A/B. |
| src/app/instruments/signals/signal-instrument.component.ts | Canales/cursor/pasos didácticos. |
| src/app/instruments/apple/apple-instrument.component.ts | Buffer/unidad/dependencia del escenarioApple. |
| src/app/layout/responsive-shell.component.ts | Desktop, consola inferior, modos y scroll. |
| src/app/world/effects/effects-pipeline.ts | Pases y perfiles con ownership explícito. |
| docs/assets/SILICIO-ASSET-CATALOG.md | Fichas físicas, procedencia y límites. |
| docs/qa/SILICIO-ESCENA-MOVIL-EVIDENCIA.md | Capturas, mediciones y casos de aceptación futuros. |

Modificar App y AtriumSceneComponent para delegar responsabilidades; mantener hosts y rutas hasta completar migración. Reutilizar Cpu8086, worker, codec y pruebas actuales. No modificar reglas funcionales para acomodar un dibujo.

## 2. Contratos compartidos

Diseñar estos contratos primero; los nombres se mantienen en las tareas siguientes:

- PieceId: ID estable de una pieza o grupo semántico.
- PieceDefinition: id, name, role (academic/operable/environment), parentId, actions, sourceRefs, modelFidelity.
- SceneIntent: SelectPiece(pieceId), FocusPiece(pieceId), SetRepresentation(material/wireframe), SetExploded(boolean), Orbit(delta), Zoom(factor), ResetView, SetInspectionLight(preset), ResetManipulation.
- RegisterView: name, value, hex, decimal, bits[16], changedMask.
- MemoryView: segment, offset, physical, bytes, accesses, selectedAddress.
- TraceView: sessionId, branchId, cursor, events, comparison.
- OperationView: mnemonic, resolvedOperands, result, flagDeltas y accessValues; estos campos se resuelven en el motor/evento para evitar duplicar reglas en la UI.
- AssetSpec: id, reference, dimensionsM, parts, anchors, sourceRefs y qualityTier; las dimensiones deben venir de la ficha aprobada R00.
- LaboratoryView: sessionId, revision, experience, selectedPiece, registers, flags, memory, trace, operation, buffer.
- InstrumentIntent: Step, Run, Pause, Restore(index), EditRegister(name, value), SelectAddress(address), SetSignal(channel), CaptureBranch, SelectBranch(branchId).
- PhysicsPose: position, rotation; transformAuthority fixed/dynamic/kinematic.
- ViewportRegion: x, y, width, height del área efectivamente libre de UI.

Fachada:
- projectLaboratory(snapshot: Snapshot, event: Trace | undefined, selection: PieceId | null): LaboratoryView.
- dispatch(intent: SceneIntent | InstrumentIntent): void.
- view: señal de LaboratoryView derivada; no estado duplicado en cada gráfico.

Registro:
- register(definition: PieceDefinition, objects: THREE.Object3D[]): void.
- registerInstanceMap(mesh: THREE.InstancedMesh, ids: PieceId[]): void.
- resolveHit(hit: THREE.Intersection): PieceId | null.
- listSelectable(experience): PieceDefinition[].
- activate(pieceId, action): void.
- auditCoverage(root: THREE.Object3D): {missing: string[], classified: number}.

Cámara:
- focus(bounds, region: ViewportRegion, reducedMotion): void.
- updateViewport(region): void.
- reset(): void.

Física:
- initialize(): Promise<void>.
- step(elapsedSeconds): void.
- beginDrag(pieceId, target): void.
- moveDrag(target): void.
- endDrag(): void.
- setKinematicTarget(pieceId, pose): void.
- reset(): void.
- dispose(): void.

Los tipos concretos usan los registros, eventos y snapshots existentes donde sean compatibles. Event/session IDs se preservan. Importación de un formato anterior recibe adaptador, no una ruptura silenciosa.

## 3. Tareas y puertas de revisión

Las casillas originales conservan el criterio de aceptación detallado. La tabla de estado R00–R12 en el informe de revisión distingue implementación comprobada y puertas abiertas; no se convierten automáticamente en cierre completo. Último incremento: 83/83 tests, build correcto y encaje/refactor verificados.

### R00 — Reconciliar baseline y cerrar referencias
**Archivos:** crear catálogo docs/assets; revisar docs/IMPLEMENTACION.md y contratos existentes; sin cambios gráficos todavía.
**Consume:** especificación3.0, plan2.0 y estado actual.
**Produce:** fichas CPU, RAM clásica, DIMM, Apple y banco; registro de discrepancias, IDs y vistas.

- [ ] Inventariar piezas reales representadas y recursos pendientes.
- [ ] Registrar planos/fotos, licencias, escala y medidas; bloquear fabricación de una cota no verificada.
- [ ] Fijar variante de2164A y referencia mecánica del DIP; del DIMM, cerrar espesor/encapsulados/llave antes de construir.
- [ ] Reconciliar divergencias entre plan2.0 y aplicación: estados iniciales, segmentos, política de límites de palabras, capacidad de historial/importación y rutas. No marcar el plan histórico completo a partir de los19 tests descritos en una entrega anterior.
- [ ] Revisar fichas y limitaciones con datos identificables; ningún «chip genérico» sin función.

**Cierre:** catálogo utilizable por quien modele y lista de contratos pendientes independiente del nuevo acabado.

### R01 — Fachada y sincronización de instrumentos
**Archivos:** laboratory.types.ts, laboratory.facade.ts, App; tests laboratory.facade.spec.ts.
**Consume:** snapshot/eventos actuales.
**Produce:** projectLaboratory, dispatch, view y todos los view models compartidos.

- [ ] Prueba future_view_uses_real_register_and_event: AX=000Ch se proyecta como12,16 bits y delta correspondiente.
- [ ] Prueba late_worker_result_does_not_replace_current_session: respuesta de sesión anterior no actualiza escena ni instrumento.
- [ ] Implementar adaptador de motor y señales; enriquecer el evento con operandos resueltos, resultado yvalores de acceso, conservando semántica y compatibilidad de sesión. No copiar instrucciones/flags en el UI.
- [ ] Editar mientras ejecuta exige pausa y confirmación del estado estable mediante comando, no escritura directa de objetos internos.
- [ ] Ejecutar npm test -- --watch=false y comprobar nombres/casos; revisión del contrato antes de avanzar.

**Cierre:** una suma produce el mismo snapshot en instrumento y escena; pausa/restauración son consistentes.

### R02 — Registry y piezas actualmente pasivas
**Archivos:** interaction-registry.ts, asset-manifest.ts, world host; test interaction-registry.spec.ts.
**Consume:** PieceDefinition y SceneIntent.
**Produce:** register, resolveHit, listSelectable, activate, auditCoverage.

- [ ] Pruebas every_academic_piece_has_action y child_mesh_resolves_owner.
- [x] Registrar instrumentos, cables, sonda, ram, pasivos, soportes y herramientas; identificar entorno.
- [ ] Definir acciones repetibles y estados ocupado/deshabilitado; prevenir dobles activaciones.
- [x] Crear selector HTML equivalente a raycast y navegación por piezas.
- [ ] Verificar por teclado y tap; ninguna pieza de estudio sin respuesta.

**Cierre:** el inventario tiene cero IDs académicos/operables sin acción o alternativa.

### R03 — Toolbar de escena y foco de cámara
**Archivos:** scene-controls.component.ts, camera-director.ts, App template; tests scene-controls.component.spec.ts y camera-director.spec.ts.
**Consume:** SceneIntent, selectedPiece, ViewportRegion.
**Produce:** toolbar, foco/reset y encuadre que respeta UI.

- [ ] Prueba representation_control_dispatches_intent; material/malla deja de aparecer en el rack.
- [ ] Prueba expanded_panel_keeps_selected_bounds_in_free_region.
- [x] Agrupar Vista/Objeto/Representación/Entorno y añadir Más controles móvil.
- [x] Ajustar encuadre desde bounds, aspect y región libre; no deformar modelos para que quepan.
- [ ] Verificar foco, aria-pressed, disabled, teclado y etiqueta en320–430 px.

**Cierre:** todos los controles solicitados viven en el visor y no tapan detalle relevante.

### R04 — Shell responsive antes de ampliar el rack
**Archivos:** responsive-shell.component.ts y estilos, App integración; test responsive-shell.component.spec.ts y futura comprobación browser.
**Consume:** región de visor y estado de instrumentos.
**Produce:** modos Escena/Instrumento/Compartido y estados de consola inferior.

- [ ] Prueba console_expansion_preserves_selection_and_session.
- [ ] Prueba pointer_cancel_releases_camera_and_drag.
- [ ] Implementar una región scroll activa por modo, safe areas y captura explícita de Manipular vista.
- [ ] Caso virtual_keyboard_keeps_run_pause_reachable y zoom200_preserves_controls.
- [ ] Revisar toda la matriz responsive de la especificación y registrar dispositivo/emulación.

**Cierre:** móvil no obliga a dominar gestos, perder escena o recorrer una columna larga para operar.

### R05 — Primer instrumento completo: registro/ALU/flags
**Archivos:** instrument-host y módulos register/alu; tests register-instrument.component.spec.ts y alu-instrument.component.spec.ts.
**Consume:** RegisterView, operation, flags e InstrumentIntent.
**Produce:** banda16 bits, bases numéricas, delta y operación real.

- [ ] Pruebas bit_selection_reports_weight, alu_operands_match_trace y flags_distinguish_carry_from_overflow.
- [ ] Dibujar carriles/bit cells en SVG/HTML con acceso equivalente por teclado.
- [ ] Animar feedback sin demorar valores; pausa y reduced motion muestran estado estable.
- [ ] Mantener editor en Programa y visualizaciones en Estado/Traza; explicación corta+detalle plegable.
- [ ] Revisar móvil, contraste y valores largos antes de replicar patrón.

**Cierre:** puede explicarse ADD y comparar CF/OF operando el instrumento, sin leer un bloque largo.

### R06 — RAM clásica y DIMM real
**Archivos:** memory-classic.model.ts, dimm-kvr26n19s8.model.ts, asset-manifest, catálogo; futuras pruebas de contrato geométrico.
**Consume:** fichas R00 y Registry.
**Produce:** buildClassicMemory(config: AssetSpec), buildValueRamModule(config: AssetSpec), ensamblajes por piezas.

- [ ] Prueba classic_bank_capacity_matches_organization y cobertura chip/banco/pin.
- [ ] Prueba dimm_outline_matches_source y dimm_contacts_exist_on_both_faces:144 contactos físicos por cara, total288; etiquetas de señales solo según pinout verificado.
- [ ] Modelar perfil, uniones y apoyos; frente/reverso y mecanismo del socket.
- [x] Construir organización/celda educativa como escala separada, identificada.
- [ ] Ejecutar quality-kit y contratos de holgura/soporte; revisar vistas neutra, rasante, wireframe y movimiento máximo.
- [ ] Integrar selección chip→organización→dato sin mezclar sesiones de arquitecturas diferentes.

**Cierre:** RAM reconocible e identificada, estructura no basada en cubos sin identidad; modelo y datos coinciden con ficha.

### R07 — Protagonistas y banco detallado
**Archivos:** electronics-workshop.ts y módulos de modelos; workbench-instruments.model.ts; catálogo/registry.
**Consume:** R00, R02, R03, R06.
**Produce:** banco con instrumentos operables y rutas de luz/señales.

- [ ] Revisar 8086 exterior/interior, Apple, mobiliario y E/S contra fichas.
- [ ] Modelar curvas/perfiles, mandos/puertos, pantallas, conectores, ventilación y cara posterior cuando sea visible.
- [ ] El osciloscopio deja de presentar una onda fija: sus controles modifican canal/captura/cursor del instrumento.
- [ ] Hacer útiles lámpara, sonda, fuente, pasivos, soportes, herramientas, cables y esquemas.
- [ ] Verificar close-up, apoyos, contactos, cables y volumen barrido del despiece, además de caras coplanares.

**Cierre:** una vista general tiene contexto físico y un primer plano conserva detalle coherente.

### R08 — Física de manipulación
**Archivos:** workbench-physics.ts, coordinador visual, acciones Registry; tests workbench-physics.spec.ts.
**Consume:** límites/fichas, transformAuthority y PhysicsPose.
**Produce:** API física compartida y reset.

- [ ] Pruebas fixed_step_caps_substeps y hidden_tab_resume_does_not_fast_forward.
- [x] Inicializar Rapier/WASM diferido y fijar unidades/ownership.
- [x] Colliders compuestos, objetos fijos, dinámicos y tapa/socket cinemáticos.
- [ ] Pruebas tool_rests_in_tray, reset_removes_transient_constraints y pointer_cancel_ends_drag.
- [ ] Comparar física a30/60 FPS, liberación rápida y calidad ligera.
- [ ] Confirmar que bytes/registros no cambian al manipular una herramienta.

**Cierre:** acciones útiles y estables, dinámica desligada de CPU, sin choque o jitter en reposo.

### R09 — Instrumentos de memoria y señales
**Archivos:** memory-instrument.component.ts, signal-instrument.component.ts, adaptador de eventos.
**Consume:** MemoryView, operation y Selection.
**Produce:** dirección, alias, bytes, bancos y canales explicativos.

- [ ] Pruebas little_endian_visual_uses_real_bytes y aliases_share_physical_address.
- [x] Mostrar la palabra como dos bytes y localizar el banco correspondiente en el escenario clásico.
- [x] Derivar trazas didácticas con unidades explícitas; no simular tiempos eléctricos por una duración GSAP.
- [ ] Reutilizar geometría/texturas de contenido para actualización; test value_change_does_not_rebuild_memory_model.
- [ ] Revisar instrumentos con escritura/restauración/cambio de segmento y móvil.

**Cierre:** no hay contradicción entre valor, parte activa y diagrama.

### R10 — Cronoscopio y Apple
**Archivos:** trace-instrument.component.ts, apple-instrument.component.ts, modelo de historial/buffer; adaptadores.
**Consume:** TraceView y escenarioApple independiente.
**Produce:** cinta visual, comparación/ramas y B0/B1 con dependencias.

- [ ] Pruebas restore_updates_all_instruments y branching_preserves_previous_future.
- [x] Archivar futuro antes de sustituir rama; permitir recuperar/exportar esa rama, con límites explícitos.
- [x] A/B muestra diferencias de registros, flags y memoria; no solo AX.
- [ ] Pruebas buffer_identity_survives_stage_change y cpu_waits_for_completion_signal.
- [x] Presentar versión/identidad y etapa de buffer; no cambiar una etiqueta y fingir procesamiento.
- [ ] Reconciliar el contrato de prefetch: implementar eventos reales en modelo versionado o conservar esquema estático identificado.

**Cierre:** historia y comparación visual son recuperables; Apple muestra dependencia y contenido ilustrativo coherente.

### R11 — Materiales, luz y efectos por perfil
**Archivos:** effects-pipeline.ts, materiales, AssetManifest y WorldEngine.
**Consume:** ensamblajes aprobados y tier de calidad.
**Produce:** baseline, PBR ycomposer con perfiles.

- [ ] Revisar material neutro/rasante, campos de desgaste y repetición de textura.
- [ ] Implementar luz/sombra/contacto antes de AO/bloom.
- [x] Un pipeline de salida; cancelación/liberación de targets y resize.
- [ ] Pruebas quality_change_preserves_academic_actions y reduced_motion_keeps_signal_state.
- [ ] Medir cada pase de forma aislada y registrar coste; excluir los que incumplan presupuesto o lectura.
- [ ] Añadir CRT, señales y polvo/DOF solo bajo las restricciones de la especificación.

**Cierre:** el resultado sin efectos ya es legible, el resultado con efectos mejora forma/actividad y cabe en perfil.

### R12 — Optimización y aceptación integral
**Archivos:** AssetRegistry/WorldEngine, LOD e instancias; docs/qa, evidencia y paquete.
**Consume:** R01–R11.
**Produce:** mediciones, capturas y versión aceptada.

- [x] Instancing/merging sin perder IDs; bajar draw calls hacia presupuesto.
- [ ] Cargar/liberar estación y reutilizar memoria/historial; test ten_station_roundtrips_stabilize_resources.
- [ ] Prueba webgl_unavailable_preserves_lab_controls.
- [ ] Verificar editor, selección, misiones, sesión y todos los instrumentos en matriz responsive.
- [ ] Medir p50/p95 de frames, costes de sombras/pases/picking y cuerpos despiertos; registrar hardware y navegador.
- [ ] Probar paquete local preparado, sin red, con fuentes, WASM, worker, assets ydecodificadores locales.
- [ ] Revisión independiente de funcionalidad/visual/uso solo después de implementación autorizada; corregir hallazgos concretos.
- [x] Actualizar estado real del plan y guion de exposición. No declarar dispositivos o ayudas técnicas no probados.

**Cierre:** evidencia permite evaluar el avance; ningún requisito se cierra solo por tener un checklist.

## 4. Trazabilidad con el plan anterior

| Pendiente anterior | Incremento responsable |
|---|---|
| Modelos/materiales con mayor fidelidad | R00, R06, R07, R11 |
| Móvil y accesibilidad | R02–R05, R09, R12 |
| Efectos medidos y perfiles | R11, R12 |
| Banco/props sin acción | R02, R07, R08 |
| Historial con ramas completas y A/B | R10 |
| Buffers Apple y variantes con fuente | R00, R10 |
| Actualización 3D sin regenerar objetos | R09, R12 |
| Prefetch/fases del bus | R09, R10; contrato académico independiente del efecto visual |
| Persistencia y límites de formato/historial | R00, R10, R12; conservar codec y compatibilidad |
| Evidencia local y exposición | R12 |

Interrupciones, caché ejecutable, constructor libre y cooperación siguen su prioridad del plan maestro. La revisión no los convierte en prestaciones terminadas ni los elimina. Si un requisito previo entra en conflicto con3.0, prevalece3.0 para escena/panel/móvil/física/modelos; el núcleo académico solo cambia con un contrato explícito.

## 5. Puertas para avanzar
G0: fichas y contratos; G1: shell+toolbar móvil; G2: un instrumento real; G3: RAM y banco identificados/operables; G4: física+resto de instrumentos; G5: efectos dentro de presupuesto; G6: aceptación desktop/móvil/local.

No estimar una fecha nueva de entrega sin disponibilidad real. La implementación está autorizada. La aceptación integral permanece abierta por los límites registrados; no se presupone una validación móvil real o de fabricación.
