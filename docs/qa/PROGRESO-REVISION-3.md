# SILICIO — revisión 3: evidencia y pendientes

Actualizado: 13 de octubre de 2026. Implementación reanudada por el usuario desde 1ce8dce. Esta revisión registra resultados concretos; no certifica todas las extensiones del plan maestro.

## Cambios de este incremento

- CPU: 40 terminales centrados en pads y perforaciones; zócalo con canales reales, apoyos de cerámica y holgura de tapa. Datums compartidos en cpu-assembly.ts. La entrada controlada del terminal al encapsulado es intencional, no una pared maciza atravesada accidentalmente.
- RAM clásica: 16 Intel 2164A, filas separadas, 256 perforaciones, marca de orientación excavada y apoyos. Galería Kingston: 288 contactos, ranura con holgura, módulo insertado y pestillos alineados. No se presentan direcciones/bancos 8086 en la galería DDR4.
- Selección: contactos instanciados también responden al raycast; selector equivalente sin WebGL; agrupaciones semánticas con explicación.
- Fachada: respuestas tardías descartadas, una petición worker vigente, instrumentos derivados de eventos reales.
- Física: herramientas dinámicas y seguimiento cinemático de tapa/pestillos. GSAP es dueño de la pose visual del mecanismo; Rapier la sigue.
- Máquina: transferencias ilustrativas de dirección/datos/control, lectura de 7, suma de 5, escritura y salida de 12.
- Código: modelos independientes por referencia, constructor de estaciones, motor Three.js sin Angular y adaptador Angular con HTML/SCSS externos. Contenido separado en content/. No hay templates/styles inline en componentes de producción.

## Verificación

| Requisito | Evidencia | Alcance |
|---|---|---|
| Encaje CPU | cpu-fit.spec.ts: 6 contratos sobre los 40 pines, perforaciones, canales, apoyos, banda de entrada y tapa | Coordenadas de la maqueta; no cotas de fabricación |
| Encaje RAM | memory-models.spec.ts: 7 contratos, incluidas filas, ejes, ranura y retenciones | Ambos modelos |
| Selección instanciada | scene-picking.spec.ts con geometría CPU e instanceContacts reales | Regresión fallaba antes de la corrección |
| Sesión y worker | laboratory.facade.spec.ts, session-codec.spec.ts, pruebas del motor y 8 misiones | Suite total 83/83, 22 archivos; salida 0 |
| Producción | npm run build, salida 0 | Initial 463.95 kB; escena diferida 676.13 kB; Rapier diferido 4.34 MB. Sin advertencia de presupuesto CSS |
| Geometría CPU | ../geometry-report.json: 335 meshes, 95456 triángulos, 40 pines, zfight[] y defects[] | Ensamblaje auditado; textos excluidos |
| Geometría RAM | memory-geometry-report.json: clásica 91 meshes/26916 triángulos, DIMM 20 meshes/1808 triángulos; ambos sin defectos detectados | Auditoría más pruebas de encaje; no toda la habitación |
| Recursos | silicio-v5-final-roundtrips.json: 10 recorridos por memoria→tiempo→Apple→máquina→8086 | Al volver: 226 buffers, 72 geometrías, 104 texturas constantes; 0 piezas sin clasificar en el sujeto; sin errores de consola |
| Responsive | silicio-v5-responsive.json: nueve tamaños de 320×568 a 1920×1080 | Viewports emulados; sin overflow horizontal. Confirmación final 390×844: ancho 390, controles 44×44, menú se cierra al enfocar |
| Recuperación JSON | Paquete local: exportar AX=0007h, avanzar a 000Ch, importar archivo y observar 0007h | Flujo de navegador, además de codec |
| Revisión independiente | review_current_increment: 3 Important corregidos con RED→GREEN; review_geometry_structure: sin Critical/Important nuevos | Segunda revisión estática; navegador comprobado por implementador |

