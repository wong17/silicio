# SILICIO — Plan de implementación: laboratorio interactivo

> **Para agentes que ejecuten este plan:** usar executing-plans, o subagent-driven-development si el usuario elige ese método. Ejecutar por tareas, comprobar cada entrega y preservar cambios ajenos. Las casillas representan trabajo pendiente.

**Fecha:** 19 de octubre de 2026, America/Managua. Revisión 5.1: sustituye el borrador del 17 de octubre (que no llegó a ejecutarse).
**Objetivo:** integrar el máximo contenido compatible en un laboratorio continuo, sin saturación, donde una persona introduzca datos, anticipe un resultado, avance paso a paso y explique qué componente actuó, qué cambió y por qué; y donde las prácticas de la asignatura (Arquitectura de Máquinas I y II, UNI) puedan resolverse dentro de un subconjunto declarado.
**Arquitectura:** escena continua con instrumentos Angular en un escritorio adaptable; transporte común que delega en la experiencia activa; resultados y explicaciones derivados de eventos deterministas. Three.js representa el estado, nunca decide resultados académicos.
**Stack:** conservar Angular 21 (21.2.25 instalado), Three.js 0.186.1, GSAP, Vitest y worker 8086. Proponer Angular CDK compatible para primitivas de interacción y Driver.js diferido para recorridos. Resolver y fijar versiones exactas y licencias al implementar, sin actualizar automáticamente Angular o Three.js.
**Especificación:** petición inicial (panel derecho, Emu8086, Traza, ventanas, transporte, orden de capítulos, PC moderno, memoria, resoluciones, Three.js), ampliación (integración, rótulos 3D y textos adaptables), sus cuatro capturas y el material de la asignatura en `D:\Documentos de clases\Arquitectura de Maquinas` (carpetas AMC y AMC2), resumido en §1.2. Las decisiones adicionales son recomendaciones de diseño, no preferencias ya confirmadas por el usuario.

Este es el **único plan vivo** indicado por README.md. El anterior se conserva sin cambios en [el archivo de la revisión 4](archivo/plan/PLAN-revision-4-cerrado-2026-10-17.md). Este encargo produce planificación; no modifica la aplicación ni instala dependencias.

## 0. Qué cambia en esta revisión

El borrador del 17 de octubre ya cubría bien paneles, Ayuda, Traza, transporte, rótulos, textos, memoria, PC y Three.js. La revisión lo contrasta con las peticiones y con el material del curso y corrige lo que no bastaba:

| # | Cambio | Motivo | Dónde |
|---|---|---|---|
| 1 | El 8086 ejecuta las prácticas del curso: registros de 8 bits, MUL/DIV, lógicas, saltos condicionales, DB/DW, macros, procedimientos e INT 21h con ventana **Pantalla** | «Parecido a Emu8086» no se consigue solo con la interfaz: el motor actual no ensambla ningún ejercicio de las Actividades 4–5 ni de la Práctica 1 | §4.2, T04a |
| 2 | Ciclo de instrucción con los siete pasos que enseña la asignatura, incluidos «incrementar el secuenciador» y «verificar interrupciones», ligados a BIU, cola y EU | Trabajo 3 (AMC2) y Guía básica de la CPU | §4.3 |
| 3 | Ventanas: anclar **abajo o a la derecha**, o flotar. Se retira anclar arriba/izquierda | Menos decisiones; arriba compite con navegación y transporte, la izquierda con la lectura de la escena | §2.1 |
| 4 | Rótulos: **marcador en la pieza** dentro del 3D y nombre colocado por candidatos alrededor de su ancla; nunca columnas | Capturas 3 y 4: quince nombres apilados que giran juntos | §2.4 |
| 5 | Dock inferior único con tres grupos (Cámara · Inspección · Vistas); Piezas, Mapa y Gráficos con el mismo diseño que la barra | Captura 2: botones de texto separados y aviso oculto bajo la barra | §2.3 |
| 6 | PC moderno con PC, IR, MAR, MDR, buses de datos/direcciones/control, arranque, interrupción de teclado frente a sondeo y las cuatro funciones del computador | Actividad 1 y Trabajo 3 (AMC2) | §6 |
| 7 | Memoria: modo de direccionamiento → dirección efectiva → dirección física, con los modos que ya admite el motor | Actividad 4 | §5 |
| 8 | Apple replanteado como **SoC moderno**: CISC frente a RISC con el mismo `ADD AX,[10]` + memoria unificada | Petición: «solo para visualizar»; Guía básica (CISC/RISC); investigación M5 del grupo | §7 |
| 9 | Cronoscopio fuera; su reutilización como «Evolución del procesador» queda como decisión | Petición: no convenció; Actividad 3 pide la evolución de procesadores | §7, T12 |
| 10 | Origen probable de X4122 identificado | La constante 255/256 de `packing.glsl` coincide con el aviso | §8 |
| 11 | Entregas por prioridad, tareas paralelizables y skills por tarea | Que lo visible llegue primero y T04a no espere a la interfaz | §10 |

### Decisiones que necesita el usuario

- **D1. Plantillas del ensamblador:** COM (`ORG 100h`) y EXE simplificada (`.MODEL SMALL/.DATA/.CODE`). Recomendado: ambas, porque los ejemplos del curso usan las dos.
- **D2. Periférico 8255 didáctico** (LEDs, interruptores y siete segmentos en el banco 8086): opcional T04b. Recomendado: sí, después de la Entrega B.
- **D3. Cronoscopio:** eliminarlo del recorrido (recomendado para el cierre) y, si se quiere, reutilizar su tema como «Evolución del procesador» (T12).
- **D4. Apple:** replantearlo como SoC moderno (recomendado) o retirarlo del menú principal.
- **D5. Libros:** la carpeta indicada contiene enunciados y trabajos del grupo, no libros completos. La bibliografía que cita el material es Stallings, *Organización y arquitectura de computadores* (7.ª ed.), Hennessy y Patterson, y Tanenbaum y Austin. Si los PDF están en otra ruta, T00 los incorpora.

## Restricciones globales

- Conservar la identidad de banco electrónico oscuro y los instrumentos propios. Simplificar su composición, no reemplazarlos por tarjetas genéricas.
- Mostrar Programa y Estado juntos en 8086. Eliminar Traza como pestaña/panel visible, conservando historial interno para retroceso, comparación y recuperación.
- Un único laboratorio con recorrido ordenado y vistas de profundidad, compartiendo ejercicio, datos y paso cuando el modelo sea compatible. Orden de capítulos: Banco 8086 → Memoria → La máquina / PC moderno → SoC (Apple). Atrio sigue como entrada; Cronoscopio deja de ser estación independiente.
- Escena, instrumentos, narración y selección muestran una proyección coherente del mismo evento. Consultar un componente o una vista de memoria del ejercicio actual no crea otra simulación ni reinicia su estado.
- El 8086 admite exactamente el subconjunto de §4.2. Lo demás produce un error en español con línea y la indicación «fuera del subconjunto de SILICIO»; nunca se ejecuta parcialmente.
- INT 21h e INT 20h son servicios simulados con efecto visible y explicación; no se ejecuta código de DOS ni de BIOS.
- Rótulos anclados a piezas concretas, con profundidad, prioridad y densidad limitada; nunca un bloque de etiquetas apiladas que se mueve como una lista superpuesta.
- Textos adaptables: dos líneas o nombres breves con significado completo recuperable; no truncar las etiquetas esenciales ni reducir tipografía para hacerlas caber.
- Navegar, mover paneles, cambiar calidad o desactivar animaciones no cambia resultados.
- Preservar sesiones v1/v2 y autoguardado; migraciones atómicas y explícitas. Importar v1/v2 sustituye únicamente 8086; importar v3 sustituye el conjunto completo validado.
- Operable sin WebGL, con teclado, movimiento reducido y desde 320 px CSS. Targets de 44×44 px; lectura general de 16 px. Datos esenciales accesibles sin hover y sin depender solo del color.
- Sin recursos remotos durante ejecución. Carga inicial objetivo ≤ 900 kB y budgets de angular.json respetados; detalles y guías cargados bajo demanda.
- Componentes nuevos con templateUrl/styleUrl. Modelos puros fuera de Angular y Three.js; geometría desde contratos de world/models/.
- Fases y costes didácticos identificados como tales; no presentar la maqueta como emulador completo ni como benchmark comercial.
- Arduino sigue fuera del proyecto (PRODUCT.md).
- La ejecución del plan no incluye publicación ni cambios de hosting.

## Foco de revisión

1. Resize/zoom con ventanas guardadas: paneles recuperables y pausa accesible. T01/T11.
2. Cambio de estación con worker pendiente o con INT 21h esperando teclado: no llegan resultados tardíos, no sigue un motor oculto y la tecla escrita después no se aplica a otro programa. T03/T04a/T10.
3. Fase intermedia: registros, memoria, Pantalla y escena no muestran instantes incompatibles. T04.
4. Sesión antigua o archivo inválido: error legible, sesión vigente intacta y UI sin congelación. T06/T10.
5. GPU lenta, context loss y zoom 200 %: mantener tareas, teclado y equivalente 2D. T08/T11.

## 1. Diagnóstico comprobado

Revisión estática en codex/scene-instruments-mobile, commit 62c2708, más el material del curso. Se inspeccionaron fuentes, documentación, dependencias instaladas y las capturas aportadas.

| Hallazgo | Evidencia | Consecuencia |
|---|---|---|
| Consola de 410 px; variantes de 340/460 px | src/app/app.scss | Reduce escena antes de distribuir instrumentos |
| Programa/Estado/Traza en un único tablist | app.html; LabSession.tab | No se ven código y resultado a la vez |
| Barra, HUD y caption con offsets independientes | world/scene-toolbar/; world/scene-hud/; app.scss | Competencia por el borde inferior |
| Caption a 68 px aparece antes de otra regla igualmente específica que vuelve a 12 px | app.scss | La cascada puede anular la separación en escenario ancho |
| freeRegion() recorta arriba/abajo y conserva casi toda la anchura | world/world-engine.ts | No sirve para ventanas laterales arbitrarias |
| Ya hay registros por bits, diferencias, ALU, listado y señales | instruments/cpu/; instruments/signal/ | Reutilizar instrumentos y mejorar jerarquía |
| Nueve misiones; README menciona ocho | content/missions.ts; README.md | Corregir documentación al cerrar |
| Subconjunto: MOV, ADD, SUB, CMP, INC, DEC, PUSH, POP, CALL, RET, JMP, JZ, JNZ, LOOP, HLT, NOP; solo registros de 16 bits y destino registro (salvo MOV) | simulation/cpu8086.ts, `encode`/`assemble` | Sin INT, MUL/DIV, lógicas, DB/DW, PROC o MACRO no ensambla ningún ejercicio del curso; el parecido con Emu8086 exige ampliar el motor |
| cpu8086.ts (499 líneas) contiene ensamblador, decodificador y ejecución; el worker restaura y ejecuta un paso por mensaje | simulation/cpu8086.ts; cpu8086.worker.ts | Separar antes de ampliar; la espera de teclado debe formar parte del estado para no bloquear el worker |
| step() ejecuta la instrucción y playPhases() la representa después | laboratory/lab-session.service.ts | Fase explicada no equivale a un ciclo de CPU |
| La máquina tiene ocho pasos, dos celdas y suma 7+5 | instruments/machine-experiment.ts | Requiere un motor nuevo para PC, archivos y periféricos |
| Apple transforma cuatro valores y espera finalización del búfer | laboratory/laboratory.facade.ts | Núcleo reutilizable; falta una tarea con decisiones y resultado claro |
| Memoria mezcla direcciones, placa, bytes y caché; DDR4 es galería | instruments/memory/ | Organizar por preguntas didácticas |
| Ya existen exposición, glosario, ramas y códec v1/v2 | content/tour.ts; console/session-panel/; simulation/session-codec.ts | Adaptar sin crear sistemas duplicados |
| projectCallouts publica todas las piezas visibles, proyecta el centro de su caja y no comprueba oclusión; telemetría hasta 10 Hz | world/world-engine.ts | Explica la columna de quince nombres de las capturas; falta prioridad, anclaje semántico y visibilidad física |
| layoutCallouts: caja fija de 168×26 px, ordena por altura en pantalla y desplaza hacia abajo cada choque | world/scene-hud/callout-layout.ts | Cada giro reordena toda la lista: por eso «giran todas juntas» |
| Sombras PCF activas; `UnpackDownscale = 255. / 256.` ≈ 0,996094 en el chunk de empaquetado de profundidad | world-engine.ts:267; node_modules/three/src/renderers/shaders/ShaderChunk/packing.glsl.js:11 | Coincide con el primer valor del aviso X4122 (§8) |

