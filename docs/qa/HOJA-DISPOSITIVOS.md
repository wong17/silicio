# Hoja de comprobación en dispositivos reales

Una página para recorrer SILICIO en un equipo que no es el de desarrollo. Anota el resultado de cada fila.

**Equipo:** ______________  **Navegador y versión:** ______________  **Fecha:** ____________

## 1. Antes de empezar

- [ ] `npm run build` y `npm run preview` (o el paquete ya construido) abierto desde `http://127.0.0.1:4300`.
- [ ] Mayús+D muestra el medidor. Anota con la estación abierta: fotograma p50 ____ ms · p95 ____ ms · escala ____ · llamadas ____ · triángulos ____.

## 2. Teléfono o tableta (táctil)

| Estación | Un dedo desplaza la página | «Manipular» orbita | Pellizco acerca | Bandeja y mapa se abren | Teclado virtual no tapa el programa |
|---|---|---|---|---|---|
| Atrio | | | | | n/a |
| Banco 8086 | | | | | |
| Memoria | | | | | |
| Cronoscopio | | | | | |
| Apple Silicon | | | | | |
| La máquina | | | | | |

- [ ] Todos los botones se pulsan con el pulgar sin tocar otro (≥ 44 px).
- [ ] Girar el dispositivo conserva la selección.

## 3. Zoom y lector de pantalla

- [ ] Zoom del navegador al 200 %: la consola sigue legible y nada queda cortado.
- [ ] NVDA (o VoiceOver): la bandeja anuncia «Terminales ×40»; una pieza se elige con el teclado; el glosario lee la definición al enfocar un término.
- [ ] Movimiento reducido activo: las estaciones muestran el estado final sin recorrido.

## 4. Rendimiento en el equipo de exposición

| Estación | p50 (ms) | p95 (ms) | Escala | Perfil |
|---|---|---|---|---|
| Atrio | | | | |
| Banco 8086 | | | | |
| Memoria | | | | |
| Cronoscopio | | | | |
| Apple Silicon | | | | |
| La máquina | | | | |

## 5. Sin red

- [ ] Con el cable o el Wi-Fi desconectado, el recorrido completo funciona.
- [ ] Pestaña Red de las herramientas del navegador: ninguna petición fuera de `127.0.0.1`.

## 6. Recuperación

- [ ] Ejecutar la misión 01, recargar la página: se recupera el programa y el cursor.
