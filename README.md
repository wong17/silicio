# SILICIO

Laboratorio de Arquitectura de Máquinas I y II con Angular, Three.js, GSAP y Lenis. Tema oscuro de banco de inspección usado. Arduino no forma parte del proyecto.

## Iniciar
```sh
npm install
npm start
```
Abrir http://localhost:4200. Para validar: `npm test -- --watch=false` y `npm run build`.

## Recorrido
Atrio → Banco 8086 (ocho experimentos) → Memoria segmentada → Cronoscopio con restauración y captura A/B → Apple Silicon conceptual → Anatomía de la máquina y buses. El estado de ejecución se conserva entre estaciones durante la sesión.

## Documentación
- `docs/PLAN.md`: plan único vigente, con el estado verificado, los pendientes y las mejoras.
- `docs/ARQUITECTURA-DEL-CODIGO.md`: capas, propietarios y reglas para ampliar.
- `docs/archivo/`: planes y estados anteriores (revisiones 2.0 y 3.0), conservados como referencia.
- `DESIGN.md`: dirección visual, paleta, materiales y tipografía.
- `PRODUCT.md`: contexto del proyecto académico.

Las fuentes Barlow, Barlow Condensed e IBM Plex Mono se sirven localmente; sus licencias OFL están en `public/fonts`. El simulador ejecuta un subconjunto educativo, no binarios externos arbitrarios. Los modelos internos de 8086 y Apple son conceptuales.

## Entrega y comprobación

El 8086 tiene cuarenta terminales inspeccionables, placa de apoyo y un banco de electrónica. Hay preguntas de comprobación, glosario, exportación y recuperación de sesiones JSON. La ejecución del subconjunto se decodifica desde memoria y se realiza en un worker.

Después de `npm run build`, usar `npm run preview` para el paquete local compilado. El puerto por defecto es4300; se puede cambiar con `SILICIO_PORT`. Comprobar geometría con `npm run check:geometry`. Ver `docs/GUIA-DE-EXPOSICION.md` y `docs/geometry-report.json`.

## Revisión 4 (octubre de 2026)

Plan único en [docs/PLAN.md](docs/PLAN.md). Novedades: cámara con transición, HUD de escena (mapa del banco y bandeja de piezas con miniaturas), animaciones que explican derivadas del estado real (viaje de instrucción del 8086, memoria con fila y columna, cronoscopio como cinta de pasos, buffer compartido del SoC, buses de La máquina), PUSH/POP/CALL/RET, caché comparable, glosario, modo exposición y autoguardado de sesión.

`npm run check:offline` verifica que ninguna fuente carga recursos de otro origen; con `-- --dist` revisa también el paquete de producción.

## Publicar (build y deploy)

```bash
npm ci
npm test -- --watch=false     # 308 pruebas
npm run build                 # dist/silicio/browser
npm run check:offline -- --dist
npm run preview               # http://127.0.0.1:4300
```

Es una aplicación estática de una sola página: sirve `dist/silicio/browser` desde cualquier hosting y reescribe las rutas (`/8086`, `/memory`…) a `index.html`. Ya incluye `netlify.toml` y `vercel.json` (Cloudflare lo resuelve con `wrangler.jsonc`, y un `_redirects` con `/* /index.html 200` allí falla); para GitHub Pages copia `index.html` a `404.html`; para Cloudflare usa `wrangler.jsonc` (Build command `npm run build`, Deploy command `npx wrangler deploy`). Todo (fuentes, worker, WASM) viaja en el paquete: no hace peticiones a otros orígenes. Carga inicial de unos 609 kB; la escena (834 kB) y la física Rapier (4,3 MB, 1,2 MB comprimida) llegan diferidas.

