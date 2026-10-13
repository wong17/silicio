# SILICIO — estado comprobado

## Correcciones de esta entrega
- Se retiró la nota sobre desgaste y toda explicación de decisiones de estilo de la interfaz. El contenido añadido explica multiplexación AD0–AD15, ALE, reloj, zócalo, registros y segmentación.
- Se reconstruyó el 8086: encapsulado alargado, cavidad real en cerámica, tapa con muesca, marca del pin 1, 40 terminales de perfil extruido doblado, contactos del zócalo, pistas, pasivos, reloj, lógica de apoyo y soportes. Placa didáctica, no reproducción de un circuito comercial.
- Entorno físico con mesa, pared, instrumentos, luz articulada, cables y herramientas. El trazado del osciloscopio es ilustrativo; no se declara medición real.
- Apple conceptual con placa, portador, contactos BGA instanciados, paquetes auxiliares y detalle de celdas en los bloques. La distribución sigue siendo conceptual.
- Etiquetas de memoria usan valores actuales. El cronoscopio muestra como máximo los 16 eventos más recientes y un estado inicial cuando no existe traza.
- Motor 8086 en worker, respuestas identificadas y descarte de respuestas canceladas. El decodificador lee memoria y ya no depende del IR ensamblado para ejecutar.
- Ocho experimentos, cinco preguntas con retroalimentación y glosario.
- Exportación y recuperación JSON: validación de registros, flags, memoria y reejecución de cada evento importado para verificar la traza.
- Preferencias de calidad y reducción de movimiento persistentes; sonido optativo activado por gesto.
- Malla para inspección, nivel ligero que oculta microdetalle, recuperación mediante recarga y suspensión al ocultar la página.

## Evidencia
- 19 pruebas de simulación, decodificador, controles y sesiones pasan.
- Kit de geometría de la skill: 171/171 autocomprobaciones.
- Comprobación del ensamblaje: 40 pines, 291 meshes, 68480 triángulos, sin caras coplanares conflictivas ni datos geométricos defectuosos; ver geometry-report.json. El chequeo excluye textos y no certifica todas las penetraciones sólidas de montaje.
- Navegador: worker ejecuta ADD AX,[10] y devuelve AX=000C; ALE seleccionable; escritura little endian; retroalimentación conceptual y navegación.
- Compilación de producción correcta, worker y escena separados. Permanece advertencia CSS alrededor de13 kB frente al presupuesto de12 kB.
- Apple visible: 393 llamadas y115198 triángulos en la vista capturada. No constituye medición universal de FPS ni garantía por equipo.

## Fuentes y skills
Intel, datasheet 8086 (copia documental): https://userpages.cs.umbc.edu/squire/8086-datasheet.pdf
Apple WWDC20: https://developer.apple.com/videos/play/wwdc2020/10686/
Skills: Three.js router, debugging, procedural geometry y su quality-kit, procedural materials, lighting e interaction; guías de GSAP ya integradas.

## Límites y pendientes del plan de largo alcance
La entrega funcional no representa todos los paquetes de los ocho documentos originales: quedan trazabilidad completa de misiones a esos paquetes, fases de bus temporizadas, prefetch eléctrico, interrupciones, más variantes comerciales Apple con fuente y representación específica, historial de ramas múltiples, postprocesado con medición por dispositivo, una evaluación integral de accesibilidad y perfiles de rendimiento de varios equipos. No se afirma que todo el plan de largo alcance esté cerrado.
