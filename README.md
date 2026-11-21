# NEXO

**Orientación que conecta, tecnología que acompaña.**

NEXO es una máquina inteligente de bienestar y conexión familiar pensada para acompañar a una persona hospitalizada (por ejemplo, en una UCI) desde la mesa de noche. El hardware es un **iPad Air de 11 pulgadas en horizontal** y esta aplicación web es el software que le da vida: no es una página web sobre NEXO, es la pantalla del dispositivo.

Vista previa actual (privada): https://claude.ai/artifact/JpmgYYNtLgyiwFb3FSWezo
Publicación en GitHub Pages: pendiente.

## Objetivo

Que la persona sepa dónde está, qué día y qué hora es y quién la acompaña; que pueda escuchar a su familia, calmarse, mantener la mente activa y entender su atención, todo con toques grandes y simples.

## Características

| Sección | Qué hace |
|---|---|
| **Inicio** | Saludo según la hora con el nombre configurado, fecha y reloj en vivo, último mensaje de la familia (reproducir, pausar, detener), dónde está, tarjeta de bienestar, clima de ejemplo y accesos rápidos. |
| **Mi gente** | Carrusel de familiares, perfil individual, agregar/editar/eliminar contactos, mensajes de voz, video y texto, grabación de mensajes de voz, álbum de fotos por persona. |
| **Mi mundo** | Mi playlist (favoritos, anterior/siguiente), música suave, sonidos de naturaleza, paisajes ilustrados, recuerdos (fotos y video), juegos cognitivos (El despertar del paisaje, Eco de luces, Completa el refrán) y relajación (respiración guiada, meditación, sonidos relajantes). |
| **Mi cuidado** | Nota del equipo de salud, “¿Cómo te sientes hoy?” (registro diario), signos vitales registrados por el personal, plan de cuidado, evolución del ánimo (gráfica de 7 días), tratamientos, procedimientos y recomendaciones por categoría. Solo informativo. |
| **Controles** | Barra inferior inspirada en la máquina: bajar volumen, reproducir/pausar, subir volumen y campana de notificaciones. Arriba: silenciar y configuración. |
| **Configuración** | Nombre, volumen, tamaño de texto, reducir movimiento, notificaciones, ubicación y clima de ejemplo, información de la app y restablecer datos de demostración. |

## Tecnologías

- React 18 + TypeScript + Vite
- CSS3 propio (variables, Grid, Flexbox, media queries); sin framework de UI
- Lucide React (iconos)
- LocalStorage (datos y preferencias) e IndexedDB (fotos, audios y videos agregados en el dispositivo)
- Web Audio API (control de volumen real en iPadOS, tonos de juegos y avisos), Speech Synthesis (lectura en voz alta), MediaRecorder (grabar mensajes)
- PWA: manifest + service worker propio
- Tipografía Lexend alojada localmente

## Estructura del proyecto

```
src/
├── assets/        audio (.m4a), video (.mp4), img, fonts
├── components/    piezas reutilizables (Sheet, Avatar, controles de reproducción, gráfica, logo…)
├── data/          datos de demostración y catálogo multimedia
├── hooks/         estado global (datos, UI), reloj, reproductor, URLs de medios
├── layouts/       marco del dispositivo: barra superior, menú lateral, controles
├── pages/         Inicio, Mi gente, Mi mundo, Mi cuidado, Configuración (+ subcarpetas)
├── services/      lógica pura y persistencia: storage, mediaStore, audioEngine, care, games, wellbeing, notifications, time
├── styles/        tokens, base, layout, components, pages
└── types/         tipos de TypeScript
public/            manifest, service worker, íconos
scripts/           generación de audio/video, íconos y vista previa
```

Los servicios no dependen de React; para conectar una base de datos real basta con reemplazar `services/storage.ts` y `services/mediaStore.ts` manteniendo sus firmas.

## Requisitos

- Node.js 20 o superior y npm
- ffmpeg (solo para regenerar el audio y el video de demostración)

## Instalación

```bash
npm install
```

## Ejecución local

```bash
npm run dev
```

Abre la URL que aparece (también en la red local, para probar desde el iPad en la misma Wi‑Fi).

## Compilación

```bash
npm run build
```

```bash
npm run preview
```

Otros comandos:

| Comando | Para qué |
|---|---|
| `npm run build:artifact` | Genera `dist-artifact/index.html`, un solo archivo con todo incluido (vista previa). |
| `npm run media` | Regenera la música, los sonidos y el video de demostración. |
| `npm run icons` | Regenera los íconos de la PWA. |

## Despliegue en GitHub Pages

Pendiente de configurar (se hará al final). La app ya está preparada: Vite usa `base: './'`, por lo que funciona en cualquier subruta (`https://usuario.github.io/NEXO/`), y la navegación es interna (no usa rutas de URL), así que no hay errores 404 al recargar. Falta crear el workflow de GitHub Actions y activar Pages en el repositorio.

