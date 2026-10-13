# SILICIO — Índice general del plan

Versión 3.0 · 12 de octubre de 2026 · **Revisión del plan completada; ampliación pendiente de implementar.**

SILICIO será un laboratorio web 3D dedicado al Intel 8086, Apple Silicon y el funcionamiento general de una computadora. Angular organiza la aplicación; Three.js representa el mundo; GSAP coordina movimientos; Lenis se aplica a los recorridos y paneles de lectura pertinentes. El aspecto es el de equipos usados y mantenidos, con desgaste material coherente. Arduino queda fuera del alcance.

Este paquete conserva la base 2.0 y añade la revisión 3.0. Existe una aplicación inicial; este índice no certifica su fidelidad, sus pruebas ni el cierre completo del plan. Esta revisión modifica únicamente planificación.

## 1. Documentos y orden de lectura

**Leer primero la revisión vigente:** [Escena, instrumentos y móvil](./SILICIO-AMPLIACION-ESCENA-PANEL-Y-MOVIL.md) y [tareas R00–R12](./SILICIO-IMPLEMENTACION-ESCENA-INSTRUMENTOS-MOVIL.md). Sus decisiones prevalecen para modelos, banco, interacciones, panel, controles de escena, móvil, física y efectos. El núcleo académico conserva sus contratos hasta reconciliación explícita.


| Orden | Documento | Contenido | Lector principal |
|---|---|---|---|
| 1 | [Propuesta académica](./SILICIO-PROPUESTA-ACADEMICA.md) | Idea, objetivos, alcance, metodología y entregables para la asignatura | Docente y autor. |
| 2 | [Plan maestro](./SILICIO-PLAN-MAESTRO.md) | Visión, mundo, prioridades, stack y decisiones generales | Todos. |
| 3 | [Experiencias y misiones](./SILICIO-EXPERIENCIAS-Y-MISIONES.md) | Ocho experiencias, recorridos, acciones y doce misiones con condiciones/resultados | Diseño, contenido y aplicación. |
| 4 | [Especificación técnica](./SILICIO-ESPECIFICACION-TECNICA.md) | Dialecto 8086, codificación, memoria, flags, fixtures, modelos, worker, historia y persistencia | Simulación e integración. |
| 5 | [Dirección 3D y UX](./SILICIO-DIRECCION-3D-Y-UX.md) | Espacio, cámaras, materiales, desgaste, recursos, efectos, controles y presupuestos | Arte, renderer e interacción. |
| 6 | [Plan de ejecución](./SILICIO-PLAN-DE-EJECUCION.md) | Siete días, 28 paquetes desglosados, ocho ampliaciones, agentes y guion | Coordinación e implementación. |
| 7 | [Verificación y trazabilidad](./SILICIO-VERIFICACION-Y-TRAZABILIDAD.md) | 38 requisitos, 70 casos previstos, evidencia, rendimiento y criterios de cierre | Revisión y entrega. |

Este índice conserva el paquete base de ocho documentos e incorpora dos documentos específicos de la revisión 3.0. Los archivos se complementan: el maestro resume decisiones; cada anexo desarrolla su área. Si una implementación descubre que necesita cambiar un contrato, se actualizan contrato, dependencias y comprobaciones del mismo incremento.

## 2. Qué contiene el mundo

| Experiencia | Contenido central | Prioridad |
|---|---|---|
| Atrio y banco | Entrada, CPU, memoria, almacenamiento y salida | P0 |
| Intel 8086 | Registros, BIU/EU, instrucciones, flags y ejecución | P0 |
| Galería de memoria | Bytes, palabras, segmentación y direcciones | P0; caché P1 |
| Cronoscopio | Restauración, causa de errores y ramas A/B | P0; especulación P2 |
| Apple Silicon | Bloques documentados, tareas y memoria compartida conceptual | P0; variantes P1 |
| Buses y entrada/salida | Dirección, datos, control y organizaciones básicas | P0 integrado en atrio; interrupciones P1 |
| Fundición | Comparar y construir organizaciones | P1/P2 |
| Cooperación | Personas como unidades de una computadora | P2 |

La primera entrega contiene un atrio y cuatro experiencias principales conectadas, con buses/conceptos generales integrados en el banco. Las ocho experiencias describen la visión completa; no se exigen ocho salas terminadas dentro de la semana.

## 3. Alcance cerrado para siete días

- Mundo 3D navegable, objetos seleccionables, despieces y transición de escala.
- Intel 8086 funcional acotado: doce mnemónicos, dieciocho grupos de formas y restricciones documentadas.
- Seis programas de referencia F01–F06, con condiciones y resultados definidos.
- Memoria segmentada, little-endian y direcciones equivalentes.
- Historial reversible, dos ramas comparables y diagnóstico del segmento equivocado.
- M5 conceptual con tres tareas deterministas, bloques documentados y buffers inspeccionables.
- Siete misiones P0; exploración libre, laboratorio y modo de presentación.
- Biblioteca de diez familias de materiales, recursos con nombres estables y desgaste por causas físicas.
- Editor/inspectores 2D, teclado, movimiento reducido, persistencia y recuperación.
- Paquete local para exposición sin red, fuentes, evidencia y guion de 10–12 minutos.

