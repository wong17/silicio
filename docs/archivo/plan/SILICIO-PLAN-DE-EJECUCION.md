# SILICIO

> **Revisión 3.0 vigente:** [Escena, instrumentos y móvil](./SILICIO-AMPLIACION-ESCENA-PANEL-Y-MOVIL.md) y [tareas futuras](./SILICIO-IMPLEMENTACION-ESCENA-INSTRUMENTOS-MOVIL.md). Esta revisión modifica solo documentos; no ejecuta implementación.

## Plan de ejecución de siete días y coordinación de agentes

Versión 2.0 · 12 de octubre de 2026 · Planificación completada y detallada; implementación pendiente.

Este documento convierte el [plan maestro](./SILICIO-PLAN-MAESTRO.md) en trabajo asignable. La entrega se concentra en Intel 8086, arquitectura general y Apple Silicon. Angular, Three.js, GSAP y Lenis forman la base prevista. Arduino queda excluido.

[Índice del paquete](./SILICIO-INDICE.md) · [Contrato técnico](./SILICIO-ESPECIFICACION-TECNICA.md) · [Misiones](./SILICIO-EXPERIENCIAS-Y-MISIONES.md) · [Producción 3D](./SILICIO-DIRECCION-3D-Y-UX.md) · [Aceptación](./SILICIO-VERIFICACION-Y-TRAZABILIDAD.md)

El backlog contiene **28 paquetes P0 y ocho ampliaciones EXT**. Las fichas de la sección 12 descomponen el trabajo de cada paquete. La sección 13 fija el resultado de cada bloque diario y la sección 14 desarrolla la visión posterior. Esta versión cierra la matriz de instrucciones, los escenarios y las decisiones de producto que antes se dejaban para el inicio.

## Contenido

