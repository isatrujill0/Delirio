# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Tres públicos por igual (confirmado por la autora):

- **Familias** de pacientes ingresados en UCI: llegan asustadas, a menudo desde el móvil, queriendo saber qué le pasa a su familiar y qué pueden hacer.
- **Estudiantes** de ciencias de la salud: buscan una explicación clara y fuentes citables.
- **Profesionales** de UCI (enfermería, medicina): buscan el argumento para cribar de forma sistemática y un recordatorio práctico.

## Product Purpose

Sitio de divulgación «Delirio en Pacientes Críticos». Explica qué es el delirio en la UCI, por qué pasa desapercibido (sobre todo el hipoactivo), cómo se detecta y previene, y cómo puede acompañar la familia. Éxito: que el visitante salga sabiendo reconocerlo y qué hacer o preguntar.

## Positioning

Nace de la observación turno a turno: pacientes «desorientados» cuyo estado se atribuía a la gravedad en lugar de buscarse como disfunción cerebral aguda. El sitio muestra la fluctuación y la invisibilidad del delirio, no solo lo define.

## Operating Context

Página única estática (HTML, CSS y JS sin framework ni build), servida con `serve.ps1`. Lectura con scroll y piezas interactivas: simulaciones de los subtipos hiperactivo e hipoactivo, pestañas, acordeones, filtro de evidencia, carrusel y formulario.

## Capabilities and Constraints

- Sin backend: el formulario de historias es simulado y debe decirlo.
- Terminología clínica en español: delirio (delirium), CAM-ICU, ICDSC, RASS, paquete ABCDEF, guías PADIS.
- Contenido educativo; no sustituye la valoración de un profesional sanitario.
- Modo claro/oscuro y control de tamaño de texto existentes.

## Evidence on Hand

- Cinco referencias reales en el sitio: Ely 2004 (JAMA), Pandharipande 2013 (NEJM), Devlin 2018 (PADIS, Crit Care Med), Girard 2018 (MIND-USA, NEJM), Pun 2019 (ABCDEF, Crit Care Med).
- No hay testimonios reales, fotos, logotipo ni equipo identificado. Los testimonios son ilustrativos y se rotulan así; no inventar personas, instituciones ni cifras sin fuente.

## Product Principles

1. Lo que no se busca no se encuentra: el cribado sistemático es el mensaje central.
2. El delirio silencioso (hipoactivo) merece tanto espacio como el ruidoso.
3. Cada público encuentra su ruta en segundos, sin jerga para la familia y sin vaguedad para el profesional.
4. Rigor sin alarmismo: cifras con fuente, conductas descritas sin juicio.
5. La familia es parte del cuidado.

## Accessibility & Inclusion

Lectores bajo estrés y con móvil; contraste AA, navegación por teclado, respeto a `prefers-reduced-motion`, texto ampliable.
