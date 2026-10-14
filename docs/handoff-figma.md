# Traspaso a Claude Desktop: llevar Quincena a Figma

Documento para continuar en una sesión de Claude Desktop (en la computadora del usuario) el trabajo de diseño en Figma que no se pudo hacer desde la nube.

## 1. Contexto

- El usuario pidió una app para llevar sus finanzas con **salario quincenal**, registrando y especificando sus gastos, diseñada en Figma y basada en apps de referencia y comunidades (Reddit, foros).
- **Ya está hecha la app** (web instalable, sin dependencias) en el repo `kevv21/Demo-show`, rama `claude/inspiring-volta-0stml8`. No hay PR abierto.
- El usuario es de **Nicaragua**: la app trabaja en córdobas (C$) y acepta montos en dólares (US$) con tipo de cambio. Los diseños deben mostrar montos en C$ (por ejemplo "C$12,500") y, donde aplique, el equivalente "US$250".
- **Falta el diseño en Figma.** El conector MCP de Figma se bloqueó: la cuenta tiene plan **Starter con asiento View** y ese plan permite **20 llamadas MCP al mes**, ya agotadas el 14 oct 2026. Ese límite es de la cuenta de Figma, así que también aplica en Desktop.
- Archivo de Figma ya creado (vacío, una página "Page 1"): https://www.figma.com/design/KFgbavtd7Wv6QRieTEu03K (fileKey `KFgbavtd7Wv6QRieTEu03K`, plan `team::1673967276440825674`).

## 2. Objetivo en Figma

En el archivo anterior, dejar:

1. **Página "Fundamentos":** variables de color con modos *Claro* y *Oscuro* (valores en `design/tokens.json`), estilos de texto en Manrope y una muestra visual de paleta y tipografía.
2. **Página "Pantallas":** 7 frames de 390 × 844 en fila, con 80 px de separación: Bienvenida, Inicio, Gastos, Fijos, Reportes, Ajustes y Nuevo gasto (hoja inferior). La versión oscura es opcional, en una segunda fila.
3. **Componentes básicos** (si hay tiempo): Botón (primario, secundario, peligro), Chip (normal, activo), Fila de gasto, Fila de fijo (pendiente, pagado, vencido), Tarjeta de sobre (ok, cerca del límite, excedido) y Barra de pestañas.

Criterio de terminado: las pantallas se ven como las capturas de `design/screens/`, usan las variables (no colores sueltos) y sin textos cortados.

## 3. Rutas, en orden de preferencia

### Ruta A: importar la app real con html.to.design (la más rápida)
1. Publicar la app. Opción 1: GitHub, en Settings → Pages → Deploy from a branch, rama `claude/inspiring-volta-0stml8`, carpeta `/ (root)`. Pedir confirmación al usuario antes de cambiar ajustes de su repo. Opción 2: correrla local con `npm start` (http://localhost:8080) y usar la extensión de Chrome de html.to.design, si está disponible, para capturar localhost.
2. En Figma, en el archivo de arriba, abrir el plugin **html.to.design** (instalarlo si falta) e importar cada URL con viewport de 390 px de ancho:
   `?demo=1#/inicio`, `?demo=1#/movimientos`, `?demo=1#/fijos`, `?demo=1#/reportes`, `?demo=1#/ajustes`, y la raíz sin `?demo` para la Bienvenida (en una ventana sin datos guardados).
   Para "Nuevo gasto", usar `?demo=1&nuevo=1#/inicio`.
3. Renombrar los frames, ordenarlos en la página "Pantallas" y, si el plugin lo permite, importar también con el esquema oscuro.
4. Crear las variables desde `design/tokens.json` (plugin Tokens Studio, o a mano si son pocas) y reemplazar los colores importados por variables.
5. Ojo: el plan gratuito de html.to.design puede limitar el número de importaciones; verificar antes de empezar.

### Ruta B: conector MCP de Figma (solo si hay cuota)
- Revisar con `whoami`. Si el límite sigue agotado, no insistir: esperar al reinicio mensual o que el usuario consiga un asiento Full o Dev en plan Professional (200 llamadas al día).
- Si hay cuota, presupuestar unas 8 llamadas: 1) crear variables, 2) estilos de texto y página Fundamentos, 3 a 7) una pantalla o dos por llamada, 8) captura de verificación. Cargar la skill `figma-use` antes de usar `use_figma`. Fuente: Manrope (estilos "Regular", "Medium", "SemiBold", "Bold", "ExtraBold").

