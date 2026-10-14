# SILICIO — estado para continuar

Actualizado 13 de octubre de 2026. Proyecto E:/Repositories/silicio, rama codex/scene-instruments-mobile. Cambios de este incremento sin commit. Fuente autoritativa: src/ en ese repositorio.

## Incremento actual: laboratorio alrededor del banco

**Entorno.** La escena ya no flota en un vacío: `world/models/lab-room.model.ts` construye la única pared, la del fondo, frente al banco (panel perforado, estantería, almacenaje, reloj y tuberías), el suelo de baldosas, el techo a 18 unidades con tubos fluorescentes, un mueble base con cajones que llega al suelo (sostiene la mesa), carro de instrumentos, taburete, extintor y papelera. La sala está cerrada: paredes laterales en x = ±38 y frontal en z = 38, techo a 18 y suelo. La cámara queda dentro de la sala (`world/room-bounds.ts`, aplicado en cada fotograma del motor), así que el zoom out nunca traspasa una pared ni el techo. El color del aire lejano (`HAZE`) coincide con el fondo y la niebla empieza a 44 unidades, para que las paredes lejanas no se vean negras. Equipo de diseño en el suelo: `world/models/lab-equipment.model.ts` (torres, CRT con esquema, placas con chips, cajas, bandeja de CPUs, bolsas antiestáticas, planos y oblea). La fuente de laboratorio muestra tensión y corriente en vivo, con serigrafía en el panel. El mapa de «Iluminación del banco» muestra el banco completo, centrado, con el anillo de alcance del brazo. Los textos de la portada van sobre un velo de esquina (sin cajas), y la luz ambiental es más cálida y uniforme (exposición 1,12, entorno 0,8, relleno frontal y un lavado en el fondo). La sala es decorativa: nada de ello es seleccionable.

**Planos en las paredes.** Hojas de esquema dibujadas a mano (bloques del 8086, celda DRAM, inversor CMOS, bloques del SoC, ciclo de bus) con papel envejecido y el sello «CONCEPTUAL · NO A ESCALA» (`models/wall-blueprints.model.ts`, `textures/blueprint-sheets.ts`).

**Banco apoyado en el mundo.** Cada estación baja hasta el mat por la base real de su placa (`bench-layout.ts`: `boardBase`, `matTop`; `WorldEngine.ground`). El mat descansa en la mesa, la bandeja en el mat y las herramientas en la bandeja. El osciloscopio, la fuente y la sonda apoyan en la mesa. Los cables no cruzan la bandeja ni las herramientas. El cajón de componentes tiene compartimentos visibles encima.

**Herramientas.** Al agarrar una herramienta queda en la mano hasta que se suelta («Soltar herramienta» o Escape). Con la mano vacía el botón está deshabilitado y no se mueve nada. El suelo de colisión evita que algo caiga sin fin. Las herramientas se mueven por el lado derecho del banco, sin pasar por los instrumentos altos (se elevan por encima de ellos).

**Lámpara.** «Iluminar pieza» enciende la lámpara y apunta al centro de la pieza. Si el brazo no llega, la luz se detiene en el borde de su alcance y el visor lo dice. Brazo de 5,6 + 5,2 unidades; alcance horizontal de 10,2 desde la columna (`world/lamp-limits.ts`).

**Instrumentos animados.** Todos usan el registro `WorkshopTools.animate(fn, 'room' | 'subject')`; con movimiento reducido el tiempo queda en cero.
- Osciloscopio: traza analógica que se desplaza y carril de strobe ALE/RD/WR que refleja el canal elegido en el instrumento de señales.
- Multímetro: lectura que deriva y repinta solo cuando cambia el texto.
- Fuente: piloto que respira. Soldador: LED de espera ámbar.
- Máquina: paquetes que viajan por los buses y LEDs de estado con ritmos distintos.
- Cronoscopio: aguja del dial y cuadro de la línea de tiempo que se ilumina en su turno.
- Apple: bloques del die que se iluminan en secuencia.