## Instalar en el iPad (PWA)

1. Abre la dirección publicada en **Safari**.
2. Toca **Compartir → Agregar a pantalla de inicio**.
3. Abre NEXO desde el ícono: se ve a pantalla completa, sin barras de Safari.
4. Para un uso como dispositivo dedicado, activa **Ajustes → Accesibilidad → Acceso guiado** y bloquea la pantalla en horizontal desde el Centro de control.

### Limitaciones de Safari / iPadOS

- Safari no permite forzar la orientación horizontal; en vertical NEXO cambia a un diseño de una columna con menú inferior.
- El volumen del sistema se controla con los botones físicos; los botones de NEXO ajustan el volumen de la app mediante Web Audio (iPadOS ignora `audio.volume`).
- El sonido solo empieza después de un toque (política de reproducción de iOS).
- Grabar mensajes de voz requiere permiso de micrófono y funciona solo en HTTPS o `localhost`.
- La lectura en voz alta usa las voces instaladas en el iPad; la calidad depende de ellas.
- iPadOS puede borrar los datos de sitios web que no se usan en varias semanas; instalada como app de pantalla de inicio, esa limpieza es mucho menos probable.

### Qué funciona sin conexión

Todo, después de la primera visita: al instalarse, el service worker guarda la app completa (lista `precache.json` generada en cada compilación), la música, los sonidos, las fotos y el video, y responde desde la caché las peticiones por rangos del audio, así que la música suena y se puede adelantar sin red. No hay funciones que dependan de internet. Verificado en Chromium; falta probarlo en un iPad físico.

## Funcionalidades implementadas

- Navegación entre las cuatro secciones con transiciones; menú lateral (inferior en vertical).
- Reloj y fecha en vivo, saludo según la hora, nombre configurable.
- Reproductor único con reproducir, pausar, reanudar, detener, progreso con búsqueda, anterior/siguiente, volumen y favoritos guardados.
- Audio real: 6 piezas originales y 1 video de demostración incluidos.
- Contactos: crear, editar, eliminar (con confirmación), foto desde cámara o galería, perfil.
- Mensajes: voz grabada en el dispositivo, video, texto; los de demostración se leen en voz alta y están marcados.
- Tratamientos y procedimientos: crear, editar, eliminar con validaciones; recordatorios.
- Recomendaciones por categoría con lectura en voz alta.
- Registro de ánimo diario y gráfica «Tu ánimo» (lo que la persona registró, sin valoraciones clínicas); signos vitales y nota del equipo editables por el personal.
- Notificaciones dentro de la app con insignia, aviso sonoro y configuración por tipo.
- Modo cuidador: agregar, editar o eliminar personas, mensajes, fotos, tratamientos, procedimientos, signos, la nota del equipo y restablecer datos piden un PIN (de demostración: **1234**; se cambia en Configuración → Contenido). Queda desbloqueado 10 minutos o hasta tocar «Bloquear». Es una barrera contra toques accidentales, no una medida de seguridad.
- Configuración persistente; restablecer datos de demostración.
- Manejo de errores: almacenamiento lleno o bloqueado, datos dañados (se descartan los registros rotos y se guarda una copia de respaldo), medios no disponibles, micrófono denegado y una pantalla de error con «Volver a intentar».
- Accesibilidad: áreas táctiles ≥ 56 px, iconos con texto, tres tamaños de texto, reducir movimiento, foco visible, etiquetas para lectores de pantalla.
- PWA instalable con funcionamiento sin conexión.

## Funcionalidades pendientes

- Publicación en GitHub Pages con GitHub Actions.
- Videollamadas y envío de mensajes desde el paciente hacia la familia (requieren un servicio externo; hoy la familia deja los mensajes en el propio dispositivo).
- Clima real (requiere un servicio meteorológico; hoy es un dato de ejemplo editable).
- Integración con monitores o historia clínica (hoy los signos y tratamientos se registran a mano).
- Sincronización entre dispositivos (requiere un servidor y base de datos).
- Prueba en un iPad físico (las pruebas actuales son en Chromium con el tamaño del iPad).

## Datos de demostración

Las fotos de la familia de demostración (la paciente Leslie, Mamá, Papá, su hermano Rafa, su hermana Karen y su novio Bryan) son reales y se usan con permiso de esas personas, según confirmó quien desarrolla el proyecto. Los mensajes, los datos de contacto, los tratamientos, procedimientos, recomendaciones, el historial de ánimo, los signos vitales, la nota del equipo y el clima iniciales son ficticios y aparecen marcados como “Demostración” o “Ejemplo”. Mi cuidado es informativo: no diagnostica ni cambia tratamientos.