**No verificado en esta revisión:** navegador en vivo, reproducción de X4122, GPU efectiva, FPS actuales, suite o build. Las cifras históricas de QA no son resultados actuales; T00 obtiene la línea base.

### 1.1 Un recorrido integrado, con profundidad progresiva

La unidad de uso será **un ejercicio dentro de un laboratorio continuo**, con un objetivo, un conjunto de datos, un paso actual y un transporte. Las entradas de navegación son capítulos o vistas; no obligan a iniciar actividades aisladas para consultar cada componente.

- Ruta mental constante: **Preparar → Predecir → Ejecutar paso → Observar → Explicar/comparar**. Mostrar fase actual y siguiente acción; los detalles no necesarios quedan disponibles en su lugar de consulta.
- Prueba de la explicación de cada paso: una persona nueva puede responder dónde está, qué ocurrió, qué cambió, qué puede hacer y qué pasará después.
- En 8086, abrir memoria desde una instrucción lleva directamente a sus direcciones y bytes, conservando programa, cursor e historial. Regresar mantiene el mismo paso. El estudio de memoria separado sigue disponible como ejercicio explícito.
- En PC, abrir RAM, SSD, CPU, teclado o monitor es profundizar en el mismo ordenador y los mismos datos. Los instrumentos cambian de contexto; no aparece otro motor con valores de ejemplo ajenos. El acceso Memoria abre por defecto el contexto del ejercicio activo; empezar un ejercicio aislado requiere elegirlo expresamente.
- El SoC se presenta como capítulo de comparación de arquitectura dentro del laboratorio. Recibe la instrucción de la misión 01 del 8086 para comparar CISC/RISC y el mosaico del PC mediante «Comparar este resultado», sin volver a escribir datos.
- Mantener un contexto de lección compartido: propietario de simulación, objetivo, entrada, paso y vista consultada. El resultado/entrada transferido entre modelos es un artefacto con identificador, versión y procedencia; no se mezclan registros o direcciones de arquitecturas incompatibles.
- El 8086, el PC moderno y el SoC conservan motores académicos diferenciados. Cambiar de modelo se indica y pausa; abrir otra vista del mismo modelo conserva controlador y estado. Integrar la experiencia no implica conectar DDR4 a un 8086 ni simular que todos los chips son el mismo.
- Resumen fijo con dato de entrada, paso y resultado parcial. Dos instrumentos principales como máximo en el preset de estudio, más Pantalla cuando el programa usa E/S; inspector y explicaciones amplían el contexto a demanda.
- Mostrar qué se está consultando y una acción «Volver al paso». Un catálogo completo de piezas sigue disponible sin llenar la escena de nombres.

**Aceptación:** empezar un programa, consultar su memoria, localizar la pieza que interviene y regresar sin recargar datos, perder el paso ni alternar entre simulaciones desconectadas. El recorrido PC permite seguir un archivo desde SSD hasta monitor abriendo cada componente sobre el mismo estado.

### 1.2 Alineación con la asignatura

Fuentes: enunciados de AMC (Actividades 1–5, Práctica 1 de EMU8086, Proyecto final) y AMC2 (Trabajo 1, Trabajo 3 «Organización del CPU», investigaciones Apple M5 y Meteor Lake), además de la Guía básica de la CPU. Cada tema tiene un lugar en el laboratorio; no se crea una estación por tema.

| Tema del curso | Fuente | Dónde vive en SILICIO | Actividad comprobable |
|---|---|---|---|
| Arquitectura frente a organización; estructura y función; procesamiento, almacenamiento, transferencia y control | Actividad 1; Trabajo 1 AMC2 | PC moderno: cada evento lleva su función; el inspector distingue lo visible al programador de la organización | Seguir un archivo y clasificar cada paso |
| CPU: registros, UC, ALU, PC, IR, MAR, MDR, buses de datos, direcciones y control | Trabajo 3 AMC2 | PC moderno con esos nombres; 8086 con sus equivalentes (IP, cola, BIU/EU) | Identificar qué registro cambia en cada fase |
| Ciclo de instrucción: búsqueda, ejecución y verificación de interrupciones | Trabajo 3 AMC2; Guía básica | Grano «fase» en 8086 y PC (§4.3) | `ADD AX,[10]` explicado en siete pasos |
| Von Neumann frente a Harvard | Actividad 2; Trabajo 3 §4.11 | PC: programa y datos en la misma RAM; ficha comparativa en Ayuda | Señalar dónde está el programa |
| Microprocesador frente a microcontrolador | Actividad 1 | Glosario y ficha del atrio; Arduino excluido | — |
| Terminales del 8086 | Actividad 2 | 40 pines existentes; se iluminan los que intervienen en el paso | Qué pines usa una lectura de memoria |
| Conexión con memoria y periféricos; 8255; 8259 | Actividades 2–3 | Memoria; puertos del 8255 didáctico (T04b); interrupción del teclado en PC | Encender un LED con OUT; atender una tecla |
| Registros ix86, modelos de memoria, segmentación | Actividad 3 | Estado; Memoria «Direcciones 8086» | Alias 1000:0020 = 1001:0010 |
| Ensamblador: segmentos, modos de direccionamiento, control de flujo, formato de sentencia, palabras reservadas | Actividad 4 | Programa (campos de cada línea), Memoria (dirección efectiva) | Calcular EA de `[BX+SI+4]` |
| Ejercicios EMU8086: mensaje, suma de dos números leídos, contar dígitos, invertir número, suma de arreglo, multiplicación, promedio | Actividad 4; Práctica 1 | Misiones 10–17 con Pantalla (§4.4) | Salida esperada en Pantalla |
| Constantes, operadores, tipos de datos, E/S, interrupciones, procedimientos, macros | Actividad 5 | DB/DW/EQU, INT 21h, PROC/CALL/RET, MACRO | Expandir una macro y ver su listado |
| CISC frente a RISC; segmentación de cauce; núcleos P/E; caché L1–L3 | Guía básica; Proyecto final U IV; M5 y Meteor Lake | SoC: CISC/RISC; cola de 6 bytes del 8086 como solapamiento; caché en Memoria | Mismo resultado con una o dos instrucciones |
| Evolución de los procesadores | Actividad 3; Guía básica 2.2.3 | Opcional T12 | Cuadro comparativo con fuentes |

Una idea del material («el procesador no puede operar datos directamente en la RAM; necesita trasladarlos primero a sus registros») es cierta para una arquitectura RISC de carga/almacenamiento, no para `ADD AX,[10]` del 8086. La comparación del SoC (§7) lo muestra con datos, sin contradecir al estudiante en abstracto.

Ayuda incluye **Temas del curso**: índice generado desde `content/course-map.ts` que abre la vista, ejercicio o pieza correspondiente.

## 2. Escritorio de instrumentos: anclaje por defecto, flotación opcional

### 2.1 Elección

| Opción | Beneficio | Coste | Decisión |
|---|---|---|---|
| Panel lateral único | Simple | Sigue ocultando información y exige scroll largo | Sustituir |
| Todo flotante desde el inicio | Libertad | Obliga a ordenar, pierde ventanas y tapa contenido | No usar como estado inicial |
| Anclables en los cuatro bordes y flotantes | Máxima flexibilidad | Arriba compite con navegación y transporte; la izquierda corta la lectura de la escena; más decisiones sin beneficio didáctico | No |
| Anclados abajo o a la derecha, con opción de flotar | Datos simultáneos, posiciones previsibles y pocas decisiones | Requiere mínimos, foco y restauración | **Elegida** |

La escena ocupa el área entre cabecera y dock; instrumentos en una capa superior con zonas reservadas. La cámara encuadra el espacio visible. Abrir un panel no crea otro canvas ni reconstruye la escena.

Estado inicial del Banco 8086:

    8086 · Memoria · La máquina · SoC                          Paneles · Ayuda (?)
    [8086 · Instrucción]  [Reiniciar] [Atrás] [Paso] [Ejecutar/Pausa] [Velocidad] [Grano]
    ┌──────────────────────────────────────────────────┬──────────────┐
    │                    ESCENA 3D                     │ PANTALLA     │
    │          pieza activa y recorrido del dato       │ solo si el   │
    │                                                  │ programa usa │
    │                                                  │ E/S          │
    ├─────────────────────────┬────────────────────────┴──────────────┤
    │ PROGRAMA                │ ESTADO                                │
    │ editor · listado · IP   │ registros AH|AL · flags · cambios     │
    │ variables (plegable)    │ detalle contextual                    │
    └─────────────────────────┴───────────────────────────────────────┘
    Paso: qué se hace · origen → destino · qué cambió · qué sigue
    [Cámara] | [Inspección] | [Piezas] [Mapa] [Gráficos]

Son ventanas ancladas, no una consola lateral. La explicación pertenece a una región medida del conjunto inferior; no es texto suelto detrás del dock.

Presets:
- **Estudiar:** escena arriba, pareja de instrumentos abajo; predeterminado.
- **Explorar:** escena ampliada, instrumentos minimizados y recuperables.
- **Comparar:** prioridad a dos instrumentos, escena reducida recuperable. No abre Traza.

Cada panel: título, minimizar, ampliar/restaurar y menú «Mover a: abajo · derecha · ventana flotante». Menú y teclado ofrecen alternativa al arrastre.

### 2.2 Reglas de ventanas

- Menú **Paneles** con estado abierto/cerrado y **Restablecer distribución**.
- Abrir inicialmente dos instrumentos y explicación. Pantalla se abre sola la primera vez que el programa ensamblado contiene INT 21h u OUT; inspector, señales, pila, caché o ALU ampliada, a demanda.
- Resumen de registros/flags visible; detalle de bit/ALU no sustituye Programa.
- Una instancia por instrumento: al moverlo conserva fuente, selección, scroll y foco.
- Guardar distribución por experiencia y clase de tamaño, con versión y validación, separada del estado académico.
- Tras resize/zoom, ajustar rectángulos al área útil manteniendo cabeceras accesibles. Si no cabe, usar Estudiar con aviso.
- Apertura enfoca el panel; cierre devuelve foco al disparador. Ventanas no modales sin focus trap; Ayuda sí es diálogo.
- Arrastre/redimensión bloquea interacción con cámara debajo; raycast solo en canvas libre.
- Mínimo de panel anclado de escritorio: 320 px de ancho. Estudiar conserva al menos 320×220 px de escena; si no cabe se ofrece Comparar.
- Flotantes pueden solaparse por elección; nunca ocultan controles permanentes, avisos críticos o la cabecera activa. Restablecer resuelve acumulaciones.

