# Guion de exposición — 8 minutos

1. Atrio: identificar el 8086, su encapsulado de40 pines y la diferencia entre objeto físico y arquitectura visible al programador. Seleccionar ALE y explicar la multiplexación.
2. Banco8086: compilar la primera misión, ejecutar un paso y observar AX=000C. Comparar CF y OF con los experimentos segundo y tercero.
3. Memoria: escribir1234h y mostrar34h/12h; probar2000:0010 y2001:0000 para enseñar alias de dirección.
4. Cronoscopio: restaurar el estado inicial y cambiar DS antes de repetir ADD. Explicar registros, flags y memoria restaurados. Exportar una sesión para conservar evidencia.
5. Apple Silicon: seleccionar CPU/GPU/memoria y recorrer el buffer. Señalar que memoria compartida requiere coordinación; no se reproducen un die comercial ni tiempos medidos.
6. Máquina: seleccionar dirección, datos y control. Responder la pregunta y diferenciar arquitectura de organización.
7. Cierre: mostrar una sesión JSON recuperada y exponer las limitaciones del subconjunto simulado.

## Ejecución local
Desarrollo: npm install y npm start. Producción: npm run build y npm run preview; abrir http://127.0.0.1:4300. El servidor debe ejecutarse desde la raíz del proyecto. Los gráficos, fuentes, worker y contenido son locales; los enlaces de referencia sí requieren conexión.

Pruebas: npm test -- --watch=false. Geometría: npm run check:geometry. La revisión visual y las mediciones de GPU se hacen en navegador real.
