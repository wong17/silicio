# Guion de exposición — 8 minutos

1. **0:00–0:45 / Banco físico.** Identificar encapsulado, 40 terminales, cerámica, tapa, zócalo y placa. Usar selector/foco y giro; distinguir maqueta física de arquitectura visible al programador. Seleccionar ALE y explicar multiplexación.
2. **0:45–2:15 / 8086.** Abrir Programa, cargar la misión de suma y compilar; avanzar hasta ADD y observar AX=000Ch. Estado muestra operandos reales, 16 bits y flags. Contrastar CF/OF con las misiones de acarreo y desbordamiento.
3. **2:15–3:30 / Memoria.** Escribir 1234h y ver 34h/12h. Comparar 2000:0010 con 2001:0000. Inspeccionar bancos clásicos; cambiar a galería DDR4 para mostrar otra generación, sin atribuirle direcciones/bancos 8086. Seleccionar chips y pestillos.
4. **3:30–4:30 / Cronoscopio.** Capturar A, restaurar un estado, modificar una entrada y repetir; recuperar ramas y mostrar diferencias en registros/flags/memoria. Exportar sesión y recuperar el JSON.
5. **4:30–5:45 / Apple.** Arquitectura conceptual M5 base publicada: CPU, GPU, Neural y memoria. Recorrer B0/B1 y explicar que una unidad espera finalización antes de consumir la versión nueva. No son tiempos comerciales ni plano de die.
6. **5:45–6:45 / Máquina.** Recorrer los pasos: dirección 0, RD, lectura de 7, suma de 5, dirección 1, WR, escritura de 12 y salida. Explicar datos/dirección/control y diferencia entre arquitectura y organización.
7. **6:45–7:30 / Uso.** Mostrar iconos/tooltip, malla y luz de inspección. En teléfono: Escena/Compartido/Instrumento; la selección tiene alternativa HTML. Soltar herramienta y ordenar bandeja sin cambiar registros.
8. **7:30–8:00 / Alcance.** Subconjunto 8086 y diagramas didácticos; geometría no destinada a fabricación. Mostrar evidencia de pruebas y señalar que dispositivos reales/extensiones futuras no están certificados.

## Preparación

npm install, npm start para desarrollo. npm run build y npm run preview para producción (por defecto http://127.0.0.1:4300). Si está ocupado, CMD: set SILICIO_PORT=4307 y después npm run preview; abrir http://127.0.0.1:4307. No detener un servicio ajeno. Iniciar desde raíz del proyecto.

Fuentes, worker, WASM y contenido se empaquetan localmente; referencias externas requieren red. La prueba completamente desconectada aún está pendiente. Antes de exponer, abrir cada estación, compilar suma y comprobar recuperar una sesión.

Pruebas: npm test -- --watch=false. Geometría: npm run check:geometry y node tools/check-memory.mjs. Estado y pendientes: [plan vigente](PLAN.md). Evidencia de la revisión 3: [archivo](archivo/qa/PROGRESO-REVISION-3.md).

## Modo exposición

Tecla **X** (o «Modo exposición» en la barra) recorre los ocho minutos como una secuencia: cada paso cambia de estación si hace falta, selecciona la pieza, abre o cierra el chip y encuadra la cámara; la línea de apoyo queda en pantalla. Avanzar: flecha derecha o barra espaciadora. Retroceder: flecha izquierda. Salir: Esc. Los pasos están en `src/app/content/tour.ts` y siguen los tiempos de la guía.

Otras ayudas: **Mayús+D** muestra el medidor de rendimiento; **T** rotula las piezas principales; **P** abre la bandeja y **B** el mapa del banco. Una URL como `/8086?pieza=pin-25&vista=45,12.0` abre la estación ya encuadrada.