La representación 3D es el espacio principal. El 2D permite leer código, números y explicaciones con precisión. Los modelos conservan su identidad: el 8086 no recibe características modernas ficticias y Apple no se presenta como un emulador exacto de un chip propietario.

## 4. Cierre de la revisión de planificación

| Vacío detectado en la versión anterior | Resolución en la versión 2.0 |
|---|---|
| Instrucciones nombradas sin todas sus formas | Matriz I01–I18 con opcodes elegidos, operandos, direccionamiento y errores. |
| Sintaxis y carga pendientes de concretar | Dialecto, límites de programa, condiciones predeterminadas y archivos definidos. |
| Misiones descritas por objetivo general | M01–M12 con inicio, acciones, éxito, error frecuente, pistas y evidencia. |
| Apple conceptual sin operaciones pequeñas fijadas | A01–A03 con entradas, cálculo, resultados y flujo de buffers. |
| Historia y worker descritos a alto nivel | Estados, comandos, identidades, límites, checkpoints y reglas A/B. |
| Realismo sin inventario suficiente para producirlo | MAT-01–MAT-10, AS-01–AS-16, cámaras, desgaste, pipeline y revisión visual. |
| Backlog con paquetes demasiado amplios | Fichas detalladas de los 28 paquetes, tareas internas y criterios. |
| Ampliaciones formuladas como ideas | EXT-01–EXT-08 con dependencias, resultados y verificaciones. |
| Aceptación general | R01–R38 y T01–T70, con evidencia y prioridades. |
| Lectura dispersa | Índice, enlaces cruzados y responsabilidades documentales. |

La revisión documental de cierre comprobó referencias locales, enlaces entre documentos y secciones, identificadores y dependencias sin ciclos. Los setenta casos están vinculados con requisitos. También se recalcularon ejemplos de flags, direcciones, longitudes/desplazamientos, tareas Apple y costes de caché, sin discrepancias con sus resultados especificados. Esta revisión no sustituye la inspección visual de escenas o la ejecución futura de los simuladores.

## 5. Qué se conoce y qué requiere el desarrollo

**Definido:** experiencia, prioridades, límites de fidelidad, stack, dialecto y formas, escenarios, arte, interacción, contratos, tareas, criterios y guion.

**A registrar al comenzar:** equipo/navegador de exposición, versiones compatibles instaladas, herramientas disponibles y referencia física concreta del encapsulado. El plan incluye una alternativa de geometría paramétrica si no se dispone de Blender.

**A comprobar sobre el producto:** resultados del núcleo implementado, integración, exactitud del contenido final, apariencia real, fluidez, estabilidad y funcionamiento local. Las metas de FPS y carga son presupuestos de diseño, no mediciones ya obtenidas.

Estas comprobaciones no dejan pendiente la redacción del plan. Son parte de su ejecución y tienen responsables y criterios definidos.

## 6. Uso del paquete

Para presentar la idea al docente, usar la propuesta académica y el mapa del maestro. Para comenzar a construir, seguir BAS-01/BAS-02 y el primer hito del plan de ejecución. Cada agente recibe tareas concretas y los anexos de su área; la coordinación conserva contratos e integración.

Para revisar avances, consultar requisitos y casos T. Para ampliar el proyecto, seguir EXT y mantener separado el alcance efectivamente disponible. El paquete puede copiarse al futuro repositorio como documentación de diseño, preservando los IDs para no perder trazabilidad.

## 7. Revisión 3.0: decisiones que deben aplicarse al continuar

| Cambio solicitado | Documento/área |
|---|---|
| Modelos y banco con más realismo | Especificación 3.0, secciones 3–5; R00, R06, R07 |
| RAM concreta y coherencia de época | Intel2164A clásica, KingstonKVR26N19S8/8 moderna, Apple independiente |
| Objetos antes pasivos operables | InteractionRegistry y tabla de acciones; R02, R07 |
| Física de banco y efectos útiles | Especificación, secciones 9–11; R08, R11 |
| Panel gráfico de instrumentos | Especificación, sección 7; R01, R05, R09, R10 |
| Toolbar dentro de escena | Especificación, sección 6; R03 |
| Móvil sin pérdida de funciones | Especificación, sección 8; R04, R12 |
| Cierre con evidencia de pendientes | R00 y R12; matriz NX01–NX14 |

Todos los incrementos nuevos están pendientes. No se ejecutó implementación en esta revisión.