La primera medición rápida de recorridos se descartó porque podía leer métricas de una estación anterior antes de actualizar Angular/render. El archivo final toma una observación tras cada navegación y espera metricsStation. No se usa una lectura desfasada como evidencia de fuga o estabilidad.

## Rendimiento observado

Equipo: NVIDIA GeForce GT 730, ANGLE/D3D11, navegador integrado. Acercamiento final CPU equilibrado: 240 frames, p50 25.10 ms / p95 49.70 ms; GPU 24 muestras, p50 5.89 ms / p95 11.30 ms. Son condiciones de esa captura, no promesa de FPS en otros equipos.

Medición anterior en este mismo incremento con RAM: alto p50/p95 23.2/37.2 ms, GPU 11.06/18.87 ms; equilibrado 18.6/29.1 ms, GPU 7.09/16.42 ms. No es una comparativa controlada definitiva. Tres perfiles manuales; alto usa salida HDR/MSAA cuando se soporta. Bloom retirado porque dificultaba leer los metales. No se añadió AO/DOF sin coste demostrado.

## Estado por paquete del plan

| Paquete | Estado comprobado | Puerta aún abierta |
|---|---|---|
| R00 | Referencias y límites en catálogo | Mecánica exacta del lote 2164A y espesor/encapsulado DIMM no verificados |
| R01 | Fachada, operandos reales, época de sesión y descarte worker probados | Ampliaciones futuras del contrato académico |
| R02 | Registry, instancias, equivalentes y cobertura de sujeto | Inventario per-pin de RAM no se inventa sin pinout; accesibilidad con ayudas reales |
| R03 | Toolbar, foco por bounds/región libre, 44 px y cierre del menú móvil | Evaluación de foco por usuarios |
| R04 | Modos, scroll nativo, cancelación y nueve viewports | Teléfonos/teclados virtuales reales y zoom 200% integral |
| R05 | Bits, operandos, resultado y CF/OF visuales | Pruebas de comprensión con docente |
| R06 | Dos referencias RAM, perforaciones y encajes probados | Cotas mecánicas exactas y validación de cada cara del lote |
| R07 | Banco, instrumentos, contenido útil y encaje CPU corregido | Auditoría exhaustiva de todos los volúmenes barridos y apoyos del entorno |
| R08 | Paso fijo, límites, herramientas, cancel/reset y mecanismos probados | Comparativa de trayectoria a 30/60 FPS y drag en dispositivos reales |
| R09 | Segmentación, alias, bytes y señales didácticas | Temporización eléctrica real fuera del modelo actual |
| R10 | 8 ramas, restauración, A/B, codec v2/v1, B0/B1 y dependencia CPU/GPU | Prefetch eléctrico/interrupts no implementados; esquema explícitamente didáctico |
| R11 | Salida única, perfiles, recursos y timer GPU | Presupuesto por más hardware y coste aislado de cada pase |
| R12 | Build, 83 pruebas, geometría, recorridos, viewport, sesión y revisiones | Prueba desconectada de red, evaluación móvil/ayudas técnicas real y aceptación del docente |

## Decisiones y diferencias respecto a archivos previstos

Los nombres previstos eran orientativos: intel-2164a-memory.model.ts y kingston-dimm.model.ts son los propietarios actuales. App conserva los instrumentos 8086/memoria/historial en app.html; MachineInstrument sí tiene componente propio. No se declara que todos los componentes futuros del rack hayan sido extraídos. El layout comparte shell-base.scss sin mezclar markup dentro de TypeScript.

No se borran requisitos por falta de evidencia. Interrupciones, prefetch real, caché, constructor libre, cooperación y otras extensiones P1/P2 conservan su prioridad histórica. La geometría es una maqueta educativa detallada, no un CAD de fabricación.

El detector Impeccable se ejecutó una vez: emitió avisos orientativos de tokens/paleta respecto a DESIGN.md; no equivale a validación sin observaciones. Se mantuvo el lenguaje industrial oscuro autorizado y se verificaron tamaños/encuadre en navegador. Separación de toolbar escritorio antes diferida: ahora 8 px.
