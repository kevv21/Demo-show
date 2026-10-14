# Quincena: notas para Claude Code

App web instalable (PWA) en HTML, CSS y JavaScript, sin dependencias ni paso de build. Qué hace y cómo se usa: `README.md`.

## Antes de cambiar algo

- **Esta rama está publicada.** GitHub Pages sirve `claude/inspiring-volta-0stml8` (carpeta raíz) en https://kevv21.github.io/Demo-show/ y el usuario tiene la app instalada en su teléfono. Cada push cambia su app: pide confirmación antes de hacer push. Es la única rama del repo.
- **Los datos del usuario** están en `localStorage` del teléfono (`quincena:v1`), sin copia en ningún servidor. Si cambias su formato, migra en `Store.normalize` y nunca borres datos. La demo (`?demo=1`) usa otra clave, `quincena:demo`.
- **Service worker** (`sw.js`): responde primero desde la caché y se actualiza en segundo plano, así que un cambio se ve la segunda vez que se abre la app. Si agregas un archivo a la app, súmalo a `SHELL`.
- **Dos sesiones trabajan en esta rama:** la de Claude Code en la nube y una local en la PC del usuario (clon en `C:\Users\Morenito34\Proyectos\Quincena`). Haz `git pull` antes de empezar y otra vez antes de hacer push.
- **Pruebas:** `npm test` (lógica de quincenas, `node --test`).

## Diseño: tres lugares que deben coincidir

1. `src/styles.css`: manda, porque es lo que se ve.
2. `design/tokens.json`: los mismos valores en formato W3C DTCG.
3. Figma: https://www.figma.com/design/KFgbavtd7Wv6QRieTEu03K (páginas Fundamentos, Pantallas en claro y oscuro, y Componentes). Se hizo el 2026-10-13 con la API de plugins desde la pestaña de Figma en Chrome, no con el conector MCP, que en este plan (Starter, asiento View) solo da 20 llamadas al mes. Starter permite un modo por colección: por eso "Color claro" y "Color oscuro" son dos colecciones con los mismos nombres de variable.

Si cambias un color, tamaño o peso, cámbialo en los tres o anota la diferencia al final de la página Fundamentos ("Pendientes para el código").

`docs/handoff-figma.md` es histórico: el plan que propone ya no hace falta.

## Reglas del código

- **Colores de categoría:** al pintarlos, pásalos siempre por `catColor()` (`src/app.js`). Cambia `#13201A` (Metas, y ese color de la paleta) por `var(--ink)` para que se vea en modo oscuro. El color guardado no cambia.
- **Fondo de las hojas:** `dialog#sheet::backdrop` lleva el color escrito (bg.scrim, `#0A100D` al 45 %) porque Safari antes de 17.4 no pasa variables a `::backdrop`.

## Cómo escribir para este usuario

Español, directo y sin halagos. En textos de la app, documentos y mensajes no uses guion largo ni guion medio como pausa: usa coma, punto, dos puntos o paréntesis.

## Historial fuera de la sesión original

**2026-10-13, sesión local:** se corrigieron los 6 "Pendientes para el código" de Figma.
1. `tokens.json` no tenía `--hero-muted`: agregado como `text.on-hero-muted`.
2. `tokens.json` ponía peso 500 en cuerpo y secundario, pero la app los muestra en 400: ahora dice 400.
3. La cifra principal mide `clamp(38px, 11vw, 48px)` (43 a 390 de ancho): se deja así para que quepan montos grandes y quedó explicado en `tokens.json`.
4. El texto de ejemplo de los campos usaba el gris de Chrome: ahora `::placeholder` usa `var(--muted)`.
5. Metas (`#13201A`) casi no se veía en modo oscuro: se agregó `catColor()`.
6. El aviso de demo tenía `#13201A` escrito: ahora usa `var(--accent-ink)` (text.on-accent). El fondo de las hojas quedó registrado como `bg.scrim`.

Falta en Figma: tachar esa lista y pintar Metas con text/primary en las pantallas oscuras.
