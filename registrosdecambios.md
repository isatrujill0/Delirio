# Registro de cambios · NEXO

Registro de los cambios del sitio, del más reciente al más antiguo, para que varias personas puedan trabajar a la vez sin pisarse.

## Cómo trabajar en paralelo

1. Antes de empezar, actualiza tu copia: `git pull`.
2. Trabaja en una rama propia (`git switch -c nombre-del-cambio`) y no directamente en `main`.
3. Anota tu cambio aquí, arriba del todo: fecha, quién, qué y qué archivos toca.
4. Si vas a tocar una zona que alguien tiene «en curso» (abajo), avísale antes.
5. Para probar: `powershell -File serve.ps1` y abre http://localhost:5173. No hay tests; se verifica en el navegador (claro, oscuro y móvil).

Los archivos que más se tocan a la vez son `index.html`, `css/styles.css` y `js/main.js`. Cuanto más pequeño sea cada cambio, más fácil será juntarlo.

## En curso / pendiente

- Probar la portada nueva en Safari y en móviles reales (la figura de partículas usa WebGL).
- Falta la frase definitiva de la intro (debajo de «NEXO»).
- En móvil la cabeza queda en parte detrás del título: valorar si se reduce el texto en pantallas pequeñas.
- La sección «Elige tu recorrido» sigue justo debajo de la portada, antes de «Qué es»: decidir si se queda ahí.
- Revisar con herramienta el contraste del texto de la portada cuando pasan partículas brillantes por detrás.

## 2026-11-20 · Figura humana, portada «Delirium» e identidad más equilibrada

- **Figura:** se exploraron dos opciones: cerebro abstracto o figura humana. Se eligió la **figura humana** (busto de perfil con la cabeza inclinada hacia arriba) porque une el delirium a una persona y no solo a un órgano. Dentro de la cabeza hay una red densa de neuronas y filamentos que se encienden, se apagan y se dispersan, con chispas cálidas. La piel y el cuerpo son una nube tenue. Alrededor de la cabeza orbitan partículas y al fondo ondulan cintas de luz. Archivo: `js/hero.js`.
- **Portada:** el texto va centrado sobre el pecho de la figura: «Delirium», «Cuando la mente pierde sus referencias.», una frase que lo define, el botón «Conoce el proyecto» (lleva a #nexo) y el indicador «Explora más». Detrás del texto hay un velo oscuro suave para que se lea aunque pasen partículas.
- **Menú de la portada:** está dentro de una píldora de vidrio, con «Inicio» marcado.
- **Intro:** «NEXO» y la frase se ven unos 3 segundos y luego se abre la página. La frase es **provisional** y está marcada con un comentario en `index.html`.
- **Identidad equilibrada:** en el tema claro, el fondo pasa a casi blanco y los paneles a superficies sólidas con sombra suave, sin desenfoque. El vidrio y los degradados azules y lilas quedan para momentos concretos: la portada, «Por dentro» y «Las dos caras» (oscuras), y «NEXO» y «La Station» (nueva clase `.feature`). Las secciones `.alt` tienen un gris azulado neutro. El vidrio se controla con el token `--blur`.
- **Archivos:** `js/hero.js`, `index.html`, `css/styles.css`.

## 2026-11-20 · Portada inmersiva con cabeza de partículas (sustituida el mismo día)

- **Qué:** la portada pasa a ser una escena oscura a pantalla completa. En el centro, una cabeza humana de perfil hecha de unas 7.000 partículas y filamentos que respiran, se alejan y vuelven, se encienden y se apagan, con una onda de luz que la atraviesa (alusión a la atención fluctuante del delirium). Gira despacio sola; no reacciona al ratón ni a los clics. Al bajar, las partículas se dispersan y la escena se funde con la siguiente sección.
- **Texto:** titular «Cuando la mente pierde sus referencias.», frase de apoyo e indicador «Explorar». Se quitaron de la portada los botones, el reloj, «Estás en la UCI» y la curva de atención.
- **Cabecera:** sobre la portada es transparente, usa colores oscuros y muestra solo cuatro enlaces (El delirium, El problema, Nuestra propuesta, NEXO). Al bajar vuelve el menú completo y la barra de recorridos.
- **Accesibilidad:** con movimiento reducido la figura se dibuja quieta; sin WebGL queda un núcleo de luz suave.
- **Archivos:** `js/hero.js` (nuevo), `index.html`, `css/styles.css`, `js/main.js`.
- Se añadieron los anclajes `#nexo-problema` y `#nexo-propuesta` en la sección NEXO.

## 2026-11-19 · Portada con cerebro de conexiones (sustituida el 20)

- Primera versión de la portada centrada en un cerebro dibujado en SVG con tarjetas en las esquinas. Botones más grandes (54 px), iconos de 26 px y botón secundario con borde de color: esto último se mantiene en todo el sitio.

## 2026-11-20 · Accesibilidad (commit d3ca68c)

- Contraste AA en ambos temas y en la Station, etiquetas pequeñas a 0,85 rem, áreas táctiles de 44 px en pantallas táctiles, títulos que siempre terminan su animación al hacer scroll, menú compacto por debajo de 1440 px.

## 2026-11-19 · Guía Apple Design (commit 8ba357f)

- Respuesta inmediata al pulsar, cabecera sin línea dura, menú móvil que aparece desde su botón, fundido al cambiar de tema y soporte para menos transparencia y más contraste.

## 2026-11-19 · Rediseño NEXO (commit 44e7824)

- Intro «NEXO», tema claro por defecto y movimiento ligado al scroll (mundo «Calma de vidrio»).

## 2026-11-13 · Inicio del proyecto

- Primer commit, rediseño «hoja de turno» y gráfico de atención en el hero.
