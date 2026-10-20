# Línea base del rediseño (T00)

Fecha: 19 de octubre de 2026. Commit de partida `62c2708` en `codex/scene-instruments-mobile`, con `docs/PLAN.md` (revisión 5.1) sin confirmar. Nada de lo descrito aquí está arreglado: es el punto de comparación de T11.

## Entorno

| Elemento | Valor |
|---|---|
| Sistema | Windows 10 Pro 19045, Node 24.11.1, npm 11.18.0 |
| Angular | core/common/router 21.2.25, CLI y build 21.2.24 |
| Three.js | 0.186.1 |
| Vitest | 4.1.11 |
| Navegador | Chromium 152 (panel de navegador de la app de escritorio) |
| GPU | ANGLE (NVIDIA GeForce GT 730, Direct3D11 vs_5_0 ps_5_0), DPR 1 |
| Perfil gráfico inicial | «Ligero» (low), elegido automáticamente por la GPU |

## Pruebas y build

| Comando | Resultado |
|---|---|
| `npm test -- --watch=false` | 67 archivos, 319 pruebas, todas en verde (21,8 s). README dice 308: el recuento está desfasado. |
| `npm run build` | Correcto. Inicial 615,48 kB (163,69 kB transferidos); escena diferida 835,61 kB; Rapier 4,34 MB; worker 9,52 kB. |

## Distribución y colisiones observadas

Capturas en esta carpeta (`base-8086-*.jpg`).

| Viewport | Observación |
|---|---|
| 1366×768 | Consola fija de 410 px a la derecha; Programa, Estado y Traza son pestañas excluyentes. Barra de escena con seis iconos y «…»: Piezas, Mapa y Gráficos quedan dentro de «…». La indicación «Selecciona una pieza · arrastra el anillo de la lámpara para iluminar» ocupa la esquina inferior izquierda junto a la barra. |
| 1366×768, rótulos (T) | Quince nombres en cajas de 168×26 px, apilados en dos columnas sobre el chip, con líneas guía que cruzan otras piezas y nombres cortados («Oscilador de referenc…», «Unidad aritmético-lóg…», «Desacoplo y terminaci…», «Unidad de interfaz de…»). Reproduce las capturas 3 y 4 del usuario. |
| 1024×768 | Consola de 340 px; «La máquina» aparece desvanecido al final de la navegación; la barra de escena tapa la parte baja del banco. |
| 390×844 | Navegación cortada («Apple Silic…») con desplazamiento horizontal; modos Escena/Compartido/Instrumento; la barra de escena cubre el borde inferior del chip; Programa y Estado siguen siendo pestañas. |

La captura 2 del usuario (barra con «Piezas», «Mapa» y «Gráficos» como botones de texto aparte y la indicación cortada bajo la barra) corresponde a un ancho de escenario de 1060 px o más, donde la regla `@container stage (min-width: 1060px)` sube la indicación a 68 px pero otra regla posterior la devuelve a 12 px.

## Aviso X4122

- **Reproducido** al cargar `/8086` en desarrollo con la GT 730: el mismo texto del usuario (`(210,81-129) … sum of 0.996094 and -2.98545e-017 …`).
- **Solo al arrancar.** Ningún programa vivo (42) conserva el aviso en su registro, y no reaparece al: cambiar entre estaciones; activar las sombras (perfil Detalle, 25 programas nuevos); generar miniaturas de piezas; crear otro PMREMGenerator.
- **Hipótesis de §8 no confirmada.** En three 0.186.1 el chunk `packing` (donde `UnpackDownscale = 255/256 ≈ 0,996094`) solo lo incluye `depth.glsl` (MeshDepthMaterial, que usa el mapa de sombras), pero los programas de sombra compilados después no emiten el aviso. Posible causa de que no reaparezca: la caché de programas de ANGLE/Chromium devuelve binarios ya compilados sin registro.
- **Siguiente paso (T11):** repetir con un perfil de navegador limpio o `--disable-gpu-program-cache` y un gancho de diagnóstico activo antes de crear el renderer, para nombrar el material. Mientras tanto se trata como aviso del compilador HLSL sin impacto demostrado: el programa enlaza y la imagen es correcta.

## Programas del curso con el ensamblador actual

Programas de `src/app/content/course-programs.ts` (misiones 10–17):

| Misión | Primer error | Siguiente error sin `ORG 100h` |
|---|---|---|
| 10 Hola mundo | Línea 1: Instrucción no admitida: ORG | Literal fuera de 16 bits: OFFSET MSG |
| 11 Suma de dos dígitos | Ídem | El destino debe ser un registro de 16 bits (`MOV AH, 01h`) |
| 12 Suma de un arreglo | Ídem | Literal fuera de 16 bits: DW 1 |
| 13 Multiplicación | Ídem | Literal fuera de 16 bits: DW ? |
| 14 Contar dígitos | Ídem | Instrucción no admitida: DIV |
| 15 Invertir un número | Ídem | Instrucción no admitida: DIV |
| 16 Promedio de notas | Ídem | Literal fuera de 16 bits: DB 80 |
| 17 Una macro | Ídem | Literal fuera de 16 bits: MACRO TEXTO |

Ninguno ensambla: confirma el alcance de T04a.

## Rendimiento

No medido en esta línea base: el panel del navegador estaba oculto y el navegador limita los fotogramas de una página en segundo plano, así que los tiempos no serían representativos. El motor ya publica `frameP50/P95`, `gpuP50/P95`, llamadas, triángulos, geometrías y texturas en `canvas.dataset` cada 60 fotogramas; T11 los lee con el panel visible, 1366×768, perfil Ligero, 9 s por estación, en este orden: 8086, Memoria, La máquina, Apple, Cronoscopio.

## Libros (D5)

Sin ruta de libros: no se incorporaron capítulos.
