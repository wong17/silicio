# Resultados de aceptación (T11)

Fecha: 2026-10-20 · Navegador: Chromium headless (Playwright 1.56.1, SwiftShader, `reducedMotion: reduce`) sobre la build de producción servida con `tools/serve-production.mjs`.

## Ejecutado y verde
| Qué | Evidencia |
| --- | --- |
| Pruebas unitarias | 92 archivos, 653 pruebas |
| Build de producción | sin errores; bundle inicial ≈ 839 kB (objetivo ≤ 900 kB) |
| `check:geometry`, `check:tokens`, `check:offline -- --dist` | sin defectos ni referencias externas |
| `e2e/workspace.spec.ts` | 12 viewports × 4 capítulos (sin scroll horizontal ni regiones esenciales superpuestas), objetivos de 44 px y zoom 200 % |
| `e2e/course-programs.spec.ts` | misión 10 («Hola mundo» en Pantalla), misión 11 con teclado real (34=7), error de ensamblado |
| `e2e/learning-paths.spec.ts` | 8086→Memoria→Banco conserva paso y datos; PC (SSD→RAM→monitor) → comparación en el SoC; redirecciones /apple y /time; guía por acciones con Esc |
| `e2e/graphics-lifecycle.spec.ts` | diez recorridos sin crecimiento de geometrías/texturas; pérdida de contexto; sin WebGL; pestaña oculta; movimiento reducido |

Defectos encontrados y corregidos con estas pruebas: el popover de Driver.js se colocaba fuera de pantalla (ancla demasiado grande y fuera del viewport; ahora anclas compactas y scroll previo); los programas largos del PC no terminaban a 450 ms/paso (se añadió la velocidad «Inmediata»).

## No hecho / no verificado (no se declara cumplido)
- **X4122**: no reproducido; requiere el navegador con GPU real. No se silenció ninguna advertencia y no hay excepción documentada.
- **`compileAsync` al cambiar de capítulo y p95 frente a T00 (≤110 %; PC ≤50 ms en Ligero)**: sin medir (headless con SwiftShader no es representativo de la GPU de referencia).
- **Rótulos** (órbita, paneo, oclusión, alta densidad), **contraste 4,5:1**, **teclado y lector de pantalla**: sin revisión visual/asistiva propia en esta pasada.
- **Worker lento**: no probado.
- **Prueba con cinco estudiantes**: pendiente; la puerta didáctica (D4) sigue abierta.
- Verificación visual en el navegador de T07 (caja abierta, paquetes, 390 px) y T09 (Driver.js).
