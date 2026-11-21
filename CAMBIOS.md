# CAMBIOS — Bitácora de desarrollo de NEXO

Zona horaria de todas las entradas: **Colombia (America/Bogota, UTC−5)**.
Las horas corresponden a la finalización real de cada cambio (tomadas del reloj del sistema y de la fecha de modificación de los archivos).

---

20/11/2026

15:48 — Análisis de referencias y definición del producto

* Se analizaron las imágenes de referencia (Inicio, Mi gente, Mi mundo, Mi cuidado) y el brief.
* Se documentaron usuario, propósito, restricciones y principios en PRODUCT.md.
* Se definió la dirección visual (contrato de dirección) para la pantalla del dispositivo.
* Archivos afectados: PRODUCT.md, .impeccable/surfaces/src-app-tsx.md.
* Resultado: base de producto y diseño acordada; supuesto registrado: usuario principal = paciente hospitalizado en UCI.
* Estado: Completado.

15:52 — Estructura del proyecto

* Se creó el proyecto con React 18, TypeScript, Vite y Lucide React.
* Se organizó src/ en components, pages, layouts, hooks, services, data, types, styles y assets.
* Se descargó la tipografía Lexend (alta legibilidad) para uso local, sin depender de servicios externos.
* Archivos afectados: package.json, tsconfig.json, vite.config.ts, .gitignore, src/assets/fonts/*.
* Resultado: proyecto compila.
* Estado: Completado.

15:53 — Instalación de la skill ui-ux-pro-max

* Se descargó la skill desde github.com/nextlevelbuilder/ui-ux-pro-max-skill y se instaló en .claude/skills/ui-ux-pro-max.
* Se usaron sus reglas de UX (táctil, carruseles con controles, rendimiento de React); su paleta sugerida se descartó porque contradice la identidad violeta de las referencias.
* Archivos afectados: .claude/skills/ui-ux-pro-max/**.
* Estado: Completado.

15:54 — Recursos multimedia de demostración

* Se compusieron y sintetizaron por código 3 piezas de música suave y 3 paisajes sonoros (bosque, lluvia, mar), 96 s cada uno, en AAC (.m4a). Son originales, sin licencias de terceros.
* Se generó un video de demostración (14 s) con la foto familiar de ejemplo y música original.
* Se recortaron retratos de Mamá, Papá y Daniela a partir de la imagen de referencia entregada por el usuario.
* Archivos afectados: scripts/generate-media.mjs, src/assets/audio/*, src/assets/video/*, src/assets/img/*.
* Resultado: audio real reproducible; no hay reproducciones simuladas.
* Estado: Completado.

16:02 — Lógica de negocio y persistencia

* Tipos de datos y datos de demostración marcados como tales.
* Almacenamiento en LocalStorage versionado, con saneamiento de datos y manejo de errores (espacio lleno, almacenamiento bloqueado, datos dañados).
* Fotos, audios y videos agregados en el dispositivo se guardan en IndexedDB.
* Motor de audio único con control de volumen real en iPad (Web Audio), lectura en voz alta y sonidos de aviso.
* Notificaciones derivadas de mensajes, tratamientos y procedimientos.
* Archivos afectados: src/types/index.ts, src/data/*.ts, src/services/*.ts, src/hooks/*.
* Estado: Completado.

16:06 — Interfaz del dispositivo y las cuatro secciones

* Marco del dispositivo: barra superior (logo, sonido, configuración), menú lateral con opción activa iluminada, controles inferiores (−, reproducir/pausar, +, campana de notificaciones) y fondo de pétalos.
* Inicio: saludo según la hora, fecha y reloj en vivo, mensaje familiar con reproducir/pausar/detener, ubicación, bienestar, clima de ejemplo y accesos rápidos.
* Mi mundo: playlist con favoritos, música, naturaleza, paisajes, recuerdos, juegos cognitivos (El despertar del paisaje, Eco de luces, Completa el refrán) y relajación (respiración guiada, meditación, sonidos).
* Configuración: nombre, volumen, tamaño de texto, reducir movimiento, notificaciones, contenido y restablecer datos.
* Archivos afectados: src/layouts/*, src/components/*, src/pages/HomePage.tsx, src/pages/WorldPage.tsx, src/pages/world/*, src/pages/SettingsPanel.tsx.
* Estado: Completado.

16:14 — Mi gente y Mi cuidado

* Mi gente: carrusel de personas, perfil, agregar/editar/eliminar contactos, mensajes de voz, video y texto, grabación de audio, álbum de fotos.
* Mi cuidado: nota del equipo de salud, registro de ánimo diario, signos vitales registrados a mano, plan de cuidado, evolución del ánimo (gráfica) y vistas de tratamientos, procedimientos y recomendaciones con formularios y validaciones.
* Archivos afectados: src/pages/PeoplePage.tsx, src/pages/people/*, src/pages/CarePage.tsx, src/pages/care/*, src/components/MoodChart.tsx, src/services/wellbeing.ts.
* Resultado: sección informativa, sin diagnósticos; los datos de ejemplo están marcados.
* Estado: Completado.

16:15 — Ajuste visual para iPad Air 11" (1180 × 820)

* Se revisaron capturas de las cuatro secciones a 1180 × 820 y 1180 × 760 (Safari con barra).
* Se corrigió el desborde de Mi mundo y Mi cuidado, la intensidad del fondo y el logo.
* Se agregó la versión vertical (menú inferior y contenido en una columna).
* Archivos afectados: src/styles/*.css, src/pages/CarePage.tsx, src/pages/care/Wellbeing.tsx.
* Resultado: sin desbordes ni barras de desplazamiento en 1180 × 820.
* Estado: Completado.

16:16 — PWA y vista previa

* Manifest, íconos (192, 512, maskable, Apple) y service worker con caché para uso sin conexión.
* Compilación de un solo archivo para la vista previa (artefacto de Claude).
* Archivos afectados: public/manifest.webmanifest, public/sw.js, public/icons/*, scripts/generate-icons.cjs, scripts/artifact-fragment.mjs, vite.config.ts, index.html.
* Resultado: vista previa publicada en https://claude.ai/artifact/JpmgYYNtLgyiwFb3FSWezo (privada).
* Estado: Completado.

16:22 — Capa de verificación (parte 1) y ajustes de accesibilidad

* Se configuraron Vitest + fast-check (pruebas basadas en propiedades) y Playwright 1.63.0 (E2E a 1180 × 820).
* Se agregaron 3 flujos E2E: navegación y persistencia del nombre; agregar/editar/eliminar personas; música real, volumen, ánimo y tratamiento con persistencia.
* Se creó scripts/smoke.cjs: ejecuta la app real en horizontal, Safari con barra y vertical, y falla ante errores de consola, desbordes o audio que no suena.
* Se creó la skill de verificación (.claude/skills/verify/SKILL.md) y el checklist RELIABILITY.md.
* Corrección: con texto «Muy grande», Inicio se superponía; ahora la sección se desplaza.
* Corrección: dos botones distintos se anunciaban como «Reproducir Mi playlist»; el de la columna ahora es «Escuchar Mi playlist».
* Archivos afectados: package.json, vitest.config.ts, playwright.config.ts, tests/e2e/*, scripts/smoke.cjs, .claude/skills/verify/SKILL.md, RELIABILITY.md, src/styles/pages.css, src/pages/WorldPage.tsx, .gitignore.
* Resultado: tsc sin errores; E2E 3/3 en verde; smoke en verde.
* Estado: En progreso (faltan pruebas de propiedades y revisión independiente).

16:24 — Pruebas basadas en propiedades y corrección de un bloqueo en «Completa el refrán»

* Se agregaron 80 pruebas basadas en propiedades (fast-check, semillas fijas) sobre storage, time, care, games, wellbeing, notifications y playlist: round-trip, invariantes e idempotencia.
* Bug encontrado por las pruebas: proverbOptions se quedaba en un ciclo infinito si el generador aleatorio devolvía siempre el mismo valor. Se corrigió con una selección Fisher–Yates parcial y se agregó la prueba de regresión.
* Detalle: un puntaje -0 guardado ahora se normaliza a 0 (round-trip exacto con JSON).
* Archivos afectados: tests/property/*.test.ts, src/services/games.ts, src/services/storage.ts.
* Resultado: tsc PASS, build PASS, propiedades 80/80, E2E 3/3, smoke PASS.
* Estado: Completado.

16:42 — Correcciones de la revisión independiente (ronda 1)

* Un revisor independiente (sin acceso a cómo se escribieron las pruebas) encontró 10 hallazgos importantes y 16 menores; se avisó al usuario antes de tocar código de producción.
* Sin conexión: el service worker ahora guarda toda la app en la primera visita (lista generada en la compilación) y responde las peticiones por rangos de audio y video desde la caché. Verificado: recarga sin red, música sonando y adelantando sin red.
* Honestidad: tratamientos, procedimientos, recomendaciones e historial de ánimo de ejemplo ahora muestran «Ejemplo» (también en Inicio y en las notificaciones). La nota de ejemplo ya no dice «estable»; «Tu evolución / ¡Vas muy bien!» pasó a «Tu ánimo», redactado como lo que la persona registró.
* Modo cuidador: agregar, editar o eliminar personas, mensajes, fotos, tratamientos, procedimientos, signos, la nota del equipo y «Restablecer» piden un PIN (demostración: 1234, se cambia en Configuración). Se desbloquea 10 minutos y se puede bloquear desde la barra superior.
* Sonido: silenciar detiene la lectura en voz alta; los videos respetan el silencio y el volumen de NEXO.
* Recordatorios: un tratamiento que empieza en el futuro ya no avisa hoy; dos tratamientos a la misma hora generan dos avisos.
* Borrar los signos vitales pide confirmación.
* Botones de al menos 56 px (puntos del carrusel ahora son solo indicador).
* Datos dañados: cada registro se valida campo por campo; un registro roto se descarta en vez de dejar la pantalla en blanco. Se agregó una pantalla de error con «Volver a intentar» y «Restablecer», y una copia de respaldo de los datos dañados.
* Menores: avisos descartados ya no reaparecen; el grabador no guarda audio como video; fotos a medio guardar se limpian; nombres accesibles únicos; Eco de luces no cuenta un toque extra como error; los errores de guardado se avisan cada vez; Escape cierra solo la ventana superior y tocar fuera no borra un formulario; fechas faltantes no parecen recientes; el botón ▶ del dock sigue con las favoritas; las pruebas ahora pasan por tsc.
* Archivos afectados: public/sw.js, vite.config.ts, src/services/*.ts, src/types/index.ts, src/data/demo.ts, src/hooks/useCaregiver.tsx, src/hooks/useAppData.tsx, src/components/*.tsx, src/layouts/*.tsx, src/pages/**/*.tsx, src/styles/*.css, src/App.tsx, tests/**, tsconfig.json, .gitignore.
* Resultado: tsc PASS (incluye pruebas), build PASS, propiedades 80/80, E2E 3/3 (con PIN), smoke PASS.
* Estado: En progreso (faltan las pruebas nuevas de la ronda y la ronda 2 de revisión).

16:49 — Pruebas nuevas de la ronda 1 y dos fallos que revelaron

* E2E nuevas (5 archivos, 10 pruebas): sin conexión (recarga y música sin red), limpieza de IndexedDB al borrar foto y mensaje de video, PIN de cuidador (incorrecto, correcto, Bloquear, Restablecer), sonido real (ganancia del GainNode, voz cancelada al silenciar, video silenciado), confirmación al borrar signos, registros dañados y etiquetas «Ejemplo».
* Propiedades nuevas (38): validación campo por campo de storage, round-trip de datos válidos, nextDose con fechas de inicio y empates, avisos por tratamiento, «Ejemplo · » en avisos de demostración, pruneDismissed, volumeToGain y la cola de reproducción.
* Smoke: «reproducción iniciada» ahora exige que el audio avance (antes bastaba el punto encendido) y se mide que cada botón tenga al menos 56 × 56 px.
* Fallo corregido: en el visor de fotos los botones (anterior, siguiente, eliminar) quedaban fuera de la pantalla a 1180 × 820.
* Fallo corregido: los accesos «Paisajes» y «Recuerdos» de Mi mundo medían 52 px.
* Fallo corregido: una fecha de inicio imposible (p. ej. 2026-13-45) impedía para siempre el recordatorio; ahora cuenta como iniciada.
* Archivos afectados: tests/e2e/*.spec.ts, tests/property/*.test.ts, scripts/smoke.cjs, src/styles/components.css, src/styles/pages.css, src/services/care.ts, README.md.
* Resultado: tsc PASS, build PASS, propiedades 118/118, E2E 13/13 (~14 s), smoke PASS con verificación de tamaño táctil.
* Estado: Completado (queda la ronda 2 de revisión independiente).

16:55 — Correcciones de la revisión independiente (ronda 2), pausado por el usuario

* Datos guardados por la versión anterior: al cargarlos, los tratamientos, procedimientos, recomendaciones e historial de ánimo de ejemplo recuperan la etiqueta «Ejemplo», y la nota antigua que decía «estable» se reemplaza por la nueva.
* La pantalla de error ya no borra fotos, audios ni videos al restablecer; el texto dice exactamente qué se conserva.
* El PIN de demostración (1234) solo se muestra en la vista previa; en el dispositivo instalado ya no se le muestra al paciente (está en el README).
* Dos tratamientos a la misma hora se muestran juntos en Inicio y en el plan.
* El service worker ya no mezcla una página vieja de la caché del navegador con archivos nuevos.
* Archivos afectados: src/services/storage.ts, src/components/ErrorBoundary.tsx, src/hooks/useCaregiver.tsx, src/pages/HomePage.tsx, src/pages/CarePage.tsx, public/sw.js, CAMBIOS.md.
* Resultado: tsc PASS, build PASS, propiedades 118/118, E2E 13/13.
* Estado: En progreso (pausado a pedido del usuario; faltan pruebas de migración y de la pantalla de error, y la ronda 3 de revisión).

16:57 — La verificación deja de ser una skill

* A pedido del usuario, se quitó la skill .claude/skills/verify/SKILL.md del repositorio y de la carpeta local.
* Sus pasos se conservan como documento normal del proyecto: VERIFICACION.md (typecheck, build, pruebas de propiedades, E2E, smoke en la app real e informe de evidencia).
* .gitignore ya no versiona nada de .claude/.
* Archivos afectados: VERIFICACION.md (antes .claude/skills/verify/SKILL.md), .gitignore.
* Resultado: el repositorio no contiene skills de Claude Code.
* Estado: Completado.

23:52 — Pruebas de las correcciones de la ronda 2

* Propiedades (5): los datos guardados por la versión anterior recuperan «Ejemplo» solo en los registros de demostración, un registro creado por la familia no se marca, la nota antigua con «estable» solo se reemplaza si era la de ejemplo, y el resultado es idempotente.
* E2E: actualización desde el formato anterior (etiquetas, nota, notificaciones y PIN); pantalla de error (restablecer pide doble confirmación, guarda copia y no borra fotos ni audios; «Volver a intentar» se recupera); sin conexión el audio se sirve por rangos (206) desde el service worker; el PIN de demostración no se muestra en la versión instalada.
* Archivos afectados: tests/property/storage.test.ts, tests/e2e/migration.spec.ts, tests/e2e/error-screen.spec.ts, tests/e2e/offline.spec.ts, tests/e2e/caregiver.spec.ts.
* Resultado: las pruebas nuevas pasan (sin fallos de producción encontrados); tsc PASS. No se ejecutó el procedimiento completo de VERIFICACION.md (se hará cuando el usuario lo indique).
* Estado: Completado.

23:55 — Corrección de la ronda 3: el ánimo del paciente ya no se marca como «Ejemplo»

* La revisión independiente (ronda 3, la última) confirmó resueltos los hallazgos importantes de la ronda 2 y encontró una regresión: tras recargar, el ánimo registrado por el paciente se guardaba como «Ejemplo» mientras la nota del equipo siguiera siendo la de demostración.
* Corrección: el ánimo registrado se guarda siempre como real, y la migración solo trata como de ejemplo los datos antiguos donde ningún registro de ánimo tenía la marca.
* Pruebas de regresión: el ánimo registrado sigue siendo real tras dos recargas, con o sin nota de ejemplo; un registro sin marca junto a otros marcados es del paciente.
* Archivos afectados: src/services/wellbeing.ts, src/services/storage.ts, tests/property/storage.test.ts, tests/property/wellbeing.test.ts.
* Resultado: propiedades 125/125; E2E de bienestar, migración y datos clínicos 5/5; tsc PASS. No hubo una cuarta ronda de revisión (el límite es de 3 rondas). No se ejecutó el procedimiento completo de VERIFICACION.md.
* Estado: Completado.

10:17 — Fotos reales de la familia de demostración

* La paciente de demostración pasa a ser Leslie (hija). Contactos: Mamá, Papá, Rafa (hermano), Karen (hermana) y Bryan (novio), cada uno con la foto entregada por el usuario (recortada y reducida para el avatar). Se quitaron Daniela y Tía Carmen.
* El usuario confirmó que tiene permiso de estas personas para usar sus fotos en el prototipo.
* Inicio muestra la foto de la familia; el álbum incluye la foto de Mamá con Leslie y las de cada familiar.
* El video de demostración «Recuerdos en familia» se regeneró con la nueva foto familiar.
* Los mensajes de demostración se adaptaron (hija, hermanita) y siguen marcados como «Demostración»; no se inventaron datos personales de la familia.
* Textos neutros en género: estados de ánimo «En calma», «Con cansancio» y «Sin ánimo», y frases de relajación y recomendaciones.
* Archivos afectados: src/assets/img/* (nuevas: rafa, karen, bryan, mama-y-leslie; reemplazadas: familia, mama, papa; eliminada: daniela), src/assets/video/recuerdos-en-familia.mp4, scripts/generate-media.mjs, src/data/demo.ts, src/data/media.ts, src/services/wellbeing.ts, src/pages/world/Relax.tsx, README.md, tests/e2e/*.spec.ts, tests/e2e/fixtures.ts.
* Resultado: tsc PASS; propiedades 125/125; E2E 17/17; capturas de Inicio, Mi gente y Mi cuidado revisadas a 1180 × 820. No se ejecutó el procedimiento completo de VERIFICACION.md.
* Estado: Completado.
