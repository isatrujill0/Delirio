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

10:30 — Signos vitales: textos que no se salen y simulación en vivo

* En pantallas angostas (celular, vertical o texto grande), cada recuadro de signos muestra ícono, etiqueta y valor uno debajo del otro; las etiquetas se dividen con guion si no caben y los valores quedan alineados. Verificado: ningún texto sale de su recuadro a 1180 × 820 ni en un iPhone 13.
* A pedido del usuario, los signos de demostración ahora se mueven: cada 4 segundos dan un paso pequeño dentro de rangos tranquilos (ritmo cardíaco 68–92 lpm, respiración 14–20 rpm, oxigenación 94–98 %). El corazón late al ritmo simulado (se detiene con «Reducir movimiento»).
* Honestidad: la tarjeta dice «Valores simulados: no vienen de un monitor» con la etiqueta «Simulación»; los valores registrados por el personal no se mueven. NEXO sigue sin interpretar los valores.
* Pruebas: 3 propiedades nuevas (siempre dentro de rango, sin saltos bruscos, no se queda quieta).
* Archivos afectados: src/services/wellbeing.ts, src/pages/care/Wellbeing.tsx, src/styles/pages.css, tests/property/wellbeing.test.ts, README.md.
* Resultado: tsc PASS; propiedades 128/128; E2E 17/17. No se ejecutó el procedimiento completo de VERIFICACION.md.
* Estado: Completado.

10:36 — «Tu salud» como monitor integrado en vivo, con análisis

* A pedido del usuario, los signos vitales se presentan como un monitor integrado de NEXO: «Monitor integrado · en vivo», con ritmo cardíaco, respiración y oxigenación que cambian cada 4 segundos.
* Análisis por signo: mini gráfica de los últimos 2 minutos, tendencia (sube, baja o sin cambios) y estado frente al rango de referencia (60–100 lpm, 12–20 rpm, 94–100 %); en la cabecera, «Todo en rango» o «Revisa: …».
* Sin diagnósticos: la app no califica la salud de la persona; fuera de rango solo muestra «Si te sientes mal, avisa a tu enfermera». Se actualizó RELIABILITY.md (punto 4) para reflejar esta decisión del usuario.
* En la demo el monitor es simulado (persona tranquila en cama) y la tarjeta muestra «Demo: datos simulados». Los valores que el personal escribe a mano con el PIN quedan fijos.
* En el iPad horizontal, el estado «en rango» es un punto verde en la esquina para que Mi cuidado siga cabiendo sin desplazarse; en el celular se muestra el texto completo.
* Pruebas: 4 propiedades nuevas (estado exacto frente al rango, la simulación siempre queda en rango, detección de tendencia, ruido pequeño = sin cambios).
* Archivos afectados: src/services/wellbeing.ts, src/pages/care/Wellbeing.tsx, src/styles/pages.css, src/types/index.ts, tests/property/wellbeing.test.ts, README.md, RELIABILITY.md.
* Resultado: tsc PASS; propiedades 132/132; E2E 17/17; smoke PASS (1180 × 820, 1180 × 760 y vertical); en iPhone 13 ningún texto sale de su recuadro. No se ejecutó el procedimiento completo de VERIFICACION.md.
* Estado: Completado.

10:42 — «Paisajes» pasa a ser «Recuerdos de viajes» con fotos reales