### 2.3 Responsive por espacio disponible

| Tamaño CSS | Distribución |
|---|---|
| ≥1024 px ancho y ≥720 alto | Pareja horizontal inferior; escena arriba; anclaje derecha y flotación |
| 800–1023 ancho o 521–719 alto | Pareja horizontal si caben mínimos; más espacio a instrumentos; Comparar disponible |
| <800 ancho | Sin ventanas flotantes; instrumentos en flujo vertical; franja compacta de instrucción + registros afectados |
| ≤520 alto, teclado virtual o zoom con poco alto | Ejercicio primero; escena colapsable; evitar comprimir todo |

En móvil no caben dos paneles completos y 3D a la vez. Sí deben verse la instrucción y su efecto y poder recorrer ambos instrumentos en el mismo documento, sin pestañas excluyentes. Restaurar distribución de escritorio al recuperar tamaño.

Usar layout común, ResizeObserver, 100dvh y safe-area; no offsets independientes. Texto envolvente; scroll local para listados, nunca horizontal global.

**Dock inferior único.** Un solo componente con tres grupos separados por divisores: **Cámara** (girar, zoom, encuadrar, centrar), **Inspección** (despiece, aislar, rótulos, lámpara, mover/soltar) y **Vistas** (Piezas, Mapa, Gráficos). Piezas, Mapa y Gráficos usan el mismo botón, fondo, target y estado activo que el resto, con icono propio. Con ≥1280 px de ancho, Vistas muestra icono y palabra; por debajo, solo icono con nombre accesible y tooltip que cabe en viewport. Con <600 px, Cámara pasa a «Más» y Vistas sigue visible. Gráficos lee una única preferencia de calidad.

**Texto de la escena.** La indicación «Selecciona una pieza…» se reduce a una frase de 40 caracteres como máximo («Toca una pieza para inspeccionarla») y vive en la región de explicación, encima del dock; nunca debajo de la barra.

### 2.4 Rótulos integrados en la escena

Aplicar el mismo sistema a CPU, memoria, PC y SoC, conservando la opción de activar/desactivar rótulos.

1. **Anclajes por pieza:** definir punto y orientación de referencia en coordenadas locales de cada componente. Siguen su transformación, apertura y despiece. No usar como anclaje común el centro de grupos extensos como pistas, pasivos o encapsulado.
2. **Presentación híbrida:** un **marcador** pequeño (disco de 8–10 px con numeral opcional) vive en el 3D sobre la pieza y queda tapado por la geometría como cualquier objeto. El **nombre** es una placa HTML breve junto al marcador, nítida, accesible y capaz de usar dos líneas. Se muestra el nombre de la selección, del hover/foco, del paso activo y de hasta los vecinos prioritarios del límite; las demás piezas visibles muestran solo marcador. En modo **Anatomía** todas las piezas de una familia muestran su numeral y la leyenda numerada vive en Piezas/inspector. Una ficha HTML explica la pieza seleccionada.
3. **Profundidad y visibilidad:** la placa aparece solo si su ancla es visible: raycast desde la cámara al ancla, como máximo a 5 Hz, con histéresis de dos muestras. Ocultar rótulos de piezas detrás de cámara o fuera del encuadre. Una tapa cerrada no deja ver etiquetas internas salvo un modo explícito de corte/despiece. La pieza seleccionada conserva su información en el inspector, que ofrece enfocar/abrir si está oculta.
4. **Densidad limitada:** modo Contexto prioriza selección, paso activo y elementos próximos relevantes. Máximo inicial de seis nombres en escritorio amplio y tres en vista compacta; reducir más si no hay espacio. «Ver todas» abre el catálogo, no todas las etiquetas sobre el modelo.
5. **Colocación por candidatos:** probar ocho posiciones alrededor del ancla (derecha, izquierda, arriba, abajo y diagonales) a 12–48 px; tomar la primera libre según preferencia y conservar la del cuadro anterior mientras siga libre. Si ninguna cabe sin chocar con otra placa, un panel o el dock, retirar la placa y dejar el marcador. Nunca desplazar en cascada ni crear columnas. Línea guía solo cuando la placa queda a más de 24 px del ancla.
6. **Movimiento correcto:** la posición de cada placa se escribe por transform CSS en el mismo requestAnimationFrame del render, fuera de Angular, desde la matriz de su ancla. Visibilidad y colocación se recalculan al cambiar el conjunto visible o al terminar el gesto, no en cada fotograma. Cubrir órbita en ambos ejes, paneo, zoom, resize, apertura/despiece y piezas movidas, sin saltos por cambios marginales.
7. **Texto legible:** rótulos de una o dos líneas, altura medida y tamaño de lectura estable; retirar la caja fija de 26 px y la regla nowrap/ellipsis. Si el nombre completo es largo, usar un shortLabel editorial y conservar el nombre completo en inspector, catálogo y nombre accesible.
8. **Acceso y rendimiento:** etiquetas visuales no son la única forma de seleccionar; Piezas e inspector mantienen controles táctiles/teclado de 44 px. Los marcadores comparten geometría y material (una sola instancia por estación). Sin WebGL, la ficha y el catálogo siguen funcionando.

Ejemplos tomados de las capturas: «Oscilador de referencia» → «Oscilador»; «Banco de registros» → «Registros»; «Unidad de interfaz de bus» → «Interfaz de bus»; «Unidad aritmético-lógica» → «ALU» con nombre completo en la ficha; «Desacoplo y terminaciones» → «Desacoplo»; «Separadores y fijaciones» → «Separadores». No abreviar un nombre hasta volverlo ambiguo.

**Aceptación:** reproducir las dos vistas aportadas con giro horizontal/vertical, zoom y despiece; no hay pila central de nombres, solapamientos entre rótulos ni líneas que parezcan apuntar a otra pieza. Etiquetas ocultas siguen consultables en Piezas. Comprobar también los rectángulos de interacción, no solo la tinta visible.

### 2.5 Textos cortos y adaptables en toda la interfaz

Aplicar a navegación, pestañas, acciones, títulos, chips, rótulos y ayudas; no solo al 8086. Preferir dos filas cuando el texto lo requiera y ajustar altura real del componente. Usar etiquetas breves redactadas por contexto; iconos solos únicamente donde sean reconocibles y tengan nombre accesible.

No ocultar palabras esenciales bajo otra barra, cortar con ellipsis el nombre de una acción o reducir la fuente para encajarlo. Mantener juntas cifra y unidad/dirección; si una tabla necesita más espacio, usar representación compacta o scroll local. El contenido completo se consulta por toque/teclado, no exclusivamente hover. Probar también los nombres más largos a 320/360 px y con zoom 200 %.

## 3. Ayuda y transporte

### Ayuda superior derecha

Mover todo «Sesión, gráficos y atajos» a **Ayuda (?)**, disponible en todas las estaciones:
- Empezar/repetir guía.
- Temas del curso (§1.2) y glosario buscable.
- De Emu8086 a SILICIO: tabla de equivalencias de §4.1.
- Atajos.
- Sesión: importar/exportar y autoguardado.
- Preferencias: sonido, movimiento y acceso a los mismos ajustes gráficos.
- Alcance y límites del modelo, incluido el subconjunto 8086.

Errores, espera de entrada, edición sin ensamblar y límites alcanzados siguen junto al ejercicio, no escondidos en Ayuda.

### Una barra para la simulación activa

Centrada bajo navegación: objetivo («8086 · Instrucción», «PC · Transferencia»), Reiniciar, Atrás, Paso, Ejecutar/Pausar, velocidad didáctica y grano (instrucción/fase) cuando la experiencia lo admite. No ejecuta todas las estaciones simultáneamente.

- Cambiar de modelo/ejercicio pausa el anterior, conserva estado y no auto-reanuda al volver. Consultar otra pieza o vista del mismo ejercicio conserva el controlador; no lo reinicia ni altera su ejecución.
- Ocultar paneles no pausa/reinicia; abrir Ayuda pausa y cerrar no auto-reanuda.
- Un planificador espera resolución del paso antes del siguiente. Sin acumulación de peticiones en worker lento.
- Velocidad modifica presentación, no frecuencia simulada del chip.
- Esperar teclado/archivo pausa visiblemente («Esperando teclado») y lleva el foco a la entrada; completar entrada habilita continuar sin auto-play.
- Paso/Ejecutar con edición sin ensamblar ofrece «Ensamblar y continuar» y nunca ejecuta en silencio el código anterior.
- Reiniciar ejercicio restaura fixture y permite Deshacer mediante snapshot previo. Cambiar ejemplo con edición pendiente permite conservarla.
- Acciones de formulario como Escribir palabra o predecir Acierto/Fallo permanecen junto a sus datos.
- Caché con predicción pendiente impide Play con explicación. Galería sin ejercicio no ofrece un Play sin efecto.
- Atajos no se disparan desde editor, inputs, Pantalla, menús o diálogos.

## 4. Banco 8086: depurador didáctico con las prácticas del curso

Inspiración funcional solicitada: ver programa, registros, memoria, salida y avance por instrucción juntos, como en EMU8086. Conservar estética SILICIO. No se busca compatibilidad completa con EMU8086, DOS ni binarios externos: el alcance es el subconjunto de §4.2.

### 4.1 Ventanas equivalentes a EMU8086

| EMU8086 | SILICIO | Notas |
|---|---|---|
| Editor de código y «compile» | **Programa**: editor, Ensamblar, errores por línea | Textarea accesible con numeración; no hace falta un editor pesado |
| Original source code (línea amarilla) | Marcador de línea actual en Programa | El mismo marcador en el listado dirección/bytes/instrucción |
| Emulator: registros | **Estado**: AX…DX partidos en H/L, punteros, segmentos, IP, flags | Formatos hex/decimal/binario/ASCII; cambios antes → después |
| Memory | Memoria cercana al acceso (volcado con dirección física, hex y ASCII) | Abre la vista Memoria del mismo paso |
| Variables | **Variables** plegable dentro de Programa | Nombre, dirección, tipo, valor; seleccionar resalta bytes en 2D/3D |
| Stack | Pila contextual | Se abre con PUSH/POP/CALL/RET; muestra SS:SP y retorno |
| Emulator screen | **Pantalla** 80×25 con entrada de teclado | Se abre al primer INT 21h; opcionalmente espejada en un monitor del banco |
| Single step / Run / Step back | Transporte común (§3) | Breakpoints por línea |
| Virtual devices | Puertos del 8255 didáctico (T04b) | Opcional |

**Estado:** matriz compacta de registros con AH|AL visibles, flags explicados y cambios antes → después. Seleccionar registro despliega bits. Ediciones validadas pausan y generan una rama coherente.

**Detalle contextual:** ALU, pila, memoria cercana al acceso y señales se abren por necesidad o desde Paneles. La lectura resalta los mismos bytes en 2D/3D.

**Explicación:** «ADD AX,[10] toma 5 de memoria, lo suma a AX=7 y deja AX=12. La memoria no cambia». Se genera desde valores reales del evento. Explicar flags afectados; no encenderlos todos por decoración.

### 4.2 Subconjunto del curso

Las codificaciones mostradas en el listado son las del 8086 real. Registros de 8 y 16 bits salvo indicación; operandos registro, memoria (modos actuales de `[BX|BP][+SI|DI][+desp]`) e inmediato, con destino en memoria permitido.