### Ruta C: dibujar a mano en Figma controlando el navegador o la app
- Usar los PNG de `design/screens/` como referencia (arrastrarlos a frames de 390 × 844, bajar la opacidad y bloquearlos) y construir encima con auto layout. Es lenta: usarla solo si A y B fallan.

## 4. Especificación visual (resumen)

**Colores modo claro:** fondo `#F4F5F0`, superficie `#FFFFFF`, hundido `#ECEEE7`, texto `#13201A`, texto secundario `#5F6A64`, borde `#E1E4DC`, marca `#1D6A50`, marca suave `#E1EFE8`, acento lima `#C6F36B` (solo la cifra principal), héroe `#13201A`, ok `#1F8A5B`, alerta `#B86E0B` / `#FBEFD9`, peligro `#C0392B` / `#FBE4E0`, info suave `#E6EEFB`.
**Modo oscuro:** fondo `#0E1512`, superficie `#16201B`, hundido `#1D2923`, texto `#EEF2EC`, secundario `#9AA59F`, borde `#26332C`, marca `#5CC79A`, héroe `#1C2B23`.
**Categorías:** vivienda `#5B6CF0`, servicios `#2E9BC6`, educación `#3F7FBF`, súper `#1F8A5B`, transporte `#E08A1E`, salud `#D6478F`, deudas `#C0392B`, comida `#E0565B`, ocio `#A35BD6`, suscripciones `#7A6FF0`, hormiga `#8A7A55`, personal `#C08A2E`, metas `#13201A`, otros `#5F6A64`. El fondo del ícono de categoría es su color al 16% sobre la superficie.
**Tipografía (Manrope):** monto héroe 48/800, título 26/800, título de tarjeta 17/800, cuerpo 16/500, secundario 13/500, etiqueta 11/600. Números tabulares.
**Forma:** tarjetas con radio 20 y borde de 1 px; héroe con radio 24; controles con radio 12; botones con radio 14 y 48 de alto; chips como píldora. Margen lateral de 16, separación entre tarjetas de 14.

**Inicio, de arriba abajo:** selector de quincena ("Quincena del 30 sep", "30 sep al 14 oct · actual", flechas circulares de 44); tarjeta héroe oscura ("TE QUEDA PARA GASTAR", monto en lima, "Unos $X por día · N días restantes", línea de avance, fila Ingreso | Fijos | Ahorro | Gastado); alertas; tarjeta "Fijos de esta quincena" (círculo para marcar, nombre, "Vence ...", monto en píldora gris; el vencido va en rojo); tarjeta "Sobres" en cuadrícula de 2 (emoji, nombre, restante grande, "de $X", barra con raya del día de hoy); "Últimos gastos". Botón flotante "+ Gasto" verde y barra de 5 pestañas (Inicio, Gastos, Fijos, Reportes, Ajustes).
**Nuevo gasto:** hoja inferior con radio superior de 24, título, selector segmentado "C$ córdobas | US$ dólares", monto grande centrado de 40/800 con la conversión debajo en verde, cuadrícula de categorías de 4 columnas (emoji y nombre), nota, fecha y botón "Guardar gasto".

Fuente de verdad: las capturas de `design/screens/` y `src/styles.css`.

## 5. Reglas para la sesión de Desktop

- Responder en español, directo y sin halagos; cuestionar antes de dar la razón.
- En cualquier texto o diseño, **no usar guion largo ni guion medio** como pausa; usar coma, punto, dos puntos o paréntesis.
- No modificar el código de la app salvo que el usuario lo pida. Si se cambia algo en Figma que deba reflejarse en el código, anotarlo para después.
- Pedir confirmación antes de acciones visibles para otros (publicar Pages, compartir el archivo de Figma).

## 6. Texto para pegar en Claude Desktop

> Continúa un proyecto. Tengo una app de finanzas por quincena ya construida en el repo de GitHub kevv21/Demo-show, rama claude/inspiring-volta-0stml8. Lee primero docs/handoff-figma.md de esa rama: tiene el contexto, la especificación visual y el plan. Tu tarea es dejar el diseño en mi archivo de Figma https://www.figma.com/design/KFgbavtd7Wv6QRieTEu03K: página "Fundamentos" con variables claro/oscuro y estilos de texto, y página "Pantallas" con 7 pantallas de 390 × 844. Mi conector de Figma tiene un límite de 20 llamadas al mes (plan Starter, asiento View) y ya está agotado, así que empieza por la ruta A del documento (plugin html.to.design manejando mi navegador) y usa el conector solo si whoami muestra cuota. Pídeme confirmación antes de cambiar ajustes de GitHub o compartir algo.