* En Mi mundo, el acceso «Paisajes» ahora es «Viajes» y abre «Recuerdos de viajes»: 12 fotos de la familia entregadas por el usuario (Machu Picchu, Taj Mahal, Cristo Redentor, playa, montaña, crucero, cumpleaños, los perritos, entre otras).
* Cuadrícula de 4 columnas en el iPad (2 en vertical) y visor a pantalla completa con anterior/siguiente, pase automático cada 9 segundos y música suave opcional («Amanecer sereno»).
* Las fotos se redujeron a un máximo de 1100 px (1,3 MB en total) y quedan guardadas para uso sin conexión.
* Las ilustraciones de paisajes se conservan donde ya se usaban como arte (playlist, juegos).
* Archivos afectados: src/assets/img/viajes/*.jpg (12 nuevas), src/data/media.ts, src/pages/WorldPage.tsx, src/styles/pages.css, README.md.
* Resultado: tsc PASS; propiedades 132/132; E2E 17/17; smoke PASS (incluye tamaño táctil). Sin errores de consola al abrir la cuadrícula y el visor. No se ejecutó el procedimiento completo de VERIFICACION.md.
* Estado: Completado.

10:49 — 10 recuerdos más, cada uno con su lugar

* Se agregaron 10 fotos a «Recuerdos de viajes» (22 en total): Burj Khalifa (Dubái, Emiratos Árabes Unidos), templo en kimono y puente entre montañas (Japón), comida coreana (Seúl, Corea del Sur), calles de Nueva York (Estados Unidos), Disneyland (California, Estados Unidos), Día de Muertos (México), juego en la nieve, concierto y bus de colores.
* Los recuerdos se ordenaron por viaje: primero los de lugares conocidos y al final los de casa.
* Donde el lugar no se distingue en la foto, se usó una descripción (por ejemplo «Un viaje de invierno») en vez de inventar un país.
* Archivos afectados: src/assets/img/viajes/*.jpg (10 nuevas, 1,2 MB), src/data/media.ts.
* Resultado: tsc PASS; propiedades 132/132; E2E 17/17; smoke PASS. No se ejecutó el procedimiento completo de VERIFICACION.md.
* Estado: Completado.

11:39 — Juego con fotos reales de paisajes y widget de familia solo con la foto

* «El despertar del paisaje» usa ahora las 3 fotos reales entregadas por el usuario (isla entre montañas, atardecer con palmeras, pradera con flores) en lugar de ilustraciones. Al despejar toda la neblina aparece «Siguiente paisaje» para pasar al otro; mientras tanto, «Empezar de nuevo» vuelve a cubrir el mismo. Se muestra «Paisaje N de 3».
* La miniatura del juego en Mi mundo usa la primera foto.
* Inicio: el widget de familia ya no muestra el mensaje pendiente ni el contador de mensajes; solo la foto con «Tu familia», y al tocarlo abre Mi gente, donde se escuchan los mensajes. Se borraron los estilos que quedaron sin uso.
* Prueba ajustada: la de silenciar un mensaje hablado ahora lo reproduce desde Mi gente.
* Archivos afectados: src/assets/img/paisajes/*.jpg (3 nuevas), src/data/media.ts, src/pages/world/Games.tsx, src/pages/WorldPage.tsx, src/pages/HomePage.tsx, src/styles/pages.css, tests/e2e/sound.spec.ts, README.md.
* Resultado: tsc PASS; propiedades 132/132; E2E 17/17; smoke PASS; el juego se completó y pasó al paisaje 2 sin errores de consola. No se ejecutó el procedimiento completo de VERIFICACION.md.
* Estado: Completado.

11:57 — Mi gente como WhatsApp: chat, videollamada y audios; 8 paisajes más para el juego

* Al tocar la burbuja de una persona en Mi gente aparecen tres opciones grandes: Mensajes, Videollamada y Audios. El panel lateral también las ofrece (junto con Fotos).
* Mensajes: chat estilo WhatsApp por persona, con burbujas a la derecha (la paciente) y a la izquierda (el familiar). Se puede escribir con emojis, enviar fotos y grabar notas de voz. Sobre la caja de texto se elige quién escribe («Escribe Leslie» / «Escribe Mamá»), así ambos pueden escribir en el mismo dispositivo. Al tocar una burbuja se abre el mensaje (verlo en grande, escucharlo, eliminarlo con PIN). Lista de conversaciones con vista previa y mensajes nuevos.
* Videollamada: pantalla de llamada que suena, se conecta a los 4 segundos, muestra la foto del familiar y la cámara de la paciente en una esquina, con micrófono, cámara y colgar. Marcada como «Demo: llamada simulada»: NEXO todavía no se conecta con el teléfono de la familia.
* Audios: lista de las notas de voz que dejó cada familiar.
* Se quitó el antiguo «Grabar mensaje» (sus funciones pasaron al chat). Los mensajes guardan quién los escribió; los de la paciente no generan notificaciones. Los datos guardados antes se cargan como mensajes del familiar.
* Juego «El despertar del paisaje»: 8 paisajes más entregados por el usuario (11 en total).
* Pruebas: E2E adaptadas al chat (la de limpieza de archivos ahora envía y borra una foto en el chat); propiedades nuevas: los mensajes de la paciente nunca notifican; validación del remitente y de los mensajes con foto.
* Archivos afectados: src/pages/people/Chat.tsx y VideoCall.tsx (nuevos), src/hooks/useRecorder.ts (nuevo), src/pages/people/MessageComposer.tsx (eliminado), src/pages/PeoplePage.tsx, src/components/MessageViewer.tsx, src/types/index.ts, src/services/storage.ts, src/services/notifications.ts, src/data/demo.ts, src/data/media.ts, src/assets/img/paisajes/* (8 nuevas), src/styles/pages.css, tests/**, README.md.
* Resultado: tsc PASS; propiedades 133/133; E2E 17/17; smoke PASS; recorrido real en la app (escribir como Leslie y como Mamá con emoji, audios, llamada) sin errores de consola. No se ejecutó el procedimiento completo de VERIFICACION.md.
* Estado: Completado.

12:18 — Mi gente con solo Mensajes y Videollamada; aviso de mensajes en Inicio; refranes con voz

* Mi gente: al tocar la burbuja de una persona solo aparecen Mensajes y Videollamada. Los audios ya no tienen sección propia: se escuchan dentro del chat. El panel lateral muestra esas dos opciones; el álbum de fotos se movió al perfil (⋯ → «Ver fotos de …»). En el chat queda solo el botón de Videollamada.
* Inicio: el widget de familia muestra la foto, «Tu familia» y, si hay mensajes sin leer, el aviso «Mensaje nuevo de …» (o «Mensajes nuevos de Mamá, Papá y …»). Es solo un aviso, no se puede tocar; los mensajes se abren en Mi gente.
* Completa el refrán: cada refrán se lee en voz alta junto con sus tres opciones numeradas (se puede repetir con el botón de sonido). Se puede responder tocando o con «Responder con la voz»: se dice la terminación o el número de la opción. Si lo que se escuchó no coincide, el juego lo dice y pide repetir en vez de adivinar. Al responder, la voz dice si fue correcto y el refrán completo.
* Se corrigió el aviso de Inicio para que no sea una región que los lectores de pantalla anuncian sin parar (lo detectó una prueba).
* Pruebas: 4 propiedades nuevas para reconocer la respuesta hablada (con palabras de relleno, mayúsculas o tildes, por número, y nunca adivinar ante silencio o palabras sin relación); 1 E2E nuevo con voz y micrófono simulados; E2E adaptados (fotos desde el perfil, audio desde el chat).
* Archivos afectados: src/services/games.ts, src/hooks/useSpeechAnswer.ts (nuevo), src/pages/world/Games.tsx, src/pages/PeoplePage.tsx, src/pages/HomePage.tsx, src/styles/pages.css, tests/property/games.test.ts, tests/e2e/voice-proverb.spec.ts (nuevo), tests/e2e/media-cleanup.spec.ts, tests/e2e/sound.spec.ts, README.md.
* Resultado: tsc PASS; propiedades 137/137; E2E 18/18; smoke PASS. El reconocimiento de voz real no se ha probado en un iPad físico. No se ejecutó el procedimiento completo de VERIFICACION.md.
* Estado: Completado.

---

21/11/2026

23:01 — Inicio más limpio, contador en Mensajes y Mi cuidado reorganizado con presión arterial

* Inicio: se quitó el acceso «Escuchar algo tranquilo». El aviso «Mensajes nuevos de …» pasó a un cuadro aparte debajo de la foto de la familia (sigue sin ser tocable).
* Mi gente: se quitó el recuadro «Mensajes nuevos»; ahora el número de mensajes sin leer aparece como un circulito sobre el botón Mensajes.
* Mi cuidado, con menos texto: encabezado corto; mensaje del equipo de salud en dos líneas; «¿Cómo te sientes hoy?» se mantiene; «Tu plan de cuidado» pasó a «Lo próximo» (tratamiento y procedimiento con su hora en una línea, y acceso a Consejos); «Tu ánimo» sin el bloque lateral de texto (la tendencia es una etiqueta pequeña).
* Monitor integrado: se agregó la presión arterial (máxima/mínima, mmHg) con su rango de referencia y tendencia; los cuatro signos se actualizan cada 3 segundos en una cuadrícula 2 × 2. El formulario del personal también registra la presión. Las lecturas guardadas antes reciben valores de ejemplo (si eran de demostración) o «—» (si eran reales).
* Todo cabe sin desplazarse a 1180 × 820; en celular ningún texto sale de su recuadro.
* Pruebas: propiedades con presión arterial y su migración (138); E2E adaptadas a los nuevos nombres de botones (18).
* Archivos afectados: src/pages/HomePage.tsx, src/pages/PeoplePage.tsx, src/pages/CarePage.tsx, src/pages/care/Wellbeing.tsx, src/services/wellbeing.ts, src/services/storage.ts, src/types/index.ts, src/data/demo.ts, src/styles/pages.css, tests/**, README.md.
* Resultado: tsc PASS; propiedades 138/138; E2E 18/18; smoke PASS. No se ejecutó el procedimiento completo de VERIFICACION.md.
* Estado: Completado.

---

24/11/2026

10:21 — Publicación automática en GitHub Pages (pendiente de activar)

* Se agregó el workflow .github/workflows/deploy.yml: compila NEXO y lo publica en GitHub Pages cada vez que cambia main, o a mano desde Actions.
* Falta un paso que solo puede hacer el dueño del repositorio: Settings → Pages → Source: «GitHub Actions». El repositorio es privado: en el plan gratuito de GitHub, Pages requiere hacerlo público (o un plan de pago).
* Archivos afectados: .github/workflows/deploy.yml (nuevo), README.md, CAMBIOS.md.
* Resultado: la compilación de producción pasa localmente. La publicación no se ha verificado en GitHub porque Pages aún no está activado.
* Estado: En progreso (esperando la activación de Pages).

10:29 — Corrección: tarjetas encimadas en pantallas bajas (vista previa en iPad)

* Problema reportado por el usuario con una foto: en el iPad, dentro de la vista previa de claude.ai (con las barras de Safari y del visor), NEXO tiene unos 640 px de alto; en Mi mundo y Mi cuidado las tarjetas quedaban encima de los controles inferiores y no se podía llegar a Música, Juegos ni Relajación.
* Reproducido a 1130 × 640: 10 botones de Mi mundo y 8 de Mi cuidado quedaban debajo de la barra de controles.
* Corrección: cuando la pantalla horizontal mide menos de 740 px de alto, cada sección ocupa lo que necesita y se desplaza dentro de su área, sin tapar los controles (las mismas reglas que ya se usaban con texto grande). A 1180 × 820 el diseño no cambia.
* Comprobado en 1130 × 640, 1180 × 700, 1180 × 600 y 1024 × 560: ningún botón queda debajo de los controles en las cuatro secciones.
* Archivos afectados: src/styles/pages.css.
* Resultado: tsc PASS; propiedades 138/138; E2E 18/18; smoke PASS. Sin probar todavía en el iPad físico. No se ejecutó el procedimiento completo de VERIFICACION.md.
* Estado: Completado.

10:35 — Meditación guiada con voz femenina sobre la música

* A pedido del usuario, cada paso de la meditación (Mi mundo → Relajación → Meditación) además de verse en pantalla lo lee una voz femenina en español, lenta y suave, mientras sigue sonando la música. Mientras habla, la música baja un poco y luego vuelve a su volumen.
* La voz se elige entre las del dispositivo: femenina en español, prefiriendo la de Colombia y luego la de México (en iPad, por ejemplo «Paulina» o «Mónica»). Si no hay una femenina, usa otra voz en español.
* Botón «Voz guía activada / Solo música» para quien prefiera escuchar solo la música. Silenciar NEXO también calla la voz. Al terminar, la voz dice la frase de cierre.
* Pruebas: 3 propiedades nuevas (elegir siempre una voz femenina en español si existe, preferir Colombia y México, nunca una voz en otro idioma); 1 E2E nuevo (la voz lee los pasos con la música sonando, y «Solo música» la calla).
* Archivos afectados: src/services/audioEngine.ts, src/pages/world/Relax.tsx, tests/property/audio-voice.test.ts (nuevo), tests/e2e/meditation-voice.spec.ts (nuevo), README.md.
* Resultado: tsc PASS; propiedades 141/141; E2E 19/19; smoke PASS. La voz real depende de las voces instaladas en el iPad y no se ha escuchado en el dispositivo físico. No se ejecutó el procedimiento completo de VERIFICACION.md.
* Estado: Completado.

10:44 — Etiqueta «Tu familia» sin tapar caras

* En Inicio, la etiqueta con corazón «Tu familia» tapaba la cara de una persona de la foto. Ahora es más pequeña y está en la esquina superior izquierda, sobre el fondo de la foto.
* Archivos afectados: src/pages/HomePage.tsx, src/styles/pages.css.
* Resultado: revisado a 1180 × 820 y a 1130 × 640 (vista previa en iPad); propiedades 141/141; E2E 19/19; smoke PASS. No se ejecutó el procedimiento completo de VERIFICACION.md.
* Estado: Completado.

10:47 — Se quitó el recuadro «Nada sonando» de la barra inferior

* A pedido del usuario, se quitó el recuadro de la esquina inferior izquierda («Nada sonando» / lo que está sonando). Los controles del centro (−, reproducir/pausar, + y volumen) y la campana siguen en su lugar, centrados.
* Lo que mostraba ese recuadro no se perdió: si algo no se puede reproducir, ahora aparece como aviso emergente; y lo que está sonando se anuncia a los lectores de pantalla (texto invisible).
* Archivos afectados: src/layouts/DeviceChrome.tsx, src/styles/layout.css, tests/e2e/sound.spec.ts, tests/e2e/wellbeing.spec.ts.
* Resultado: tsc PASS; propiedades 141/141; E2E 19/19; smoke PASS. No se ejecutó el procedimiento completo de VERIFICACION.md.
* Estado: Completado.

10:50 — Recuerdos en una sola pantalla; mensajes nuevos coherentes con el chat

* Mi mundo: se quitó «Viajes» como acceso aparte. «Recuerdos» reúne todo en una sola pantalla: primero «Viajes» (las 22 fotos de viajes, con el visor y pase automático) y luego «En familia» (el video y las fotos de la familia).
* Mi gente: un mensaje del familiar solo cuenta como nuevo si llegó después de la última respuesta de la paciente en esa conversación (si ella respondió, ya lo vio). La regla se aplica igual en el circulito de Mensajes, en la lista de conversaciones, en el aviso de Inicio y en la campana.
* El panel «Último mensaje» ahora muestra el último mensaje real de la conversación, sea del familiar o de la paciente («Tú: …»), y al tocarlo abre el chat.
* Datos de ejemplo corregidos: Bryan y Karen ya no aparecen con mensajes nuevos porque Leslie les había respondido; Mamá le responde a Leslie después de su pregunta, así que sus 2 mensajes sí son nuevos.
* Pruebas: 5 propiedades nuevas (regla de mensajes nuevos, responder marca todo lo anterior como visto, último mensaje de la conversación y coherencia de los datos de ejemplo).
* Archivos afectados: src/services/messages.ts (nuevo), src/services/notifications.ts, src/pages/PeoplePage.tsx, src/pages/HomePage.tsx, src/pages/WorldPage.tsx, src/data/demo.ts, src/styles/pages.css, tests/property/messages.test.ts (nuevo), README.md.
* Resultado: tsc PASS; propiedades 146/146; E2E 19/19; smoke PASS. No se ejecutó el procedimiento completo de VERIFICACION.md.
* Estado: Completado.

10:58 — Chat sin «Escribe Leslie / Escribe Mamá» y videollamada como una llamada real

* Mi gente → Mensajes: se quitaron los botones «Escribe Leslie / Escribe Mamá». Lo que se escribe en el chat lo envía la paciente; la caja dice «Escribe a Mamá».
* Videollamada rediseñada como una llamada real: la cámara del familiar ocupa toda la pantalla (en la demo, su foto con un movimiento suave, como alguien frente a la cámara), con nombre, punto «en vivo» y tiempo arriba; la cámara de la paciente aparece en una ventana pequeña y al tocarla se intercambian las vistas. Botones de micrófono, cámara y colgar sobre el video.
* Sigue marcada como «Demo: llamada simulada» y explica que la cámara del familiar es su foto. Dentro de la vista previa de claude.ai el iPad puede no dar permiso de cámara (el visor no lo ofrece); en la app publicada o instalada la cámara sí funciona.
* Pruebas: 1 E2E nuevo (chat sin selector, envío como paciente, llamada que contesta, intercambio de vistas y colgar).
* Archivos afectados: src/pages/people/Chat.tsx, src/pages/people/VideoCall.tsx, src/styles/pages.css, tests/e2e/videocall.spec.ts (nuevo), README.md.
* Resultado: tsc PASS; propiedades 146/146; E2E 20/20; smoke PASS; con cámara simulada de Chromium se vio el video propio en la ventana pequeña. No se ejecutó el procedimiento completo de VERIFICACION.md.
* Estado: Completado.

11:06 — Juego nuevo «Vuelo del colibrí», controlado con la cabeza

* Idea del usuario: un juego de estimulación facial además de táctil. Es original de NEXO (no es copia de ningún juego existente): un colibrí vuela entre arcos de flores, y la paciente lo guía subiendo o bajando la cabeza frente a la cámara. Está pensado para una paciente en la UCI: es lento, las aberturas son amplias, chocar no termina el juego (solo dice «¡Casi!») y cada arco superado suena y suma.
* Al empezar se calibra («Mira de frente a la pantalla un momento…»); una ventana pequeña muestra la cámara con «Te veo». Si no ve la cara, lo dice. También se puede jugar con el dedo, y si no hay cámara (por ejemplo en la vista previa de claude.ai) cambia solo a modo dedo.
* Privacidad: la detección de la cara corre dentro del iPad; la imagen no se graba ni se envía. Se dice en la pantalla.
* Dependencia nueva (RELIABILITY 10): @vladmandic/face-api 1.7.15 (licencia MIT), fijada a versión exacta. Se carga solo al abrir el juego: el JavaScript principal sigue en 323 kB (sin cambio) y la librería va aparte (1,31 MB, 330 kB comprimida). Modelo del detector: 193 kB en public/models, guardado para uso sin conexión (caché nexo-v3). La vista previa de claude.ai no incluye la librería (allí no hay cámara); su tamaño sigue en 12,0 MB. Motivo: es la opción más liviana que funciona sin internet y sin enviar la imagen a un servidor.
* Mi mundo: la columna de Juegos cognitivos se compactó para que los 4 juegos quepan a 1180 × 820 (botones de al menos 56 px).
* Probado con una cámara simulada que muestra una cara moviéndose arriba y abajo: el colibrí siguió la cara (altura entre 0,20 y 0,95, al ritmo del movimiento).
* Pruebas: 6 propiedades nuevas (el colibrí y las aberturas siempre dentro de la pantalla; cada arco cuenta una sola vez; el juego es justo: apuntar al centro de cada abertura pasa todos los arcos; mover la cabeza hacia arriba sube el colibrí); 1 E2E nuevo (modo dedo y pausa); la prueba sin conexión ahora acepta cualquier versión de la caché e incluye el modelo.
* Archivos afectados: src/services/flight.ts y src/services/faceTracker.ts (nuevos), src/pages/world/HeadFlight.tsx (nuevo), src/pages/world/Games.tsx, src/pages/WorldPage.tsx, src/styles/pages.css, public/models/* (nuevos), public/sw.js, package.json, package-lock.json, tests/property/flight.test.ts y tests/e2e/flight.spec.ts (nuevos), tests/e2e/offline.spec.ts, README.md.
* Resultado: tsc PASS; propiedades 152/152; E2E 21/21; smoke PASS. Sin probar todavía en el iPad físico. No se ejecutó el procedimiento completo de VERIFICACION.md.
* Estado: Completado.

11:09 — Refrán corregido y mensajes nuevos marcados al abrir el chat

* Completa el refrán: «A caballo regalado…» ahora termina en «no se le miran los dientes» (antes decía «el colmillo», que no es la forma correcta).
* Mi gente → Mensajes: al abrir un chat, los mensajes que no se habían visto aparecen debajo de una línea «1 mensaje nuevo» / «N mensajes nuevos», con el borde resaltado y la etiqueta «Nuevo», y el chat empieza en ese punto (como en WhatsApp). Siguen marcados así mientras se está en el chat; al salir quedan como leídos y el circulito desaparece.
* Datos de ejemplo: además de Mamá y Papá, Rafa tiene una conversación con un mensaje nuevo sin leer, y Papá un segundo mensaje («Mañana te llevo tu cobija favorita 💙»). Bryan y Karen siguen sin mensajes nuevos porque Leslie ya les respondió.
* Pruebas: 1 E2E nuevo (abrir el chat de Rafa muestra el mensaje nuevo; al volver a entrar ya no está marcado y queda guardado como leído); la propiedad de datos de ejemplo ahora incluye a Rafa; el E2E de refranes usa la terminación corregida.
* Archivos afectados: src/services/games.ts, src/pages/people/Chat.tsx, src/data/demo.ts, src/styles/pages.css, tests/e2e/new-messages.spec.ts (nuevo), tests/e2e/voice-proverb.spec.ts, tests/property/messages.test.ts.
* Resultado: tsc PASS; propiedades 152/152; E2E 22/22; smoke PASS. No se ejecutó el procedimiento completo de VERIFICACION.md.
* Estado: Completado.

15:45 — Vuelo del colibrí: chocar reinicia y la vista previa ya incluye el detector de caras

* Regla nueva pedida por el usuario: si el colibrí no pasa por el hueco entre las dos partes del arco y lo toca, la ronda termina («¡Chocaste! Pasaste N arcos · Tu mejor: …») y el botón «Jugar otra vez» la reinicia desde cero. Se guarda el mejor puntaje.
* Cámara en la vista previa: antes la vista previa (archivo único) no incluía el detector de caras, así que nunca podía usar la cámara. Ahora el modelo va empaquetado dentro de la app (y dentro del archivo único de la vista previa) y la librería también. Probado sirviendo el archivo de la vista previa con una cámara simulada: el colibrí siguió la cara. Que la cámara se encienda dentro del visor de claude.ai depende de que el visor lo permita; si no, el juego pasa al modo dedo y lo dice.
* El modelo dejó de estar en public/models: ahora es un recurso de la compilación (queda en la lista de archivos para uso sin conexión). Caché del service worker: nexo-v4.
* Tamaños: vista previa 13,6 MB (antes 12,0 MB; límite 16 MB); JavaScript principal de la app sin cambio (323 kB).
* Pruebas: 1 E2E nuevo (chocar termina la ronda, el colibrí se detiene y «Jugar otra vez» reinicia); la prueba sin conexión ya cuenta el modelo dentro de la lista de la compilación.
* Archivos afectados: src/pages/world/HeadFlight.tsx, src/services/faceTracker.ts, src/assets/models/* (movidos desde public/models), public/sw.js, src/styles/pages.css, tests/e2e/flight.spec.ts, tests/e2e/offline.spec.ts, README.md.
* Resultado: tsc PASS; propiedades 152/152; E2E 23/23; smoke PASS. No se ejecutó el procedimiento completo de VERIFICACION.md.
* Estado: Completado.