- [1. Resultado comprometido por el plan](#1-resultado-comprometido-por-el-plan)
- [2. Responsables y límites de edición](#2-responsables-y-límites-de-edición)
- [3. Reglas de integración](#3-reglas-de-integración)
- [4. Hitos diarios](#4-hitos-diarios)
- [5. Backlog P0](#5-backlog-p0)
- [6. Orden de ampliaciones](#6-orden-de-ampliaciones)
- [7. Contrato práctico entre agentes](#7-contrato-práctico-entre-agentes)
- [8. Plantillas de asignación](#8-plantillas-de-asignación)
- [9. Registro de evidencia](#9-registro-de-evidencia)
- [10. Guion de presentación](#10-guion-de-presentación)
- [11. Datos que se registran al iniciar la implementación](#11-datos-que-se-registran-al-iniciar-la-implementación)
- [12. Fichas de los 28 paquetes P0](#12-fichas-de-los-28-paquetes-p0)
- [13. Bloques diarios de trabajo](#13-bloques-diarios-de-trabajo)
- [14. Backlog de la visión completa](#14-backlog-de-la-visión-completa)
- [15. Disciplina de coordinación](#15-disciplina-de-coordinación)

## 1. Resultado comprometido por el plan

Una aplicación con un atrio 3D, cuatro experiencias principales y contenido de arquitectura general integrado en el banco central:

1. Banco 8086 con un subconjunto funcional y formas de operandos documentadas.
2. Memoria segmentada con inspección de bytes, palabras y direcciones.
3. Cronoscopio con restauración y comparación de ejecuciones.
4. Apple Silicon con un modelo conceptual interactivo del M5.

La estética mostrará materiales usados y mantenimiento. El editor y los inspectores 2D permanecerán sincronizados con el mundo. La entrega incluirá misiones, fuentes, evidencias de verificación, un guion y un paquete local de exposición.

«Comprometido por el plan» expresa la prioridad que debe protegerse. La disponibilidad de herramientas, el equipo de exposición y la primera integración se comprobarán al inicio. Toda ampliación estará condicionada a completar y estabilizar esta base.

## 2. Responsables y límites de edición

La persona autora mantiene la dirección, acepta cambios y ensaya la experiencia. Tres frentes pueden trabajar simultáneamente. Los roles son asignaciones propuestas para agentes futuros; este documento no ha iniciado agentes ni tareas automáticas.

| Rol | Propiedad principal | Entrega cotidiana |
|---|---|---|
| Coordinación | Alcance, contratos, prioridades, integración y decisión de cierre | Versión integrada comprobada, incidencias y siguiente objetivo. |
| Agente A, simulación | CPU, ensamblador acotado, memoria, historial y worker | Casos verificables y estados de referencia. |
| Agente B, experiencia 3D | Renderer, cámaras, escenas, recursos, materiales y rendimiento gráfico | Escenas revisables con interacciones reales. |
| Agente C, aplicación y contenido | Angular, editor, inspectores, navegación, misiones y fuentes | Flujo de usuario completo conectado a los contratos. |

El contenido de Apple pertenece a C; los objetos y materiales de su escena pertenecen a B. A participa cuando un escenario conceptual necesita cálculos, sin mezclarlo con el modelo 8086. Un responsable único mantiene el archivo de contratos centrales.

Durante la verificación, los agentes revisarán áreas distintas de las que implementaron. El número de agentes se ajustará a la capacidad de revisar e integrar sus entregas.

## 3. Reglas de integración

1. Definir y versionar los contratos antes de dividir implementaciones.
2. Mantener una rama o integración principal ejecutable; incorporar cambios pequeños y comprobables cada día.
3. Usar módulos independientes para trabajar en paralelo. Las mallas no escriben memoria y el núcleo no conoce cámaras.
4. Resolver una incompatibilidad de contrato antes de extenderla a otras salas.
5. Incorporar un ejemplo funcional con cada capacidad nueva.
6. Respetar el lockfile y acordar las nuevas dependencias con coordinación.
7. Preservar el trabajo local existente cuando se cree o use el repositorio.
8. Cada entrega distingue implementación, pruebas realizadas y aspectos todavía no comprobados.

La fuente de trabajo pendiente será un backlog mantenido en el repositorio. Los estados de este documento son iniciales: todas las tareas comienzan pendientes. Un elemento solo se cierra con la evidencia de su criterio de aceptación.

## 4. Hitos diarios

| Día | Simulación | Gráficos | Aplicación y contenido | Puerta de salida |
|---|---|---|---|---|
| 1 | Contrato, estado, carga y primera operación; vectores de referencia | Banco simple, cámara y un material de referencia con desgaste | Proyecto Angular, inspector básico y fuentes iniciales | Programa y objeto comparten un estado; herramientas y equipo registrados. |
| 2 | Subconjunto P0 y codificación avanzan sobre pruebas; worker conectado | 8086 seleccionable y animación de una transferencia | Editor acotado y controles de ejecución conectados | Una suma funciona de extremo a extremo y puede explicarse en pantalla. |
| 3 | Memoria segmentada, diferencias y restauración | Primer plano representativo del 8086; galería de memoria | Misiones de suma, flags y direcciones; inspector temporal | Un dato se puede seguir y un estado se puede restaurar; dirección visual aprobada. |
| 4 | Consolidar pruebas P0 y ramas de ejecución | Escena Apple conceptual y continuidad entre salas | Misiones restantes, Apple y contenido general | Recorrido P0 completo, con las siete misiones reproducibles. |
| 5 | Resolver fallos; ampliaciones solo si la base está estable | Finalizar materiales, iluminación y perfiles | Cerrar explicaciones, fuentes, guion y navegación | Alcance congelado y candidato a entrega. |
| 6 | Revisión independiente de resultados y límites | Perfilado en el equipo real, capturas y ajustes | Pruebas de flujo, accesibilidad y funcionamiento local | Evidencia de aceptación de la versión candidata. |
| 7 | Correcciones necesarias y compilación final | Ajustes justificados por el ensayo | Ensayo, instrucciones, grabación de respaldo y paquete | Entrega identificada por versión y demostración ensayada. |

Estos hitos usan días de trabajo; no fijan una fecha de entrega del docente ni presuponen una cantidad concreta de horas diarias. Los días 6 y 7 se reservan para cierre. La amplitud de la visión no convierte las funciones P1/P2 en obligaciones de esta semana.

### Puertas de control

- **G1, día 1:** herramientas disponibles, equipo de referencia definido y contrato capaz de describir una ejecución simple.
- **G2, día 2:** integración vertical de una suma con bytes, estado, inspector y objeto 3D. Si falla, todos los frentes priorizan esta integración.
- **G3, día 3:** primer plano con calidad visual representativa y restauración verificable. Si el arte está retrasado, el detalle se concentra en los dos protagonistas y se reutiliza el entorno.
- **G4, día 4:** recorrido P0 completo. Si queda una experiencia central incompleta, el día 5 se dedica a cerrarla.
- **G5, día 5:** funciones congeladas. Se incorporan después únicamente correcciones necesarias para la entrega.
- **G6, día 6:** criterios funcionales, de uso y de exposición comprobados.
- **G7, día 7:** ensayo de inicio a fin y respaldo del paquete preparado.

## 5. Backlog P0

El backlog siguiente describe la base histórica 2.0; su estado debe reconciliarse con la aplicación y evidencia actuales. Las tareas nuevas de 3.0 permanecen pendientes. Las dependencias de la base son mínimas; cada responsable puede trabajar con fixtures acordados mientras otro frente completa su implementación.

### Base e integración

| ID | Responsable | Tarea | Depende de | Criterio de cierre |
|---|---|---|---|---|
| BAS-01 | Coordinación | Registrar equipo, herramientas, disponibilidad diaria y versiones elegidas | — | Ficha de entorno y lockfile inicial; decisiones registradas. |
| BAS-02 | Coordinación y A | Materializar los contratos y la matriz ya definidos en la especificación técnica | BAS-01 | Fixture compartido de suma y errores; todos los frentes pueden consumirlo. |
| BAS-03 | C | Crear aplicación Angular y rutas de las experiencias | BAS-01 | Carga directa y navegación entre rutas sin errores. |
| BAS-04 | B | Crear canvas, renderer, coordinador visual y ciclo de vida | BAS-01 | Un render por frame; cambio de escena sin duplicar listeners. |
| BAS-05 | A y C | Conectar worker, comandos y respuesta identificada por sesión | BAS-02, BAS-03 | Cargar, ejecutar, pausar y cancelar sin bloquear la interfaz. |

### Intel 8086 y memoria

| ID | Responsable | Tarea | Depende de | Criterio de cierre |
|---|---|---|---|---|
| CPU-01 | A | Estado, lectura/escritura de memoria y condiciones iniciales | BAS-02 | Pruebas de registros, bytes, palabras y direcciones. |
| CPU-02 | A | Ensamblador, decoder y mapa fuente-dirección del subconjunto | CPU-01 | Bytes y tamaños contrastados; sintaxis no admitida produce error. |
| CPU-03 | A | Instrucciones y flags P0 | CPU-02 | Vectores independientes y programas de las misiones pasan. |
| CPU-04 | B | Encapsulado 8086 y representación funcional interna | BAS-04 | Partes seleccionables y modelo de referencia identificado. |
| CPU-05 | B y C | Vincular estado con componentes y editor | BAS-05, CPU-03, CPU-04 | Suma visible y consistente en código, registros, memoria y 3D. |
| MEM-01 | A y C | Segmentación, representación numérica e inspector | CPU-01 | Direcciones equivalentes y orden de bytes comprobados. |
| MEM-02 | B | Galería 3D y visualización paginada de accesos | MEM-01 | Una ventana pequeña representa el acceso real sin crear toda la RAM como mallas. |

### Tiempo, Apple y arquitectura general

| ID | Responsable | Tarea | Depende de | Criterio de cierre |
|---|---|---|---|---|
| TIM-01 | A | Checkpoints y diferencias por instrucción | CPU-03 | Restauración idéntica al estado capturado. |
| TIM-02 | A y C | Rama A/B al modificar condiciones | TIM-01 | Se conserva la ejecución original y se compara con la nueva. |
| TIM-03 | B y C | Cronoscopio visual y caso del segmento equivocado | TIM-02 | La misión se puede resolver y justificar con la traza. |
| APP-01 | C | Datos y límites del modelo M5 | BAS-02 | Cada afirmación comercial tiene variante y fuente. |
| APP-02 | B | Encapsulado y bloques funcionales Apple | BAS-04, APP-01 | Selección, despiece y encuadres; distribución conceptual identificada. |
| APP-03 | C y B | Escenario de memoria compartida | APP-01, APP-02 | La interacción explica el buffer y los bloques sin presentar un benchmark ficticio. |
| GEN-01 | C y B | Banco general, buses y comparación de modelos | BAS-03, BAS-04 | Componentes, rutas y diferencias quedan explicados y manipulables. |

### Arte, uso y cierre

| ID | Responsable | Tarea | Depende de | Criterio de cierre |
|---|---|---|---|---|
| ART-01 | B | Biblioteca de materiales y desgaste | BAS-04 | Muestras revisadas con luz neutra y luz final. |
| ART-02 | B | Iluminación, recursos optimizados y perfiles | ART-01, CPU-04, MEM-02, TIM-03, APP-02, GEN-01 | Escenas dentro del presupuesto ajustado al equipo real. |
| UX-01 | C y B | Propiedad del input, controles y navegación | BAS-03, BAS-04 | Editor, scroll e inspección no compiten por los mismos gestos. |
| UX-02 | C | Persistencia, movimiento reducido y acceso por teclado | BAS-03 | Preferencias y controles verificados en recorrido completo. |
| EDU-01 | C | Siete misiones, glosario y fuentes | CPU-05, MEM-02, TIM-03, APP-03, GEN-01 | Misiones reproducibles con condiciones de éxito claras. |
| QA-01 | Revisión cruzada | Verificar semántica, sincronización y errores | CPU-05, MEM-02, TIM-03, APP-03, GEN-01, UX-02, EDU-01 | Matriz de evidencia completa y fallos impeditivos resueltos. |
| QA-02 | B y coordinación | Verificar rendimiento, recursos y contexto gráfico | ART-02, UX-01 | Resultados registrados en el equipo de exposición. |
| REL-01 | C y coordinación | Paquete local, fuentes locales y guía de ejecución | QA-01, QA-02 | Recorrido funciona sin red desde el servidor local documentado. |
| REL-02 | Coordinación | Guion, ensayo y grabación de respaldo | EDU-01, REL-01 | Exposición completa de 10–12 minutos ensayada. |

## 6. Orden de ampliaciones

Después de G4 y únicamente con P0 estable:

| Orden | Ampliación | Motivo de prioridad | Validación exigida |
|---|---|---|---|
| 1 | Caché didáctica con dos configuraciones | Reutiliza la traza de memoria y aporta comparación causal | Conteos de aciertos y fallos recalculables. |
| 2 | Más detalle del observatorio Apple | Refuerza un foco explícito del encargo | Fuentes por variante y geometría conceptual consistente. |
| 3 | Pila, CALL y RET | Amplía la explicación de flujo y estado | Ida y retorno, SP y dirección guardada correctos. |
| 4 | Interrupción y periférico clásico | Conecta CPU con entrada/salida | Estado guardado y restaurado conforme al modelo elegido. |
| 5 | Dos configuraciones de Fundición | Hace visible arquitectura frente a organización | Resultado funcional idéntico y métricas justificadas. |

Después de la semana: especulación, ejecución fuera de orden, constructor libre de CPU y modo cooperativo en red. Incorporar cada una requerirá su propio modelo, casos de prueba y presupuesto visual.

## 7. Contrato práctico entre agentes

El fixture de integración debe expresar al menos:

- Modelo y versión.
- Condiciones iniciales y programa con codificación conocida.
- Instrucción seleccionada, dirección y longitud.
- Estado anterior y posterior de registros y flags afectados.
- Lecturas y escrituras de memoria con dirección y tamaño.
- Estado de ejecución: preparado, activo, pausado, detenido o error.
- Correspondencia entre identificadores semánticos y objetos 3D.

El primer ejemplo compartido será `ADD AX, [10]`, con AX=7 y palabra de memoria=5. Se declarará el segmento de datos y la notación decimal del desplazamiento. El resultado será AX=12. El fixture conservará los valores de memoria para que la presentación no invente una escritura que la instrucción no realiza.

Los identificadores como `cpu.ax`, `cpu.alu` o `memory.word.selected` serán estables. Una modificación de su significado requiere actualizar contrato, fixture y consumidores en la misma integración.

## 8. Plantillas de asignación

### Agente A

> Implementa únicamente el núcleo y los contratos de simulación que se te asignen. Usa el modelo `intel8086-subset-v1` y la matriz de formas aceptadas. Mantén Angular, Three.js y GSAP fuera del núcleo. Cada instrucción debe aportar pruebas de resultados, flags y codificación basadas en referencias independientes. Registra las limitaciones y devuelve una entrega pequeña que pueda integrarse en la experiencia visual.

### Agente B

> Construye las escenas 3D asignadas dentro del estilo de laboratorio usado y mantenido. Consume estados y eventos del contrato compartido. No calcules resultados de CPU en el renderer. Mantén un único bucle de presentación, recursos con ciclo de vida explícito y materiales compatibles con la versión acordada. Entrega capturas de los encuadres relevantes y un presupuesto de recursos medido.

### Agente C

> Construye el flujo Angular, los inspectores y el contenido asignado. El mundo sigue siendo la experiencia principal; el 2D facilita código y datos. Envía comandos al modelo y presenta su respuesta. Mantén teclado, foco y movimiento reducido. Cada explicación debe tener fuente y distinguir reglas didácticas de datos del procesador. Entrega un recorrido de usuario comprobable con los fixtures y después con la simulación integrada.

### Revisión cruzada

> Revisa el incremento contra sus criterios de aceptación. Busca discrepancias entre estado y visualización, afirmaciones sin respaldo, interacciones que compiten y costes gráficos. Prioriza defectos que cambian el aprendizaje o impiden el recorrido. Informa evidencia y pasos de reproducción. No amplíes el alcance durante la revisión.

## 9. Registro de evidencia

Cada tarea cerrada tendrá una entrada con:

| Campo | Contenido |
|---|---|
| Identificador | ID del backlog y versión o commit comprobado. |
| Comportamiento | Resultado concreto que se verificó. |
| Método | Prueba automatizada, ejecución comparada, revisión de contenido o inspección visual. |
| Entorno | Equipo, navegador, resolución y perfil gráfico si aplica. |
| Evidencia | Resultado de pruebas, captura, traza o archivo de referencia. |
| Límites | Aspectos que esa comprobación no acredita. |

Una captura demuestra apariencia, no exactitud de los flags. Una prueba del núcleo demuestra semántica, no calidad de materiales. La aceptación del módulo requiere las comprobaciones pertinentes para su función.

## 10. Guion de presentación

| Tiempo orientativo | Escena | Demostración |
|---|---|---|
| 0:00–1:00 | Atrio | Presentar la computadora y el objetivo de explorar su funcionamiento. |
| 1:00–3:30 | Banco 8086 | Abrir el procesador, ejecutar la suma y explicar registros, ALU y destino. |
| 3:30–5:00 | Memoria | Mostrar segmento, desplazamiento y los bytes que se leyeron. |
| 5:00–7:30 | Cronoscopio | Introducir el caso preparado, investigar su origen y corregirlo. |
| 7:30–9:30 | Apple Silicon | Explorar un SoC, sus bloques y la memoria compartida del escenario conceptual. |
| 9:30–11:00 | Comparación final | Explicar qué se conserva y qué cambia entre los modelos. |
| Margen restante | Preguntas | Usar acceso directo a los componentes relevantes. |

La grabación de respaldo mostrará esta misma versión. Las afirmaciones de la exposición corresponderán a funciones realmente incluidas. El guion tendrá una lista breve de condiciones iniciales para poder reiniciar cada demostración.

## 11. Datos que se registran al iniciar la implementación

El diseño de producto ya está fijado en este paquete. Al comenzar se registran datos que requieren el entorno real: equipo/navegador de exposición, versiones compatibles efectivamente instaladas, herramientas de modelado disponibles, referencia física del encapsulado concreto y resultados de las primeras mediciones.

La matriz de instrucciones y la sintaxis están cerradas en la especificación técnica. NASM es la referencia elegida para contraste de ensamblado; la referencia de ejecución que se utilice deberá quedar identificada. Si Blender no está disponible, se aplica la alternativa de geometría paramétrica prevista en el documento de arte. Estas comprobaciones son tareas ejecutables con una respuesta definida, no asuntos de ideación pendientes.

## 12. Fichas de los 28 paquetes P0

Cada ficha define actividades, producto y comprobación. El orden interno puede ajustarse para resolver una dependencia, pero no se elimina su criterio de cierre. Los IDs T remiten a la matriz de verificación.

### BAS-01 — Entorno y base de trabajo

1. Registrar equipo, navegador y disponibilidad diaria del autor; seleccionar el equipo de exposición como referencia.
2. Crear el repositorio conservando cualquier trabajo existente; registrar Node, npm y versiones compatibles del stack elegido.
3. Instalar dependencias con lockfile, scripts y estructura de carpetas del plan; comprobar disponibilidad de herramientas de recursos.
4. Registrar decisiones de entorno y una ejecución inicial de compilación.

**Producto:** aplicación mínima compilable, lockfile y ficha de entorno. **Cierre:** otro frente puede arrancar el proyecto con las instrucciones y versiones registradas.

### BAS-02 — Contratos compartidos

1. Traducir las tablas de la especificación a tipos y esquemas versionados.
2. Crear fixtures de F01 con estados anterior/posterior, error de operando y selección de componente.
3. Fijar IDs semánticos y responsabilidad única de cambios del contrato.
4. Hacer que A, B y C consuman el mismo fixture antes de ampliar implementación.

**Producto:** contratos y fixtures compartidos. **Cierre:** núcleo, inspector y escena interpretan los mismos campos; no hay contratos privados incompatibles.

### BAS-03 — Shell Angular y rutas

1. Crear shell persistente, navegación hash y carga diferida de experiencias/editor.
2. Implementar entrada, mapa, panel contextual y estados de carga/error.
3. Conservar selección y sesión al cambiar rutas compatibles.
4. Preparar vista de presentación y fuentes locales.

**Producto:** recorrido navegable con fixtures. **Cierre:** T01/T02 y recuperación de ruta; el canvas permanece en el shell.

### BAS-04 — Subsistema gráfico

1. Crear WebGLRenderer, escena/cámara, resize y coordinador de presentación.
2. Conectar ticker GSAP y Lenis sin RAF automático duplicado.
3. Implementar registro de recursos, entrada/salida de escena y cancelación de animaciones.
4. Añadir captura de pérdida de contexto y herramientas de diagnóstico de desarrollo.

**Producto:** un canvas con una estación seleccionable. **Cierre:** T02/T43/T58 para el incremento correspondiente; un solo render por frame.

### BAS-05 — Worker y sesión

1. Implementar mensajes con sesión, época, secuencia y comando.
2. Conectar cargar, paso, ejecutar, pausar y lectura de memoria.
3. Acotar lotes y captura; descartar respuestas antiguas.
4. Añadir timeout y recuperación de proyecto.

**Producto:** SessionFacade/WorkerClient y monitor. **Cierre:** T28–T30, además de STEP de F01 integrado.

### CPU-01 — Registros y memoria

1. Implementar estado de 16 bits, vistas de mitades y flags nombrados.
2. Implementar direcciones, selección DS/SS y memoria por bytes.
3. Implementar lecturas/escrituras de palabra y restricciones P0 atómicas.
4. Implementar cargador con valores predeterminados y condiciones por escenario.

**Producto:** estado inicial serializable y operaciones de memoria. **Cierre:** T05/T08/T10–T14 con resultados independientes.

### CPU-02 — Ensamblador y decoder

1. Implementar tokens, etiquetas, literales, comentarios y errores por línea/columna.
2. Implementar dos pasadas y las dieciocho familias de formas I01–I18.
3. Emitir bytes canónicos y mapa fuente-dirección; decodificar únicamente las formas del contrato.
4. Contrastar longitudes y muestras con NASM/manuales, registrando variantes equivalentes.

**Producto:** programa cargable y diagnósticos. **Cierre:** T06/T07/T09/T22/T23; ningún prefijo o instrucción desconocida pasa silenciosamente.

### CPU-03 — Semántica y flags

1. Implementar MOV, aritmética, comparación, INC/DEC, saltos, LOOP, NOP y HLT.
2. Garantizar conservación de flags y ejecución atómica.
3. Aplicar protección del programa, destino de salto y límite de ejecución del monitor.
4. Ejecutar F01–F06 y casos de borde; guardar resultados y límites.

**Producto:** núcleo funcional puro. **Cierre:** T15–T27 y pruebas de conservación/restauración que lo involucren.

### CPU-04 — Protagonista Intel

1. Registrar referencia DIP, modelar exterior y dividir piezas interactivas.
2. Crear BIU/EU, registros, ALU y seis casillas de cola como organización funcional.
3. Crear despiece, encuadres y nombres de nodos estables.
4. Revisar primer plano y relación entre IDs semánticos y mallas.

**Producto:** AS-03/04/05 integrados. **Cierre:** T55 y muestra de materiales del día 3.

### CPU-05 — Operación integrada

1. Vincular editor, bytes, registros y mallas al mismo snapshot.
2. Convertir el delta de F01 en trayectoria explicativa con origen/destino.
3. Completar o saltar animaciones sin depender de ellas para el resultado.
4. Conservar consistencia al pausar, cambiar escena o mostrar errores.

**Producto:** primera suma de extremo a extremo. **Cierre:** T03/T15; el operando de memoria no se anima como destino.

### MEM-01 — Herramientas de memoria

1. Crear calculadora de dirección y ventanas de hasta 256 bytes.
2. Implementar selección de palabra y representaciones numéricas.
3. Vincular accesos de código/datos con categorías distintas.
4. Preparar alias de M04 y datos del arreglo de M05.

**Producto:** inspector con cálculos reproducibles. **Cierre:** T10–T14 y resolución de M04.

### MEM-02 — Galería 3D

1. Instanciar casillas y marcadores de ventana sin generar un millón de mallas.
2. Vincular selección y accesos con el inspector.
3. Mostrar los dos bytes de palabra y sus direcciones.
4. Mantener identidad de selección al pasar del banco a la galería.

**Producto:** AS-06 y escena E02. **Cierre:** T03/T12 y misión M05 inspeccionable.

### TIM-01 — Historia

1. Registrar deltas, checkpoints y páginas inmutables según presupuesto.
2. Implementar búsqueda y restauración exacta.
3. Distinguir cabezal de ejecución y cursor de inspección.
4. Pausar al alcanzar límites sin eliminar historial silenciosamente.

**Producto:** capturas reversibles. **Cierre:** T29/T31/T33.

### TIM-02 — Ramas

1. Crear A/B desde una frontera de instrucción válida.
2. Validar cambios iniciales y conservar el origen de cada rama.
3. Comparar registros, flags y rangos de memoria; limitar a dos ramas activas P0.
4. Implementar recuperación/exportación antes de sustituir una rama.

**Producto:** divergencias reproducibles. **Cierre:** T32 con F04.

### TIM-03 — Cronoscopio

1. Crear cronología virtualizada y mesa temporal.
2. Vincular elegir/restaurar/comparar con el historial real.
3. Mostrar diferencias causales del segmento equivocado.
4. Evitar repetición de sonidos, progreso o efectos externos al buscar estados.

**Producto:** AS-07 y E03. **Cierre:** M06 completa y T31–T33 desde interfaz.

### APP-01 — Contenido Apple

1. Crear ficha M5 con fuentes por afirmación y distinción de bloques.
2. Separar hechos comerciales de posiciones/tamaños conceptuales.
3. Redactar memoria unificada, especialización y límites de las tareas.
4. Definir contenidos y verificadores de A01–A03/M07 con las entradas del contrato.

**Producto:** datos y contenido versionados. **Cierre:** T49; revisión cruzada de lenguaje y fuentes.

### APP-02 — Protagonista Apple

1. Crear exterior y bloques funcionales de AS-08/09.
2. Aplicar materiales contemporáneos usados, con desgaste en zonas expuestas.
3. Crear selección y despiece por niveles.
4. Vincular cada bloque a su ficha y a los escenarios pertinentes.

**Producto:** E04 inspeccionable. **Cierre:** T49/T54/T55 sin geometría presentada como plano exacto no documentado.

### APP-03 — Tareas y buffers Apple

1. Implementar funciones deterministas de A01–A03 con apoyo de A para revisión matemática.
2. Crear entradas editables admitidas y buffers con identidad/versión.
3. Animar preparar, procesar y consultar sin inventar latencias del chip.
4. Integrar M07 y su verificador.

**Producto:** escenario conceptual interactivo completo. **Cierre:** T45–T48 y M07 reproducible.

### GEN-01 — Banco general

1. Implementar secuencia de entrada-procesamiento-memoria-salida.
2. Crear rutas diferenciadas de datos, direcciones y control.
3. Incorporar comparación conceptual Von Neumann/Harvard.
4. Integrar E05 en la misma estación y conectar accesos del atrio.

**Producto:** E00/E05 y M01. **Cierre:** T50/T51 y primera interacción clara.

### ART-01 — Materiales

1. Crear MAT-01–MAT-10 con las variantes necesarias para los protagonistas.
2. Separar máscaras de pintura, contacto, polvo y microdetalle.
3. Revisar color, roughness, normales y costuras bajo luz neutra.
4. Documentar valores elegidos y capturar los primeros planos representativos.

**Producto:** biblioteca reutilizable y muestra de dirección visual. **Cierre:** T54, sin repetir suciedad idéntica en todos los materiales.

### ART-02 — Integración visual y perfiles

1. Ajustar iluminación, sombras y composición con efectos inicialmente apagados.
2. Exportar/optimizar recursos, incluir decodificadores y registrar procedencia.
3. Crear perfiles reducido/equilibrado/alto y ciclo de liberación de recursos.
4. Incorporar sonido opcional y límites de eventos sonoros.

**Producto:** escenas finales del alcance P0. **Cierre:** T44/T56–T58 y presupuestos medidos.

### UX-01 — Input y navegación

1. Implementar propietario único de rueda, arrastre y teclado según contexto.
2. Establecer selección, órbita, encuadre y salida con Escape.
3. Conectar paneles y editor sin mover cámara mientras se escribe.
4. Mantener foco al abrir/cerrar diálogos y cambiar modos.

**Producto:** controles consistentes. **Cierre:** T38/T39 y recorrido sin conflictos de gestos.

### UX-02 — Acceso, persistencia y recuperación

1. Adaptar inspectores a pantalla estrecha, teclado y movimiento reducido.
2. Implementar preferencias, autoguardado y proyectos en almacenamiento local.
3. Validar importación/exportación y conservar cambios antes de sustituir sesiones.
4. Implementar estados de cuota/error y trabajo temporal recuperable.

**Producto:** sesiones usables y conservables. **Cierre:** T34–T41 y T44.

### EDU-01 — Misiones y fuentes

1. Crear M01–M07 con condiciones, pasos, verificadores y tres niveles de pistas.
2. Integrar glosario, explicaciones breves y desarrollo opcional.
3. Guardar progreso y notas por versión sin bloquear exploración.
4. Verificar vínculos entre contenido, componentes, modelos y fuentes.

**Producto:** recorrido académico completo. **Cierre:** T52/T53 y acceso a todas las referencias pertinentes.

### QA-01 — Exactitud y uso

1. Ejecutar la matriz P0 pertinente al núcleo, protocolo y experiencias.
2. Revisar áreas con agentes distintos de sus autores cuando sea posible.
3. Corregir errores causales, de estado, guardado y accesibilidad.
4. Registrar versión, resultados, evidencia y límites reales.

**Producto:** informe de aceptación funcional. **Cierre:** sin bloqueantes/mayores en los requisitos P0; no se presenta el plan de tests como tests ejecutados.

### QA-02 — Gráficos y rendimiento

1. Registrar equipo/perfil/resoluciones y medir el recorrido de 60 segundos.
2. Revisar capturas de los encuadres obligatorios.
3. Repetir cambios de escena para detectar acumulación.
4. Ajustar solo las causas observadas y repetir las comprobaciones afectadas.

**Producto:** informe visual y de rendimiento. **Cierre:** T54–T58 en el equipo de exposición.

### REL-01 — Paquete local

1. Generar build e identificar versión.
2. Incluir recursos, fuentes, workers y decodificadores locales.
3. Documentar servidor local e inicio del recorrido.
4. Probar sin red con un perfil de navegador preparado para el ensayo.

**Producto:** paquete reproducible. **Cierre:** T59; el entorno de desarrollo no es el único que funciona.

### REL-02 — Exposición

1. Preparar presets de los seis momentos del guion.
2. Ensayar duración, reinicios y acceso directo a componentes.
3. Grabar respaldo de la misma versión y conservar exportaciones de los ejemplos.
4. Redactar alcance realmente implementado y limitaciones.

**Producto:** demostración y documentación de entrega. **Cierre:** T60 y paquete coherente con lo expuesto.

## 13. Bloques diarios de trabajo

No se impone una cantidad ficticia de horas. Cada día se organiza en preparación, producción e integración; la revisión del autor ocurre sobre una versión utilizable. Los frentes pueden trabajar en paralelo con fixtures, pero el recorrido integrado se comprueba a diario.

| Día | Preparación | Producción principal | Integración y revisión del autor |
|---|---|---|---|
| 1 | BAS-01/02, leer contratos y elegir referencia física | Shell, canvas, estado básico y geometría simple | Ver un mismo AX y programa en datos e inspector; probar una selección. |
| 2 | Acordar fixture F01 y mensajes | CPU-02/03, worker y escena Intel | Ejecutar ADD de principio a fin y distinguir lectura de escritura. |
| 3 | Revisar arte protagonista y memoria | MEM-01/02, TIM-01, ART-01 | Resolver M02–M04 y restaurar un estado; revisar primer plano. |
| 4 | Revisar resultados del núcleo antes de ampliar | TIM-02/03, APP-01/02/03 y GEN-01 | Completar M01–M07 y recorrer todas las estaciones P0. |
| 5 | Lista priorizada de defectos | EDU-01, UX-01/02 y ART-02; resolver faltantes | Congelar funciones y guardar candidato de entrega. |
| 6 | Preparar matriz y equipo de referencia | QA-01/02 y correcciones necesarias | Revisar evidencia, rendimiento y recorrido sin red. |
| 7 | Seleccionar versión final comprobada | REL-01/02 y correcciones del ensayo | Exposición completa, paquete, documentación y respaldo. |

La ruta crítica funcional es contratos → núcleo/bytes → suma integrada → memoria/historial → misiones → aceptación → paquete. La ruta crítica visual es referencia → geometría simple → protagonista → material representativo → escenas → rendimiento. Apple avanza con sus fixtures en paralelo y debe integrarse antes del cierre del día 4.

### Respuesta cuando un hito se retrasa

- G2 sin suma integrada: suspender escenarios nuevos y concentrar los frentes en datos, protocolo y presentación de F01.
- G3 sin acabado suficiente: reutilizar el entorno y reservar detalle para 8086/Apple; mantener la interacción funcional.
- G4 con un módulo P0 incompleto: usar el día 5 para cerrarlo; no iniciar EXT.
- G5 con defectos funcionales: conservar congelación de nuevas funciones y priorizar exactitud/recorrido.
- G6 con perfil gráfico insuficiente: medir un perfil reducido y reducir efectos/recursos; conservar contenido y claridad.
- Una función P0 que siga sin funcionar al entregar se declara como limitación real. No se oculta dentro de una cinemática.

## 14. Backlog de la visión completa

Estas ampliaciones tienen orden y criterios propios. Se ejecutan después de estabilizar la base, sin prometer que caben en los siete días.

| ID | Prioridad | Dependencias | Entrega concreta | Cierre |
|---|---|---|---|---|
| EXT-01 | P1 | MEM-02, TIM-01 | Caché de cuatro/ocho líneas, traza, etiquetas y costes | M09 y T61; datos iguales y conteos reproducibles. |
| EXT-02 | P1 | APP-03 | Variantes M5 Pro/Max/Ultra con fichas y geometría conceptual | T65 y fuentes independientes por configuración. |
| EXT-03 | P1 | CPU-03, TIM-01 | Pila, CALL/RET cercanos y operaciones ampliadas documentadas | M08/T62 y nueva matriz de capacidades. |
| EXT-04 | P1 | GEN-01, EXT-03 | Sondeo/interrupción y periféricos clásicos acotados | M10/T63 y contexto restaurado según modelo. |
| EXT-05 | P1 | EXT-01, EDU-01 | Dos presets `generic16-v1` comparables | M11/T64 y equivalencia funcional. |
| EXT-06 | P2 | EXT-05, TIM-03 | Modelo de especulación/OOO, predictor y confirmación | M12/T66/T67 y referencia secuencial equivalente. |
| EXT-07 | P2 | EXT-05 | Constructor válido, análisis y evolución reproducible | T68/T69; cada candidato cumple contratos. |
| EXT-08 | P2 | GEN-01, QA-01 | Roles locales y después servicio cooperativo autoritativo | T70; idempotencia, reconexión y estado común. |

Cada ampliación comienza con un contrato del modelo y un ejemplo mínimo. Después se integra visualización, contenido, controles, pruebas y presupuesto. Agregar una puerta en el mundo no acredita haber completado la experiencia.

## 15. Disciplina de coordinación

### Fronteras de edición

| Área | Responsable principal | Consumidores |
|---|---|---|
| Contratos comunes y configuración | Coordinación; cambios revisados con A/B/C | Todos. |
| Núcleo Intel, historia y worker | A | C mediante fachada; B mediante eventos. |
| Mundo, materiales, recursos y cámaras | B | C mediante controlador de escena. |
| Angular, rutas, contenido, editor y persistencia | C | B consume IDs; A consume parámetros de escenarios. |
| Escenario Apple matemático | C con revisión de A | B anima su estado. |
| Integración y evidencia de entrega | Coordinación | Todos aportan resultados concretos. |

Un agente recibe IDs de tareas, entradas, archivos de su responsabilidad y criterio de cierre. No se le envía todo el plan como una orden de implementar simultáneamente cada ampliación. Los cambios del contrato se integran primero y los consumidores se actualizan en el mismo incremento.

### Formato de una entrega de agente

1. Tareas abordadas y comportamiento resultante.
2. Archivos modificados y contratos afectados.
3. Comprobaciones realmente realizadas y evidencia.
4. Aspectos que no se verificaron.
5. Dependencia concreta para el siguiente frente, si existe.

La coordinación revisa la integración antes de declarar cerrado un paquete. Las pruebas se repiten cuando un cambio afecta a sus resultados, no por generar actividad. No se crean automatizaciones ni publicaciones externas por el hecho de que estén descritas en este documento.


## 13. Backlog vigente de la ampliación 3.0

La próxima ejecución está desglosada en [SILICIO-IMPLEMENTACION-ESCENA-INSTRUMENTOS-MOVIL.md](./SILICIO-IMPLEMENTACION-ESCENA-INSTRUMENTOS-MOVIL.md), R00–R12. Su alcance lo define [la especificación3.0](./SILICIO-AMPLIACION-ESCENA-PANEL-Y-MOVIL.md).

Todas las tareas nuevas siguen pendientes. La evidencia de la aplicación existente se toma de docs/IMPLEMENTACION.md y de comprobaciones futuras, no de asumir que todo el backlog histórico quedó cerrado.

Orden: referencias/contratos → shell/toolbar móvil → primer instrumento real → memorias → modelos/banco/interacción → física → instrumentos e historial/buffer → efectos/optimización → aceptación.

La revisión actual solo actualiza el plan. No se instala Rapier, no se generan activos, no se cambia código ni se ejecutan comandos de implementación/pruebas. La antigua semana no se reinicia y no se fija una fecha nueva de entrega.
