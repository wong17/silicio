---
name: SILICIO
description: Banco de inspección usado
colors:
  graphite: '#101214'
  console: '#181b1e'
  metal: '#313336'
  copper: '#b77b52'
  amber: '#d7ac6f'
  text: '#e3ded2'
  button-ink: '#172019'
typography:
  display:
    fontFamily: 'Barlow Condensed, sans-serif'
    fontSize: 'clamp(48px,5.7vw,86px)'
    fontWeight: 600
    lineHeight: 0.92
  headline:
    fontFamily: 'Barlow Condensed, sans-serif'
    fontSize: '38px'
    fontWeight: 600
    lineHeight: 1.03
  body:
    fontFamily: 'Barlow, sans-serif'
    fontSize: '16px'
    fontWeight: 400
    lineHeight: 1.6
rounded:
  controls: '0px'
  editorRail: '9px'
  editorTool: '5px'
  tooltip: '4px'
spacing:
  compact: '8px'
  inspector: '26px'
components:
  button-primary:
    backgroundColor: '{colors.amber}'
    textColor: '{colors.button-ink}'
    rounded: '{rounded.controls}'
    padding: '12px 11px'
---

# Design System: SILICIO

## Overview

**Creative North Star: "Banco de inspección usado"**

Banco de inspección usado: una experiencia oscura con componentes físicos y una consola de operación. La interfaz usa grafito, cobre y ámbar; los modelos llevan desgaste procedural y límites educativos explícitos.

## Colors

Tema exclusivamente oscuro. Grafito para fondo, consola para inspector, metal para el banco, cobre para detalles y ámbar para acciones. Acentos apagados por estación: cobre en 8086, verde en memoria, lavanda gris en tiempo y acero azul en Apple. Las superficies cerámicas del objeto pueden ser claras; no son un tema claro de interfaz.

## Typography

Barlow Condensed 600 en títulos HTML, Barlow 400/600 en lectura y controles, IBM Plex Mono 400 en datos. H1 usa clamp(48px,5.7vw,86px), h2 38px, h3 25px, cuerpo 16px/1.5, registros14px. Los títulos se adaptan a55px y51px en ventanas estrechas. Las etiquetas 3D actuales usan bold26px monospace sobre textura canvas, no Barlow Condensed. Fuentes locales con licencias OFL en public/fonts.

## Layout

Escena a la izquierda e inspector de390px a la derecha; a1150px pasa a350px, a1700px450px. Bajo900px hay modos Escena, Compartido e Instrumento; el modo Compartido reserva42% al visor y mantiene una región de scroll en la consola. Instrumento ocupa toda el área libre; el editor selecciona ese modo al enfocar en teléfono. Navegación móvil horizontal. Espaciado compacto8px y relleno del inspector26px.

## Elevation & Depth

La interfaz separa por tono y línea; la profundidad vive en Three.js. Geometría biselada, luz de inspección cálida, sombra física, materiales PBR y desgaste determinista compartido entre color, rugosidad y relieve. Materiales procedurales, todavía sin fidelidad fotorealista de producción.

## Shapes

Controles rectangulares sin radio. Bordes finos, placas biseladas y pines metálicos. SVG propio para identidad y giros.

## Components

Botón primario ámbar, secundarios grafito y foco2px ámbar. Campos oscuros, editor monoespaciado y mensajes de error visibles. Navegación activa subrayada; directorio de estaciones con divisores. Registros en celdas compactas, flags con estado numérico. Anotaciones con línea lateral1px y texto de lectura.

## Do's and Don'ts

Do mantener el tema oscuro, usar monoespaciado para datos y ofrecer controles HTML equivalentes.

Don't convertir los bloques conceptuales en afirmaciones de distribución exacta del silicio ni declarar terminado el plan completo.

El sidecar documenta valores observados y no genera rampas tonales nuevas; queda pendiente esa extensión para el panel de Impeccable.

Modelo y ambiente actualizados: encapsulado alargado con cavidad, perfil extruido de los terminales, zócalo y soporte físico sobre un banco de electrónica. El taller tiene pared, instrumentos, lámpara, herramientas y cableado; las vistas de memoria e historial muestran valores de la simulación. En móvil, la cámara reserva espacio vertical para la explicación y el objeto.

## Barra de edición del visor
La petición del usuario fija una barra inspirada en editores3D: iconos SVG de22px, herramientas44×44px, carril metálico oscuro y separadores finos. Radio del carril9px, herramienta5px y tooltip4px son ampliaciones intencionales del lenguaje anterior. Estados ámbar de malla/despiece/luz; tooltips de texto Barlow13px y nombres accesibles. Escritorio conserva separación6px; móvil8px y menú3columnas con tamaño uniforme. El último control tiene exactamente la misma área.

## HUD de escena y rótulos (revisión 4)

- **Mapa del banco** y **bandeja de piezas** viven sobre el visor, plegados por defecto en un botón de 44 px. Abierto, cada uno entra con `scale(0.96)` y opacidad en 180–200 ms, `cubic-bezier(0.23, 1, 0.32, 1)`, con origen en su esquina. Con movimiento reducido no hay animación.
- **Tinta de los rótulos 3D**: se elige por contraste medido contra la superficie que los sostiene (≥ 4,5:1): tinta clara `#f1ead2` sobre superficies oscuras, oscura `#15120c` sobre claras; contorno del tono opuesto al 35 %. Los rótulos reciben luz como la superficie, así que el contraste no cambia al mover la lámpara.
- **Rótulos flotantes** (tecla T): etiquetas HTML de 26 px de alto con línea guía, de tamaño constante en pantalla, dentro de la región libre.
- Objetivos táctiles ≥ 44 × 44 px y separación ≥ 8 px también en el HUD.