- **Transferencia:** MOV (incluido MOV DS/ES, registro), XCHG, LEA, PUSH/POP de registro de 16 bits.
- **Aritméticas:** ADD, ADC, SUB, SBB, CMP, INC, DEC, NEG, MUL, IMUL, DIV, IDIV, CBW, CWD.
- **Lógicas y desplazamientos:** AND, OR, XOR, NOT, TEST, SHL/SAL, SHR, SAR, ROL, ROR (cuenta 1 o CL).
- **Control:** JMP, JE/JZ, JNE/JNZ, JC/JB, JNC/JAE, JA, JBE, JG, JGE, JL, JLE, JS, JNS, JO, JNO, LOOP, CALL/RET cercanos.
- **Sistema:** INT 21h (servicios 01h leer carácter con eco, 02h escribir carácter, 09h escribir cadena terminada en `$`, 0Ah entrada con búfer, 4Ch terminar), INT 20h, HLT, NOP. IN/OUT solo con T04b.
- **Directivas:** ORG 100h; DB, DW con listas, cadenas y DUP(n); EQU; OFFSET; BYTE PTR/WORD PTR; etiquetas de datos como variables con tipo; PROC/ENDP; END; MACRO/ENDM con parámetros y LOCAL; literales decimales, hex (`h` y `0x`), binarios (`b`) y de carácter (`'A'`); comentarios con `;`.
- **Plantilla EXE simplificada:** .MODEL SMALL, .STACK, .DATA, .CODE y `MOV AX,@DATA / MOV DS,AX`, sobre una disposición fija de segmentos documentada en Ayuda y visible en Estado. La plantilla COM conserva los valores actuales (CS:IP en 0100h, SP=FFFEh) para que las misiones 01–09 no cambien.
- **División:** divisor 0 o cociente que no cabe produce el fallo «error de división» (en el 8086 real, INT 0), detiene la ejecución y no modifica registros.
- **Fuera del subconjunto (error explícito):** instrucciones de cadena, prefijos de segmento, saltos y llamadas lejanos, INT distintos de 20h/21h, servicios 21h no listados, coprocesador e INCLUDE. `INCLUDE 'emu8086.inc'` sugiere la macro de ejemplo equivalente o INT 21h/09h.

**Pantalla y teclado.** Modelo puro de texto de 80×25 con cursor y cola de teclado dentro del snapshot. INT 21h/01h o 0Ah con la cola vacía devuelve `waiting-input` sin avanzar IP; el transporte muestra «Esperando teclado» y la entrada de Pantalla recibe el foco. Las teclas quedan registradas para Atrás y para repetir la ejecución de forma determinista. INT 21h se explica como servicio del sistema: «en un PC real, apila FLAGS, CS e IP y salta por el vector de 0000:0084h; aquí el servicio está simulado».

### 4.3 Ciclo de instrucción

Grano «fase» con los pasos que usa el curso, sobre el mismo evento:

| Paso del curso | En el 8086 de SILICIO | Pieza 3D |
|---|---|---|
| Búsqueda 1. Cargar la siguiente instrucción | La BIU forma CS:IP, calcula la dirección física y trae los bytes a la cola | Interfaz de bus, cola, pines AD |
| Búsqueda 2. Incrementar el secuenciador | IP avanza la longitud de la instrucción (1–6 bytes) | IP en Estado |
| Búsqueda 3. Interpretar | La EU decodifica opcode y ModR/M desde la cola | Control |
| Ejecución 4. Cargar operandos | Registro o memoria: modo → EA → dirección física | Registros, bus |
| Ejecución 5. Ejecutar | ALU o decisión de salto | ALU |
| Ejecución 6. Guardar resultado | Destino y flags afectados | Registros o memoria |
| Ejecución 7. Verificar interrupciones | IF y solicitudes pendientes; en el subconjunto, ninguna salvo la del 8255 de T04b | Control |

El 8086 no tiene registros llamados MAR y MDR: su papel lo cumplen el latch de dirección y el búfer de datos del bus. Se rotulan «equivalente a MAR/MDR» y se usan con nombre propio en el PC conceptual (§6). La cola de seis bytes permite que la BIU busque mientras la EU ejecuta; se muestra como solapamiento, precursor de la segmentación de cauce, sin prometer temporización.

### 4.4 Misiones

Conservar las nueve misiones y añadir las del curso. Cada misión tiene objetivo, predicción, entrada de ejemplo fija y comprobación automática sobre el estado final (registro, memoria o Pantalla), además de «qué observar».

| Misión | Enseña | Entrada de ejemplo | Comprobación |
|---|---|---|---|
| 10 Hola mundo | INT 21h/09h, cadena con `$` | — | Pantalla: «Hola mundo» |
| 11 Suma de dos dígitos leídos | 01h, `SUB AL,'0'`, ADD, 02h | Teclas 3 y 4 | Pantalla termina en «7» |
| 12 Suma de un arreglo | DW, LOOP, `[SI]` | 1…10 | AX = 55 |
| 13 Multiplicación | MUL y conversión a decimal | 12 × 11 | AX = 132; Pantalla «132» |
| 14 Contar dígitos | DIV entre 10 en bucle | 12345 | CX = 5 |
| 15 Invertir un número | DIV y MUL | 1234 | AX = 4321 |
| 16 Promedio de notas | Suma y DIV | 80, 90, 70 | AX = 80 |
| 17 Una macro | MACRO con parámetro | — | Listado con expansión; Pantalla con dos mensajes |

Agrupar por nivel en el selector: Fundamentos (01–03, 06, 08), Control de flujo (04, 05, 12, 14, 15), Entrada/salida (10, 11, 13, 16), Pila, procedimientos y macros (07, 09, 17).

### 4.5 Reglas de ejecución

1. Grano predeterminado: instrucción. Alternativa: fase explicada del mismo evento.
2. Motor atómico por instrucción; un presentador conserva before/after y produce una proyección visible única para instrumentos y escena. Etiqueta «explicando instrucción N».
3. Las fases de §4.3 son dependencias educativas, no microcódigo ni ciclos eléctricos exactos.
4. Un solo evento del motor por instrucción. Cambiar fase no reejecuta. Al abandonar explicación se muestra el estado confirmado; Atrás restaura la instrucción anterior.
5. Corregir la proyección actual que agrupa lecturas de datos en la fase genérica de escritura; diferenciar fetch de código y lectura de operandos.
6. Breakpoint detiene antes de instrucción. Continuar desde él avanza una vez antes de comprobarlo de nuevo.
7. Retirar Traza y enlaces que ordenan consultarla. Mantener historial privado y comparación antes/después opcional.
8. `waiting-input` no es un paso: no cuenta en el historial hasta que la instrucción se completa con la entrada.

**Aceptación:** cargar suma, predecir 12 y ejecutar viendo simultáneamente línea, AX, flags, memoria y explicación; ejecutar la misión 11 escribiendo 3 y 4 y ver «7» en Pantalla. El alumno identifica qué cambió sin abrir Ayuda.

## 5. Memoria: una pregunta por actividad

Conservar instrumentos de direcciones, bancos, bytes y caché. Ofrecer **Guardar y leer**, **Direcciones 8086** y **Caché**. DDR4 pasa a **Cómo se organiza la RAM**, con tarea de identificación/recorrido; nunca se conecta ficticiamente al 8086.

Pareja de paneles: **Operación** (dato/dirección) y **Resultado** (celdas/recorrido). Una franja de orientación indica dónde vive el dato (registros → caché → RAM → almacenamiento) y en qué nivel trabaja la actividad, sin cifras de latencia que no tengan fuente.

1. Guardar 1234h: 34h en dirección menor, 12h en siguiente y palabra reconstruida. Las variables DB/DW del programa aparecen con su nombre. Formatos alternativos con etiquetas, no todos a la vez.
2. Construir dirección por pasos: modo de direccionamiento → dirección efectiva (base + índice + desplazamiento) → segmento × 16 + EA. Ejemplo: `[BX+SI+4]` con BX=0010h y SI=0002h da EA=0016h; con DS=1000h, física 10016h. Después, 1000:0020 y 1001:0010 llevan a 10020h. Introducir segmento después de byte y dirección.
3. Comparar palabra par/impar: bancos y uno/dos ciclos del modelo. Señales detalladas bajo ampliación.
4. Caché: secuencia corta, predicción Acierto/Fallo, causa y línea afectada. Conservar comparación 4/8 líneas y costes actuales. Llamarla «secuencia de accesos», sin reintroducir Traza.
5. DDR4: ocho componentes y ancho conjunto. Datos de ejemplo propios; distinguir palabra del procesador, ancho de canal y longitud de ráfaga. No enseñar «64 bits = una ráfaga DDR4 completa».

El espacio lógico 8086 es de 1 MiB; la placa representa 128 KiB. Mostrar la ventana física de 128 KiB con su base. No convertir direcciones distintas en alias al enmascarar índices de la maqueta. El alias académico se calcula sobre dirección de 20 bits.

Origen visible: **Ejercicio**, aislado; **Sesión 8086**, con sus direcciones y edición que pausa explícitamente y conserva retroceso; o **PC actual**, como inspección de la RAM del mismo ordenador y paso. Seleccionar origen no copia valores silenciosamente entre modelos. DDR4 usa contexto PC o un ejercicio propio, nunca modifica el 8086.

**Aceptación:** ubicar ambos bytes de 1234h, calcular la dirección física de un operando `[BX+SI+desp]`, explicar un alias real y justificar un fallo de caché con los datos mostrados.

## 6. La máquina: PC moderno conceptual

Principal ampliación funcional. Sustituir la secuencia fija por un modelo con entradas, programas y resultados reproducibles, conservando diagramas propios como base.

### 6.1 Componentes

- CPU con los nombres del curso: **PC, IR, MAR, MDR**, registros R0–R3, flags Z/N/C/V, Unidad de Control y ALU.
- RAM con regiones de programa, entrada, trabajo y framebuffer. Programa y datos comparten RAM: se rotula como organización von Neumann.
- ROM de firmware con el cargador de arranque.
- SSD con archivos virtuales y programa prefabricado.
- Placa madre con conexiones/controladores, no como almacén universal.
- Teclado real del usuario y cola de entrada del modelo; controlador de interrupciones conceptual.
- Monitor con salida derivada del framebuffer.
- Controlador de memoria, USB, almacenamiento/PCIe y motor de pantalla como piezas explicativas.

Inicio: ordenador ensamblado con teclado/monitor; «Abrir equipo» revela interior. Diagrama 2D equivalente sin WebGL. Cada transferencia muestra **dirección, dato y señal de control** (lectura, escritura, solicitud de interrupción), que es el modelo de buses del curso; una nota aclara que un PC actual usa enlaces punto a punto (canal de memoria, PCIe, USB) y no un único bus compartido. Rotular simplificaciones funcionales.

Cada evento lleva una de las **cuatro funciones** del computador: procesamiento, almacenamiento, transferencia o control, con texto e icono además del color.

### 6.2 Motor acotado con datos reales

CPU conceptual de palabras de 32 bits. No emula x86-64 ni un SO completo ni ejecuta binarios del equipo del visitante.

Operaciones: INPUT, LOAD, STORE, ADD, SUB, COMPARE, BRANCH, STATUS, READ_FILE, WRITE_FILE, DISPLAY y HALT. Las de archivos/pantalla son **servicios simplificados**, no instrucciones de un ISA real. Producen eventos de solicitud, transferencia y resultado. El ciclo de cada operación sigue los siete pasos de §4.3 con PC → MAR → memoria → MDR → IR explícitos.