**Modelos ampliados.** La máquina es una placa verde con tres chips en zócalos, buses de cobre (direcciones, datos, control), cristal, condensadores, ranura de expansión y tornillos (`models/machine-board.model.ts`). El cronoscopio tiene base, eje, dial y dieciséis cuadros en hélice (`models/chronoscope.model.ts`). Apple suma bloques con etiqueta, PMIC, cristal, bobinas, trazas y puntos de prueba (`models/apple-soc.model.ts`); el die se ve al abrir el chip con la tecla E o el botón de la barra.

**Superficies.** Sin patrón de contorno (que parecía agua). El desgaste sale en parches con bordes granulados y arañazos; el acabado `tile` da las baldosas del suelo.

**Interfaz.** Los bordes de color a la izquierda son degradados desde el borde (portales de estación, alertas y paneles de instrumentos). Sin líneas sólidas en ese lado.

## Verificación de este incremento

- 122 pruebas en 28 archivos, todas pasan. Incluyen auditoría de contacto del banco (`bench-clearance.spec.ts`: objetos apoyados, herramientas sobre la bandeja, cables fuera de sólidos) y alcance de la lámpara (`lamp-limits.spec.ts`).
- Build de producción correcto. Carga inicial 528 kB frente a un presupuesto de 900 kB.
- Detector de Impeccable sobre los archivos de interfaz tocados: 95 avisos de paleta, tamaño de letra y radio fuera de DESIGN.md (ya existían en la consola). Sin antipatrones bloqueantes.
- Navegador integrado: 8086, máquina, cronoscopio, Apple y vistas de la sala desde el frente derecho, el fondo izquierdo y lateral izquierdo. Zoom out con los controles: la cámara se detiene bajo el techo y la vista ya no se vuelve blanca. Sin errores de consola.

## Límites explícitos

- Sin probar en teléfono real, teclado virtual, zoom 200 % ni lectores de pantalla.
- No hay cifras de FPS en hardware representativo; la GT 730 de prueba no lo es. La estación 8086 pasó a unos 170 000 triángulos por la sala: conviene medir en equipos modestos.
- La lámpara alcanza la mitad izquierda y el centro del banco. El lado derecho (suministro, mug, bandeja de chips) queda fuera y lo indica el aviso.
- El arrastre de la lámpara y de las herramientas se comprobó con eventos de puntero simulados, no con ratón real.
- Las animaciones de GSAP no avanzan en una pestaña sin foco; la comprobación de la apertura de Apple se hizo colocando la tapa a mano.

## Paredes con contenido y rendimiento

Las paredes de la sala tienen contenido temático en `world/models/lab-library.model.ts`: estanterías de libros, armario de componentes, vitrina de chips, rack de instrumentos, carteles de planos, pizarra, computadoras y racks. Los atlas de esas paredes se pintan a media resolución. En la GPU de prueba (GT 730, 870×614 px) la escena completa tarda unos 18,8 ms por fotograma frente a 0,6 ms de la escena vacía. Las cifras son de una GPU compartida; falta una medida de FPS en un equipo real.

## Lo que sigue abierto

1. Revisión en teléfono y tableta, FPS en un equipo representativo y, si hace falta, reducir triángulos de la sala.
2. Cotas mecánicas exactas de variante/lote, pinouts no verificados y auditoría integral de volúmenes.
3. Android/iOS y teclado virtual reales, zoom 200 % integral, ayudas técnicas y comparación física 30/60 FPS.
4. Prueba de paquete realmente desconectado, más equipos GPU y aceptación docente.
5. Extensiones P1/P2: interrupciones, prefetch real, caché, constructor libre, cooperación y experiencias adicionales según plan histórico.

No marcar revisión 3 ni plan maestro completo por el número de tests. Consultar la tabla R00–R12 y cerrar cada puerta con evidencia.

## Operación

Desarrollo 127.0.0.1:4200; paquete usado 127.0.0.1:4307. No detener 4300, ocupado por otro proceso. Producción: set SILICIO_PORT=4307 seguido de npm run preview en CMD.

Ledger .superpowers/sdd/SILICIO-IMPLEMENTACION-ESCENA-INSTRUMENTOS-MOVIL/progress.md conserva decisiones; no borrarlo mientras haya puertas pendientes.
