# Diseño de Quincena

Aquí está todo lo necesario para llevar el diseño a Figma sin depender del conector MCP.

## Qué hay en esta carpeta

| Archivo | Para qué sirve |
| --- | --- |
| `tokens.json` | Colores (modo claro y oscuro), colores por categoría, radios, espacios y tipografía. Formato W3C DTCG. |
| `screens/*.png` | Capturas a 390 × 844 (iPhone 14) en resolución 2x de cada pantalla, en claro y oscuro. |

Archivo de Figma (terminado el 2026-10-13: Fundamentos, Pantallas en claro y oscuro, y Componentes): https://www.figma.com/design/KFgbavtd7Wv6QRieTEu03K

## Por qué no se dibujó directo en Figma

Tu cuenta tiene plan Starter con asiento View. Con eso el conector MCP de Figma permite **20 llamadas al mes**, y ya estaban agotadas. Cambiar a Claude Desktop no lo resuelve porque el límite es de la cuenta de Figma. Lo que sí lo resuelve: un asiento Full o Dev en plan Professional (200 llamadas al día).

## Cómo pasarlo a Figma (de más rápido a más trabajo)

1. **Pantallas editables con html.to.design (recomendado).**
   1. Publica la app (ver el README principal, sección GitHub Pages).
   2. En Figma: Plugins, busca **html.to.design** e instálalo.
   3. Pega la URL de cada pantalla con datos de ejemplo, con ancho 390:
      - `.../?demo=1#/inicio`
      - `.../?demo=1#/movimientos`
      - `.../?demo=1#/fijos`
      - `.../?demo=1#/reportes`
      - `.../?demo=1#/ajustes`
   4. El plugin crea capas editables (textos, auto layout, colores). Repite con el sistema en modo oscuro si quieres la variante oscura.
2. **Variables desde `tokens.json`.** Con el plugin **Tokens Studio for Figma**: importa el archivo, usa los grupos `claro` y `oscuro` como dos modos y exporta a variables de Figma.
3. **Referencia visual.** Arrastra los PNG de `screens/` a un frame de 390 × 844 y redibuja encima.

## Sistema visual

- **Tipografía:** Manrope (Google Fonts). Números tabulares para que las cifras no "bailen".
- **Moneda:** córdobas con símbolo C$ (formato es-NI: C$12,500.50). Los dólares siempre como "US$" para no confundirlos.
- **Color:** verde oscuro como marca (dinero, calma), lima `#C6F36B` solo para la cifra principal "Te queda para gastar". Rojo y ámbar se reservan para estados (excedido, vencido, cerca del límite), nunca para decorar.
- **Jerarquía de Inicio:** 1) cuánto te queda y cuánto por día, 2) fijos pendientes y vencidos, 3) sobres por categoría con una raya que marca qué tan avanzada va la quincena, 4) últimos gastos.
- **Captura rápida:** el botón "+ Gasto" siempre visible; la hoja abre con el teclado numérico y la categoría más usada ya seleccionada. Meta: registrar un gasto en menos de 5 segundos.
- **Accesibilidad:** objetivos táctiles de 44 px o más, foco visible, contraste AA en textos, respeta "reducir movimiento" y el modo oscuro del sistema.