**Arranque:** «Encender» ejecuta tres eventos visibles: el PC apunta a la ROM, el cargador copia el programa elegido del SSD a la RAM y el PC salta a su inicio. ROM no cambia; RAM empieza vacía.

**Interrupción frente a sondeo:** el programa «Escribir y ver» tiene dos variantes. Por sondeo, un bucle con STATUS y BRANCH consulta el teclado; por interrupción, la CPU avanza una tarea de fondo (un contador visible) y, al pulsar una tecla, el controlador solicita interrupción, la CPU termina la instrucción en curso, guarda PC y flags, la rutina copia la tecla a la cola y se restaura el estado. Un contador muestra instrucciones de espera frente a trabajo útil. Responde a la pregunta del Trabajo 3: por qué las interrupciones importan.

Entradas:
- Texto escrito: máximo 256 caracteres por envío.
- .txt UTF-8 o .csv: máximo 64 KiB.
- CSV: hasta 1024 enteros decimales con signo de 32 bits, separados por coma/salto de línea, espacios permitidos. Rechazo de campos inválidos y UTF-8 inválido.
- Ejemplos locales disponibles sin red.

Importar copia al SSD virtual; READ_FILE lleva los datos a RAM. Separar visualmente ambas acciones. No subir archivos ni ejecutar su contenido.

| Programa inicial | Entrada | Resultado | Enseña |
|---|---|---|---|
| Escribir y ver | Hola en teclado | Hola en monitor | Cola, interrupción frente a sondeo, RAM, CPU, framebuffer y salida |
| Sumar archivo | CSV 1,2,3,4 | 10 y resultado.txt | SSD→RAM, procesamiento, guardar y mostrar |
| Editar y guardar | Hola editado a HOLA | Archivo recuperado con HOLA | RAM volátil frente a almacenamiento |
| Procesar una imagen | Mosaico 8×8, valores 0–255 | Imagen invertida, 255−valor | CPU/RAM/pantalla y comparación posterior con SoC |

El cargador coloca el programa incorporado en RAM antes de ejecutarlo. CPU obtiene operaciones de esa región; programa y datos se inspeccionan por separado. ADD usa 32 bits; el ejercicio de suma informa desbordamiento en vez de publicar una suma engañosa.

SSD persiste en la sesión. **Reiniciar ejercicio** restaura fixture; **Apagar/encender PC** borra RAM/registros/pantalla, conserva SSD y repite el arranque. Son acciones distintas.

### 6.3 Interacción

Pareja: **Programa y entradas** / **Componentes y salida**. Paquetes con valor, origen, destino y motivo; regiones con antes → después.

Recorrido de archivo: petición → controlador SSD → RAM → CPU → resultado en RAM → framebuffer → monitor. Si se muestra DMA, explicar que el controlador mueve el bloque sin hacer pasar cada byte por un registro de CPU.

Esperas explícitas de teclado, archivo o respuesta. Retroceso restaura SSD virtual, RAM, colas y monitor. Registrar entradas para repetir determinísticamente.

**Aceptación:** cambiar CSV cambia suma; guardar/apagar/encender recupera archivo; no usar datos antes de finalizar transferencia; en «Escribir y ver», la variante por interrupción avanza el contador de fondo y la de sondeo no. Las animaciones leen eventos, no secuencias decorativas.

## 7. Cronoscopio y SoC moderno

### Cronoscopio

Retirarlo de recorrido y atrio. Conservar utilidad dentro del ejercicio: Atrás y comparación A/B de resultados guardados. Mostrar diferencias relevantes de registros/bytes/salida sin cinta 3D ni tabla completa de eventos.

/time abre Banco 8086 con comparación. Importaciones antiguas siguen válidas. Sin dos estados, explicar cómo guardar uno; frame-N heredado no selecciona una pieza inexistente.

Reutilización opcional (D3, T12): «Evolución del procesador» como línea de tiempo del atrio, no como simulación: 8086 (1978) → generaciones de 32 bits → multinúcleo → chiplets (Ryzen 9 9950X) → tiles (Meteor Lake) → SoC (Apple M5), con año, bits, núcleos, caché y arquitectura. Solo datos con fuente y fecha; cada hito enlaza al capítulo donde se practica.

### SoC moderno (Apple M5 como caso)

El capítulo deja de ser solo visual. Dos actividades, en este orden:

**1. CISC frente a RISC con la misma tarea.** Recibe la misión 01 del 8086 (AX=7, palabra en [10] = 5).

| Caso | 8086 (CISC) | RISC de carga/almacenamiento didáctico |
|---|---|---|
| Sumar memoria a un registro | `ADD AX,[10]`: 1 instrucción, 4 bytes (03 06 0A 00), 1 lectura de datos | `LDR R1,[R0,#10]` + `ADD R2,R2,R1`: 2 instrucciones, 8 bytes, 1 lectura de datos |
| Sumar y guardar en memoria | `ADD [10],AX`: 1 instrucción, 4 bytes (01 06 0A 00), 1 lectura y 1 escritura | `LDR` + `ADD` + `STR`: 3 instrucciones, 12 bytes, 1 lectura y 1 escritura |

R0 contiene la base de datos (papel equivalente a DS) y se indica. Resultado idéntico (12). Mensaje: el tráfico de datos es el mismo; cambia cómo se expresa el trabajo (longitud variable frente a fija, operandos de memoria frente a carga/almacenamiento). El RISC es didáctico con sintaxis de estilo ARM; no se muestran codificaciones AArch64 salvo que se verifiquen.

**2. Memoria unificada con salida tangible.**
- Mosaico editable de 8×8 valores de gris, de 0 a 255; el mismo formato/editor del programa gráfico del PC. Se puede iniciar aquí o recibir su entrada/resultado mediante «Comparar este resultado», conservando el estado PC para regresar.
- Invertir: salida = 255 − entrada. Ver entrada/resultado y una celda inspeccionable.
- CPU prepara → GPU procesa → señal de fin → CPU presenta.
- Elegir compartida/separada; comparar resultado y copias explícitas.
- Separada: 64 bytes al dispositivo y 64 de vuelta. Compartida: sin esas copias explícitas, con dependencias y sincronización. No afirmar tráfico cero, coste cero ni aceleración comercial medida.
- Lectura prematura muestra espera, no un resultado válido.
- Extraer/reutilizar BufferExperiment como módulo puro fuera de laboratory.facade.ts.

Exploración secundaria: unidades del SoC (núcleos de rendimiento y eficiencia, GPU, Neural Engine, memoria unificada) con datos de la investigación M5 solo si conservan fuente y fecha de Apple; no simula el hardware real.

**Aceptación:** ambas configuraciones producen imagen idéntica; entrada cambia salida; copia y espera se comprenden; el alumno explica por qué `ADD AX,[10]` necesita dos instrucciones en RISC. Si no supera revisión didáctica, retirar del menú principal hasta corregirla (D4).

**Ampliaciones posteriores, fuera del cierre:** memoria virtual/fallo de página dentro de PC; localidad de caché dentro de Memoria; segmentación de cauce de cinco etapas. Priorizar profundidad antes de multiplicar estaciones.

## 8. Three.js: diagnóstico sin ocultar avisos

X4122 coincide con WARN_FLOAT_PRECISION_LOSS del compilador HLSL que usa ANGLE sobre Direct3D en Windows. El texto no demuestra por sí solo un material roto o un cálculo académico incorrecto.

**Origen probable:** el primer valor del aviso, 0,996094, es 255/256 = `UnpackDownscale`, definida en el chunk `packing` de three 0.186.1 y usada para desempaquetar profundidad RGBA; los otros sumandos (1 y restos de 10⁻¹⁷) encajan con el plegado de constantes de esas mismas expresiones. El proyecto usa `PCFShadowMap`, por lo que los programas con sombras incluyen ese código. Hipótesis a confirmar, no conclusión.

En Three.js 0.186.1 local, WebGLProgram.js emite ese Program Info Log como warning si el programa enlaza y el log no está vacío. onShaderError está en la rama de fallo de enlace, no captura todos los warnings. La línea 1 del chunk minificado no identifica el material; las líneas 209/210 son del HLSL traducido.

Procedimiento:
1. Reproducir en desarrollo/producción, registrando navegador, GPU, backend (ANGLE D3D11 u OpenGL), estación, calidad y operación.
2. Desactivar `renderer.shadowMap.enabled` y comparar: si el aviso desaparece y vuelve al reactivarlo, el origen queda acotado al empaquetado de sombras.
3. Capturar log, shader compilado y estado de enlace; traducción con WEBGL_debug_shaders cuando exista. Identificar material/variante.
4. Si el origen es el chunk de la biblioteca y el programa enlaza, documentar como aviso del compilador sin impacto, con captura y comparación de imagen. No editar node_modules ni cambiar de versión por esto; contrastar con el repositorio de three.js antes de cualquier cambio.
5. No silenciar console.warn globalmente ni bajar toda la precisión para esconderlo. `renderer.debug.checkShaderErrors = false` es una opción documentada de rendimiento en producción (evita consultas síncronas al enlazar), no un arreglo: solo se evalúa tras el paso 4, manteniéndolo activo en desarrollo y en una prueba de QA que compile todas las estaciones.
6. Precompilar los programas de cada estación con `renderer.compileAsync(scene, camera)` antes de mostrarla para evitar tirones al cambiar de capítulo; medir.

Revisar también:
- Coplanares, near/far, transparencias, etiquetas y selección.
- Cámara/callouts informados de ventanas y áreas libres.
- Un renderer/canvas; miniaturas limitadas y reutilizadas.
- Dispose de geometrías/texturas/targets; listeners/tweens al cambiar estación.
- Context loss/restoration, fallback 2D y reduced-motion.
- Más superficie de canvas aumenta píxeles: medir DPR/perfil; no añadir postprocesado automático.
- Animación académica detenida al pausar; ambiente opcional según perfil.

GT 730 figura en QA histórico; volver a identificar GPU. Medir frame/GPU p50/p95, llamadas, triángulos, programas, texturas y resolución. Headless/software sirve para funcionalidad, no acredita rendimiento de esa GPU.

## 9. Arquitectura y contratos

Separar escritorio, controladores y motores; adelgazar App/LabSession donde se cambien, sin reescritura indiscriminada.

