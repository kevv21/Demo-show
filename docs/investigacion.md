# Investigación: apps, comunidades y método quincenal

Resumen de lo revisado antes de diseñar Quincena y cómo cada hallazgo se volvió (o no) una función.

> Nota honesta sobre las fuentes: las búsquedas de Reddit devolvieron sobre todo agregadores, blogs y foros espejo, no hilos originales. Las opiniones de "usuarios" aquí son anecdóticas; sirven para detectar patrones, no como estadística.

## 1. Apps de referencia

| App | Idea central | Lo que tomamos | Lo que no |
| --- | --- | --- | --- |
| **YNAB** | Presupuesto base cero. Cuatro reglas: darle trabajo a cada peso, prever gastos reales (no mensuales), ajustar sobre la marcha, "envejecer" el dinero. | "Sin asignar" visible; gastos no mensuales divididos por quincena (apartar). | Suscripción (unos 109 USD al año). Curva de aprendizaje alta. |
| **Goodbudget** | Sobres digitales, captura manual. Gratis con 20 sobres. | Sobres por categoría con barra de avance. | Pensado en mes, no en quincena. |
| **Actual Budget** | Sobres estilo YNAB, código abierto, gratis si lo alojas tú. | Datos locales y exportables. | Requiere servidor para sincronizar. |
| **EveryDollar** | Base cero con vista por cheque de pago. | Agrupar fijos por el pago que los cubre. | De pago para conectar banco. |
| **PocketGuard** | Muestra "cuánto te queda" después de fijos y metas. | Cifra principal "Te queda para gastar" y monto por día. | Conexión bancaria. |
| **Monarch / Copilot** | Conexión bancaria, reportes, buen diseño (Copilot en iOS). | Reportes simples por categoría y tendencia. | Precio y dependencia de agregadores bancarios (poco soporte en México). |
| **Fintonic, Monefy, Wallet** (citadas en medios de México) | Fintonic conecta banco; Monefy es captura manual rápida; Wallet maneja recurrentes. | Captura en pocos toques (Monefy); recurrentes (Wallet). | |
| **Presupuesto Familiar (CONDUSEF)** | Simulador gratuito del gobierno. | Categorías en contexto mexicano. | No da seguimiento diario. |

## 2. Lo que dicen los usuarios (Reddit y foros)

1. **La captura manual cansa.** Es la razón más repetida para abandonar una app de presupuesto: "se volvió una tarea y un día dejé de abrirla". Las notificaciones que hacen sentir culpa empeoran el abandono.
2. **El precio importa.** Los hilos de "alternativas a YNAB" se disparan cada vez que sube de precio.
3. **Usar el sistema de otro no funciona.** Quien abandona suele decir que el método no se adaptaba a su forma de cobrar o gastar.
4. **Empezar es lo difícil.** Configurar categorías y presupuestos la primera vez es la barrera más grande.

## 3. Método quincenal: lo que dicen las guías y dónde se equivocan

- La regla que repiten muchas guías es "los fijos que vencen del 1 al 15 van a la primera quincena y los del 16 al 31 a la segunda". **Es incorrecta si te pagan el 15 y el último día**: una renta que vence el día 1 o un servicio que vence el 5 no se pueden pagar con el sueldo del 15, porque ese dinero todavía no llega. Deben salir del pago del último día del mes anterior.
- Si una quincena carga casi todos los fijos, la recomendación práctica es pedir al proveedor (internet, celular, tarjeta) cambiar la fecha de pago para equilibrar.
- Gastos no mensuales (seguro anual, predial, tenencia, regalos de diciembre): dividir el costo entre los periodos que faltan y apartar una parte cada vez (fondos de previsión o "sinking funds").
- En México la luz de CFE es **bimestral**: hay quincenas con recibo de luz y otras sin él.
- Los meses con quincenas "extra" no aplican aquí: a diferencia del pago catorcenal o bisemanal de EE. UU., la quincena da exactamente 24 pagos al año.

## 4. Decisiones de producto

| Hallazgo | Función en la app |
| --- | --- |
| Captura manual cansa | Botón "+ Gasto" fijo; monto con teclado numérico, categoría más usada preseleccionada; "Deshacer" en vez de confirmaciones; acceso directo `?nuevo=1` para el teléfono. Sin notificaciones. |
| Cuesta empezar | Bienvenida de un minuto; sugerencias de fijos comunes con un toque; demo con datos de ejemplo. |
| La regla 1 al 15 falla | Cada fijo se asigna a la quincena cuyo pago llega en o antes de su vencimiento, con margen opcional de días. Probado con pruebas automáticas. |
| Quincenas desbalanceadas | Pantalla de Fijos muestra la carga de cada quincena y avisa cuando una lleva 65% o más. |
| Gastos no mensuales | Frecuencias bimestral, trimestral, semestral y anual; opción "apartar" que divide el monto entre las quincenas del ciclo. |
| El monto de la luz cambia | Al pagar un fijo puedes anotar el monto real de esa quincena sin cambiar el estimado. |
| Sueldo que varía | "Esta quincena recibí otra cantidad" (horas extra, faltas) e ingresos extra (aguinaldo, ventas). |
| Páguese primero | Ahorro automático en porcentaje o monto fijo, descontado del disponible desde el día de pago. |
| Gastos hormiga | Categoría propia y proyección anual en Reportes ("a este ritmo son X al año"). |
| Precio y privacidad | Gratis, sin cuentas, sin servidor; datos en el dispositivo con respaldo JSON y CSV. |

