# SILICIO — Requisitos, verificación y trazabilidad

> **Revisión 3.0 vigente:** [Escena, instrumentos y móvil](./SILICIO-AMPLIACION-ESCENA-PANEL-Y-MOVIL.md) y [tareas futuras](./SILICIO-IMPLEMENTACION-ESCENA-INSTRUMENTOS-MOVIL.md). Esta revisión modifica solo documentos; no ejecuta implementación.

Versión 2.0 · 12 de octubre de 2026 · Criterios de aceptación del producto futuro.

[Índice](./SILICIO-INDICE.md) · [Plan maestro](./SILICIO-PLAN-MAESTRO.md) · [Ejecución](./SILICIO-PLAN-DE-EJECUCION.md) · [Contrato técnico](./SILICIO-ESPECIFICACION-TECNICA.md)

## Contenido

- [1. Cómo interpretar este documento](#1-cómo-interpretar-este-documento)
- [2. Requisitos trazables](#2-requisitos-trazables)
- [3. Casos funcionales y de codificación](#3-casos-funcionales-y-de-codificación)
- [4. Casos de experiencia y entrega](#4-casos-de-experiencia-y-entrega)
- [5. Casos de ampliaciones](#5-casos-de-ampliaciones)
- [6. Cómo obtener evidencia independiente](#6-cómo-obtener-evidencia-independiente)
- [7. Protocolo de rendimiento](#7-protocolo-de-rendimiento)
- [8. Criterios de cierre de la primera entrega](#8-criterios-de-cierre-de-la-primera-entrega)
- [9. Rúbrica sugerida para autoevaluación](#9-rúbrica-sugerida-para-autoevaluación)
- [10. Registro de entrega](#10-registro-de-entrega)

## 1. Cómo interpretar este documento

Los requisitos siguientes definen lo que debe poder demostrarse. Los casos T01–T70 son un plan de comprobación: **su estado debe contrastarse con la aplicación y evidencia actuales; este documento no certifica que los casos se hayan ejecutado**. La revisión documental de esta versión verifica el plan, sus enlaces y su coherencia; no se utiliza como evidencia de rendimiento, exactitud ejecutada o calidad visual de una web.

Prioridades: P0 corresponde a la entrega de siete días; P1 a ampliaciones después de estabilizarla; P2 a la visión completa. Una tarea cerrada enlazará la versión comprobada y evidencia concreta. Una captura, una prueba del núcleo y una medición de FPS acreditan cosas distintas.

## 2. Requisitos trazables

| ID | Prioridad | Resultado exigido | Paquetes responsables | Verificación |
|---|---|---|---|---|
| R01 | P0 | Entrar en un atrio 3D y acceder a las experiencias disponibles | BAS-03, BAS-04, GEN-01 | T01, T02 |
| R02 | P0 | Mantener un solo renderer y carga de escenas con ciclo de vida | BAS-04, ART-02 | T02, T58 |
| R03 | P0 | Mostrar el mismo estado en 3D, editor e inspectores y conservar sesiones por modelo | CPU-05, MEM-02, TIM-03 | T03, T04, T15, T31 |
| R04 | P0 | Admitir el dialecto y las formas exactas del subconjunto | CPU-02 | T06, T07, T09, T23 |
| R05 | P0 | Conservar ancho de registros y correspondencia AH/AL y equivalentes | CPU-01 | T05 |
| R06 | P0 | Calcular los seis flags aritméticos y preservar los no afectados | CPU-03 | T16–T21, T25 |
| R07 | P0 | Obtener direcciones con segmento predeterminado y veinte bits | CPU-01, MEM-01 | T08–T11 |
| R08 | P0 | Leer/escribir palabras little-endian con límites explícitos | CPU-01, MEM-01 | T12–T14 |
| R09 | P0 | Usar bytes y longitudes reales de la codificación elegida | CPU-02, CPU-03 | T23, T24 |
| R10 | P0 | Ejecutar saltos y bucles sin efectos del camino no elegido | CPU-03 | T21, T22 |
| R11 | P0 | Rechazar operaciones fuera del contrato sin cambios parciales | CPU-02, CPU-03 | T07, T14, T26, T27 |
| R12 | P0 | Ejecutar y pausar con worker y presupuestos acotados | BAS-05 | T28–T30 |
| R13 | P0 | Restaurar snapshots e historial de forma exacta | TIM-01 | T31, T33 |
| R14 | P0 | Conservar y comparar dos ramas de una ejecución | TIM-02, TIM-03 | T32 |
| R15 | P0 | Resolver siete misiones con evidencia de acciones y resultados | EDU-01 | T52 |
| R16 | P0 | Explicar M5 con fuentes y límites del modelo | APP-01, APP-02 | T49 |
| R17 | P0 | Calcular tareas Apple y conservar identidad de buffers | APP-03 | T45–T48 |
| R18 | P0 | Distinguir datos, direcciones y control en el banco general | GEN-01 | T50, T51 |
| R19 | P0 | Representar materiales usados con desgaste localizado y legible | ART-01, CPU-04, APP-02 | T54, T55 |
| R20 | P0 | Mantener legibilidad y reducir movimiento sin perder funciones | UX-02, ART-02 | T40, T41, T56 |
| R21 | P0 | Evitar conflictos de foco, editor, rueda y cámara | UX-01 | T38, T39 |
| R22 | P0 | Guardar proyectos y preferencias con recuperación | UX-02 | T34–T36 |
| R23 | P0 | Validar importaciones y ofrecer exportación portable | UX-02 | T35, T37 |
| R24 | P0 | Ejecutar el recorrido local con todos los recursos sin red | REL-01 | T53, T59 |
| R25 | P0 | Sostener el perfil de exposición medido en el equipo elegido | ART-02, QA-02 | T57 |
| R26 | P0 | Liberar recursos al repetir cambios de escena | BAS-04, ART-02 | T58 |
| R27 | P0 | Recuperarse de errores de carga, worker y contexto sin pérdida silenciosa | BAS-05, BAS-04, UX-02 | T30, T36, T42, T43 |
| R28 | P0 | Mantener fuentes y distinción entre hechos, modelos y metáforas | APP-01, EDU-01 | T49, T51, T53 |
| R29 | P0 | Hacer opcional y controlable el sonido | ART-02, UX-02 | T44 |
| R30 | P0 | Presentar una versión identificada y un recorrido ensayado | REL-02 | T60 |
| R31 | P1 | Comparar caché con trazas y costes reproducibles | EXT-01 | T61 |
| R32 | P1 | Ejecutar pila y llamadas del subconjunto ampliado | EXT-03 | T62 |
| R33 | P1 | Explicar sondeo/interrupción conservando contexto | EXT-04 | T63 |
| R34 | P1 | Comparar variantes Apple con datos independientes | EXT-02 | T65 |
| R35 | P1 | Comparar organizaciones conservando programa y resultado | EXT-05 | T64 |
| R36 | P2 | Mostrar especulación y orden de confirmación correctamente | EXT-06 | T66, T67 |
| R37 | P2 | Construir/evolucionar modelos válidos con reglas reproducibles | EXT-07 | T68, T69 |
| R38 | P2 | Coordinar roles cooperativos con un estado consistente | EXT-08 | T70 |

Los IDs EXT se definen en el plan de ejecución. Un requisito no pierde su prioridad porque una parte de su geometría ya esté disponible.

## 3. Casos funcionales y de codificación

Todas las filas de esta sección comienzan en estado **pendiente de ejecución**. Los resultados esperados son el contrato a contrastar.

| ID | Preparación / acción | Resultado esperado | Evidencia futura |
|---|---|---|---|
| T01 | Iniciar aplicación y seleccionar una pieza del atrio | Geometría 3D manipulable y primera acción disponible | Recorrido y captura. |
| T02 | Recorrer rutas, volver y recargar una URL de experiencia | Un canvas/renderer activo, escena correcta y ruta válida | Prueba de navegador y registro de ciclo de vida. |
| T03 | Ejecutar F01, cambiar a memoria y regresar | AX, dirección e índice iguales en todas las vistas | Snapshot y recorrido. |
| T04 | Salir de Intel, usar Apple y volver | Se recupera Intel sin mezclar modelos | Identidades de sesión y valores. |
| T05 | Cargar patrones en ocho registros y observar mitades | Máscaras de 16 bits y correspondencia de bytes correcta | Prueba del núcleo/inspector. |
| T06 | Ensamblar formas admitidas y rechazar operaciones de 8 bits/no incluidas | Matriz respetada; diagnósticos específicos | Casos de parser/ensamblador. |
| T07 | Introducir mnemónico inválido después de una sesión válida | Fuente conservada y programa anterior identificable | Estado del editor y sesión. |
| T08 | Usar cada forma de memoria, incluyendo BP | Dirección correcta; BP usa SS y otras bases DS según contrato | Vectores de direccionamiento. |
| T09 | Desplazamientos −128,127,128 y `[BP]` sin desplazamiento | ModR/M y bytes de desplazamiento elegidos correctamente | Bytes comparados con tabla/referencia. |
| T10 | Comparar 1000h:0010h y 1001h:0000h | Dirección 10010h en ambos | Cálculo y selección. |
| T11 | Calcular FFFFh:0010h como dirección de byte | Dirección física 00000h | Vector de veinte bits. |
| T12 | Ejecutar F06 | Bytes 34h,12h y BX=1234h | Traza de escritura/lectura. |
| T13 | Leer palabra desalineada sin cruce de límites | Reconstrucción correcta de los dos bytes | Vector funcional; sin benchmark físico. |
| T14 | Intentar palabra en límites excluidos | Error del monitor y estado inalterado | Snapshot anterior/posterior. |
| T15 | Ejecutar ADD de F01 | AX=12; memoria conserva 5; lectura de datos y cero escrituras | Traza independiente y delta. |
| T16 | Ejecutar las dos variantes F02 | CF/OF distintos según lo especificado | Tabla de seis flags. |
| T17 | SUB de 0000h menos 1 | FFFFh, CF=1, OF=0, SF=1, ZF=0, AF=1, PF=1 | Vector aritmético. |
| T18 | INC/DEC en límites con CF previo 0 y 1 | CF conservado y demás flags según operación | Vectores separados. |
| T19 | Resultado 0100h en operación aritmética | PF=1 por el byte bajo 00h | Vector que diferencia paridad de 8/16 bits. |
| T20 | CMP con valores iguales y diferentes | Flags de resta, operandos intactos | Snapshots y comparación. |
| T21 | LOOP con CX=1 y CX=0 | 1→0 sin salto; 0→FFFFh con salto; flags preservados | Estado y flujo. |
| T22 | JZ/JNZ tomados/no tomados y etiqueta fuera de rel8 | Ruta correcta o diagnóstico antes de ejecutar | Programas y mapa. |
| T23 | Ensamblar y decodificar F01–F06 | Longitudes, operandos y bytes canónicos coherentes | Tabla de referencia; comparación externa cuando se use. |
| T24 | HLT en programa válido | IP posterior y estado detenido; no se ejecuta la siguiente instrucción | Estado del monitor. |
| T25 | NOP y MOV con flags previamente fijados | Flags conservados | Vectores de no modificación. |
| T26 | MOV de palabra que se solapa con programa | Rechazo atómico sin escribir ningún byte | Snapshot y error. |
| T27 | Llegar fuera de programa sin HLT | Error explícito del monitor; no ejecución de memoria arbitraria | Traza. |
| T28 | Bucle prolongado, pulsar Pausar | Respuesta acotada, UI operativa y frontera consistente | Tiempo medido y estado. |
| T29 | Alcanzar límite de instrucciones/memoria de captura | Pausa antes de excederlo y opciones de conservación | Contadores y registro. |
| T30 | Cargar otra sesión mientras llega respuesta antigua; simular timeout | Mensaje antiguo descartado; recuperación conserva proyecto | Prueba del protocolo. |
| T31 | Ejecutar F06 y restaurar antes/después de escritura | Memoria, registros y posición exactos | Comparación de snapshots y rangos. |
| T32 | Ejecutar F04 y corregir DS en B | A=16, B=12; A sigue accesible | Dos ramas y divergencia. |
| T33 | Buscar inicio, checkpoint y último elemento | Restauración exacta en las tres posiciones | Verificación de historia. |
| T34 | Editar código, salir y regresar | Texto guardado y revisión ejecutable distinguida | Recorrido de editor. |
| T35 | Guardar/exportar/importar F03 | Mismo proyecto, condiciones y resultado | Archivo validado y replay. |
| T36 | Simular cuota o almacenamiento no disponible | Trabajo temporal/exportación; aviso accionable | Recorrido de recuperación. |
| T37 | Importar archivo grande, modelo desconocido o esquema inválido | Rechazo sin sustituir proyecto ni ejecutar contenido | Casos de importación. |

## 4. Casos de experiencia y entrega

| ID | Preparación / acción | Resultado esperado | Evidencia futura |
|---|---|---|---|
| T38 | Usar Tab/Enter/Esc y escribir en editor | Foco visible; atajos del mundo no capturan escritura | Recorrido con teclado. |
| T39 | Rueda en editor, lectura e inspección | Solo responde el propietario correcto | Recorrido de gestos. |
| T40 | Activar movimiento reducido y repetir una misión | Mismas funciones/resultados con transiciones reducidas | Comparación de recorrido. |
| T41 | Usar 1920×1080,1366×768 y 390×844 | Controles accesibles y datos legibles; bandejas adaptadas | Capturas y acciones. |
| T42 | Fallar carga de GLB/textura esencial | Error visible, reintento y retorno a escena utilizable | Recuperación. |
| T43 | Perder/restaurar contexto WebGL de forma controlada | Simulación pausada; sesión conservada y escena restaurada o error claro | Registro y snapshot. |
| T44 | Iniciar sin activar audio, silenciar y recargar | Sin reproducción involuntaria; preferencia persistente | Prueba de controles. |
| T45 | A01 con [1,2,3,4] | Resultado 10 | Prueba de escenario y presentación. |
| T46 | A02 con ganancia 1,25 y límites 0/2 | Resultado principal [0,80,160,255] y clamp correcto | Tabla de entradas/salidas. |
| T47 | A03 con datos predeterminados | Wx=[4, −1], salida ReLU=[4,0] | Cálculo y escenario. |
| T48 | Seguir B0/B1 a través de las etapas | Identidad, versión y disponibilidad coherentes | Traza conceptual. |
| T49 | Revisar fichas M5 y bloques | Fuentes por afirmación, modelo conceptual señalado y categorías de núcleos separadas | Revisión de contenido. |
| T50 | Banco general con A=2, B=3; lectura y escritura | Resultado 5 y rutas correctas para dato/dirección/control | Escenario y selección. |
| T51 | Comparar Von Neumann/Harvard y volver a Intel | La explicación distingue modelos y no atribuye rasgos modernos al 8086 | Revisión académica. |
| T52 | Completar y repetir M01–M07 con pistas | Éxito por acciones/resultados; progreso por versión; pistas no completan solas | Siete recorridos reproducibles. |
| T53 | Consultar fuentes y procedencia sin red | Contenido local y registro de recursos; no se distribuyen libros completos | Paquete y manifiesto. |
| T54 | Revisar materiales neutros/finales | Desgaste localizado, metal/pintura diferenciados, sin polvo ficticio sobre silicio protegido | Capturas comparativas. |
| T55 | Revisar protagonistas y despieces | 40 terminales y orientación del 8086; bloques y escala conceptual coherentes | Revisión de geometría y fuentes. |
| T56 | Activar efectos y seleccionar datos pequeños | Lectura y selección claras; el bloom no borra señales | Capturas de uso. |
| T57 | Medir ruta representativa y respuesta de selección | Cumplimiento del perfil acordado o ajuste registrado | Informe de rendimiento. |
| T58 | Alternar escenas veinte veces tras calentamiento | Sin crecimiento sostenido de recursos/listeners ni render duplicado | Contadores y perfilado. |
| T59 | Servir build local con red deshabilitada | Misiones, workers, fuentes, modelos y decodificadores funcionan | Ensayo local completo. |
| T60 | Ejecutar guion con presets y reinicios | Exposición de 10–12 minutos reproducible sobre versión identificada | Ensayo y video de respaldo. |

## 5. Casos de ampliaciones

| ID | Prioridad | Preparación | Resultado esperado |
|---|---|---|---|
| T61 | P1 | Caché de cuatro/ocho líneas, estado frío y traza fijada | 1/2 hits y 34/24 unidades; mismos datos. |
| T62 | P1 | CALL/RET cercano y pila soportada | Retorno a IP siguiente y SP restaurado. |
| T63 | P1 | Evento de E/S en paso fijo, sondeo/interrupción | Mismo dato atendido; contexto preservado. |
| T64 | P1 | Dos organizaciones `generic16-v1` | Estado final idéntico; diferencia de coste explicada. |
| T65 | P1 | Cambiar variantes/configuraciones Apple | Cifras, fuentes y geometría conceptual corresponden a cada ficha. |
| T66 | P2 | Predicción fallida con operación posterior de escritura | Camino erróneo descartado sin escribir estado arquitectónico. |
| T67 | P2 | Dependencias RAW/WAR/WAW y confirmación | Resultado igual a referencia secuencial; orden correcto. |
| T68 | P2 | Constructor con anchos incompatibles o conexión inválida | Diagnóstico y ejecución bloqueada hasta corregir. |
| T69 | P2 | Evolución con misma semilla/carga y presupuesto | Misma secuencia reproducible de candidatos válidos y costes declarados. |
| T70 | P2 | Roles, doble envío, desconexión y reconexión | Estado autoritativo único; comandos idempotentes; recuperación consistente. |

## 6. Cómo obtener evidencia independiente

### Núcleo

Los valores esperados se derivan de referencias y cálculos revisados, no de copiar la función que se prueba. Los límites aritméticos, direccionamiento, conservación de flags y restauración merecen pruebas directas. Los programas F01–F06 sirven como integración; la matriz exige además cubrir cada forma admitida.

NASM verifica formas/codificación cuando se utiliza, teniendo en cuenta variantes equivalentes. Una referencia de ejecución adicional se registra con nombre, configuración y limitaciones. Si un caso se revisa manualmente, se identifica como revisión manual y conserva su derivación.

### Interfaz

Las pruebas de navegador comprueban navegación, mensajes, sincronización, guardado y errores. No repiten toda la aritmética a través de cientos de clics. El renderer se revisa con escenas deterministas; las capturas se contrastan con el estado que deberían mostrar.

### Fuentes

Revisar variante y fecha en datos de Apple; páginas o secciones para reglas Intel; autoría/procedencia para recursos de arte. Una cifra sin fuente se retira de la ficha hasta resolverla. Las metáforas visuales se distinguen de las relaciones físicas documentadas.

## 7. Protocolo de rendimiento

1. Registrar CPU/GPU, RAM, sistema, navegador, tamaño CSS, resolución interna, DPR, perfil y versión.
2. Cargar cada escena y medir la carga por separado del recorrido ya preparado.
3. Tras un breve calentamiento, ejecutar un recorrido de 60 segundos con selección, despiece, instrucción y cambio de vista.
4. Registrar mediana y percentil 95 del tiempo de frame, respuesta de selección, draw calls y geometría/texturas residentes.
5. Objetivo equilibrado: mediana cercana a 16,7 ms y p95≤25 ms durante la interacción preparada. Objetivo reducido: mediana≤33,3 ms y p95≤50 ms. Son metas del proyecto, no resultados actuales.
6. Selección tras carga: objetivo de respuesta perceptible menor a 100 ms en el equipo de exposición.
7. Repetir veinte cambios de escena. Recursos estabilizados después de calentamiento no deben crecer de forma monotónica. El heap y la memoria GPU se tratan como mediciones/estimaciones con sus límites; no se confunde recolección de basura tardía con una fuga confirmada.
8. Si el perfil falla, ajustar resolución/efectos/recursos y repetir solo la medición afectada. Conservar resultado anterior y posterior.

No se inventa una especificación mínima de hardware antes de medir. El primer equipo registrado establece la referencia de exposición. Se informa por separado el comportamiento en equipos adicionales.

## 8. Criterios de cierre de la primera entrega

### Obligatorios

- R01–R30 satisfechos dentro del alcance documentado.
- F01–F06 comprobados y M01–M07 reproducibles.
- Ningún defecto conocido que cambie incorrectamente resultados, pierda trabajo sin advertencia o impida el recorrido principal.
- Encapsulados y materiales protagonistas revisados en primeros planos.
- Perfil de exposición medido y paquete local ensayado sin red.
- Fuentes, matriz de instrucciones y límites presentes en la versión entregada.
- Guion y respaldo correspondientes al mismo build que se expondrá.

### Clasificación de defectos

| Nivel | Ejemplo | Tratamiento |
|---|---|---|
| Bloqueante | Resultado incorrecto, pérdida de sesión, misión inaccesible o build que no inicia | Corregir antes de declarar preparada la entrega. |
| Mayor | Texto esencial ilegible, foco atrapado, transición que oculta la causa | Corregir antes del ensayo final. |
| Menor | Detalle decorativo o acabado secundario sin efecto académico | Registrar y decidir según tiempo; no añadir funciones para compensarlo. |

Una ampliación incompleta se mantiene fuera del recorrido entregado. Si una función P0 no se alcanza, se declara el alcance real; no se cambia retrospectivamente a «opcional» para sostener una afirmación de completitud.

## 9. Rúbrica sugerida para autoevaluación

Esta rúbrica es una propuesta del proyecto, no un criterio oficial del docente.

| Dimensión | Peso | Qué se valora |
|---|---|---|
| Exactitud y límites | 30 | Resultados, flags, memoria, modelo conceptual y fuentes. |
| Aprendizaje | 20 | Preguntas claras, acciones significativas y explicaciones causales. |
| Calidad visual | 20 | Materiales, desgaste, escala, luz y primeros planos. |
| Uso e interacción | 15 | Navegación, legibilidad, teclado y control del movimiento. |
| Rendimiento | 10 | Fluidez medida, carga y estabilidad de recursos. |
| Reproducibilidad | 5 | Paquete, presets, documentación y evidencia. |

## 10. Registro de entrega

Cada comprobación ejecutada se registrará con ID, versión, fecha, método, entorno, resultado, evidencia y límites. Estados permitidos: pendiente, en ejecución, aprobada, fallida o no aplicable con justificación. Las funciones P1/P2 no se marcan aprobadas por estar descritas.

El paquete final incluirá: matriz con resultados reales; fuentes; manifiesto de recursos; instrucciones locales; capturas seleccionadas; exportaciones de ejemplos; guion; informe breve de limitaciones y ampliaciones. El registro evita afirmar cobertura mayor que la comprobada.


## 11. Requisitos y casos adicionales de la revisión 3.0

Los siguientes son requisitos y comprobaciones futuras. No se ejecutaron en esta revisión.

| ID | Requisito | Tareas | Evidencia para cerrar |
|---|---|---|---|
| NX01 | Referencias físicas de todos los protagonistas | R00, R06, R07 | Catálogo, planos/fotos yprocedencia. |
| NX02 | RAM clásica/moderna/Apple diferenciadas | R00, R06, R09 | Fichas y recorrido por escalas sin confundir sesiones. |
| NX03 | Todos los componentes de estudio/operables responden | R02, R07 | Auditoría de IDs yacciones; teclado ytap. |
| NX04 | Toolbar de escena con material/malla y vista/despiece | R03 | Ubicación, focus, pressed, disabled ytargets. |
| NX05 | Panel de instrumentos derivados de estado | R01, R05, R09, R10 | Eventos/snapshots comparados con gráficos; sin reglas duplicadas. |
| NX06 | Móvil sin pérdida académica | R04, R12 | Matriz320–1920 px, orientación yflujo completo. |
| NX07 | Scroll/gestos/teclado virtual coherentes | R03, R04 | Cancelación, consola expandida, zoom yteclado abierto. |
| NX08 | Física estable yaislada delCPU | R08 | Subpasos, descanso, reset, pérdida de foco ybytes invariantes. |
| NX09 | Modelos con uniones/apoyos reales | R06, R07 | Topología, contactos, holguras, movimiento máximo yvistas fijas. |
| NX10 | Efectos legibles ymedidos | R11 | Baseline sin efectos, coste por pase ycontraste. |
| NX11 | Calidad ligera conserva acciones | R08, R11, R12 | Perfil equivalente, falloWebGL yreduced motion. |
| NX12 | Recursos ycoste controlados | R09, R12 | Diez recorridos, p50/p95, draw calls, triángulos yresidentes. |
| NX13 | Historia/buffers recuperables ycoherentes | R10 | Restauración, A/B, ramas archivadas eidentidadB0/B1. |
| NX14 | Paquete local ycontenido sin notas internas | R12 | Recorrido sin red, fuentes/WASM/worker locales yrevisión de copy. |

Casos obligatorios adicionales:
- Se enfoca un pin/contacto desde selección3D ysu alternativaHTML muestra el mismoID.
- La barra de escena no queda dentro delrack ni detrás de la consola.
- Al abrir teclado/expandir consola, la pieza seleccionada yel control de ejecución siguen accesibles.
- Un gesto cancelado libera input yrestricciones físicas.
- Una pieza soltada descansa sin atravesar mesa/bandeja.
- Una selección/cambio de dato no reconstruye elmodelo completo.
- Una respuesta deworker antigua no actualiza un instrumento de la sesión nueva.
- La RAM se revisa por ambas caras y su conteo/contorno coincide con la ficha.
- Los valores siguen correctos al apagar bloom/AO, física o microdetalle.
- Una rama sustituida queda recuperable; los buffers conservan identidad.
- Medir perfil de detalle yligero desde cámara fija; registrar equipo yalcance de ayudas técnicas realmente probadas.

Los objetivos de rendimiento de3.0 son propuestos. Capturas de una sola resolución ylos tests existentes no certifican todas las combinaciones anteriores.
