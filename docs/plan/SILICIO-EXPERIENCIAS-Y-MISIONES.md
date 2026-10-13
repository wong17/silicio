# SILICIO — Experiencias, contenido y misiones

> **Revisión 3.0 vigente:** [Escena, instrumentos y móvil](./SILICIO-AMPLIACION-ESCENA-PANEL-Y-MOVIL.md) y [tareas futuras](./SILICIO-IMPLEMENTACION-ESCENA-INSTRUMENTOS-MOVIL.md). Esta revisión modifica solo documentos; no ejecuta implementación.

Versión 2.0 · 12 de octubre de 2026 · Diseño de la experiencia completa y de su primera entrega.

[Índice](./SILICIO-INDICE.md) · [Plan maestro](./SILICIO-PLAN-MAESTRO.md) · [Simulación](./SILICIO-ESPECIFICACION-TECNICA.md) · [Arte e interacción](./SILICIO-DIRECCION-3D-Y-UX.md)

## Contenido

- [1. La experiencia que se quiere conseguir](#1-la-experiencia-que-se-quiere-conseguir)
- [2. Estructura del mundo](#2-estructura-del-mundo)
- [3. E00 — Atrio y banco de la máquina](#3-e00--atrio-y-banco-de-la-máquina)
- [4. E01 — Banco Intel 8086](#4-e01--banco-intel-8086)
- [5. E02 — Galería de memoria](#5-e02--galería-de-memoria)
- [6. E03 — Cronoscopio](#6-e03--cronoscopio)
- [7. E04 — Observatorio Apple Silicon](#7-e04--observatorio-apple-silicon)
- [8. E05 — Taller de buses y entrada/salida](#8-e05--taller-de-buses-y-entradasalida)
- [9. E06 — Fundición de arquitecturas](#9-e06--fundición-de-arquitecturas)
- [10. E07 — La computadora somos nosotros](#10-e07--la-computadora-somos-nosotros)
- [11. Catálogo detallado de misiones](#11-catálogo-detallado-de-misiones)
- [12. Sistema de contenido](#12-sistema-de-contenido)
- [13. Cierre del recorrido](#13-cierre-del-recorrido)

## 1. La experiencia que se quiere conseguir

El visitante entra en un laboratorio que parece llevar años funcionando. Hay equipos abiertos, etiquetas de mantenimiento, una lámpara sobre una placa antigua y una estación contemporánea. Un procesador sobre el banco actúa como punto de entrada a escalas cada vez menores. Al abrirlo aparecen registros, unidades y conexiones que responden al programa que se está ejecutando.

Una misma instrucción puede verse como texto, bytes, acceso a memoria, operación y cambio de estado. El visitante puede detenerla, seguir el dato, viajar a su origen y comparar otra ejecución. Al llegar a Apple Silicon cambia el modelo estudiado, mientras conserva las herramientas de observación y el lenguaje visual del laboratorio.

La singularidad del proyecto procede de combinar escala, causalidad y tiempo: **entrar en el componente, seguir una causa y reconstruir sus consecuencias**. El entorno tiene valor cuando ayuda a localizar y relacionar esas causas.

## 2. Estructura del mundo

| Código | Lugar | Acción característica | Primera entrega |
|---|---|---|---|
| E00 | Atrio y banco de la máquina | Activar una entrada y seguirla hasta una salida | Completo en su alcance P0. |
| E01 | Banco Intel 8086 | Abrir el chip y ejecutar instrucciones | Subconjunto funcional P0. |
| E02 | Galería de memoria | Convertir segmento:offset en un lugar y examinar sus bytes | Segmentación y representación P0; caché P1. |
| E03 | Cronoscopio | Restaurar una ejecución y crear una alternativa | Historial y comparación A/B P0. |
| E04 | Observatorio Apple Silicon | Seguir tareas y buffers entre bloques de un SoC | M5 conceptual interactivo P0. |
| E05 | Taller de buses y entrada/salida | Separar dirección, datos y control en una transferencia | Estación integrada en el atrio durante P0. |
| E06 | Fundición de arquitecturas | Comparar organizaciones y construir modelos válidos | P1/P2. |
| E07 | La computadora somos nosotros | Coordinar personas que representan unidades | P2. |

El atrio permite llegar a cualquier experiencia disponible en dos acciones como máximo. E01, E02 y E03 comparten la sesión del 8086. E04 conserva su sesión conceptual separada. E05 reutiliza el banco general. Las ampliaciones aún no disponibles se describen en una ficha de futuro, sin puertas que aparenten funcionar.

### 2.1 Primer minuto orientativo

| Momento | Lo que ve | Lo que hace | Resultado |
|---|---|---|---|
| Inicio | Banco protagonista y título discreto | Activa «Entrar al laboratorio» | Se habilitan interacción y sonido solo si lo eligió. |
| Primer encuadre | Entrada, CPU, memoria y salida | Selecciona un dato de entrada | El recorrido ofrece una acción comprensible. |
| Primera operación | Dos valores pequeños y una orden | Avanza la transferencia | Aparece una consecuencia verificable. |
| Elección de profundidad | Procesador iluminado por la lámpara | Activa «Abrir procesador» o «Explorar salas» | Accede al 8086 o al mapa. |

No existe una cinemática inicial obligatoria. El minuto es una guía de ritmo, no un temporizador que limite al estudiante.

### 2.2 Modos

**Guiado:** una estación y una pregunta a la vez; las misiones sugieren el siguiente paso. El usuario puede saltar explicaciones y volver a ellas. Completar una misión no bloquea las demás.

**Exploración:** selección libre de componentes, órbita, cortes y despieces preparados. Los instrumentos muestran información contextual; no se necesita caminar con controles de videojuego.

**Laboratorio:** editor y condiciones iniciales, ejecución, inspección e historial. Los cambios se reflejan en el mismo mundo. El cambio de modo conserva sesión y componente seleccionado.

**Presentación:** recorrido curado de 10–12 minutos, presets restaurables y accesos directos. Oculta ayudas de autoría que no se necesitan durante la explicación; conserva herramientas para responder preguntas.

## 3. E00 — Atrio y banco de la máquina

### Escenario y objetos

Mesa central, placa general, módulo CPU, memoria, almacenamiento, entrada y salida. Una franja física de señalización indica el destino de cada laboratorio. La botonera del banco presenta tres controles claros: iniciar ejemplo, siguiente paso y restablecer. Las etiquetas gastadas forman parte de la escena; los nombres esenciales tienen equivalente legible en el inspector.

### Recorrido interactivo

1. Seleccionar entrada A y B en el rango 0…15.
2. Confirmar que el dato pertenece a la entrada y aún no está en el registro de trabajo.
3. Avanzar: el dato llega al registro y se identifica el camino utilizado.
4. Ejecutar la operación preparada y observar el resultado calculado.
5. Guardar en la celda indicada y mostrarlo en la salida.
6. Abrir una ficha que distingue CPU, memoria y almacenamiento.

El modelo muestra origen y destino de cada paso. No todos los bloques se iluminan al mismo tiempo. Al seleccionar almacenamiento se explica por qué no equivale a un registro, sin crear una animación de acceso a disco ajena al ejemplo.

### Contenido y aceptación

Conceptos: estructura y función; arquitectura y organización; entrada, procesamiento, memoria y salida; dato frente a dirección. La actividad termina cuando el usuario produce la suma elegida y ubica correctamente los cuatro bloques del recorrido. Pistas: primero indicar qué se mueve; después señalar qué componente conserva el dato.

Salida hacia E01 mediante el encapsulado; hacia E05 mediante los conectores. Se guarda el estado del banco al abandonar el atrio.

## 4. E01 — Banco Intel 8086

### Escenario y escala

Placa clásica con el encapsulado DIP de 40 terminales. La muesca y la orientación son reconocibles. Se separan dos capas: exterior con referencia física e interior como organización funcional educativa. La transición abre la cubierta, aproxima la cámara y reorganiza los bloques para inspección, manteniendo un punto visual de continuidad.

### Puntos de inspección

| Objeto | Acción | Información y efecto |
|---|---|---|
| Encapsulado | Abrir/cerrar | Alterna exterior y organización funcional. |
| BIU | Seleccionar | Dirección, segmentos y relación con la lectura de memoria. |
| EU | Seleccionar | Decodificación y ejecución; separación conceptual de responsabilidades. |
| AX/CX/DX/BX | Elegir registro | Valor hexadecimal, decimal, binario y mitades correspondientes. |
| SP/BP/SI/DI | Elegir registro | Función y uso concreto dentro del subconjunto. |
| CS/DS/SS/ES | Elegir segmento | Dirección base y accesos asociados. |
| IP | Enfocar código | Señala bytes y línea de la próxima instrucción. |
| ALU | Inspeccionar operación | Operandos, ancho, resultado y flags de la instrucción seleccionada. |
| FLAGS | Elegir indicador | Explica cada flag con un caso reproducible. |
| Cola | Abrir detalle | Seis casillas de bytes y advertencia breve de temporización ilustrativa. |

### Trayectoria de una suma

El código muestra `ADD AX, [10]`. Primero se localizan los bytes; después, DS y el desplazamiento determinan una dirección; dos bytes forman una palabra little-endian. El operando leído y AX llegan a la representación de la ALU. El resultado vuelve a AX y actualiza flags. La memoria de datos queda intacta.

Se puede detener al terminar la instrucción, repetir la explicación, cambiar a vista de memoria o saltar al estado confirmado. Ninguna cámara obliga a ver una trayectoria completa cada vez que se da un paso.

### Manipulaciones y alcance

P0 incluye programas F01–F06, las doce instrucciones acordadas, formas de memoria documentadas, carga de condiciones, errores explicados y conexión con historial. La edición directa de condiciones crea una rama reproducible. El editor indica que un registro visible puede tener operaciones aún no soportadas.

P1 incorpora PUSH/POP de los registros elegidos, CALL/RET cercanos y operaciones lógicas con sus flags; cada ampliación publica su matriz. Las instrucciones de interrupción y puertos se añaden como un bloque separado de verificación. No se habilitan botones por tener ya modelada la pieza 3D.

Aceptación: código, bytes, registros, memoria, flags y trayectoria corresponden a la misma instrucción; cambiar de escena conserva la sesión. Pregunta final: «¿Qué cambió y qué permaneció igual después de esta instrucción?».

## 5. E02 — Galería de memoria

### Escenario

Módulos físicos usados sirven de entrada a una representación ampliada de direcciones. El plano lógico muestra una ventana de 256 bytes como máximo, organizada para que se vean relaciones sin dibujar toda la memoria. Una dirección seleccionada permanece anclada mientras cambia la representación.

### Instrumentos P0

| Instrumento | Control | Resultado observable |
|---|---|---|
| Calculadora segmento:offset | Dos valores de 16 bits | Base desplazada, suma y dirección física de veinte bits. |
| Lupa de bytes | Dirección, anterior/siguiente ventana | Byte seleccionado, vecinos y acceso de la instrucción. |
| Unión de palabra | Seleccionar dos bytes consecutivos | Valor de 16 bits y orden little-endian. |
| Cambio de representación | Binario/hexadecimal/decimal | Cambia la escritura del valor, no su contenido. |
| Direcciones equivalentes | Dos pares segmento:offset | Ambos marcadores apuntan al mismo byte cuando hay alias. |
| Filtro de accesos | Código, lectura o escritura | Destaca la clase correcta de acceso. |

El cálculo aparece por etapas y puede modificarse. Si el usuario cambia el segmento, el desplazamiento se conserva para hacer visible el efecto de la base. Para una palabra restringida por los límites P0, la calculadora sigue funcionando y el simulador explica por qué no ejecuta esa operación concreta.

### Ampliación de caché

P1 abre una mesa de memoria rápida junto a la galería. Dos configuraciones reciben la misma traza; una línea se ocupa, se acierta o se reemplaza. El usuario cambia cuatro/ocho líneas, observa etiquetas e índices y predice el siguiente acceso. La configuración no altera los datos del programa.

La traza `0000h,0002h,0040h,0000h` proporciona un caso mínimo de conflicto. La explicación distingue localidad espacial, tamaño de bloque y capacidad; no atribuye automáticamente todos los misses a falta de RAM.

Aceptación: dos representaciones del mismo valor se mantienen sincronizadas; un acceso de palabra identifica exactamente sus bytes; los contadores de caché futuros proceden del modelo.

## 6. E03 — Cronoscopio

### Escenario

Una mesa temporal presenta el recorrido de la ejecución como una trayectoria con estaciones de instrucción. Los cambios importantes se pueden reconocer sin convertir cada instrucción en una malla permanente. Los paneles A/B muestran las diferencias precisas; el mundo resalta sus causas.

### Flujo P0

1. Abrir una captura de la sesión actual.
2. Elegir una instrucción de la cronología y restaurar su frontera de estado.
3. Inspeccionar qué registros o bytes cambió.
4. Volver a un punto anterior al error.
5. Modificar una condición inicial y crear la rama B.
6. Ejecutar B y comparar con A por registro, acceso y resultado.

La posición de cámara y el índice de instrucción son controles diferentes. Viajar visualmente hacia atrás no restaura por sí solo el modelo. Se muestran «antes» y «después» de la instrucción seleccionada con una única convención en todas las vistas.

### Investigación preparada

El error principal usa F04: el desplazamiento es correcto pero DS apunta a otra región. La rama A suma 9 y produce 16; la rama B suma 5 y produce 12. El usuario debe justificar la lectura incorrecta mediante la dirección calculada. Las pistas avanzan desde «observa dónde se leyó» hasta la base del segmento.

P1 agrega última escritura, puntos de parada y vigilancia. P2 agrega caminos especulativos: un futuro translúcido puede calcular resultados que nunca se confirman. Ese modo usa un modelo distinto del 8086.

Aceptación: restauración exacta, rama original disponible, comparación que distingue cambios causales de diferencias de presentación y límite de captura visible.

## 7. E04 — Observatorio Apple Silicon

### Escenario

Estación contemporánea con aluminio marcado por uso, un encapsulado protagonista y bloques funcionales al abrirlo. La luz cambia gradualmente respecto al banco clásico, conservando los materiales y la señalización del laboratorio. Los bloques representan organización documentada; el usuario puede consultar qué partes del dibujo son conceptuales.

### Niveles de exploración

1. **Sistema:** CPU, GPU, memoria y entrada/salida como conjunto.
2. **SoC:** distribución funcional y relaciones entre unidades.
3. **Trabajo:** una tarea, sus datos, sus etapas y su resultado.
4. **Detalle documentado:** núcleos o motores descritos por la fuente de la variante seleccionada.

La escala se limita al nivel respaldado por información pública. La experiencia no genera un supuesto esquema transistor por transistor de un M5.

### Interacciones P0

| Acción | Respuesta del mundo | Explicación |
|---|---|---|
| Seleccionar CPU | Enfoca bloque y tarea secuencial | Control y operaciones generales. |
| Seleccionar GPU | Muestra trabajo repartido sobre elementos | Paralelismo de datos, sin equivaler núcleos GPU a núcleos CPU. |
| Seleccionar Neural Engine | Abre operación matricial pequeña | Especialización; otras unidades también pueden hacer cálculos relacionados. |
| Seleccionar memoria unificada | Resalta buffers y accesos | Un conjunto compartido y necesidades de coordinación. |
| Cambiar entrada | Recalcula el escenario | Resultado matemático visible y reproducible. |
| Comparar con el banco clásico | Presenta funciones equivalentes | Qué conceptos se conservan y qué organización cambia. |

Se incluyen A01, A02 y A03, definidos con entradas y resultados en la especificación técnica. La misión principal usa A02 y hace seguir las identidades B0/B1. Las tareas ilustran decisiones de organización; no son benchmarks ni equivalen a ejecutar código ARM nativo en el chip dibujado.

### Ampliaciones P1/P2

P1 añade variantes M5 Pro/Max/Ultra con fichas independientes y selección de configuración. Si un empaquetado se ilustra, la ficha documenta su estructura y qué dimensiones se han simplificado. P2 añade recorrido M1–M5 y comparación conceptual con otros enfoques, incluido Meteor Lake cuando aporte al tema.

Aceptación: cada cifra tiene variante y fuente; CPU/GPU/Neural Engine no comparten contadores ambiguos; buffers mantienen identidad y versión; los resultados A01–A03 coinciden con sus cálculos.

## 8. E05 — Taller de buses y entrada/salida

### P0 integrado en el atrio

Un periférico virtual de entrada coloca un valor en un registro del modelo general. El usuario selecciona una operación de lectura o escritura y activa la secuencia preparada. Los caminos de dirección, datos y control tienen etiquetas y trazos diferentes. La dirección identifica un destino; el dato representa el contenido; la orden determina qué operación ocurre.

Un selector de vista compara organización Von Neumann y Harvard. La explicación se refiere a caminos y almacenamiento de instrucciones/datos. La misma escena puede ocultar capas para concentrarse en una relación a la vez.

### P1 y P2

P1 introduce sondeo e interrupción en un escenario didáctico con un evento de entrada determinista. Se observa contexto, atención y retorno. Los 8255 y 8259 tendrán fichas y operaciones acotadas que indiquen su modelo, sin simular todos los modos por mostrar el encapsulado.

P2 desarrolla arbitraje y DMA con dos solicitantes, prioridad declarada y transferencia de un bloque pequeño. La escena debe distinguir un evento lógico de interrupción, una instrucción de software y una señal eléctrica. Los pines multiplexados del 8086 se explican conforme a su pinout, no como tres grupos de cables independientes permanentes.

Aceptación: una lectura no se anima como escritura; las etiquetas de dirección y datos no se intercambian; el escenario de interrupción solo aparece ejecutable cuando restaura correctamente el contexto.

## 9. E06 — Fundición de arquitecturas

### Primera ampliación: comparar

Dos bancos ejecutan `generic16-v1` con el mismo programa y datos. El usuario elige cuatro u ocho líneas de caché y observa conteos y costes del modelo. Puede enfocar la primera divergencia de organización y comprobar que ambas máquinas obtienen el mismo resultado.

La comparación empieza desde estado frío y usa la misma traza. Hay una opción explícita para conservar estado caliente en experimentos posteriores; no se mezcla accidentalmente con la comparación inicial.

### Visión completa: construir

La mesa permite arrastrar bloques de una paleta acotada: registros, ALU, control, memoria, caché, interconexiones y puertos. Antes de ejecutar se valida anchura, direccionalidad, conexiones obligatorias y ausencia de ciclos combinacionales no admitidos. Una conexión inválida explica qué contrato incumple.

El constructor evoluciona en fases: presets editables; conexión manual válida; análisis de dependencias; incorporación de unidades; exploración automática de configuraciones. La ISA y los programas de prueba se mantienen fijos al comparar organizaciones. Cambiar la ISA exige otra familia y no conserva compatibilidad ficticia.

### Evolución de diseños

La búsqueda automática parte de configuraciones válidas y una semilla reproducible. La función de evaluación combina resultado correcto, coste temporal del modelo y presupuesto normalizado de recursos. Se conserva un conjunto de alternativas para mostrar el intercambio entre objetivos, no un ganador absoluto de todas las cargas.

Aceptación: toda configuración presentada como válida ejecuta los programas de referencia; el usuario puede explicar una mejora y su coste. Área y energía permanecen normalizadas hasta disponer de un modelo calibrado.

## 10. E07 — La computadora somos nosotros

### Experiencia cooperativa P2

Una sesión educativa reparte papeles: control, registros/ALU, memoria y entrada/salida; una quinta persona puede observar la traza. Una persona puede asumir más de un papel en modo local. Las acciones habilitadas dependen de la fase del ciclo y del contrato del modelo.

En una actividad de suma, control solicita lectura, memoria entrega el operando, la ALU calcula y registros confirma. El reloj didáctico avanza al reunir las acciones válidas. Una operación fuera de orden devuelve una explicación, sin alterar el estado correcto.

### Red y recuperación

La ampliación en red requiere un servicio autoritativo separado de la aplicación estática. El servidor valida comandos y secuencias, mantiene el estado y permite reconexión por snapshot. Los clientes presentan el mundo y las acciones disponibles. Se definen anfitrión, sala, rol, pausa y cierre; no se confía en valores calculados por un cliente para confirmar resultados.

Se comenzará con roles locales para verificar la actividad antes de agregar transporte de red. La desconexión pausa el rol o permite que el anfitrión lo reasigne. El historial registra acciones académicas de la sesión con nombres elegidos por participantes, sin exigir cuentas personales para una demostración de aula.

Aceptación: mismo estado para todos, doble envío sin doble aplicación, reconexión consistente y participación útil de cada rol. Esta experiencia no forma parte de la semana inicial.

## 11. Catálogo detallado de misiones

Las condiciones siguientes son el contrato de contenido. Los verificadores comprueban acciones y resultados, no el mero paso del tiempo o el número de clics. Una nota escrita sirve para reflexión; la aplicación no pretende calificar automáticamente cualquier explicación libre.

### M01 — Encender el banco · P0 · E00/E05

- **Objetivo:** identificar entrada, procesamiento, memoria y salida en una operación.
- **Inicio:** `machine-basics-v1`, A=2, B=3, registro y memoria en cero.
- **Acciones:** activar entrada; avanzar transferencias; seleccionar los bloques donde se conserva y presenta el resultado.
- **Resultado:** salida=5; secuencia completa; selección correcta de los cuatro papeles.
- **Error instructivo:** confundir el número transportado con la dirección de la celda.
- **Pistas:** «¿Qué valor se está moviendo?»; luego resaltar origen/destino; finalmente mostrar un paso resuelto.
- **Evidencia:** valores de entrada/salida y orden de los pasos. Cierre: una frase que explique dónde se guardó el dato.

### M02 — Seguir una suma · P0 · E01/E02

- **Objetivo:** explicar `ADD AX, [10]` y su destino.
- **Inicio:** fixture F01, AX=7 y palabra en DS:000Ah=5.
- **Acciones:** predecir AX; ejecutar ADD; localizar lectura; seleccionar registro modificado.
- **Resultado:** AX=12, memoria=5; el usuario identifica una lectura y ausencia de escritura de datos.
- **Error instructivo:** suponer que el resultado se guarda en `[10]`.
- **Pistas:** leer los operandos de izquierda a derecha; destacar el destino; mostrar antes/después.
- **Evidencia:** snapshot y acceso a 2000Ah. Cierre: «AX cambia porque ocupa la posición de destino».

### M03 — Un resultado y dos interpretaciones · P0 · E01

- **Objetivo:** distinguir CF y OF en un resultado de 16 bits.
- **Inicio:** variantes F02 con FFFFh+1 y 7FFFh+1.
- **Acciones:** predecir resultado; ejecutar cada caso; cambiar entre interpretación con y sin signo; seleccionar el flag pertinente.
- **Resultado:** primer caso CF=1, OF=0; segundo CF=0, OF=1, con sus resultados documentados.
- **Error instructivo:** deducir que CF y OF siempre deben coincidir.
- **Pistas:** mostrar el rango sin signo; después el rango con signo; finalmente una recta numérica auxiliar 2D.
- **Evidencia:** tabla A/B de operandos, resultado y flags. Cierre: el mismo patrón de bits admite interpretaciones distintas.

### M04 — Dos direcciones, un mismo lugar · P0 · E02

- **Objetivo:** comprender segmentación y alias.
- **Inicio:** calculadora con 1000h:0010h y segunda pareja editable.
- **Acciones:** obtener 10010h; introducir 1001h:0000h; seleccionar la celda común.
- **Resultado:** ambas parejas apuntan al mismo byte, aunque los dos componentes sean distintos.
- **Error instructivo:** concatenar los números en lugar de desplazar el segmento y sumar.
- **Pistas:** base del segmento; incremento de 10h por unidad; descomposición de la suma.
- **Evidencia:** dos parejas y dirección común. Cierre: distinguir dirección lógica y física.

### M05 — Recorrer un arreglo · P0 · E01/E02

- **Objetivo:** relacionar SI, tamaño de palabra y LOOP.
- **Inicio:** F03 y cuatro palabras 1,2,3,4.
- **Acciones:** predecir incremento de SI; seguir cuatro lecturas; ejecutar hasta HLT; inspeccionar CX y flags finales.
- **Resultado:** AX=10, CX=0, SI=8; lecturas en offsets 0,2,4,6.
- **Error instructivo:** avanzar una palabra sumando uno; suponer que LOOP pone ZF cuando CX llega a cero.
- **Pistas:** mostrar los dos bytes de una palabra; luego el siguiente offset; revisar qué instrucción modificó los flags por última vez.
- **Evidencia:** cuatro accesos y estado final. Cierre: separar contador de bucle y flags aritméticos.

### M06 — Investigar el segmento equivocado · P0 · E03

- **Objetivo:** reconstruir un error y justificar una corrección.
- **Inicio:** F04, rama A con DS=2100h; resultado 16 cuando se esperaba 12.
- **Acciones:** inspeccionar lectura; regresar antes de ADD; crear B con DS=2000h; comparar resultados.
- **Resultado:** A permanece en 16 y B produce 12; se identifica la diferencia entre 2100Ah y 2000Ah.
- **Error instructivo:** corregir AX después de ejecutar sin resolver la causa.
- **Pistas:** examinar operando; calcular dirección; revisar base del segmento.
- **Evidencia:** rama, punto de divergencia y estados. Cierre: explicar por qué el código pudo ser idéntico y leer otro dato.

### M07 — Compartir datos en un SoC · P0 · E04

- **Objetivo:** seguir una tarea entre bloques y comprender un buffer compartido.
- **Inicio:** A02 con [0,64,128,255] y ganancia 1,25.
- **Acciones:** predecir salida; seleccionar una unidad apropiada para transformación paralela; observar B0, producción de B1 y lectura posterior.
- **Resultado:** [0,80,160,255]; identidad y versión del buffer visibles; tres etapas completadas.
- **Error instructivo:** creer que memoria unificada significa ausencia de espera o que una CPU no puede realizar esa operación.
- **Pistas:** separar capacidad de una unidad y pertinencia de su organización; señalar coordinación entre etapas.
- **Evidencia:** entrada, resultado y flujo de buffers. Cierre: describir especialización sin declarar un benchmark.

### M08 — Regresar de una llamada · P1 · E01

- **Objetivo:** explicar dirección de retorno y balance de pila.
- **Inicio:** programa de CALL/RET cercano, SP y SS válidos y rutina pequeña del subconjunto ampliado.
- **Acciones:** inspeccionar IP siguiente; ejecutar CALL; observar la palabra guardada; ejecutar RET.
- **Resultado:** retorno a la instrucción posterior a CALL y recuperación de SP inicial.
- **Error/pista:** confundir dirección de rutina con retorno; mostrar ambos valores antes de la llamada.
- **Evidencia:** escritura/lectura de pila y SP antes/después. Solo se habilita después de validar codificación y efectos.

### M09 — Evitar viajes innecesarios · P1 · E02

- **Objetivo:** explicar un fallo por conflicto y el efecto de la organización.
- **Inicio:** cachés vacías de cuatro y ocho líneas y la traza de cuatro accesos fijada en la especificación.
- **Acciones:** predecir cada hit/miss; seguir índice/etiqueta; comparar conteos.
- **Resultado:** 1 frente a 2 hits; costes de modelo 34 frente a 24; mismos valores leídos.
- **Error/pista:** confundir más líneas con datos diferentes; localizar dónde compiten los bloques.
- **Evidencia:** traza anotada, configuración y suma de costes.

### M10 — Atender un dispositivo · P1 · E05

- **Objetivo:** distinguir sondeo e interrupción y conservar el trabajo interrumpido.
- **Inicio:** modelo didáctico con evento de entrada en un paso fijado.
- **Acciones:** ejecutar modo sondeo; repetir con interrupción; seguir atención y retorno.
- **Resultado:** mismo dato atendido, contexto preservado y costes del modelo explicables.
- **Error/pista:** saltar al servicio sin conservar contexto; mostrar el estado que la operación pendiente necesitará al regresar.
- **Evidencia:** evento, estado guardado, atención y restauración. No se atribuye esa traza a señales físicas aún no simuladas.

### M11 — Elegir una organización · P1 · E06

- **Objetivo:** distinguir ISA compartida de organización diferente.
- **Inicio:** dos presets válidos de `generic16-v1`, mismo programa y datos.
- **Acciones:** ejecutar ambos; ubicar la primera diferencia de coste; cambiar una única configuración.
- **Resultado:** mismos registros/datos finales y métricas explicadas por la configuración.
- **Error/pista:** cambiar programa y hardware simultáneamente; bloquear una variable durante la comparación.
- **Evidencia:** programa, presets y tabla de resultados. El estudiante justifica una elección para esa carga concreta.

### M12 — Descartar un futuro · P2 · E03

- **Objetivo:** distinguir ejecución especulativa y confirmación.
- **Inicio:** programa del modelo `generic-ooo-v2` con salto predicho incorrectamente.
- **Acciones:** observar resultado provisional; resolver salto; identificar lo descartado; continuar por camino correcto.
- **Resultado:** el estado final coincide con la referencia secuencial; ninguna escritura descartada queda visible arquitectónicamente.
- **Error/pista:** pensar que un dato calculado ya fue confirmado; diferenciar bandeja provisional y registro arquitectónico.
- **Evidencia:** predicción, resolución, descarte y estado final.

## 12. Sistema de contenido

### 12.1 Unidad mínima de lección

Cada lección tendrá: ID estable, pregunta, modelo, componente, explicación de unas 60–100 palabras, desarrollo opcional, ejemplo, error frecuente, actividad, condición de éxito y fuentes. La longitud es un objetivo editorial; una explicación puede dividirse en pasos si requiere más espacio.

Las fichas no aparecen todas abiertas. Seleccionar una pieza muestra primero su nombre, función y estado actual; después ofrece «Ver ejemplo» y «Profundizar». La fuente acompaña la explicación ampliada, sin interrumpir una operación.

### 12.2 Glosario inicial

Arquitectura, organización, ISA, microarquitectura, CPU, ALU, unidad de control, registro, flag, instrucción, operando, opcode, bus, dato, dirección, byte, palabra, little-endian, segmento, desplazamiento, dirección física, memoria, almacenamiento, caché, localidad, interrupción, sondeo, DMA, SoC, CPU/GPU, Neural Engine, memoria unificada, paralelismo, latencia, ancho de banda, prelectura, especulación y confirmación.

Cada entrada enlaza a una pieza o ejemplo. «Palabra» indica el ancho del modelo activo; «núcleo» aclara de qué clase de unidad habla. El glosario evita convertir diferencias comerciales en reglas universales de arquitectura.

### 12.3 Progreso y ayuda

Estados por misión: sin iniciar, en curso, completada y repetida con cambios. El registro guarda versión de misión, escenario, resultado y pistas consultadas. Repetir no borra la primera evidencia. No se exige completar una secuencia para explorar.

Las pistas tienen tres niveles: pregunta orientadora, señalamiento de componente y ejemplo parcialmente resuelto. El botón Restablecer vuelve a condiciones conocidas; antes conserva una recuperación de los cambios propios. Se ofrece exportar las notas como parte del proyecto local.

## 13. Cierre del recorrido

La presentación termina con dos escenas lado a lado mediante estados preparados: una suma del 8086 y una tarea conceptual del SoC. Las preguntas finales son qué unidades almacenan datos, quién ejecuta la operación, cómo se obtiene la dirección y qué organización facilita cada clase de trabajo.

Se puede volver directamente a cualquier demostración. El cierre ofrece fuentes, matriz de capacidades y proyecto exportable. El recorrido evita presentar la complejidad visual como evidencia de exactitud: cada afirmación se apoya en el estado o en la fuente correspondiente.


## 13. Presentación interactiva de experiencias: revisión 3.0

La [revisión de escena, panel y móvil](./SILICIO-AMPLIACION-ESCENA-PANEL-Y-MOVIL.md) cambia cómo se observa y opera cada experiencia:
- 8086: registro de bits, ALU/flags, cinta de bytes y trazas reales.
- Memoria: pieza identificada, organización por bancos o módulo moderno, dirección ybytes.
- Cronoscopio: cinta recuperable, comparación completa y preservación de ramas.
- Apple: identidad yversión deB0/B1, unidad ydependencia de finalización.
- Máquina general: conexiones dirección/datos/control yextremos operables.

Se añaden acciones en osciloscopio, lámpara, sonda, fuente, conectores, pasivos, herramientas ysoportes. Las animaciones explican consecuencias, no ocupan el lugar de la simulación. Las misiones conservan condiciones/datos y acceso completo en móvil. No se resuelven los pendientes solo cambiando su presentación.