| Archivo/unidad | Responsabilidad |
|---|---|
| shell/workspace/workspace-layout.ts | Zonas (abajo, derecha, flotante), mínimos, clamp y recuperación; puro |
| shell/workspace/workspace.service.ts | Paneles abiertos, distribución y persistencia |
| workspace.component.*; instrument-window.component.* | Composición, foco, anclaje/redimensión |
| shell/workspace/scene-viewport.service.ts | Rectángulos y región visible para visor |
| shell/help/help-dialog.component.* | Sesión, preferencias, temas del curso y equivalencias EMU8086 |
| shell/transport/simulation-transport.component.* | Barra según capacidades activas |
| shell/dock/scene-dock.component.* | Dock único Cámara · Inspección · Vistas |
| laboratory/controllers/ | Adaptadores y coordinador de ejecución |
| laboratory/lesson-context.service.ts; simulation/learning-artifact.ts | Lección, vista, propietario de ejecución y transferencia explícita de entradas/resultados compatibles |
| world/annotations/piece-anchors.ts; annotation-policy.ts; label-placement.ts; annotation-layer.ts | Anclajes locales, prioridad/oclusión, colocación por candidatos y marcadores |
| world/piece-definitions.ts; interaction-registry.ts | Nombre completo y shortLabel editorial; identidad común con catálogo/inspector |
| simulation/x86/assembler.ts, directives.ts, macros.ts, encoding.ts, decoder.ts, executor.ts | Separación de cpu8086.ts antes de ampliar; cpu8086.ts reexporta la API actual (`assemble`, `decode`, `Cpu8086`, tipos) |
| simulation/x86/dos-services.ts; text-screen.ts | INT 20h/21h y Pantalla 80×25, puros |
| simulation/x86/ppi8255.ts | Puertos didácticos (T04b) |
| content/course-programs.ts | Programas del curso como fixtures de misiones y pruebas |
| content/course-map.ts | Tema del curso → vista, ejercicio, pieza |
| instruments/cpu/screen/; instruments/cpu/variables/ | Pantalla y Variables |
| laboratory/learning-event.ts; step-presentation.ts | Evento de presentación y before/after |
| simulation/memory-lesson.ts; laboratory/memory-lesson.service.ts | Ejercicios aislados de memoria |
| simulation/pc/pc-model.ts, pc-programs.ts, pc-files.ts, pc-interrupts.ts | Motor puro, programas, entradas, arranque e interrupciones |
| laboratory/pc-session.service.ts | Coordinación y estado PC |
| instruments/machine/; world/models/machine-board.model.ts | Instrumentos y PC visible |
| simulation/risc/load-store-model.ts | Comparación CISC/RISC |
| simulation/buffer-experiment.ts | Memoria unificada pura con salida/copia |
| shell/guidance/; content/learning-paths.ts | Ayuda por acciones y éxito real |
| simulation/lab-session-codec.ts | Sobre v3; lector v1/v2 preservado |

Contratos fijados por T03 y T04a:

    ExperienceId = '8086' | 'memory' | 'machine' | 'soc' // vista/capítulo
    ControllerId = '8086' | 'memory-lesson' | 'machine' | 'soc' // motor propietario
    AdvanceUnit = 'instruction' | 'phase' | 'transfer' | 'access'
    PlaybackStatus = 'ready' | 'running' | 'paused' | 'waiting-input' | 'finished' | 'error'

    SimulationController:
      id: ControllerId
      state(): TransportState
      next(unit: AdvanceUnit): Promise<void>
      back(unit: AdvanceUnit): Promise<void>
      restart(): Promise<void>
      pause(): void

    TransportState:
      status: PlaybackStatus; units: readonly AdvanceUnit[]
      canNext: boolean; canBack: boolean; step: number; reason?: string

    SimulationCoordinator:
      activate(id: ControllerId): void
      changeView(view: ExperienceId, focusPiece?: string): void
      run(unit: AdvanceUnit): void
      pause(): void
      setSpeed(value: 'slow' | 'normal' | 'fast'): void

    LearningEvent:
      id: string; sessionId: string; revision: number
      experience: ExperienceId; controllerId: ControllerId
      kind: 'instruction' | 'transfer' | 'memory-access' | 'input' | 'output' | 'interrupt'
      role?: 'processing' | 'storage' | 'transfer' | 'control'
      source?: string; target?: string; address?: number
      bytes: readonly number[]; explanationKey: string
      changes: readonly { label: string; before: string; after: string }[]

    // 8086 (T04a)
    Snapshot += io: { screen: string; cursor: number; keyboard: readonly number[]; ports?: Readonly<Record<number, number>> }
    StepResult =
      | { kind: 'executed'; trace: Trace }
      | { kind: 'waiting-input'; service: 0x01 | 0x0a }
      | { kind: 'halted'; reason: 'hlt' | 'int20' | 'int21-4c' }
      | { kind: 'fault'; reason: 'division'; line: number }
    assemble(source: string): AssembledProgram
    AssembledProgram: instructions: Instruction[]; data: readonly DataSymbol[]; macroExpansions: readonly { line: number; expanded: string[] }[]
    DataSymbol: name: string; address: number; type: 'byte' | 'word'; length: number

Que `ExperienceId` pase de 'apple' a 'soc' es interno: rutas y sesiones antiguas con 'apple' se traducen en el lector (T10).

LessonContext mantiene lessonId, controllerId, view, currentStep y artifactId opcional. changeView no llama activate si solo se consulta otro componente del mismo ejercicio. Los artefactos de comparación tienen schemaVersion, tipo de datos, origen y payload validado; transfieren valores compatibles, nunca snapshots entre arquitecturas.

LearningEvent es presentación, no snapshot completo. Cada motor mantiene tipos propios de estado y before/after. IDs source/target coinciden con piezas y equivalente 2D.

WorkspaceService: open(panelId), close(panelId), dock(panelId, 'bottom' | 'right'), float(panelId), reset(experienceId), layout(). Validar IDs contra registro de paneles por experiencia.

WorldEngine recibe ViewportLayout: freeRect y occlusions en coordenadas CSS locales al canvas. Angular mide DOM; motor deja de buscar .bar/.dock. Callouts comparten contrato. Cambios de panel no roban continuamente la cámara durante manipulación.

CDK aporta primitivas; docking, redimensión, teclado y persistencia son responsabilidad del escritorio limitado de SILICIO. No crear un gestor genérico de ventanas anidadas o del sistema. Driver.js aporta resaltado, no decide aprendizaje.

## 10. Tareas y puertas de implementación

Cada tarea entrega comportamiento comprobable. Tests nuevos para lógica/contratos; no para repetir estilos. El layout se valida en navegador. Actualizar casillas solo con evidencia.

### Entregas

| Entrega | Tareas | Resultado para quien lo prueba |
|---|---|---|
| A. Lo que más se notó | T00, T01, T02, T02b | Escena amplia, Programa y Estado juntos, Ayuda arriba, dock único, rótulos integrados, orden de capítulos |
| B. 8086 como EMU8086 | T03, T04a, T04, T04b (opcional) | Transporte único, prácticas del curso con Pantalla y ciclo por fases |
| C. Memoria y PC moderno | T05, T06, T07 | Memoria por preguntas; PC con archivos, teclado e interrupciones |
| D. SoC, guías y cierre | T08, T09, T10, T11, T12 (opcional) | SoC replanteado, guías, migración y QA integrada |

T04a solo toca simulation/ y la fachada del worker: puede empezar en paralelo con T01–T02b. T06 puede empezar en paralelo con T04 una vez fijado T03.

### Skills por tarea

| Tareas | Skills |
|---|---|
| T00, T11 | threejs-debugging, threejs-performance, threejs-visual-validation, verification-before-completion |
| T01, T02, T04 (instrumentos), T05 | dannaway-practical-ui, impeccable |
| T02b | threejs-interaction, threejs-html, dannaway-practical-ui |
| T03, T06 | codebase-design, domain-modeling, tdd |
| T04a, T08 | tdd |
| T07 | threejs-scene, threejs-materials, threejs-performance |
| T09 | dannaway-practical-ui (copia y pasos) |
| Todas | executing-plans o subagent-driven-development; systematic-debugging ante fallos |

### T00 — Línea base

**Crear:** docs/qa/redisenio-2026-10/BASELINE.md y capturas. **Depende:** nada.

- [ ] Identificar versiones, GPU, navegador y Git, preservando cambios ajenos.
- [ ] Ejecutar suite/build actuales una vez y registrar resultados, sin heredar recuentos del README.
- [ ] Reproducir colisiones a 1920×1080, 1366×768, 1280×720, 1024×768 y 390×844 con paneles abiertos y textos largos.
- [ ] Investigar X4122 mediante §8, incluido el contraste con sombras desactivadas.
- [ ] Pasar los programas de las misiones 10–17 por el ensamblador actual y registrar cada error (evidencia del alcance de T04a).
- [ ] Si el usuario indica la ruta de los libros (D5), anotar capítulos relevantes para terminología.
- [ ] Medir estaciones con mismo viewport/perfil y guardar entradas reproducibles.

**Puerta:** defectos y métricas trazables; no se declaran arreglos.

### T01 — Escritorio adaptable

**Crear:** shell/workspace/ de §9; workspace-layout.spec.ts y workspace.component.spec.ts.
**Modificar:** app.ts/.html/.scss, shell-base.scss, world/scene-inputs.ts, atrium-scene.component.ts, world-engine.ts, scene-hud.component.ts.
**Produce:** workspace y ViewportLayout para las fases siguientes.

- [ ] Tests: resize 1920→1024→390 ajusta ventanas y recupera luego escritorio; layout corrupto vuelve al preset sin perder sesión; cerrar/reabrir conserva edición; mover un panel a derecha y volver abajo conserva scroll y selección.
- [ ] Implementar pareja Programa/Estado con instrumentos actuales, presets, anclaje abajo/derecha y flotación.
- [ ] Incorporar CDK compatible con Angular instalado; fijar versión, revisar licencia y comprobar budget.
- [ ] Añadir redimensión/anclaje por menú y teclado, además de arrastre.
- [ ] Reemplazar freeRegion basado en selectores DOM por contrato de oclusiones.
- [ ] Validar pareja a 1366×768 y franja instrucción/resultado a 390×844; selección 3D/piezas/teclado coherente.

**Puerta:** ambos instrumentos visibles en escritorio; ninguna ventana perdida o control esencial oculto.

### T02 — Ayuda, dock común y orden de capítulos

**Crear:** shell/help/help-dialog.component.ts/.html/.scss; shell/dock/scene-dock.component.ts/.html/.scss; content/course-map.ts.
**Modificar:** console/session-panel/, shell/experience-nav/, content/experiences.ts, world/scene-toolbar/, world/scene-hud/, app.html/.scss, instruments/cpu/program/.
**Consume:** T01.

- [ ] Trasladar todas las funciones de SessionPanel a Ayuda superior derecha; añadir Temas del curso y Equivalencias EMU8086.
- [ ] Dock único con grupos Cámara · Inspección · Vistas (§2.3), eliminando offsets/caption conflictivos; indicación de escena en la región de explicación.
- [ ] Orden de navegación 8086 · Memoria · La máquina · SoC; Cronoscopio fuera del menú (la ruta /time sigue funcionando hasta T10).
- [ ] Retirar Traza visible del 8086 y textos que remiten a ella, manteniendo historial.
- [ ] Comprobar import/export, Esc y retorno de foco desde Ayuda.
- [ ] Revisar targets 44 px, tooltips en viewport, textos largos y scroll local a 1366×768, 1280×720, 1024×768 y 390×844.

**Puerta:** acordeón anterior ausente; opciones intactas; dock sin colisiones; ningún texto bajo la barra.

### T02b — Rótulos 3D y lenguaje adaptable

**Crear:** world/annotations/piece-anchors.ts, annotation-policy.ts, label-placement.ts, annotation-layer.ts y pruebas de anclajes/visibilidad/colocación.
**Modificar:** world/world-engine.ts, scene-inputs.ts, interaction-registry.ts, piece-definitions.ts; world/scene-hud/callout-layout.ts/.spec.ts (sustituido por label-placement) y scene-hud.component.ts/.html/.scss; constructores de modelos para sus puntos de anclaje.
**Consume:** ViewportLayout de T01 y dock de T02. **Especificación:** §2.4–2.5.

- [ ] Probar anclaje independiente por pieza al orbitar vertical/horizontalmente, panear, hacer zoom y abrir/desmontar; cubrir resize sin cambio de azimut.
- [ ] Tests de label-placement: con un candidato libre conserva la posición anterior tras un giro de 2°; con todos ocupados retira la placa y no crea columna; nunca dos placas se intersecan; ninguna placa entra en una oclusión de panel o dock.
- [ ] Implementar nombres breves/fullName, anclajes locales, marcadores instanciados y filtro por contexto/oclusión con máximo 6/3 nombres, reduciendo según espacio.
- [ ] Tests: más candidatos que espacio, piezas tapadas por la tapa, detrás de cámara, nombres largos y controles táctiles vecinos.
- [ ] Capturas de las dos vistas del usuario y vídeo corto de órbita/despiece; revisar a 1366×768, 800×600, 390×844 y 320×568, con movimiento reducido.
- [ ] Auditar textos de todos los instrumentos: ajustar a dos filas o redactar variante corta sin pérdida de significado.

