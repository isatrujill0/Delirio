# NEXO · Delirio en Pacientes Críticos

Sitio de divulgación de una sola página sobre el delirio en la UCI. Público: familias, estudiantes de salud y profesionales de UCI, por igual. Propósito, públicos, principios y evidencia disponible: ver [PRODUCT.md](PRODUCT.md). Además presenta NEXO, la propuesta de solución del proyecto (Station junto a la cama, plataforma Care, ayuda de IA con revisión humana). Fuente de NEXO: el PDF «NEXO_presentacion_de_solucion». Dirección visual: «Calma de vidrio» (abajo). Las notas de `.impeccable/surfaces/` describen la dirección anterior («Siga la línea») y ya no aplican.

## Stack y cómo ejecutarlo

- HTML, CSS y JS puros. Sin framework, sin build, sin dependencias, sin backend.
- Servidor local: `powershell -File serve.ps1` → http://localhost:5173 (puerto con `-Port` o `$env:PORT`).
- No hay tests ni linter. Se verifica abriendo la página en el navegador.

## Archivos

- `index.html` — toda la página. Secciones `<section data-title data-lines>` en este orden: inicio (hero + recorridos), que-es, por-dentro, dos-caras, deteccion, causas, prevencion, familia, nexo (problema, tres elementos, flujo de cápsulas, límites), station (maqueta interactiva de NEXO Station), evidencia, historias, recursos. Iconos como `<symbol>` SVG al inicio del `<body>`, usados con `<use href="#i-...">`.
- `css/styles.css` — mundo «Calma de vidrio»: azules y lavandas, paneles translúcidos. Referencias de la autora: portal «Heart Blooms» (lavanda muy claro, letra fina grande, mucho aire) y webs con un objeto que se mueve al hacer scroll. Tokens en `:root` (claro, el tema por defecto) y `:root[data-theme="dark"], .night` (oscuro). `.night` fuerza oscuro en por-dentro y dos-caras; `.st-screen` (la pantalla de la Station) es siempre azul con texto blanco. Una sola receta de vidrio agrupa los selectores de paneles.
- Movimiento (todo se apaga con `prefers-reduced-motion`): intro «NEXO» una vez por sesión (clase `intro-on` desde el `<head>`, `sessionStorage('intro')`; clic o tecla la salta); esfera `.travel` fija que va al sitio que marca cada sección en `data-obj="x y escala giro opacidad"` (x, y en % de la ventana); los grupos `.spread` empiezan juntos en el centro y se reparten al bajar (`--q`); títulos con `--h` y portada con `--hx`. Todo esto solo aplica bajo la clase `moving` en `<html>`.
- `js/main.js` — IIFE con helpers `$`, `$$`, `safe`. Bloques: tema, tamaño de texto, menú móvil, rutas por público, animaciones al hacer scroll, intro, movimiento ligado al scroll, «dónde estás», simulación de dos habitaciones (datos en `NIGHT` y `HR`), prueba de letras (CAM-ICU rasgo 2), reloj (`data-today`, `data-now`, `data-daypart`), Station (pestañas, audio y llamada simulados, modos), flujo de cápsula, filtro de evidencia, formulario simulado.
- `js/brain.js` — cerebro 3D en WebGL puro (malla generada con ruido Perlin) para la sección `#por-dentro`, anclado al scroll. No se activa sin WebGL ni con `prefers-reduced-motion`.
- `.impeccable/` — notas y maquetas de diseño de la skill impeccable; no se sirven.

## Convenciones

- Todo el contenido, comentarios y nombres de UI en español. Terminología clínica: delirio, CAM-ICU, ICDSC, RASS, paquete ABCDEF, guías PADIS.
- Recorridos por público: `fam` (menta), `est` (cielo), `pro` (melocotón). Cada sección declara en `data-lines` a qué recorridos pertenece; el elegido se guarda en `localStorage('route')` y atenúa los demás.
- Tema (`data-theme` en `<html>`) y ruta se aplican con un script inline en `<head>` antes de pintar, para evitar parpadeo. Todo acceso a `localStorage` va envuelto en try/catch.
- Densidad: poca información a la vez. Tablas largas plegadas en `<details class="more">`, cifras como números grandes (`.stats`), secciones con mucho aire (9rem).
- Diseño: títulos Manrope 300 grandes, vidrio translúcido (`backdrop-filter`), esquinas redondeadas (28 px paneles, píldoras en botones), sin halos de color brillante. Fuentes: Manrope (títulos e interfaz), Atkinson Hyperlegible Next (lectura y acentos en cursiva `.soft`).
- Accesibilidad obligatoria: contraste AA, teclado, `aria-*` en piezas interactivas, respetar `prefers-reduced-motion`, texto ampliable (100/112/125 %).

## Reglas de contenido

- No inventar personas, instituciones, testimonios ni cifras sin fuente. Los testimonios son ilustrativos y se rotulan así.
- El formulario es simulado y debe decirlo.
- Contenido educativo; no sustituye la valoración de un profesional.
- NEXO no diagnostica ni trata el delirio, la IA nunca publica sin aprobación humana y el prototipo es académico: decirlo donde se presente. No usar fotos de personas reales; la Station muestra huecos rotulados.
- El delirio hipoactivo (silencioso) merece tanto espacio como el hiperactivo.
