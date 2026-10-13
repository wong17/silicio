# Catálogo del banco · revisión 3

Las formas se construyen localmente; no se redistribuyen fotografías ni modelos externos. Unidades de presentación: 1 unidad = 20 mm para DDR4 y física. El 8086 es una representación ampliada; no usar como plano de fabricación.

| Ensamblaje | Fuente / contrato | Fidelidad y límites |
|---|---|---|
| 8086 | Intel 8086, DIP40, 1978; ficha enlazada desde la aplicación | 40 terminales, muesca, contactos, cavidad, bond wires, zócalo. Interior funcional ampliado; medidas de presentación, no die real. |
| Intel 2164A-15 | Intel, orden210425-001, abril1982; [documento](https://www.minuszerodegrees.net/memory/4164/datasheet_2164A.pdf) | 65 536 × 1 bit, DIP16, 5V. 16 dispositivos = 128 KiB por cálculo. Placa, routing, socket y cotas no publicadas se modelan como ensamblaje didáctico aproximado; falta plano mecánico de variante para declarar réplica exacta. |
| KVR26N19S8/8 | Kingston VALUERAM1595-001.A00, [ficha](https://www.kingston.com/dataSheets/KVR26N19S8_8.pdf) | Contorno 133,35 × 31,25mm; 288 contactos, 8 componentes FBGA 1G×8, 8GB1Rx8 DDR4-2666 CL19, 1,2V. Contactos 144/cara. Espesor de PCB1,2mm y encapsulados aproximados, no medidas verificadas de un lote. Llave, sockets y pasivos son interpretación. |
| Apple | Arquitectura funcional, fuente Apple WWDC2020 | SoC conceptual sin variante exacta ni LPDDR comercial afirmada. B0/B1 con transformación ilustrativa ×2. |
| Banco | Instrumentos y muebles originales | Osciloscopio de captura didáctica; fuente5V de referencia estática, no medida eléctrica. Lámpara, cables, sonda, tres herramientas y bandeja. |

## Libros consultados para el plan
Stallings, Organización y arquitectura, 7.ª: DRAM/SRAM, encapsulados, módulos y DDR (páginas impresas151,157,158,169). Programming the8086/8088: organización de memoria (48–49). La placa clásica explica bancos de bytes; DDR4 permanece una galería de tecnología posterior, nunca conectada al8086 ni atribuida a Apple.

## Contratos reales
Estado inicial AX7, DS2000, CS1000, SS3000, IP0100. Ventana lógica de32bytes independiente de la capacidad física ilustrada. Palabras little endian con envoltura física a20bits en el núcleo actual; no se cambió esa política para adaptar el dibujo. Historial hasta2048pasos por corrida; ramas conservadas8en memoria. SesionesJSONv1 restauran valores y recalculan eventos.

## Puertas pendientes
No se cierra R00/R06 como réplica mecánica: faltan fotos/plano de lote y verificación completa de cotas, holguras y todas las caras. La representación tiene identidad y organización correctas; los valores aproximados permanecen expresos.