**Puerta:** ninguna columna de etiquetas como en las capturas; relación inequívoca pieza/rótulo, texto legible y catálogo completo recuperable. Rendimiento medido, sin rebuild del modelo por movimiento de cámara.

### T03 — Transporte y reloj único

**Crear:** laboratory/controllers/simulation-controller.ts, simulation-coordinator.ts, adaptadores 8086/memory/machine/soc y pruebas; shell/transport/simulation-transport.component.*.
**Modificar:** instruments/cpu/transport/, laboratory/lab-session.service.ts, machine-instrument.component.ts, apple-panel.component.*, cache-panel.component.*.
**Produce:** interfaces §9.

- [ ] Tests: cambio de modelo con next pendiente descarta respuesta vieja; doble Play no crea dos relojes; siguiente paso espera al worker. Cambiar solo de vista mantiene propietario, datos y paso.
- [ ] Crear laboratory/lesson-context.service.ts y simulation/learning-artifact.ts con pruebas de continuidad y transferencia explícita validada, conforme a §1.1.
- [ ] Adaptar primero modelos actuales sin cambiar resultados académicos.
- [ ] Pausa al cambiar modelo/ejercicio, abrir ayuda y ocultar pestaña; no auto-reanudar. Consultar vistas del mismo ejercicio no activa otro controlador.
- [ ] Estado `waiting-input` con motivo visible; esperas e indisponibilidad explícitas; retirar transportes duplicados.
- [ ] Probar atajos durante edición, ocultar panel sin reiniciar, reinicio recuperable.

**Puerta:** una barra controla cada experiencia sin actividad oculta.

### T04a — Ensamblador y E/S del curso (motor 8086)

**Crear:** simulation/x86/ de §9 con sus .spec.ts; content/course-programs.ts.
**Modificar:** simulation/cpu8086.ts (reexporta), cpu8086.worker.ts (StepResult), simulation/session-codec.ts (io por defecto), laboratory/laboratory.facade.ts (waiting-input).
**Consume:** nada de la interfaz. **Produce:** `assemble`, `AssembledProgram`, `StepResult`, `Snapshot.io` de §9.

- [x] Separar cpu8086.ts en los módulos de §9 sin cambiar comportamiento; la suite actual (cpu8086, operation, stack, missions, session-codec) pasa antes de ampliar.
- [x] Tests de codificación: `MOV AH,09h` → B4 09; `INT 21h` → CD 21; `MUL BL` → F6 E3; `DIV CX` → F7 F1; `ADD [10],AX` → 01 06 0A 00; `MOV DX,OFFSET msg` → BA + dirección de msg; Jcc fuera de −128…127 da error.
- [x] Test de ida y vuelta: para cada instrucción admitida, assemble → bytes → decode devuelve el mismo mnemónico y operandos.
- [x] Tests de semántica: MUL/DIV de 8 y 16 bits (AX y DX:AX), IMUL/IDIV con signo, AND/OR/XOR dejan CF=OF=0, SHL/SHR con CL, ADC/SBB usan CF, DIV entre 0 → `fault` 'division' sin modificar estado.
- [x] Directivas y macros: DB/DW/DUP/EQU/OFFSET/PTR, cadenas con `$`, ORG 100h, plantilla EXE, PROC/ENDP, MACRO con parámetros y LOCAL (dos expansiones no duplican etiquetas).
- [x] INT 21h 01h/02h/09h/0Ah/4Ch e INT 20h sobre text-screen; cola vacía → `waiting-input` sin avanzar IP; 4Ch y 20h → `halted`.
- [x] Tests con content/course-programs.ts: las ocho comprobaciones de §4.4.
- [x] Mensajes «fuera del subconjunto» con línea; `INCLUDE 'emu8086.inc'` sugiere alternativa.
- [x] Sesiones v1/v2 restauran con io vacío; misiones 01–09 conservan resultados y direcciones.

**Puerta:** los ocho programas del curso producen la salida esperada sin interfaz; las nueve misiones previas sin cambios.

### T04 — 8086 comprensible y simultáneo

**Crear:** laboratory/learning-event.ts, step-presentation.ts/.spec.ts; instruments/cpu/screen/ y variables/; detalles contextuales; tests de breakpoints.
**Modificar:** instruments/cpu/program/, register/, alu/, signal/; laboratory.facade.ts, lab-session.service.ts, station-activity.ts, content/missions.ts; world/models/cpu-activity.ts (pines y cola por fase).
**Consume:** T01/T03/T04a.

- [ ] Test: todas las fases de una instrucción generan exactamente un evento CPU y el mismo resultado que Paso instrucción.
- [ ] Tests: las siete fases de §4.3 en orden; before/after coherentes; lectura antes de operación; salto sin escritura inventada; CALL/RET recupera SP; `waiting-input` no entra en el historial.
- [ ] Implementar Programa (editor, Ensamblar, listado/IP, breakpoints, error por línea, variables) y Estado con AH|AL.
- [ ] Implementar Pantalla con entrada, foco al esperar teclado y espejo opcional en un monitor del banco.
- [ ] Probar parar antes de breakpoint, continuar una vez y HLT/4Ch sin pasos adicionales.
- [ ] Unificar proyección de datos para instrumentos y 3D.
- [ ] Misiones 10–17 con selector por niveles, predicción, comprobación automática y explicación; completar recorridos prioritarios 01, 02, 06, 05, 09, 10 y 11.

**Puerta:** suma, CALL/RET y misión 11 explicables con Programa, Estado y Pantalla juntos; ninguna promesa de temporización eléctrica.

### T04b — Periférico 8255 didáctico (opcional, D2)

**Crear:** simulation/x86/ppi8255.ts/.spec.ts; instruments/cpu/ports/; piezas de LEDs, interruptores y display de siete segmentos en world/models/.
**Modificar:** simulation/x86/encoding.ts, decoder.ts, executor.ts (IN/OUT); content/missions.ts.
**Consume:** T04.

- [ ] Fijar puertos didácticos documentados en Ayuda: A = LEDs, B = interruptores, C = siete segmentos, registro de control.
- [ ] Tests: `OUT` al puerto A enciende los LEDs del patrón; `IN` desde B lee el estado de los interruptores de la escena o del panel 2D; puerto no configurado da error explicado.
- [ ] Misión 18: encender LEDs según interruptores.

**Puerta:** el mismo efecto en 2D y 3D; sin WebGL se opera desde el panel.

### T05 — Memoria por actividades

**Crear:** simulation/memory-lesson.ts/.spec.ts; laboratory/memory-lesson.service.ts; selector/operación en instruments/memory/.
**Modificar:** memory-panel, cache-panel, dimm-panel, simulation/cache-lesson.ts, station-activity.ts, world/models/memory-activity.ts.
**Consume:** T01/T03, instrumentos existentes.

- [ ] Tests: 1234h ↔ [34h,12h]; `[BX+SI+4]` con BX=0010h, SI=0002h → EA 0016h → física 10016h con DS=1000h; alias 1000:0020 = 1001:0010; ventanas distintas para 10020h y 30020h.
- [ ] Implementar §5, recorrido operación/resultado, franja de orientación y origen de datos visible. Memoria abierta desde 8086/PC mantiene sus direcciones y paso; volver no reinicia.
- [ ] Test: Ejercicio no modifica 8086; Sesión lo pausa y conserva retroceso.
- [ ] Conservar tests y resultados actuales de caché 4/8 líneas; explicación por acceso.
- [ ] DDR4 usa datos propios; verificar distinción ancho/ráfaga y modelo físico.

**Puerta:** alumno comprende dirección y bytes sin requisito previo de segmentación.

### T06 — Motor PC, entradas, archivos e interrupciones

**Crear:** simulation/pc/pc-model.ts, pc-programs.ts, pc-files.ts, pc-interrupts.ts y respectivos .spec.ts; laboratory/pc-session.service.ts/.spec.ts.
**Sustituir como motor activo:** instruments/machine-experiment.ts; conservar 7+5 como fixture si aporta valor.
**Consume:** T03. **Produce:** snapshots/eventos para T07.

- [ ] Fijar mapa RAM, ROM, registros PC/IR/MAR/MDR y semántica de operaciones de §6; implementar los cuatro fixtures, incluyendo el mosaico compartido con el SoC.
- [ ] Tests: Hola→monitor; CSV 1,2,3,4→10→resultado.txt; editar/guardar/apagar/recuperar HOLA; inversión de los 64 valores del mosaico.
- [ ] Tests de ciclo: en cada operación, MAR toma el valor de PC antes de la lectura, IR recibe el contenido de MDR y PC avanza; cada evento tiene `role`.
- [ ] Tests de arranque: tras encender, RAM contiene el programa copiado del SSD, PC apunta a su inicio y ROM no cambia.
- [ ] Tests de interrupción: con tres teclas, la variante por interrupción avanza el contador de fondo y la de sondeo no; ambas muestran «Hola» igual; la interrupción se atiende al final de la instrucción en curso y restaura PC y flags.
- [ ] Tests: límite/exceso de archivo, UTF-8 inválido, CSV inválido, overflow, espera de teclado.
- [ ] Implementar entrada, importación SSD, cargador RAM y servicios visibles.
- [ ] Probar retroceso RAM/SSD/colas/pantalla y repetición idéntica del registro de entradas.
- [ ] Probar distinción entre reset de fixture y apagado.

**Puerta:** datos cambian resultados; ejecución completa sin Three.js.

### T07 — PC visible

**Crear/adaptar:** instrumentos de programa/entradas y componentes/salida en instruments/machine/; world/models/pc-activity.ts y piezas de teclado, monitor, SSD y ROM.
**Modificar:** machine-board.model.ts, piece-definitions.ts, laboratory/piece-descriptions.ts, station-builder.ts, laboratory/controllers/machine-controller.ts.
**Consume:** T06.

- [ ] Equipo cerrado/abierto con todos los componentes pedidos.
- [ ] Selección bidireccional entre pieza/instrumento/paso.
- [ ] Paquetes con origen/destino/valor desde eventos; líneas de dirección, dato y control visibles por transferencia; función del evento con icono y texto.
- [ ] Monitor desde salida del modelo; actualizar textura solo al cambiar contenido.
- [ ] Test: equivalencia 2D/3D y resultado con animación desactivada.
- [ ] Verificar geometría, cámara, recursos y coste frente a T00.

**Puerta:** seguir teclado/archivo hasta salida, distinguir RAM de SSD y señalar dónde se atiende la interrupción.

### T08 — SoC con comparación y resultado

**Crear:** simulation/risc/load-store-model.ts/.spec.ts; simulation/buffer-experiment.ts/.spec.ts; entrada/salida del mosaico.
**Modificar:** laboratory.facade.ts y lab-session.service.ts para extraer BufferExperiment; instruments/apple/; world/models/apple-activity.ts; laboratory/controllers/soc-controller.ts.
**Consume:** T03, T04a (bytes de `ADD AX,[10]` y `ADD [10],AX`).

