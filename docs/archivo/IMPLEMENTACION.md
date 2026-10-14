# SILICIO — implementación comprobada

Estado actualizado el 13 de octubre de 2026. Angular, Three.js r186, GSAP y Lenis en consola de escritorio; Rapier se carga al manipular herramientas. Interfaz oscura y fuentes locales. Arduino excluido.

## Experiencias disponibles

- Banco 8086: motor en worker, registros de 16 bits, operandos reales, flags, ocho misiones, señales didácticas, selección de 40 pines y despiece. Encapsulado, socket y placa usan perforaciones y apoyos coherentes.
- Memoria: placa didáctica de 16 Intel 2164A con bancos, segmentación, alias y little endian. Galería Kingston KVR26N19S8/8 independiente con 288 contactos, ocho paquetes y retenciones; no hereda direcciones del 8086.
- Cronoscopio: restauración, hasta ocho ramas, A/B de registros/flags/memoria, exportación v2 e importación compatible v1.
- Apple: arquitectura conceptual M5 base publicada, CPU/GPU/Neural/memoria y recorrido B0/B1 con dependencia de finalización. No reproduce un die comercial ni rendimiento medido.
- Máquina: lectura de 7, operación +5, escritura y salida de 12 con buses y señales visibles.
- Banco: osciloscopio, fuente, lámpara, sonda, cable y herramientas seleccionables; manipulación con reset. Toolbar por iconos y tooltips, foco por región libre y modos móviles.

## Organización y calidad

[Mapa del código](ARQUITECTURA-DEL-CODIGO.md). Modelos, composición, selección, cámara, física y render tienen archivos propios. El adaptador Angular no fabrica hardware; el motor gráfico no importa Angular. HTML y SCSS de producción externos.

83/83 pruebas en 22 archivos; build de producción correcto sin advertencias de presupuesto. Contratos de encaje para CPU y ambas RAM, auditorías geométricas sin defectos detectados en esos ensamblajes, diez recorridos con recursos constantes y confirmación responsive. [Evidencia y límites completos](qa/PROGRESO-REVISION-3.md).

## Límites explícitos

Los modelos no son planos de fabricación: varias cotas mecánicas son aproximadas. Las fases de bus/diagramas son didácticos; no una simulación eléctrica. No se han validado teléfonos reales, teclado virtual real, ayudas técnicas, todos los volúmenes del entorno ni la distribución completamente desconectada. Las extensiones históricas P1/P2 siguen pendientes y esta entrega no cierra todo el plan maestro.

[Guion para exposición](GUIA-DE-EXPOSICION.md) · [Catálogo y fuentes](assets/SILICIO-ASSET-CATALOG.md) · [Plan y estado actual](plan/SILICIO-IMPLEMENTACION-ESCENA-INSTRUMENTOS-MOVIL.md).
