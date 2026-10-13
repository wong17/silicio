# SILICIO — punto de reanudación

**Pausa solicitada por el usuario:** 13 de octubre de2026, zona America/Guatemala. No continuar implementación ni tareas de fondo hasta que el usuario retome.

## Proyecto y estado guardado
- Repositorio: E:/Repositories/silicio. Rama codex/scene-instruments-mobile.
- Plan autorizado: docs/plan/SILICIO-IMPLEMENTACION-ESCENA-INSTRUMENTOS-MOVIL.md; especificación SILICIO-AMPLIACION-ESCENA-PANEL-Y-MOVIL.md. **La revisión3 NO está completa.**
- Última petición visual: controles personalizados tipo Blender, iconos y tooltips, todos del mismo tamaño. Implementados en scene-controls.component con44×44px, menú móvil3columnas y tooltip también al enfocar con teclado.
- Angular, Three.js r186, GSAP, Lenis solo en consola escritorio, Rapier compat diferido. Oscuro, Barlow/BarlowCondensed/IBMPlexMono locales; Arduino excluido.

## Avance real
- Eventos del motor incorporan operandos/resultados/accesos reales; proyección laboratory.facade sin duplicar aritmética.
- Consola gráfica Estado/Programa/Traza, bits por nibbles, ALU/flags; memoria segmentada y bytes little endian.
- Modos móviles Escena/Compartido/Instrumento. Editor móvil cambia a Instrumento al recibir foco. Scroll nativo móvil, política touchAction pan-y sin manipulación.
- RAM:16Intel2164A por bancos didácticos; galeríaKingstonKVR26N19S8/8 con8FBGA y144contactos/cara. Dimensiones no verificadas figuran como aproximadas en docs/assets/SILICIO-ASSET-CATALOG.md.
- Banco operable: scope/canal, fuente5Vreferencia, lámpara, sonda, cable, herramientas, soportes y desacoplo seleccionables.
- Rapier:1/60s máximo4subpasos, unidadesm con conversión.02;3herramientas, colliders compuestos, caída/bandeja/arrastre/cancel/reset. Sin alterar CPU.
- Memoria y cronoscopio actualizan etiquetas sin reconstruir el sujeto por cada valor. IDs absolutos del historial compartidos por selector/raycast/foco.
- Historial conserva hasta8ramas; restaurar una archiva la actual. Exportaciónv2 con ramas, importaciónv1compatible. Comparación de registros/flags/memoria; recapturaA invalida caché. AppleB0/B1 ×2 ilustra dependencias reales del ejemplo, no rendimiento comercial.

## Verificación realizada
- Última suite: **45/45 pruebas**,10archivos, npm test -- --watch=false, salida0.
- Último build: salida0. Aviso pendiente app.scss13.96kB frente presupuesto12kB; límite de error18kB no excedido.
- Auditoría CPU:40pines,291mallas,68480triángulos; zfight[]/defects[]. No extrapolar a RAM o toda la escena.
- Auditoría dependencias producción:0vulnerabilidades. Auditoría total al instalar reportó6del entorno desarrollo; no se aplicó actualización automática.
- Matriz de viewport emulado:320×568,360×640,390×844,430×932,768×1024,844×390,1024×768,1366×768,1920×1080. Sin desbordamiento horizontal; botones de barra44×44; bits≥63.5pxen320. No sustituye Android/iOS reales.
- Instrumento390×844 pasó de354pxa692px de altura libre después de corregir selector.
- Tooltip por teclado observado en paquete compilado; consola sin errores nuevos en observación realizada.

## Revisión independiente y correcciones
Agente revision_incremento:6Important. Todos corregidos con regresiones RED→GREEN y suite45/45: recuperar ramas conservaactual, recapturaA actualizacomparación, alturaInstrumento, IDs cronoscopio tras16eventos, cancelación lostpointercapture/blur, política táctil initialize/resize.
Minor diferido: separación escritorio6px frente8delplan; móvil8px.

## Pendientes que no se deben dar por cerrados
1. Cámara por bounds y región libre de UI, y fachada/coordinador completos.
2. Auditoría integral real de cobertura de piezas y acciones; algunas mallas/IDs aún son agrupaciones, no inventario verificado.
3. Planos/fotos/cotas de variante2164A y loteDIMM; geometría en reverso/rasante/wireframe/despiece y chequeos de holguras/interpenetración.
4. Más fidelidad del8086/Apple y mecanismos de socket/tapa, física cinemática y captura/drag reales en browser.
5. Perfiles/efectos medidos, drawcalls, p50/p95,10recorridos y recursos. No hay composer avanzado ni mediciónGPU.
6. Validar todas las misiones, archivos, ramas, gráficos yfallbackWebGL en paquete local; teclado virtual, zoom200%, reducedmotion y dispositivos reales si disponibles.
7. Reconciliar el resto del planmaestro; interrupciones/prefetchreal/otrasexperiencias no implementadas no se eliminan de la cola.
8. Actualizar guion y docs/IMPLEMENTACION.md tras puertas reales. PRODUCT.md y sidecarImpeccable heredados desactualizados; no reparados incidentalmente.

## Reanudar sin repetir trabajo
Leer este archivo y docs/qa/PROGRESO-REVISION-3.md; inspeccionar gitstatus. Preservar todo. Continuar desde pendientes verificables, no reiniciar UI ni repetir pruebas sin nueva razón.
Servidores usados: desarrollo127.0.0.1:4200; paquete127.0.0.1:4307. Pueden no seguir vivos mañana. No matar4300: estaba ocupado por otro proceso.
Stage de trabajo C:/Users/josue/Documents/Codex/2026-10-12/d-documentos-de-clases-arquitectura-de/work/v4 contiene archivos **anteriores al formateo y algunas últimas correcciones**: no copiar toda su carpeta src sobre el proyecto. La fuente actual autoritativa es E:/Repositories/silicio/src. Copias de baseline en work/v4/baseline.
Comandos fiables: shell C:/Windows/system32/cmd.exe, login:false. Writes aEdesdeNode puedenEPERM; preparar enworkspace y copiar únicamente archivo cambiado con permisos.
Ledger en .superpowers/sdd/SILICIO-IMPLEMENTACION-ESCENA-INSTRUMENTOS-MOVIL/progress.md; no borrarlo mientras plan esté pendiente. Estados internos de CodeTesting en temporalsilicio-execution, no son entregables.

## Evidencia
Capturas de este avance: outputs/silicio-v4-toolbar-final.jpg y silicio-v4-mobile-tools.jpg (workspaceCodex); responsiveJSON silicio-v4-responsive.json. Los archivos temporalessilicio-v4-* del sistema son copias auxiliares.
