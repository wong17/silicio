# Plan de ambientación y rendimiento — SILICIO

Actualizado 13 de octubre de 2026. Rama codex/scene-instruments-mobile, sin commit.

## Objetivos

1. **Sala cerrada.** Cuatro paredes, techo y suelo. Ninguna zona visible queda negra: las paredes lejanas se funden con una neblina cálida, no con un vacío.
2. **Contenido temático.** Libros de la asignatura, maquinaria (osciloscopios, analizadores, fuentes, racks), equipos (torres, CRT, teclados), planos, chips (bandejas, encapsulados, obleas), piezas (cajones de componentes).
3. **60 FPS mínimos** en GPUs integradas, sin bajar la calidad gráfica más de lo necesario.
4. **Identidad.** El icono de la pestaña es el chip de la marca, no el de Angular.

## Estado de partida (medido en el navegador integrado)

Equipo de prueba: NVIDIA GeForce GT 730, que sirve como referencia de iGPU débil. Render sincronizado (`render` + lectura de un píxel), canvas 870×614 px, DPR 1.

| Medida | Antes | Después |
|---|---|---|
| Fotograma, vista por defecto | 20,5 ms (≈49 FPS) | 14,6 ms |
| Con la mitad de píxeles | 10,2 ms | 7,2 ms |
| Triángulos por fotograma | ≈207 000 | ≈83 000 |
| Llamadas de dibujo | 168 | 102 |

Lo que costaba más, medido por eliminación: la luz de área del techo (≈5,5 ms de los 20,5), la resolución (el coste es casi lineal en píxeles) y, en menor medida, las sombras (≈1,8 ms).

## Decisiones tomadas

- **Iluminación:** la `RectAreaLight` del techo pasa a una `PointLight`, mucho más barata por píxel.
- **Geometría:** las cajas redondeadas usan 1 segmento en lugar de 2 (≈60 % menos triángulos).
- **Resolución adaptativa:** la escala de píxeles baja de 1,0 a 0,5 si la mediana de fotograma supera 18 ms, y sube con holgura por debajo de 13,5 ms. Hay un periodo de espera de 2 s tras cada cambio para no oscilar.
- **Niebla y fondo:** el aire más allá de la sala tiene el mismo color cálido (`#3a403e`) que el fondo; la niebla empieza a 44 unidades y el plano lejano está a 180. Así las paredes lejanas no se ven negras.
- **Sala cerrada:** paredes laterales en x = ±38 y frontal en z = 38. La cámara queda acotada a x ±34, z ≤ 34 y bajo el techo.
- **Equipo en el suelo:** torres (una de pie, una tumbada), CRT con esquema en pantalla, teclado y ratón, pila de placas con chips, cajas de cartón, bandeja de CPUs, bolsas antiestáticas, planos y una caja de oblea en la estantería.
- **Contenido de las paredes:** módulo `lab-library.model.ts`, escrito por un subagente. Estanterías de libros (instancias con color), armario de componentes, instrumentos con pantallas, planos enmarcados, placas con chips y computadoras viejas. Pocas texturas (atlas) y pocas llamadas de dibujo.
- **Icono:** `public/favicon.svg` con el chip de la cabecera (grafito y ámbar). Sustituye el `favicon.ico` de Angular.

## Límites

- La resolución adaptativa corre sobre el bucle de `requestAnimationFrame`. En el panel del navegador integrado ese bucle no avanza, así que su efecto se comprueba con las mediciones sincronizadas, no con FPS reales.
- No hay medidas en hardware real. La GT 730 es un límite inferior: en un equipo más potente la escala se queda en 1,0.
- Las paredes lejanas aumentan el número de fragmentos cuando la cámara mira hacia las esquinas. Conviene medir también esas vistas.

## Próximos pasos

1. (Hecho) Módulo de paredes integrado, medido en la vista por defecto y revisado desde tres puntos de la sala.
2. Medir el coste de CPU por fotograma en las cinco estaciones.
3. Revisar la sala en tableta y móvil.

## Paredes con contenido y rendimiento (último ajuste)

- **Paredes.** `world/models/lab-library.model.ts` (escrito por un subagente y revisado en el navegador) pone libros de la asignatura en estanterías de la pared izquierda, un armario de componentes con cajones etiquetados y una vitrina de chips a la derecha, un rack de instrumentos con pantallas y carteles de planos en la pared frontal, computadoras viejas y racks de 19 pulgadas en el suelo, y una pizarra con diagramas.
- **Rendimiento.** Los atlas de esas paredes se pintan a media resolución con la misma geometría de dibujo. Medido en la GPU de prueba (GT 730, 870×614 px, DPR 1, render sincronizado): escena vacía 0,6 ms; escena completa 18,8 ms; 139 llamadas de dibujo; unos 93 000 triángulos; 267 texturas. Antes de reducir los atlas la escena completa tardaba unos 40 ms.
- **Límites.** Las cifras son de una GPU compartida con otras aplicaciones; no sustituyen a una medida de FPS en un equipo real. Los rótulos pequeños de los lomos y de los cajones se ven borrosos a distancia. Sin comprobar en tableta ni móvil.

## Z-fighting, luz y lámpara (última pasada)

- **Z-fighting.** `world/models/coplanar-faces.spec.ts` construye el banco sin navegador y falla si dos caras visibles que miran al mismo lado comparten plano y se solapan (área mayor que 0,05). Corregido: la estantería del fondo a la izquierda (el compartimento oscuro coplanar con el frente de la caja clara, y tablas y estantes que llegaban al plano de los laterales), las dos estanterías de libros, el rack de instrumentos, el mueble de componentes de la derecha, los integrados de la bandeja (solapados) y el tablero trasero. Ya no quedan pares visibles.
- **Luz.** La luz ambiental baja: hemisferio 0,35, entorno 0,45, exposición 1,0, sin relleno ni lavado de pared. Dos focos de techo de la misma potencia (260): uno sobre la mesa y sus alrededores, otro en la mitad de la sala detrás de la cámara. El segundo parpadea como un tubo averiado (`world/failing-light.ts`: caídas cortas y tartamudeos; con movimiento reducido queda fijo). Ambos tienen luminaria visible y no proyectan sombra, así que la lámpara sigue siendo la única que proyecta sombras.
- **Lámpara.** La base queda fuera de la alfombra (x = -8,9, z = 3,4; la alfombra va de x -7,75 a 7,75). La columna sube a 2,9 y la cabeza empieza a 5,0 sobre el punto de mira. La potencia del foco sigue la distancia al cuadrado, así que la zona iluminada conserva su brillo a cualquier altura.
- **Paredes.** Acabado `panel` (paneles con juntas, un tono propio por panel y una franja más oscura cerca del suelo) y `acoustic` para el techo (retícula y perforaciones).

