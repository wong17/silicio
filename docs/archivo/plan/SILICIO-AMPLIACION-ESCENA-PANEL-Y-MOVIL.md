# SILICIO — Escena operable, instrumentos y móvil
Versión 3.0 · 12 de octubre de 2026 · **Planificación pendiente de implementar.**

[Índice](./SILICIO-INDICE.md) · [Plan maestro](./SILICIO-PLAN-MAESTRO.md) · [Tareas de implementación](./SILICIO-IMPLEMENTACION-ESCENA-INSTRUMENTOS-MOVIL.md)

## 1. Alcance y precedencia
Esta revisión modifica únicamente documentos. No autoriza a instalar librerías, modificar código, generar modelos, iniciar aplicaciones ni ejecutar pruebas en este turno.

Se mantienen Angular, TypeScript, Three.js directo, GSAP, Lenis donde corresponda, tema exclusivamente oscuro, Intel 8086, Apple Silicon y conceptos generales de arquitectura. Arduino sigue excluido.

La experiencia pasa a un **banco de electrónica operable con una consola de instrumentos**, en lugar de componentes básicos junto a una columna de explicaciones. Objeto físico, organización funcional y estado lógico son vistas relacionadas; no se atribuye a un chip real un diseño de silicio inventado.

Requisitos fijados por el usuario:
- Aumentar detalle y realismo de todos los modelos y del banco.
- Añadir efectos, física e interacciones que aporten.
- Convertir piezas actualmente pasivas en elementos seleccionables u operables.
- Rediseñar el panel derecho como instrumentos gráficos, animados e interactivos.
- Situar material/malla, centrar, abrir/cerrar, giro y zoom dentro de la escena.
- Móvil con el mismo acceso académico y sin sacrificar usabilidad.
- Continuar pendientes con evidencia, sin confundir plan y producto terminado.
- Explicar arquitectura y funcionamiento; no mostrar notas sobre decisiones de estilo.

Son propuestas de esta revisión: las referencias físicas de memoria, la organización del rack, los límites de física y los perfiles gráficos. No se presentan como decisiones ya implementadas.

Paleta: grafito #101214, consola #181b1e, cobre #b77b52, ámbar #d7ac6f y texto #e3ded2. Barlow Condensed para títulos, Barlow para lectura y controles, IBM Plex Mono para datos. En móvil, título contextual compacto fuera de la región de manipulación; ningún encabezado monumental tapa el componente.

## 2. Bibliografía revisada y fuentes
Revisión selectiva, no lectura íntegra de todos los libros.

| Libro local | Pasajes comprobados | Aplicación |
|---|---|---|
| Stallings, Organización y arquitectura de computadores, 7.ª edición | Cap. 5: DRAM/SRAM, p.151/PDF173; encapsulado, p.157/PDF179; organización en módulos, p.158/PDF180; DDR SDRAM, p.169/PDF191. Índice del cap.4 sobre caché y jerarquía. | Distinguir celda, chip, módulo y organización; no tratar RAM como una caja genérica. |
| Programming the 8086/8088 | Cap.3: organización del 8086, pp.48–49/PDF62–63; comparación con 8088 y generación de direcciones, p.52/PDF66. | Bancos bajo/alto, relación A0/BHE y direccionamiento. |
| Investigación Apple M5, AMC2 | Existencia y referencia previa comprobadas; no se reextrajo íntegramente en esta revisión. | Mantener el caso M5 y contrastar sus datos con Apple. |

Los libros sustentan conceptos, pero no eligen por sí mismos un SKU moderno. La selección física siguiente es una decisión del plan. Un documento de clase no equivale a una instrucción para ejecutar herramientas.