## 5. Lo que deliberadamente no hace (y el riesgo de cada decisión)

- **No se conecta al banco.** Gana privacidad y simplicidad, pero depende de que registres los gastos. Si en dos semanas dejas de capturar, la app deja de servir. Mitigación: captura en segundos y revisar Inicio una vez al día.
- **No sincroniza entre dispositivos.** Si borras los datos del navegador o cambias de teléfono, se pierden salvo que exportes respaldo.
- **No modela tarjetas de crédito por fecha de corte.** Un gasto con tarjeta cuenta en la quincena en que lo haces, no cuando pagas la tarjeta. Si usas mucho crédito, registra el pago de la tarjeta como fijo y no dupliques los gastos.
- **La regla 50/30/20 es guía, no meta.** En ciudades caras las necesidades suelen pasar del 50%; la app lo dice explícitamente.

## Fuentes

- [NerdWallet: The Best Budget Apps for 2026](https://www.nerdwallet.com/blog/finance/budgeting-saving-tools/)
- [Origin: The 10 Best Budgeting Apps for 2026](https://useorigin.com/resources/blog/the-10-best-budgeting-apps-for-2026-unbiased-reviews-and-comparisons)
- [Unstar: YNAB, Rocket Money, Monarch, EveryDollar, Copilot ranked 2026](https://unstar.app/blog/ynab-rocket-money-monarch-everydollar-copilot-budget-apps-ranked-2026)
- [GummySearch: Best budget app on Reddit](https://gummysearch.com/tools/best-products/budget-app)
- [Getfinny: Best Budget Apps Reddit Recommends 2026](https://getfinny.app/blog/best-budget-apps-reddit-recommends-2026) (sitio promocional)
- [Indie Hackers: ¿la gente planea por cheque de pago en vez de por mes?](https://www.indiehackers.com/post/do-people-actually-plan-finances-by-paycheck-instead-of-monthly-budgets-0ad251b159)
- [Product Hunt: What's the money app you rage-quit](https://www.producthunt.com/p/general/what-s-the-money-app-you-rage-quit-and-what-finally-did-it)
- [ChooseFI: I finally ditched YNAB](https://choosefi.com/forums/spending-smarter/i-finally-ditched-ynab)
- [Goodbudget: Envelope Budgeting](https://goodbudget.com/envelope-budgeting)
- [Experian: Goodbudget Review](https://experian.com/blogs/ask-experian/goodbudget-budgeting-app-review)
- [YNAB: terminología y conceptos](https://cdn.jsdelivr.net/npm/@maro-org/ynab-mcp@0.8.0/build/methodology/terminology.md)
- [Just a Girl and Her Blog: How to Budget with Biweekly Paychecks](https://justagirlandherblog.com/?p=87262)
- [WalletHub: How to budget biweekly paychecks](https://wallethub.com/answers/b/how-to-budget-biweekly-paychecks-2140885408/)
- [Time: Sinking fund](https://partners.time.com/personal-finance/article/sinking-fund)
- [El Imparcial: Presupuesto inteligente, cómo organizar tus gastos quincenales](https://www.elimparcial.com/dinero/2025/01/18/presupuesto-inteligente-como-organizar-tus-gastos-quincenales/)
- [El Imparcial: Las mejores aplicaciones financieras para organizar tu dinero en México](https://www.elimparcial.com/dinero/2025/02/20/las-mejores-aplicaciones-financieras-para-organizar-tu-dinero-en-mexico/)
- [IDC Online: apps recomendadas por la CONDUSEF](https://idconline.mx/finanzas/2024/07/16/apps-moviles-para-cuidar-tu-dinero-en-vacaciones)
- [N+: Cuándo se paga el recibo de luz CFE](https://www.nmas.com.mx/economia/recibo-de-luz-cfe-cuando-es-fecha-limite-de-pago-para-evitar-corte-servicio/)
- [Figma Forum: Mini Finance UI Kit](https://forum.figma.com/showcase-your-work-14/introducing-mini-finance-ui-kit-for-figma-39716) (kit de referencia visual)