- [ ] Tests CISC/RISC: ambos dan AX/R2 = 12 con 7 y 5; recuentos de §7 (1 frente a 2 instrucciones y 4 frente a 8 bytes; 1 frente a 3 y 4 frente a 12 al guardar); mismos accesos de datos.
- [ ] Tests mosaico: 0→255, 255→0, 128→127 y 64 valores; salida idéntica, 0/128 bytes de copias explícitas y espera antes de completar.
- [ ] Edición, fases, salida visible y comparación. Probar transferencia del mosaico PC→SoC y vuelta al PC conservando paso, datos y resultado; un artefacto de otro tipo se rechaza sin alterar la sesión.
- [ ] Mantener unidades/fuentes como exploración secundaria.
- [ ] Evaluar comprensión antes de dar por completa esta estación.

**Puerta:** entrada controlable, comparación CISC/RISC y sincronización explicadas; si falla, no se presenta como ejercicio terminado.

### T09 — Guías por acciones

**Crear:** shell/guidance/learning-guide.service.ts/.spec.ts, content/learning-paths.ts y anclajes DOM estables.
**Modificar:** shell/tour/, content/tour.ts, console/station-mission/, shared/term.directive.ts, Ayuda.
**Consume:** T04/T05/T07/T08.

- [ ] Integrar Driver.js diferido con versión/licencia fijadas; recorrido inicial de hasta cinco pasos por experiencia.
- [ ] Recorrido «De EMU8086 a SILICIO»: escribir, ensamblar, paso, registros, Pantalla.
- [ ] Abrir panel antes de resaltar y esperar render; restaurar foco/limpiar al navegar.
- [ ] Lecciones avanzan por condiciones del estado, no por contar clics.
- [ ] Tests: cancelar/repetir, ruta nueva, anclaje ausente, reduced-motion.
- [ ] Equivalente textual, glosario y explicación fuera del tour; no superponer guía y modo exposición.

**Puerta:** primer ejercicio resoluble con guía y también sin ella; salida disponible siempre.

### T10 — Navegación, comparación y migración

**Crear:** simulation/lab-session-codec.ts/.spec.ts; panel compacto de comparación.
**Modificar:** app.routes.ts, content/experiences.ts, deeplink.ts/.spec.ts, tour.ts, station-missions.ts, console/atrium-portals/, world/scene-inputs.ts y tests de restore/autosave.
**Consume:** estados estabilizados de experiencias.

- [ ] Navegar a una vista de consulta conserva LessonContext; iniciar otro ejercicio es una acción explícita.
- [ ] Retirar Cronoscopio de carga normal; conservar parser de rutas/IDs antiguos; /apple y 'apple' se traducen a SoC.
- [ ] /time → /8086 con comparación; tab=trace → pareja Programa/Estado; frame-N sin selección inexistente.
- [ ] Comparación de dos snapshots nombrados sin vista de traza completa.
- [ ] Sobre v3: CPU compatible con v1/v2 (con io), lección memoria, PC, SoC, guía, LessonContext y artefactos de comparación. Validar sus referencias; layout en almacenamiento separado versionado.
- [ ] Importación atómica, tamaño acotado y error sin cambiar sesión vigente. v1/v2 reemplaza solo 8086 (programa, historial y ramas), conservando ejercicios independientes de Memoria, SSD/estado PC y SoC; recalcular las vistas vinculadas a Sesión 8086. v3 reemplaza el conjunto completo y rechaza payload incompleto. Importar pausa controladores y descarta respuestas pendientes, sin auto-reanudar.
- [ ] Tests: v1/v2 conservan SSD y otras experiencias; v3 reemplaza todo de forma atómica; ramas, corrupción, versión desconocida, recarga y cuota agotada.

**Puerta:** sesiones antiguas conservan programa/ramas; rutas resueltas.

### T11 — Gráficos y aceptación integrada

**Modificar según evidencia:** world-engine.ts, effects/, shaders propios, modelos/cámara que fallen y tests.
**Crear:** playwright.config.ts, e2e/workspace.spec.ts, e2e/learning-paths.spec.ts, e2e/course-programs.spec.ts, e2e/graphics-lifecycle.spec.ts; docs/qa/redisenio-2026-10/RESULTADOS.md.
**Consume:** T00–T10. Adelantar arreglos gráficos bloqueantes cuando impidan otra tarea.

- [ ] Corregir o documentar excepción acotada de X4122 siguiendo §8, con shader/capturas; medir compileAsync al cambiar de capítulo.
- [ ] Añadir Playwright como QA con versión fijada; scripts test:e2e y test:e2e:ui; fixtures sin red/semillas fijas.
- [ ] Matriz: 1920×1080, 1440×900, 1366×768, 1280×720, 1024×768, 1024×600, 800×600, 768×1024, 390×844, 360×640, 320×568, 844×390.
- [ ] Programas del curso de punta a punta: escribir la misión 10, ensamblar, ejecutar y leer «Hola mundo» en Pantalla; misión 11 con teclado real.
- [ ] Rótulos: órbita horizontal/vertical, paneo, zoom, despiece, oclusión y alta densidad; textos completos o variantes breves en una/dos líneas sin choques ni saltos colectivos.
- [ ] Recorrido integrado: programa→memoria→pieza→programa y PC→RAM/SSD/monitor→comparación SoC, conservando datos/paso y dejando claro cuándo cambia el motor.
- [ ] Estados: paneles y menús abiertos, texto largo, zoom 200 %, ayuda, error, espera de entrada. Medir cajas: sin intersecciones no intencionadas en controles/contenido esencial.
- [ ] Teclado y lector de pantalla en recorridos clave; contraste ≥4,5:1 de texto normal; señales sin depender del color.
- [ ] Diez recorridos tras calentamiento con recursos estabilizados, sin crecimiento progresivo de texturas/programas/buffers/listeners.
- [ ] Context loss/restoration, sin WebGL, reduced-motion, worker lento y pestaña oculta.
- [ ] Repetir métricas T00 con mismo perfil/viewport: objetivo p95 ≤110 % de línea base. Para PC nuevo, objetivo p95 ≤50 ms en Ligero sobre GPU de referencia, ajustando LOD/DPR. Registrar incumplimientos, no esconderlos con medias.
- [ ] Build, offline y documentación actualizada.
- [ ] Prueba con cinco estudiantes: al menos cuatro completan suma 8086, misión 11, palabra en memoria y recorrido de archivo sin explicación oral adicional y describen qué cambió. Evidencia pendiente de obtener, no garantía.

**Puerta final:** modelos correctos, matriz funcional/visual, rendimiento y evaluación didáctica registrados.

### T12 — Evolución del procesador (opcional, D3)

**Crear:** content/processor-timeline.ts/.spec.ts (datos con fuente y fecha); vista en console/atrium-portals/.
**Consume:** T10.

- [ ] Test: cada hito tiene fuente y fecha; ninguno sin enlace a capítulo o glosario.
- [ ] Línea de tiempo accesible sin WebGL; en el atrio, como mueble o pared del banco reutilizando el modelo del cronoscopio si encaja.

**Puerta:** solo datos verificados; no compite con el recorrido principal.

### Comandos y orden

Verificación existente: npm test -- --watch=false; npm run build; npm run check:geometry; npm run check:offline -- --dist; npm run check:tokens.

check:geometry cubre principalmente superficies CPU; no sustituye tests de otras estaciones ni revisión visual. npm run test:e2e se añade en T11. Filtrar pruebas por tarea según runner instalado; ningún comando no ejecutado se marca como verde.

Orden: T00 → T01 → T02 → T02b → T03 → T04a → T04 → (T04b) → T05 → T06 → T07 → T08 → T09 → T10 → T11 → (T12). T04a puede adelantarse en paralelo desde T00.
T04a y T06 son las mayores ampliaciones de lógica; T01/T03 son base común. No desarrollar cuatro escritorios o transportes independientes.

## 11. Definición de terminado

- [ ] Laboratorio integrado: consultar componentes/memoria conserva ejercicio, datos y paso; cambios de modelo explícitos.
- [ ] Rótulos ligados a cada pieza, con marcador 3D, oclusión, densidad limitada y movimiento estable; sin columnas superpuestas.
- [ ] Textos breves o en dos líneas en todas las vistas, sin truncar contenido esencial en pantallas pequeñas.
- [ ] Programa/Estado juntos en escritorio; instrucción/resultado relacionados en móvil.
- [ ] Ayuda arriba a la derecha conserva todas las funciones previas y añade temas del curso y equivalencias EMU8086.
- [ ] Traza y Cronoscopio fuera de navegación ordinaria; retroceso/comparación conservados.
- [ ] Escena amplia, paneles recuperables, anclables abajo/derecha y flotantes.
- [ ] Transporte único con objetivo y estados claros, incluida la espera de teclado.
- [ ] Dock único con Piezas/Mapa/Gráficos del mismo diseño; texto esencial fuera de oclusiones.
- [ ] 8086 ejecuta las misiones 10–17 del curso con Pantalla y ciclo de siete pasos.
- [ ] Memoria por operaciones/resultados con dirección efectiva y origen de datos explícito.
- [ ] PC con CPU (PC/IR/MAR/MDR), RAM, ROM, SSD, placa, teclado y monitor; cuatro programas, archivos de entrada, arranque e interrupción frente a sondeo.
- [ ] SoC con CISC/RISC y memoria unificada, con comparación honesta.
- [ ] Driver.js útil pero no obligatorio para usar el laboratorio.
- [ ] Compatibilidad de sesiones, teclado, reduced-motion y fallback 2D.
- [ ] Aviso gráfico investigado y recursos/rendimiento comprobados.
- [ ] README.md, PRODUCT.md, DESIGN.md, docs/ARQUITECTURA-DEL-CODIGO.md y docs/GUIA-DE-EXPOSICION.md actualizados a implementación real.
- [ ] Paquete y evidencia QA local; publicación fuera de alcance.

## 12. Referencias

- Material de la asignatura (local): AMC/ACTIVIDAD 1–5, Practica de maquinas 1, Proyecto Final AMC 1, Guía Básica: El Procesador (CPU); AMC2/TRABAJO 3 (Organización del CPU), Trabajo 1, Investigación Apple M5, Investigación Meteor Lake.
- Stallings, W. *Organización y arquitectura de computadores* (7.ª ed.). Pearson. Bibliografía base citada por el curso (ciclo de instrucción, interrupciones y buses en el cap. 3 que cita el Trabajo 3).
- [Angular CDK: arrastre acotado](https://angular.dev/guide/drag-drop). Primitivas de interacción; anclajes/persistencia siguen siendo lógica propia.
- [Driver.js: recorridos interactivos](https://driverjs.com/docs/interactive-tours). Permite controlar avance y esperar elementos; SILICIO valida el aprendizaje.
- [Driver.js: configuración](https://driverjs.com/docs/configuration). Verificar teclado, foco y cierre al fijar versión.
- [Microsoft: avisos HLSL](https://learn.microsoft.com/en-us/windows/win32/direct3dhlsl/hlsl-errors-and-warnings). X4122 corresponde a pérdida de precisión.
- [Three.js: WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer). debug.checkShaderErrors y compileAsync; la rama concreta de warning y la constante de packing se verificaron en la fuente local 0.186.1.

La web actual emu8086.com consultada ya no presentaba el manual original; no se usa como fuente de compatibilidad. La equivalencia de ventanas de §4.1 sale de la Práctica 1 del grupo, que describe el depurador, la línea resaltada, la pantalla del emulador y los mensajes.

Skills aplicadas: brainstorming, writing-plans, dannaway-practical-ui y threejs-skill-router (borrador del 17 de octubre); writing-plans y dannaway-practical-ui (esta revisión). Cargar las de la tabla «Skills por tarea» al ejecutar cada fase.