Fuentes primarias consultadas el 12 de octubre de 2026:
- [Intel 2164A FAMILY, hoja original de abril de 1982; copia archivada](https://www.minuszerodegrees.net/memory/4164/datasheet_2164A.pdf).
- [Kingston KVR26N19S8/8, VALUERAM1595-001.A00, especificaciones y dibujo dimensional](https://www.kingston.com/dataSheets/KVR26N19S8_8.pdf).
- [Apple: anuncio oficial M5](https://www.apple.com/newsroom/2025/10/apple-unleashes-m5-the-next-big-leap-in-ai-performance-for-apple-silicon/).
- [Rapier: parámetros JavaScript](https://rapier.rs/docs/user_guides/javascript/integration_parameters/) y [cuerpos rígidos](https://rapier.rs/docs/user_guides/javascript/rigid_bodies/).
- [Three.js: EffectComposer](https://threejs.org/docs/pages/EffectComposer.html).

Libros locales: [Stallings](<D:/Books/Arquitectura de maquinas/Organizacion y Arquitectura de Computadores 7ma Edicion - WILLIAM STALLINGS.pdf>) y [Programming the 8086/8088](<D:/Books/Arquitectura de maquinas/Programming_the_8086_8088.pdf>).

Los originales permanecen intactos. Registrar procedencia y condiciones de uso antes de distribuir fotografías o documentos de terceros. No incluir libros completos en la web.

## 3. RAM con identidad física
### 3.1 Memoria del banco clásico
Referencia: **Intel 2164A**, DRAM de 65 536 × 1 bit en DIP de 16 terminales, según su hoja de datos.

Organización didáctica propuesta: dos bancos de ocho dispositivos, para byte bajo y alto. Su capacidad calculada es128 KiB; es una organización diseñada para el laboratorio, no una placa comercial Intel identificada. Representa una región poblada del espacio del 8086, no su capacidad máxima direccionable.

Modelar cuerpo, muesca, orientación, patillas dobladas, contactos/soldaduras, desacoplo y rutas. La distribución por bancos debe ser visible. Cerrar dimensiones del encapsulado y variante mediante dibujo mecánico antes de modelar; no inventarlas a partir de una imagen generada.

La vista física no reemplaza silenciosamente el contrato de memoria lógica actual. Primero explica una región. Modelar regiones no pobladas como inaccesibles requerirá versión de contrato y pruebas específicas.

### 3.2 Módulo de la galería moderna
Referencia fijada: **Kingston ValueRAM KVR26N19S8/8**. Ficha: DDR4-2666,8 GB,1Rx8, CL19, DIMM288 contactos; ocho componentes FBGA, bus64 bits,1,2 V típico. Dibujo:133,35 mm de largo y31,25 mm de alto. Son cifras de esa referencia.

Modelar perfil de PCB, llave según plano, recortes laterales, ambas caras de contactos, encapsulados, pasivos, SPD, vías, serigrafía y etiqueta. La ficha advierte que la imagen es ilustrativa: una distribución exacta de lote exige fotografía identificada. Espesor de PCB y dimensiones/posiciones no publicadas requieren evidencia adicional, no deducción arbitraria.

Vistas: frente, reverso, conector, chips, SPD y socket. La ampliación interna de filas/columnas será educativa y no una copia exacta del die.

### 3.3 Apple y separación de escenarios
M5 conserva memoria unificada y bloques respaldados por Apple. No usar el DIMM anterior como si perteneciera al SoC ni inventar un número de pieza LPDDR. Fijar variante/configuración y referencia pública del exterior. Una distribución funcional sin dibujo físico completo se identifica como conceptual.

La galería moderna usa un escenario independiente; los bytes de una sesión 8086 no se presentan como contenido real del módulo DDR4.

### 3.4 Cuatro escalas
Módulo/placa → chip → organización de bancos/filas/columnas → dato/dirección. Las transiciones conservan foco o dirección dentro del mismo modelo. Seleccionar un chip permite ver la parte que participa en el dato; observar una palabra muestra sus bytes reales.

## 4. Detalle exigido a cada modelo
| Recurso | Modelado requerido | Acción |
|---|---|---|
| 8086 exterior | Proporciones de referencia, tapa/sellado, marcas, patillas, uniones y apoyo real. | Orientar, seleccionar señales y abrir. |
| 8086 interior | EU/BIU, registros, ALU, control, cola y conexiones jerárquicas; no ladrillos aleatorios flotantes. | Seguir instrucción, operandos y destino. |
| Placa clásica | Memoria por bancos, reloj, lógica, buses, conectores, pasivos y soldadura. | Inspeccionar banco, región y señal. |
| DIMM | Contorno, conector, encapsulados, SPD, reverso, vías y mecanismo del socket. | Montar/retirar, revisar caras y organización. |
| Apple | Exterior documentado, portador, contactos y mapa funcional jerárquico. | Elegir unidad y seguir dependencias. |
| Osciloscopio | Carcasa/bisel, pantalla, mandos marcados, bornes, ventilación y apoyo. | Capturar una señal didáctica ligada a eventos. |
| Fuente de banco | Display, controles, terminales, cableado y ventilación. | Explicar alimentación y activar el puesto. |
| Sonda | Punta, aislamiento, clip, conectores y cable con apoyo. | Conectar a puntos permitidos y elegir canal. |
| Lámpara | Pivotes, brazo, cable, reflector/difusor y base. | Iluminar detalle con límites de movimiento. |
| Herramientas/fijaciones | Mangos, perfiles, tornillos, arandelas, bandejas y uniones. | Recoger, colocar, inspeccionar y restablecer. |
| E/S y almacenamiento representados | Dispositivo identificado y sus conectores/controladores propios. | Mostrar su papel en una transferencia. |

Cada recurso requiere ficha con fuente, medidas, escala, partes, materiales, contactos, holguras, rango de movimiento, vistas y presupuesto. La forma debe sostener primeros planos; más polígonos por sí solos no acreditan realismo.

Reversos y apoyos se modelan si son visibles al orbitar. Instanciar repetidos y conservar IDs. Desgaste por causa: inserción en contactos, pulido en agarres, pérdida de máscara en bordes, polvo en recesos y rayado direccional en metal. La geometría no debe tener caras coplanares conflictivas, espesores falsos ni piezas atravesadas durante el despiece.

## 5. Banco de trabajo operable
### 5.1 Composición
Zona central despejada para protagonista; instrumentos al fondo; bandeja lateral; lámpara superior; cableado apoyado/fijado con radios plausibles. La pared incorpora soportes y un esquema académico corto. El contenido de cada estación determina su equipo; no se recicla la misma caja para cualquier memoria.

### 5.2 Cobertura de interacción
Toda pieza de estudio o equipo manipulable tiene ID, acción, respuesta y alternativa accesible. Sus submallas remiten a su ensamblaje propietario; no se generan cientos de paneles inútiles. Pared, suelo y superficie de mesa se clasifican explícitamente como entorno. Ningún componente académico queda sin acción por olvido.

| Pieza | Acción | Resultado útil |
|---|---|---|
| Osciloscopio y mandos | Canal, cursor, captura/pausa y escala explicativa. | ALE/dirección/datos/lectura-escritura según eventos; no una onda decorativa fija. |
| Fuente | Activar e inspeccionar alimentación. | Estado de energía y ruta; no modificar voltaje del CPU lógico sin modelo eléctrico validado. |
| Lámpara | Posiciones de inspección y ajuste limitado. | Leer terminales, marcas o material. |
| Sonda | Conectar a puntos autorizados con ajuste al objetivo. | Señal seleccionada y vista sincronizada. |
| Cable/conector | Inspeccionar extremos. | Resaltar origen/destino y tipo de relación. |
| RAM clásica | Seleccionar chip/banco. | Relación con bits, byte bajo/alto y dirección. |
| DIMM | Seleccionar chip, SPD, conector; operar pestañas. | Función de piezas y secuencia de montaje. |
| Reloj | Seleccionar y observar secuencia. | Distinguir reloj, instrucción y velocidad de animación. |
| Pasivos | Seleccionar grupo funcional. | Desacoplo/alimentación, sin fingir simulación analógica. |
| Herramienta/tornillo/bandeja | Recoger, soltar y restablecer. | Manipulación estable y explicación breve de montaje. |
| Soporte | Inspeccionar unión y apoyo. | Sujeción/aislamiento físico. |
| Esquema de pared | Elegir tema. | Abrir el instrumento asociado. |

Estados: reposo, foco, seleccionado, ocupado, deshabilitado, carga y error. Acciones repetidas durante una transición no duplican timelines, cuerpos ni eventos.

## 6. Barra de controles dentro de la escena
HTML sobre el canvas, con botones nativos, foco y etiquetas; no controles esenciales dibujados únicamente en textura3D.

Grupos:
1. Vista: centrar, giro izquierda/derecha, zoom.
2. Objeto: abrir/cerrar, enfocar pieza, frente/reverso cuando exista.
3. Representación: materiales/malla, capas funcionales y cubierta.
4. Entorno: luz de inspección, restablecer objetos, menú de calidad.

Material/malla se elimina del panel derecho. Los controles del programa permanecen en el instrumento del CPU. Importar/exportar y preferencias generales quedan en una zona secundaria de sesión.

Escritorio: grupos compactos anclados al visor, con SVG coherente y nombres cortos. Móvil: fila primaria Centrar/Abrir/Vista y botón Más controles; este abre el resto dentro del área de escena. No esconder giro/zoom al final de un inspector largo.

La barra respeta safe areas y una zona protegida del objeto. El estado abierto/cerrado y material/malla se anuncia correctamente. Atajos solo con foco en el visor; nunca capturan escritura del editor.

## 7. Panel derecho como consola de instrumentos
### 7.1 Organización
Un rack de instrumentos intercambiables responde a selección y ejecución. Jerarquía: estado/operación → visual principal → controles de esa operación → conclusión breve → explicación/fuente plegable. Máximo dos instrumentos abiertos en escritorio, uno en móvil; cambiar no pierde la sesión.

No usar gauges inventados de energía/rendimiento. Las magnitudes provienen del estado real, de una ficha documentada o de una regla didáctica identificada. Los FPS no son rendimiento del procesador estudiado.

### 7.2 Instrumentos
| Instrumento | Representación/interacción | Fuente de verdad |
|---|---|---|
| Registro16 bits | Banda de bits, hex/decimal/binario, bytes alto/bajo y delta; seleccionar bit muestra peso. | Registros/snapshots. |
| ALU | Dos operandos entran, operación y resultado; acarreo/signo diferenciados. | Evento real, sin suma de ejemplo fija. |
| Flags | Símbolo+0/1; seleccionar revela qué cambió y por qué. | Flags antes/después. |
| Direccionamiento | Regletas segmento/offset, desplazamiento cuatro bits, suma y alias. | Dirección calculada. |
| Memoria | Mapa compacto y dos bytes unidos gráficamente; lectura/escritura distinta. | Acceso real y tamaño. |
| Bancos | Carriles byte bajo/alto y selección de chip. | Conversión explícita del evento al escenario. |
| Cinta de instrucción | Opcode, ModR/M, operandos, bytes y cursor. | Decodificador y mapa fuente. |
| Prelectura | Seis posiciones solo con eventos de prefetch modelados; en su ausencia, esquema estático identificado. | Contrato disponible; nunca relleno aleatorio. |
| Analizador lógico | Canales, cursor de etapa y captura. | Pasos explicativos; no nanosegundos inventados. |
| Cronoscopio | Cinta restaurable, búsqueda y A/B de registros, flags, memoria. | Historial/cursor/ramas. |
| Apple | Mapa CPU/GPU/Neural Engine, B0→B1, versión/identidad y sincronización. | Escenario independiente. |
| Máquina general | Rutas dirección/datos/control y extremos. | Transferencia didáctica verificable. |
| Predicción | Elegir resultado antes de ejecutar y contrastarlo gráficamente. | Misión y resultado observado. |

Editor accesible en pestaña Programa, junto a Estado y Traza. SVG/HTML preferidos para gráficos e interacción; Canvas2D reservado a trazas densas. No añadir otro motor2D para unas pocas escalas. Cada visual tiene datos HTML equivalentes.

### 7.3 Estilo y movimiento
Fondo opaco oscuro, marcas de escala, cifras tabulares y unidades. Color acompañado de símbolo/texto. Selección120–180 ms; cambio de instrumento180–240 ms; delta150–250 ms, sin demorar el dato verdadero. Pausa mantiene 2D/3D en el mismo punto. Movimiento reducido sustituye desplazamientos por estados directos.

Selección de pieza: nombre, función en una oración, visual y relación/dato actual. Explicación extensa/fidelidad/fuente son expandibles. No publicar notas de producción, decisiones estéticas o diagnósticos de desarrollador.

## 8. Móvil completo
### 8.1 Distribución propuesta
| Ancho CSS | Layout |
|---|---|
| ≥1200 px | Escena flexible + rack380–440 px. |
| 900–1199 px | Rack320–360 px, instrumentos compactos. |
| <900 px, retrato | Escena + consola inferior; modos Escena/Instrumento/Compartido. |
| Teléfono horizontal | Vista compartida si cabe o cambio de modo conservando estado; no forzar orientación. |

En Compartido, área de escena estable y consola de altura acotada, con estados cerrada/compacta/expandida por botón y gesto. Ejecutar/Pausar/Restaurar siguen al alcance. La expansión no reinicia selección ni cámara.

Una región desplazable activa por modo. Evitar página+inspector+editor compitiendo durante el mismo gesto. El editor tiene scroll propio cuando está enfocado.

### 8.2 Entrada/cámara
- Tap selecciona; órbita solo en modo Manipular vista, con entrada/salida explícita.
- Un dedo no mueve cámara y página simultáneamente. Pinch dentro del visor tiene alternativa de botones; el navegador conserva zoom fuera.
- Cancelar en pointercancel, lostpointercapture, blur y visibilidad.
- Ninguna función depende de hover, doble clic o clic derecho.
- Pins/contactos densos: agrupación y anterior/siguiente; no hitboxes gigantes superpuestos.
- Enfocar pieza y calcular proyección desde el área libre real, incluyendo consola/teclado.
- Safe areas y svh/dvh según estado; teclado virtual no oculta Ejecutar/Pausar.

### 8.3 Criterios
- Targets ≥44×44 CSS px y separación ≥8 px en barra principal.
- Lectura habitual16 px; datos/etiquetas12–14 px si conservan legibilidad.
- Contraste4,5:1 texto y3:1 gráficos/controles esenciales.
- Sin desbordamiento horizontal de página entre320–430 px; tablas/editor pueden tener scroll indicado.
- Zoom200 % y texto ampliado sin controles perdidos o valores recortados.
- Mismas funciones académicas en móvil; degradar imagen antes que retirar acciones.
- Sin WebGL: editor, estado, memoria, historial y aprendizaje disponibles.

Matriz futura:320×568,360×640,390×844,430×932,768×1024,844×390,1024×768,1366×768,1920×1080. Añadir teclado abierto, safe areas, texto ampliado, movimiento reducido y solo teclado. Registrar Android/Chrome e iOS/Safari reales cuando estén disponibles; emulación no los certifica.

## 9. Física acotada
Rapier pasa de «fuera de P0» a **obligación de esta ampliación**, diferido. No simula electrones, circuitos, rendimiento de CPU ni DRAM mediante cuerpos rígidos.

| Sistema | Autoridad | Uso |
|---|---|---|
| Cámara | CameraDirector/GSAP | Encuadre y continuidad. |
| CPU/RAM montada | Fijo/anclado | Apoyo y colisión. |
| Tapa | Cinemático guiado | Despiece con recorrido validado. |
| Herramientas/tornillos | Dinámico Rapier | Recoger/soltar/reposar. |
| Socket | Mecanismo limitado; joint si aporta | Pestañas y montaje. |
| Lámpara | Articulación limitada | Luz de inspección. |
| Cable de fondo | Geometría con apoyos/radios | Forma sin dinámica permanente. |
| Sonda/cable manipulado | Ruta restringida; cadena física condicional | Conexión útil y visible. |

Metros, Y arriba, gravedad de diseño(0;−9,81;0); convertir modelado en mm una sola vez. La ampliación educativa no cambia accidentalmente gravedad/masa.

Paso1/60 s, máximo4 subpasos/frame, acumulador≤0,1 s; descartar excedente tras pausa larga. Interpolar poses. Un coordinador; GSAP propone objetivo cinemático y Rapier aplica pose. Nunca dos escritores sobre el mismo transform.

Presupuesto inicial12 cuerpos dinámicos despiertos escritorio,6 móvil. Colliders primitivos/compuestos, CCD solo donde lo justifique velocidad, cuerpos dormidos en reposo. Reset conocido, teardown completo y no rebote exagerado.

Ligero conserva acción mediante colocación guiada/mecanismos restringidos si la dinámica libre cuesta demasiado. Casos futuros:resting, caída a bandeja, arrastre lento, liberación rápida, reset, pérdida de foco, navegación y reanudación. No prometer determinismo idéntico entre equipos.

## 10. Efectos con propósito
Forma/uniones → materiales → luz → sombras/contacto → postprocesado. Baseline sin efectos siempre legible.

| Efecto | Propósito | Restricción |
|---|---|---|
| Luz de inspección | Leer biseles, metal, plástico y marcas. | Fuente visible y exposición estable. |
| AO/contacto | Apoyo del socket, herramientas y componentes. | Media resolución condicional; sin halos en etiquetas. |
| Bloom selectivo | LED, CRT, señales activas. | Moderado, desactivable, fuera de UI. |
| Traza de señal | Recorrido/orden/extremos. | Derivado de eventos o regla didáctica explícita. |
| CRT | Rejilla, cursor, persistencia tenue. | Canal/captura cambian contenido real. |
| PBR/desgaste | Identidad material. | Campos compartidos y microdetalle filtrado a distancia. |
| Polvo escaso | Haz de luz y profundidad. | Decorativo, apagable, fuera de ligero. |
| DOF | Introducción/inspección optativa. | Desactivado al operar o leer pines/datos. |
| Color | Oscuro sin perder información. | Una conversión de salida; no doble gamma. |

Glitch, aberración, motion blur o grano intenso no se añaden por disponibilidad. Un EffectComposer de la versión instalada, ownership de color/depth/targets explícito. No acumular MSAA/FXAA/SMAA sin medir.

## 11. Presupuestos propuestos
| Métrica | Detalle escritorio | Equilibrado | Ligero móvil |
|---|---|---|---|
| Frame | Mediana≤16,7 ms;p95≤25 ms | Mediana≤25 ms | Mediana≤33,3 ms;p95≤50 ms |
| Draw calls totales | ≤220 | ≤160 | ≤100 |
| Triángulos visibles | ≤350000 | ≤220000 | ≤120000 |
| DPR máximo | 1,5 | 1,25 | 1 |
| Texturas hero | Hasta2K donde aporta | 1K/2K seleccionadas | 1K prioritarias |
| Sombras | Una principal; segunda solo medida | Una | Reducida/contacto alternativo |

Objetivos, no mediciones ya logradas. Reducir coste observado con instancing/merging/LOD y cargar estación bajo demanda; no solo subir geometría. Contar sombras y pases y comparar misma cámara/perfil.

Separar protagonista, periféricos y entorno. Meshopt/KTX2 con decodificadores locales una vez validado el pipeline. IDs se conservan al agrupar mallas.

No reconstruir RAM/historial en cada cambio de valor: actualizar atributos/instancias/texturas y reutilizar recursos. Tras10 recorridos/reset, cifras de geometrías/texturas se estabilizan. El perfil cambia efectos y detalle, dato/acción académica permanece.

## 12. Arquitectura prevista
Flujo: worker/modelos → fachada Angular → instrumentos2D y mundo3D. Ambos devuelven intenciones a la fachada. Física actualiza solo objetos de manipulación; cámara/barra poseen la vista.

Módulos: WorldEngine, InteractionRegistry, CameraDirector, WorkbenchPhysics, InstrumentHost, ResponsiveShell y AssetManifest. La fachada es fuente de selección; el worker sigue siendo fuente de ejecución.

Separar responsabilidades concentradas actualmente en App y AtriumSceneComponent; conservar rutas públicas y adaptar sesiones. No migrar a R3F/WebGPU para resolver UI.

## 13. Uso de skills
Consultadas para esta revisión: Writing Plans, Physics, Game UI Designer/UI Patterns, HTML, Accessibility y Postprocessing. Router, geometry, materials, lighting ydebugging ya forman parte del trabajo previo. Se consultaron instrucciones; no se ejecutaron ejemplos ni pruebas de skills en esta revisión.

| Frente futuro | Skills | Evidencia de implementación |
|---|---|---|
| Modelos | procedural-geometry, geometry, product-viewer | Fichas, topology/geometry gates, vistas fijas. |
| Material | procedural-materials, textures, materials | Identidades PBR, desgaste, luz neutra/rasante. |
| Luz/efectos | lighting, shadow-systems, image-pipeline, postprocessing;bloom/AO si se adopta | Antes/después sin efectos, coste por pase. |
| Física | physics, procedural-animation | Ownership, fixed step, descanso, reset, límites. |
| Consola | game-ui-designer, accessibility, html, frontend-design, Impeccable | UI ligada a datos y revisión escritorio/móvil. |
| Movimiento | gsap-core, frameworks, timeline, performance | Lifecycle, cancelación, reduced motion. |
| Recursos | performance, assets, optimize-3d-assets | Pesos, cámaras fijas, recursos estabilizados. |
| Verificación | debugging, testing, visual-validation | Reproducir fallos, gestos y evidencia. |

Aprovechar ejemplos/contratos pertinentes, no convertir cientos de skills en cientos de dependencias o efectos. Océanos, vegetación, XR ymeteorología no entran por estar disponibles.

## 14. Aceptación
- Pieza académica/operable tiene acción, respuesta y alternativa accesible.
- RAM identificada, frente/reverso inspeccionables, organización comprensible.
- Memoria clásica, moderna y Apple diferenciadas.
- Herramientas de cámara/despiece/material-malla dentro del visor.
- Cada estación tiene una operación gráfica principal, no párrafos apilados.
- Editor, registros, memoria, historial ymisión utilizables en móvil.
- Scroll/órbita/UI/física no compiten; cancelación no deja gesto activo.
- Sin z-fighting, apoyos falsos o piezas atravesadas en vistas aceptadas.
- Sin bloom/AO las señales siguen comprensibles.
- Efectos/física no alteran resultados académicos.
- Medidas y equipos registrados; no cerrar un ítem por estar planificado.

## 15. Secuencia
Contratos/referencias → shell responsive ybarra → primer instrumento real → memorias → protagonistas/banco/interacción → física → instrumentos e historial/buffers → efectos/optimización → aceptación desktop/móvil/local.

La fecha de esta revisión no reinicia la antigua semana ni inventa una fecha nueva de entrega. El detalle de tareas y su relación con pendientes anteriores está en el documento de implementación.
