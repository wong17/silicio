# SILICIO

> **Revisión 3.0 vigente:** [Escena, instrumentos y móvil](./SILICIO-AMPLIACION-ESCENA-PANEL-Y-MOVIL.md) y [tareas futuras](./SILICIO-IMPLEMENTACION-ESCENA-INSTRUMENTOS-MOVIL.md). Esta revisión modifica solo documentos; no ejecuta implementación.

## Laboratorio inmersivo de arquitectura de computadores

Propuesta de proyecto para Arquitectura de Máquinas I y II · Versión 2.0 · 12 de octubre de 2026.

### Descripción

SILICIO propone una experiencia web tridimensional para explorar el funcionamiento interno de una computadora. El visitante ingresa a un laboratorio virtual desde el cual accede a un procesador Intel 8086, una galería de memoria, herramientas para reconstruir ejecuciones y un observatorio de Apple Silicon.

La plataforma relacionará los programas con los cambios que producen en registros, memoria y componentes. La interacción permitirá ejecutar ejemplos, detenerlos, inspeccionar sus resultados y modificar condiciones para comprender sus consecuencias. Los modelos 3D tendrán una apariencia de equipos utilizados y mantenidos, con materiales reconocibles y desgaste localizado. Los inspectores de código y datos utilizarán elementos 2D para conservar claridad y precisión.

### Objetivo general

Desarrollar una plataforma educativa que permita explicar y experimentar con la arquitectura y organización de computadores mediante la exploración de componentes tridimensionales, la ejecución de ejemplos acotados del Intel 8086 y el estudio conceptual de Apple Silicon.

### Objetivos específicos

1. Representar CPU, memoria, entrada/salida y sus interconexiones en un entorno navegable.
2. Relacionar las instrucciones del subconjunto implementado con sus operandos, registros, flags y resultados.
3. Explicar el direccionamiento segmentado del 8086 y la representación de datos en memoria.
4. Permitir la reconstrucción de una ejecución para identificar y corregir errores preparados.
5. Explorar los bloques documentados de un SoC de Apple y el concepto de memoria unificada.
6. Vincular cada experiencia con explicaciones, ejercicios y referencias de la asignatura.

### Alcance de la primera entrega

| Componente | Función educativa |
|---|---|
| Atrio y banco general | Introducir la estructura de la computadora y permitir el acceso a los laboratorios. |
| Banco Intel 8086 | Inspeccionar componentes y ejecutar un subconjunto documentado de instrucciones. |
| Galería de memoria | Observar direcciones, bytes, palabras y segmentación. |
| Cronoscopio | Revisar estados anteriores y comparar una ejecución corregida con la original. |
| Observatorio Apple Silicon | Explorar CPU, GPU, Neural Engine y memoria unificada mediante un modelo conceptual basado en documentación pública. |

El trabajo se centrará en procesadores y arquitectura de computadores. Arduino queda excluido del alcance propuesto. El plan define doce mnemónicos del 8086, sus formas de operandos y seis programas de referencia; la representación interna de Apple distinguirá los datos documentados de las simplificaciones educativas. La primera entrega tendrá siete misiones reproducibles.

### Tecnologías

Angular y TypeScript organizarán la aplicación. Three.js representará el mundo, las cámaras, los materiales y los componentes. GSAP coordinará las transiciones y despieces. Lenis se utilizará en recorridos y paneles que requieran desplazamiento de lectura. El núcleo de simulación mantendrá su lógica separada de la presentación gráfica.

### Metodología y duración

Se plantea una semana de desarrollo con apoyo de agentes de inteligencia artificial y coordinación del autor. El trabajo comenzará con una operación funcional integrada en el escenario 3D. Después incorporará memoria, historial y Apple Silicon. Los últimos dos días se dedicarán a comprobar exactitud, uso, rendimiento y preparación de la exposición.

La visión posterior incluye caché configurable, comparación de organizaciones, periféricos clásicos y experiencias de ejecución especulativa. Esas ampliaciones no se consideran terminadas por formar parte del diseño.

### Verificación y entregables

Se comprobarán resultados y flags de los programas soportados, generación de direcciones, restauración de estados y sincronización de las vistas. La revisión visual verificará legibilidad, materiales, navegación y rendimiento en el equipo de exposición. Cada explicación relevante contará con una fuente.

La entrega prevista comprende la aplicación, código fuente, recursos optimizados, ejemplos y misiones, documentación del alcance, evidencias de comprobación y un paquete local con instrucciones. La exposición mostrará una suma del 8086, su acceso a memoria, el diagnóstico de un error y una comparación conceptual con Apple Silicon.

### Aporte del proyecto

El estudiante podrá recorrer la relación entre una orden de software y su efecto sobre la máquina. La combinación de inspección espacial, estados verificables y reconstrucción temporal buscará facilitar explicaciones causales: qué cambió, qué instrucción lo produjo y por qué se obtuvo ese resultado.

### Base académica

La propuesta toma como punto de partida los trabajos de organización del CPU y Apple M5 de la asignatura, los textos de programación del 8086 y organización de computadores disponibles en la biblioteca del autor, el [manual original de Intel](https://www.inf.pucrs.br/~calazans/undergrad/orgcomp_EC/mat_microproc/intel-8086_family_Users_Manual.pdf) y la [documentación pública de Apple sobre M5](https://www.apple.com/newsroom/2025/10/apple-unleashes-m5-the-next-big-leap-in-ai-performance-for-apple-silicon/).

El [índice del paquete](./SILICIO-INDICE.md) organiza la documentación. El [plan maestro](./SILICIO-PLAN-MAESTRO.md) contiene la visión y el [plan de ejecución](./SILICIO-PLAN-DE-EJECUCION.md) desarrolla tareas, dependencias y criterios de cierre. Los anexos detallan experiencias, simulación, producción 3D y una matriz de 38 requisitos y 70 casos de verificación previstos.


## Ampliación de presentación e interacción — revisión 3.0

Se amplía la experiencia a un banco de electrónica operable con modelos de memoria identificados, manipulación física limitada yconsola de instrumentos. El estudiante podrá seguir datos, seleccionar señales ycomparar estados mediante gráficos accesibles, con la misma disponibilidad funcional en móvil.

La [especificación](./SILICIO-AMPLIACION-ESCENA-PANEL-Y-MOVIL.md) separa hardware clásico, memoria moderna y Apple; mantiene referencias ylímites de fidelidad. Esta revisión describe el trabajo pendiente, no acredita su ejecución.
