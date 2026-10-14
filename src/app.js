import * as L from './logic.js';
import * as Store from './store.js';

const params = new URLSearchParams(location.search);
const DEMO = params.has('demo');
let state = Store.load(DEMO);
let fmt = L.makeFormatter(state.settings.currency);
const ui = { periodKey: null, filter: 'todas', toast: null, toastTimer: null, undo: null };

const $app = document.getElementById('app');
const $sheet = document.getElementById('sheet');

// ---------- utilidades ----------

const esc = (v) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const money = (c) => fmt.money(c);
const round = (c) => fmt.round(c);
const usd = (c) => fmt.usd(c);
// Símbolo de la moneda local tal como lo muestra el formato del país (C$, $, Q, ₡...).
const symbolOf = (code) => L.makeFormatter(code).round(0).replace(/[\d\s.,-]/g, '');
const localSymbol = () => symbolOf(state.settings.currency);
const currencyInfo = () => L.MONEDAS.find((m) => m.code === state.settings.currency) || L.MONEDAS[0];
const billLocal = (bill) => L.billAmount(bill, state.settings);
const pct = (a, b) => (b > 0 ? Math.round((a / b) * 100) : 0);
const today = () => L.todayISO();
const catById = (id) => state.categories.find((c) => c.id === id) || state.categories.find((c) => c.id === 'otros');
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const dayLabel = (iso) => {
  if (iso === today()) return 'Hoy';
  if (iso === L.addDays(today(), -1)) return 'Ayer';
  const { m, d } = L.parseISO(iso);
  const wd = DIAS[L.weekday(iso)];
  return `${wd[0].toUpperCase()}${wd.slice(1)} ${d} ${L.MESES[m - 1]}`;
};
const payDayLabel = (d) => (d === 'last' ? 'último día' : `día ${d}`);
const dueLabel = (d) => (d === 'last' ? 'último día del mes' : `día ${d}`);
// Las claves de quincena terminan en 1 o 2 según el orden del día de pago dentro del mes.
const payDayOfKey = (key) => {
  const sorted = [...state.settings.payDays].sort((a, b) => (a === 'last' ? 99 : a) - (b === 'last' ? 99 : b));
  return sorted[Number(key.slice(-1)) - 1];
};

function commit(mutator, { toast, undo } = {}) {
  const before = JSON.stringify(state);
  mutator(state);
  state = Store.normalize(state);
  if (!Store.save(state, DEMO)) showToast('No se pudo guardar en este navegador. Exporta un respaldo.');
  fmt = L.makeFormatter(state.settings.currency);
  if (undo) ui.undo = before;
  render();
  if (toast) showToast(toast, !!undo);
}

function showToast(text, withUndo = false) {
  ui.toast = { text, withUndo };
  clearTimeout(ui.toastTimer);
  ui.toastTimer = setTimeout(() => {
    ui.toast = null;
    ui.undo = null;
    renderToast();
  }, 4500);
  renderToast();
}

function renderToast() {
  let el = document.getElementById('toast');
  if (!ui.toast) {
    if (el) el.remove();
    return;
  }
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.setAttribute('role', 'status');
    document.body.appendChild(el);
  }
  el.innerHTML = `<span>${esc(ui.toast.text)}</span>${ui.toast.withUndo && ui.undo ? '<button data-action="undo">Deshacer</button>' : ''}`;
}

function currentPeriod() {
  return ui.periodKey ? L.periodByKey(ui.periodKey, state.settings) : L.periodFor(today(), state.settings);
}

function route() {
  const r = (location.hash || '#/inicio').replace('#/', '');
  return ['inicio', 'movimientos', 'fijos', 'reportes', 'ajustes'].includes(r) ? r : 'inicio';
}

// ---------- íconos ----------

const ICON = {
  inicio: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  movimientos: '<path d="M4 6h16M4 12h16M4 18h10"/>',
  fijos: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4M8 14h3"/>',
  reportes: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  ajustes: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  left: '<path d="m15 18-6-6 6-6"/>',
  right: '<path d="m9 18 6-6-6-6"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
};
const icon = (name, cls = '') =>
  `<svg class="ico ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[name]}</svg>`;

// ---------- piezas ----------

function periodSwitch(p) {
  const isCurrent = today() >= p.start && today() <= p.end;
  return `
  <div class="period-switch">
    <button class="icon-btn" data-action="period" data-delta="-1" aria-label="Quincena anterior">${icon('left')}</button>
    <div class="period-title">
      <strong>${esc(L.periodLabel(p))}</strong>
      <span>${esc(L.periodRange(p))}${isCurrent ? ' · actual' : ''}</span>
    </div>
    <button class="icon-btn" data-action="period" data-delta="1" aria-label="Quincena siguiente">${icon('right')}</button>
  </div>
  ${isCurrent ? '' : '<button class="link center" data-action="period-today">Volver a la quincena actual</button>'}`;
}

function bar(value, max, { color, marker, plain } = {}) {
  const w = max > 0 ? Math.min(100, (value / max) * 100) : value > 0 ? 100 : 0;
  const over = max > 0 && value > max;
  const tone = plain ? 'ok' : over ? 'over' : max > 0 && value / max >= 0.85 ? 'warn' : 'ok';
  return `<div class="bar ${tone}" role="presentation">
    <div class="bar-fill" style="width:${w.toFixed(1)}%;${color && tone === 'ok' ? `background:${color}` : ''}"></div>
    ${marker != null ? `<div class="bar-marker" style="left:${(marker * 100).toFixed(1)}%"></div>` : ''}
  </div>`;
}

function expenseRow(e) {
  const c = catById(e.categoryId);
  return `<button class="row" data-action="edit-expense" data-id="${esc(e.id)}">
    <span class="emoji" style="--c:${c.color}">${esc(c.emoji)}</span>
    <span class="row-main"><span class="row-title">${esc(e.note || c.name)}</span><span class="row-sub">${esc(e.note ? c.name : dayLabel(e.date))}${e.usd != null ? ` · ${usd(e.usd)}` : ''}</span></span>
    <span class="row-amount">−${money(e.amount)}</span>
  </button>`;
}

function incomeRow(i) {
  return `<button class="row" data-action="edit-income" data-id="${esc(i.id)}">
    <span class="emoji" style="--c:#1F8A5B">💰</span>
    <span class="row-main"><span class="row-title">${esc(i.note || 'Ingreso extra')}</span><span class="row-sub">Ingreso extra${i.usd != null ? ` · ${usd(i.usd)}` : ''}</span></span>
    <span class="row-amount pos">+${money(i.amount)}</span>
  </button>`;
}

function billRow(b, period) {
  const overdue = !b.paid && b.kind === 'pago' && b.date < today();
  const sub =
    b.kind === 'apartado'
      ? `Apartar para ${L.frecuenciaLabel(b.bill.every).toLowerCase()} de ${b.bill.usd != null ? usd(b.bill.usd) : money(billLocal(b.bill))}${b.dueInPeriod ? ' · vence esta quincena' : ''}`
      : `${overdue ? 'Venció' : 'Vence'} ${dayLabel(b.date).toLowerCase()}${b.bill.usd != null ? ` · ${usd(b.bill.usd)}` : ''}${b.amount !== b.estimated ? ` · estimado ${money(b.estimated)}` : ''}`;
  return `<div class="row bill ${b.paid ? 'is-paid' : ''} ${overdue ? 'is-overdue' : ''}">
    <button class="check ${b.paid ? 'on' : ''}" data-action="toggle-bill" data-id="${esc(b.bill.id)}" data-period="${esc(period.key)}" aria-pressed="${b.paid}" aria-label="${b.paid ? 'Marcar como pendiente' : b.kind === 'apartado' ? 'Marcar como apartado' : 'Marcar como pagado'}">${icon('check')}</button>
    <span class="row-main"><span class="row-title">${esc(b.bill.name)}</span><span class="row-sub">${esc(sub)}</span></span>
    <button class="row-amount link-amount" data-action="bill-amount" data-id="${esc(b.bill.id)}" data-period="${esc(period.key)}" aria-label="Cambiar monto real">${money(b.amount)}</button>
  </div>`;
}

function nav(active) {
  const items = [
    ['inicio', 'Inicio'],
    ['movimientos', 'Gastos'],
    ['fijos', 'Fijos'],
    ['reportes', 'Reportes'],
    ['ajustes', 'Ajustes'],
  ];
  return `<nav class="tabbar" aria-label="Secciones">${items
    .map(([id, label]) => `<a href="#/${id}" class="${active === id ? 'active' : ''}" ${active === id ? 'aria-current="page"' : ''}>${icon(id)}<span>${label}</span></a>`)
    .join('')}</nav>`;
}

const fab = () => `<button class="fab" data-action="new-expense" aria-label="Agregar gasto">${icon('plus')}<span>Gasto</span></button>`;

const demoBanner = () =>
  DEMO ? `<div class="demo-banner">Datos de ejemplo. <a href="${location.pathname}">Salir del demo</a></div>` : '';

// ---------- pantallas ----------

function viewOnboarding() {
  const s = state.settings;
  const first = s.payDays[0] === 'last' ? 15 : s.payDays[0];
  const second = s.payDays[1];
  const opts1 = Array.from({ length: 15 }, (_, i) => i + 1).map((d) => `<option value="${d}" ${d === first ? 'selected' : ''}>Día ${d}</option>`).join('');
  const opts2 = [...Array.from({ length: 15 }, (_, i) => i + 16), 'last']
    .map((d) => `<option value="${d}" ${d === second ? 'selected' : ''}>${d === 'last' ? 'Último día' : `Día ${d}`}</option>`)
    .join('');
  return `
  <main class="screen onboarding">
    <div class="brand"><span class="logo">Q</span><span>Quincena</span></div>
    <h1>Organiza tu dinero por quincena</h1>
    <p class="muted">Un minuto y listo. Todo se guarda solo en este dispositivo.</p>
    <form data-form="onboarding" class="card form">
      <label>Moneda
        <select name="currency">${currencyOptions(s.currency)}</select>
      </label>
      <label>¿Cuánto recibes cada quincena? <small>Neto: lo que llega a tu cuenta después de INSS e IR</small>
        <input name="netPay" inputmode="decimal" placeholder="${esc(localSymbol())}0" required autocomplete="off" value="${s.netPay ? (s.netPay / 100).toFixed(2) : ''}">
      </label>
      <div class="two">
        <label>Primer pago<select name="pay1">${opts1}</select></label>
        <label>Segundo pago<select name="pay2">${opts2}</select></label>
      </div>
      <label>Si el día de pago cae en fin de semana
        <select name="weekendRule">
          <option value="none">Me pagan ese mismo día</option>
          <option value="before">Me pagan el viernes antes</option>
        </select>
      </label>
      <fieldset>
        <legend>¿Cuánto quieres ahorrar de cada quincena?</legend>
        <div class="chips">${[0, 5, 10, 15, 20]
          .map((v) => `<label class="chip"><input type="radio" name="savings" value="${v}" ${v === 10 ? 'checked' : ''}><span>${v}%</span></label>`)
          .join('')}</div>
      </fieldset>
      <button class="btn primary" type="submit">Empezar</button>
    </form>
    <a class="link center" href="?demo=1">Ver una demo con datos de ejemplo</a>
  </main>`;
}

function currencyOptions(sel) {
  return L.MONEDAS.map((m) => `<option value="${m.code}" ${m.code === sel ? 'selected' : ''}>${m.name} (${esc(symbolOf(m.code))})</option>`).join('');
}

function viewInicio() {
  const p = currentPeriod();
  const s = L.summarize(state, p, today());
  const pending = s.bills.filter((b) => !b.paid);
  const overdue = pending.filter((b) => b.kind === 'pago' && b.date < today());
  const paid = s.bills.filter((b) => b.paid);
  const isCurrent = today() >= p.start && today() <= p.end;
  const dayN = Math.min(p.days, Math.max(1, L.daysBetween(p.start, today()) + 1));
  const recent = [...s.expenses].sort((a, b) => (a.date === b.date ? b.createdAt - a.createdAt : a.date < b.date ? 1 : -1)).slice(0, 5);
  const alerts = [];
  if (overdue.length)
    alerts.push(['danger', `${overdue.length === 1 ? `${overdue[0].bill.name} ya venció` : `${overdue.length} fijos ya vencieron`} y no ${overdue.length === 1 ? 'está marcado' : 'están marcados'} como pagado. Si ya pagaste, márcalo.`]);
  if (s.available < 0) alerts.push(['danger', `Vas ${money(-s.available)} por encima de lo que entra esta quincena.`]);
  else if (s.unassigned < 0)
    alerts.push(['warn', `Tu plan (fijos, ahorro y sobres) supera tu ingreso por ${money(-s.unassigned)}. Baja algún sobre en Ajustes.`]);
  if (!state.bills.length) alerts.push(['info', 'Agrega tus gastos fijos (renta, luz, internet) para saber qué quincena paga cada uno.', '#/fijos', 'Agregar fijos']);
  if (!s.budgetTotal) alerts.push(['info', 'Define sobres por categoría (súper, transporte, salidas) para ver cuánto te queda en cada uno.', '#/ajustes', 'Definir sobres']);

  return `
  ${demoBanner()}
  <header class="top">${periodSwitch(p)}</header>
  <main class="screen">
    <section class="hero" aria-label="Resumen de la quincena">
      <p class="eyebrow">${s.available < 0 ? 'Te pasaste por' : 'Te queda para gastar'}</p>
      <p class="big ${s.available < 0 ? 'neg' : ''}">${money(Math.abs(s.available))}</p>
      <p class="hero-sub">${
        isCurrent
          ? s.perDay > 0
            ? `Unos <strong>${round(s.perDay)} por día</strong> · ${s.daysLeft} ${s.daysLeft === 1 ? 'día restante' : 'días restantes'}`
            : `${s.daysLeft} ${s.daysLeft === 1 ? 'día restante' : 'días restantes'}`
          : today() < p.start
            ? `Empieza el ${esc(L.shortDate(p.start))} · ${p.days} días`
            : 'Quincena cerrada'
      }</p>
      ${isCurrent ? `<div class="timeline" aria-label="Día ${dayN} de ${p.days}"><div style="width:${((dayN / p.days) * 100).toFixed(1)}%"></div></div><p class="hero-mini">Día ${dayN} de ${p.days}</p>` : ''}
      <dl class="flow">
        <div><dt>Ingreso</dt><dd>${round(s.income)}</dd></div>
        <div><dt>Fijos</dt><dd>${round(s.fixedTotal)}</dd></div>
        <div><dt>Ahorro</dt><dd>${round(s.savings)}</dd></div>
        <div><dt>Gastado</dt><dd>${round(s.spentTotal)}</dd></div>
      </dl>
    </section>

    ${alerts
      .map(([tone, text, href, cta]) => `<div class="alert ${tone}"><span>${esc(text)}</span>${href ? `<a href="${href}">${esc(cta)}</a>` : ''}</div>`)
      .join('')}

    ${
      s.bills.length
        ? `<section class="card">
      <div class="card-head"><h2>Fijos de esta quincena</h2><span class="muted">${money(s.fixedPaid)} de ${money(s.fixedTotal)}</span></div>
      ${pending.map((b) => billRow(b, p)).join('')}
      ${paid.length ? `<details class="paid-list"><summary>${paid.length} ${paid.length === 1 ? 'pagado' : 'pagados'}</summary>${paid.map((b) => billRow(b, p)).join('')}</details>` : ''}
      ${!pending.length ? '<p class="muted small">Todo pagado en esta quincena.</p>' : ''}
    </section>`
        : ''
    }

    ${
      s.envelopes.length
        ? `<section class="card">
      <div class="card-head"><h2>Sobres</h2><span class="muted">la raya marca el día de hoy</span></div>
      <div class="envelopes">
      ${s.envelopes
        .map(
          (e) => `<button class="envelope" data-action="filter-cat" data-id="${esc(e.cat.id)}">
          <div class="env-top"><span class="emoji sm" style="--c:${e.cat.color}">${esc(e.cat.emoji)}</span><span class="env-name">${esc(e.cat.name)}</span></div>
          <div class="env-amount ${e.remaining < 0 ? 'neg' : ''}">${e.budget ? (e.remaining < 0 ? `−${round(-e.remaining)}` : round(e.remaining)) : round(e.spent)}</div>
          <div class="env-sub">${e.budget ? (e.remaining < 0 ? 'excedido' : `de ${round(e.budget)}`) : 'sin sobre'}</div>
          ${bar(e.spent, e.budget, { color: e.cat.color, marker: isCurrent && e.budget ? s.elapsed : null })}
        </button>`,
        )
        .join('')}
      </div>
    </section>`
        : ''
    }

    <section class="card">
      <div class="card-head"><h2>Últimos gastos</h2><a href="#/movimientos" class="link">Ver todos</a></div>
      ${recent.length ? recent.map(expenseRow).join('') : '<p class="empty">Aún no registras gastos en esta quincena. Usa el botón <strong>+ Gasto</strong>: toma 5 segundos.</p>'}
    </section>
  </main>
  ${fab()}
  ${nav('inicio')}`;
}

function viewMovimientos() {
  const p = currentPeriod();
  const s = L.summarize(state, p, today());
  const used = [...new Set(s.expenses.map((e) => e.categoryId))].map(catById);
  const f = ui.filter;
  const list = s.expenses.filter((e) => f === 'todas' || e.categoryId === f);
  const incomes = f === 'todas' ? s.extrasList : [];
  const byDate = {};
  for (const e of list) (byDate[e.date] ||= { exp: [], inc: [] }).exp.push(e);
  for (const i of incomes) (byDate[i.date] ||= { exp: [], inc: [] }).inc.push(i);
  const dates = Object.keys(byDate).sort().reverse();
  const total = list.reduce((a, e) => a + e.amount, 0);
  return `
  ${demoBanner()}
  <header class="top">${periodSwitch(p)}</header>
  <main class="screen">
    <div class="summary-line"><span>${f === 'todas' ? 'Gastado en la quincena' : esc(catById(f).name)}</span><strong>${money(total)}</strong></div>
    <div class="chips scroll" role="group" aria-label="Filtrar por categoría">
      <button class="chip ${f === 'todas' ? 'on' : ''}" data-action="filter" data-id="todas">Todas</button>
      ${used.map((c) => `<button class="chip ${f === c.id ? 'on' : ''}" data-action="filter" data-id="${esc(c.id)}">${esc(c.emoji)} ${esc(c.name)}</button>`).join('')}
    </div>
    ${
      dates.length
        ? dates
            .map(
              (d) => `<section class="day"><h3>${esc(dayLabel(d))}<span>${money(byDate[d].exp.reduce((a, e) => a + e.amount, 0))}</span></h3>
        <div class="card flush">${byDate[d].inc.map(incomeRow).join('')}${byDate[d].exp.sort((a, b) => b.createdAt - a.createdAt).map(expenseRow).join('')}</div></section>`,
            )
            .join('')
        : '<p class="empty">No hay movimientos en esta quincena.</p>'
    }
    <button class="btn ghost" data-action="new-income">+ Registrar ingreso extra</button>
  </main>
  ${fab()}
  ${nav('movimientos')}`;
}

function viewFijos() {
  const load = L.fixedLoadByPayDay(state, today());
  const totalLoad = load.reduce((a, l) => a + l.total, 0);
  const heavy = load.find((l) => totalLoad > 0 && l.total / totalLoad >= 0.65);
  const pay = state.settings.netPay;
  const bills = [...state.bills].sort((a, b) => b.amount - a.amount);
  const which = (bill) => {
    if (bill.every === 0) return 'Cada quincena';
    if (L.isSpread(bill)) return `Apartas ${money(L.spreadPerPeriod(bill, state.settings))} cada quincena`;
    // Primera quincena (desde la actual) a la que le toca este fijo.
    let p = L.periodFor(today(), state.settings);
    for (let i = 0; i < 26; i++) {
      if (L.billDueDatesInPeriod(bill, p, state.settings).length) return `Lo paga la quincena del ${payDayLabel(payDayOfKey(p.key))}`;
      p = L.shiftPeriod(p, 1, state.settings);
    }
    return '';
  };
  return `
  ${demoBanner()}
  <header class="top"><h1 class="title">Gastos fijos</h1></header>
  <main class="screen">
    <p class="muted">Lo que pagas sí o sí. Cada uno se asigna a la quincena cuyo pago llega antes de su vencimiento.</p>
    ${
      bills.length
        ? `<section class="card">
      <div class="card-head"><h2>Carga por quincena</h2><span class="muted">mes típico</span></div>
      ${load
        .map(
          (l) => `<div class="load-row">
        <div class="load-label"><span>Quincena del ${esc(payDayLabel(payDayOfKey(l.period.key)))}</span><strong>${money(l.total)}</strong></div>
        ${bar(l.total, pay || totalLoad, { plain: true, color: 'var(--brand)' })}
        <div class="small muted">${pay ? `${pct(l.total, pay)}% de tu pago` : ''}</div>
      </div>`,
        )
        .join('')}
      ${heavy ? `<div class="alert warn"><span>Una quincena carga el ${pct(heavy.total, totalLoad)}% de tus fijos. Pide a algún proveedor (internet, celular, tarjeta) mover su fecha de pago para equilibrar.</span></div>` : ''}
    </section>`
        : ''
    }
    <section class="card flush">
      ${
        bills.length
          ? bills
              .map((b) => {
                const c = catById(b.categoryId);
                return `<button class="row" data-action="edit-bill" data-id="${esc(b.id)}">
            <span class="emoji" style="--c:${c.color}">${esc(c.emoji)}</span>
            <span class="row-main"><span class="row-title">${esc(b.name)}${b.active ? '' : ' <em class="tag">pausado</em>'}</span>
              <span class="row-sub">${esc(L.frecuenciaLabel(b.every))}${b.every === 0 ? '' : ` · vence ${esc(dueLabel(b.dueDay))}`}${b.usd != null ? ` · ${usd(b.usd)}` : ''}</span>
              <span class="row-sub accent">${esc(which(b))}</span></span>
            <span class="row-amount">${money(billLocal(b))}</span>
          </button>`;
              })
              .join('')
          : `<div class="empty-block"><p class="empty">Toca una sugerencia para agregarla, o crea uno desde cero.</p>
          <div class="chips wrap">${[
            ['Alquiler', 'vivienda', 1, 1],
            ['Luz', 'servicios', 20, 1],
            ['Agua', 'servicios', 18, 1],
            ['Internet y cable', 'servicios', 10, 1],
            ['Plan de celular', 'servicios', 22, 1],
            ['Streaming', 'suscripciones', 18, 1],
            ['Colegiatura', 'educacion', 5, 1],
            ['Préstamo', 'deudas', 15, 1],
            ['Tarjeta de crédito', 'deudas', 20, 1],
            ['Gimnasio', 'salud', 1, 1],
            ['Matrícula escolar', 'educacion', 15, 12],
            ['Seguro del vehículo', 'transporte', 15, 12],
          ]
            .map(([n, c, d, e]) => `<button class="chip" data-action="new-bill" data-name="${esc(n)}" data-cat="${c}" data-day="${d}" data-every="${e}">+ ${esc(n)}</button>`)
            .join('')}</div></div>`
      }
    </section>
    <button class="btn primary" data-action="new-bill">+ Agregar gasto fijo</button>
    <p class="small muted">Tip: los gastos que no son mensuales (matrícula escolar, seguro del vehículo, regalos de diciembre) conviene <strong>apartarlos</strong> cada quincena para que no te tomen por sorpresa. Si un fijo lo pactaste en dólares, regístralo en US$ y la app lo convierte.</p>
  </main>
  ${nav('fijos')}`;
}

function viewReportes() {
  const p = currentPeriod();
  const s = L.summarize(state, p, today());
  const income = s.income || 1;
  const groups = Object.entries(Store.GRUPOS).map(([id, g]) => ({ id, ...g, value: s.groups[id], p: pct(s.groups[id], income) }));
  const byCat = {};
  for (const e of s.expenses) byCat[e.categoryId] = (byCat[e.categoryId] || 0) + e.amount;
  for (const b of s.bills) byCat[b.bill.categoryId] = (byCat[b.bill.categoryId] || 0) + b.amount;
  const cats = Object.entries(byCat)
    .map(([id, v]) => ({ c: catById(id), v }))
    .sort((a, b) => b.v - a.v);
  const maxCat = cats[0] ? cats[0].v : 0;
  const tr = L.trend(state, p, 6, today());
  const maxTr = Math.max(1, ...tr.map((t) => Math.max(t.income, t.fixed + t.spent + t.savings)));
  const hormiga = s.expenses.filter((e) => catById(e.categoryId).id === 'hormiga').reduce((a, e) => a + e.amount, 0);
  return `
  ${demoBanner()}
  <header class="top">${periodSwitch(p)}</header>
  <main class="screen">
    <section class="card">
      <div class="card-head"><h2>Regla 50/30/20</h2><span class="muted">% de tu ingreso</span></div>
      ${groups
        .map(
          (g) => `<div class="rule-row">
        <div class="load-label"><span>${esc(g.label)}</span><strong>${g.p}% <span class="muted">/ meta ${g.meta}%</span></strong></div>
        <div class="bar ${g.id === 'ahorro' ? (g.p >= g.meta ? 'ok' : 'warn') : g.p > g.meta ? 'over' : 'ok'}"><div class="bar-fill" style="width:${Math.min(100, g.p)}%"></div><div class="bar-marker" style="left:${g.meta}%"></div></div>
        <div class="small muted">${money(g.value)}</div>
      </div>`,
        )
        .join('')}
      <p class="small muted">Es una guía, no una ley. Si vives en una ciudad cara, las necesidades suelen pasar del 50%: lo importante es que el ahorro no sea cero.</p>
    </section>

    <section class="card">
      <div class="card-head"><h2>¿En qué se fue?</h2><span class="muted">fijos + gastos</span></div>
      ${
        cats.length
          ? cats
              .map(
                (x) => `<div class="cat-row">
          <span class="emoji sm" style="--c:${x.c.color}">${esc(x.c.emoji)}</span>
          <div class="cat-main"><div class="load-label"><span>${esc(x.c.name)}</span><strong>${money(x.v)}</strong></div>${bar(x.v, maxCat, { color: x.c.color, plain: true })}</div>
        </div>`,
              )
              .join('')
          : '<p class="empty">Sin datos en esta quincena.</p>'
      }
    </section>

    ${
      hormiga
        ? `<div class="alert info"><span>Gastos hormiga en esta quincena: <strong>${money(hormiga)}</strong>. A ese ritmo son <strong>${round(hormiga * 24)}</strong> al año.</span></div>`
        : ''
    }

    <section class="card">
      <div class="card-head"><h2>Últimas 6 quincenas</h2></div>
      <div class="trend" role="img" aria-label="Ingreso contra salidas en las últimas seis quincenas">
        ${tr
          .map((t) => {
            const out = t.fixed + t.spent + t.savings;
            const h = (v) => ((v / maxTr) * 100).toFixed(1);
            return `<div class="trend-col">
            <div class="trend-bars">
              <div class="tb income" style="height:${h(t.income)}%" title="Ingreso ${money(t.income)}"></div>
              <div class="tb stack" style="height:${h(out)}%" title="Salidas ${money(out)}">
                <div style="flex:${t.savings}" class="sv"></div><div style="flex:${t.fixed}" class="fx"></div><div style="flex:${t.spent}" class="sp"></div>
              </div>
            </div>
            <span>${esc(L.shortDate(t.period.payDate))}</span>
          </div>`;
          })
          .join('')}
      </div>
      <div class="legend"><span><i class="income"></i>Ingreso</span><span><i class="sv"></i>Ahorro</span><span><i class="fx"></i>Fijos</span><span><i class="sp"></i>Gastos</span></div>
    </section>
  </main>
  ${fab()}
  ${nav('reportes')}`;
}

function viewAjustes() {
  const s = state.settings;
  const p = L.periodFor(today(), s);
  const override = state.payOverrides[p.key];
  const budgetTotal = state.categories.reduce((a, c) => a + c.budget, 0);
  const sum = L.summarize(state, p, today());
  return `
  ${demoBanner()}
  <header class="top"><h1 class="title">Ajustes</h1></header>
  <main class="screen">
    <section class="card">
      <div class="card-head"><h2>Ingreso</h2></div>
      <button class="row" data-action="edit-pay">
        <span class="row-main"><span class="row-title">Pago por quincena</span><span class="row-sub">Te pagan el ${esc(payDayLabel(s.payDays[0]))} y el ${esc(payDayLabel(s.payDays[1]))}${s.weekendRule === 'before' ? ' · se adelanta si cae en fin de semana' : ''}</span></span>
        <span class="row-amount">${money(s.netPay)}</span>
      </button>
      <button class="row" data-action="edit-override">
        <span class="row-main"><span class="row-title">Esta quincena recibí otra cantidad</span><span class="row-sub">${override != null ? `Ajustado para la ${esc(L.periodLabel(p).toLowerCase())}` : 'Por horas extra, descuentos o faltas'}</span></span>
        <span class="row-amount">${override != null ? money(override) : ''}</span>
      </button>
      <button class="row" data-action="edit-savings">
        <span class="row-main"><span class="row-title">Ahorro automático</span><span class="row-sub">Se aparta primero, antes de gastar</span></span>
        <span class="row-amount">${s.savings.type === 'percent' ? `${s.savings.value}%` : money(s.savings.value)}</span>
      </button>
    </section>

    <section class="card">
      <div class="card-head"><h2>Sobres por quincena</h2><span class="muted">${money(budgetTotal)}</span></div>
      <p class="small muted">Cuánto te das por quincena para cada categoría variable. Sin asignar esta quincena: <strong class="${sum.unassigned < 0 ? 'neg' : ''}">${money(sum.unassigned)}</strong></p>
      ${state.categories
        .map(
          (c) => `<button class="row" data-action="edit-cat" data-id="${esc(c.id)}">
        <span class="emoji" style="--c:${c.color}">${esc(c.emoji)}</span>
        <span class="row-main"><span class="row-title">${esc(c.name)}</span><span class="row-sub">${esc(Store.GRUPOS[c.group].label)}</span></span>
        <span class="row-amount ${c.budget ? '' : 'muted'}">${c.budget ? money(c.budget) : 'sin sobre'}</span>
      </button>`,
        )
        .join('')}
      <button class="btn ghost" data-action="new-cat">+ Nueva categoría</button>
    </section>

    <section class="card">
      <div class="card-head"><h2>Preferencias</h2></div>
      <form data-form="prefs" class="form">
        <label>Moneda<select name="currency" data-autosave>${currencyOptions(s.currency)}</select></label>
        ${
          L.usesUSD(s)
            ? `<label>Tipo de cambio: ${esc(localSymbol())} por US$1 <small>Se usa para gastos y fijos en dólares (alquiler, préstamos, suscripciones).${s.currency === 'NIO' ? ' Viene con el oficial del BCN; si pagas con tarjeta, tu banco puede cobrar un poco más.' : ''}</small>
          <input name="usdRate" inputmode="decimal" data-autosave value="${s.usdRate ? s.usdRate : ''}" placeholder="Sin configurar"></label>`
            : ''
        }
        <label>Pagar los fijos con margen de
          <select name="billBufferDays" data-autosave>${[0, 1, 2, 3, 5]
            .map((d) => `<option value="${d}" ${d === s.billBufferDays ? 'selected' : ''}>${d === 0 ? 'Sin margen (el mismo día del vencimiento)' : `${d} ${d === 1 ? 'día' : 'días'} antes del vencimiento`}</option>`)
            .join('')}</select>
        </label>
      </form>
    </section>

    <section class="card">
      <div class="card-head"><h2>Tus datos</h2></div>
      <p class="small muted">Se guardan solo en este navegador. Si borras los datos del navegador o cambias de teléfono se pierden: exporta un respaldo de vez en cuando.</p>
      <div class="btn-grid">
        <button class="btn" data-action="export-json">Exportar respaldo</button>
        <label class="btn">Importar respaldo<input type="file" accept="application/json,.json" data-action="import-json" hidden></label>
        <button class="btn" data-action="export-csv">Exportar CSV</button>
        <button class="btn danger" data-action="reset">Borrar todo</button>
      </div>
    </section>
    <p class="small muted center">Quincena v1 · <a href="?demo=1">ver demo</a></p>
  </main>
  ${nav('ajustes')}`;
}

// ---------- hojas (diálogos) ----------

function openSheet(html) {
  $sheet.innerHTML = `<div class="sheet-inner"><button class="icon-btn sheet-close" data-action="close-sheet" aria-label="Cerrar">${icon('x')}</button>${html}</div>`;
  if (!$sheet.open) $sheet.showModal();
  const first = $sheet.querySelector('[autofocus]');
  if (first) setTimeout(() => first.focus(), 30);
  syncFx();
}
function closeSheet() {
  if ($sheet.open) $sheet.close();
}

function usageOrder() {
  const since = L.addDays(today(), -60);
  const count = {};
  for (const e of state.expenses) if (e.date >= since) count[e.categoryId] = (count[e.categoryId] || 0) + 1;
  return [...state.categories].sort((a, b) => (count[b.id] || 0) - (count[a.id] || 0));
}

// Campo de monto con selector de moneda local o dólares (si la moneda local no es el dólar).
function amountField({ cents = 0, usdCents = null, cls = 'amount-input', autofocus = true, label = 'Monto' } = {}) {
  const canUSD = L.usesUSD(state.settings);
  const isUSD = canUSD && usdCents != null;
  const val = isUSD ? (usdCents / 100).toFixed(2) : cents ? (cents / 100).toFixed(2) : '';
  return `${
    canUSD
      ? `<div class="segmented cur-toggle" role="radiogroup" aria-label="Moneda del monto">
      <label><input type="radio" name="cur" value="local" ${isUSD ? '' : 'checked'}><span>${esc(localSymbol())} ${esc(currencyInfo().plural)}</span></label>
      <label><input type="radio" name="cur" value="usd" ${isUSD ? 'checked' : ''}><span>US$ dólares</span></label>
    </div>`
      : ''
  }
    <input class="${cls}" name="amount" data-amount inputmode="decimal" placeholder="${isUSD ? 'US$0' : `${esc(localSymbol())}0`}" aria-label="${label}" autocomplete="off" required ${autofocus ? 'autofocus' : ''} value="${val}">
    ${canUSD ? '<p class="fx-preview" data-fx-preview aria-live="polite"></p>' : ''}`;
}

// Muestra la conversión a moneda local mientras se escribe un monto en dólares.
function syncFx() {
  const form = $sheet.querySelector('form');
  const out = form && form.querySelector('[data-fx-preview]');
  if (!out) return;
  const isUSD = form.elements.cur && form.elements.cur.value === 'usd';
  const input = form.elements.amount;
  input.placeholder = isUSD ? 'US$0' : `${localSymbol()}0`;
  if (!isUSD) {
    out.textContent = '';
    return;
  }
  const rate = state.settings.usdRate;
  const v = L.parseAmount(input.value);
  if (!rate) out.textContent = 'Configura el tipo de cambio en Ajustes para usar dólares.';
  else out.textContent = `${v ? `= ${money(L.fromUSD(v, rate))}` : 'Se convierte'} al cambio de ${localSymbol()}${rate} por US$1`;
}

// Lee el monto del formulario: si viene en dólares lo convierte y guarda también el original.
function readMoney(form) {
  const v = readAmount(form);
  if (v == null) return null;
  const isUSD = form.elements.cur && form.elements.cur.value === 'usd';
  if (!isUSD) return { amount: v, usd: null };
  const rate = state.settings.usdRate;
  if (!rate) {
    const input = form.elements.amount;
    input.setCustomValidity('Configura el tipo de cambio en Ajustes para usar dólares');
    input.reportValidity();
    input.addEventListener('input', () => input.setCustomValidity(''), { once: true });
    return null;
  }
  return { amount: L.fromUSD(v, rate), usd: v };
}

function sheetExpense(e) {
  const cats = usageOrder();
  const sel = e ? e.categoryId : ui.filter !== 'todas' ? ui.filter : cats[0].id;
  openSheet(`
    <h2>${e ? 'Editar gasto' : 'Nuevo gasto'}</h2>
    <form data-form="expense" class="form" data-id="${e ? esc(e.id) : ''}">
      ${amountField({ cents: e ? e.amount : 0, usdCents: e ? e.usd : null })}
      <fieldset><legend class="sr-only">Categoría</legend>
        <div class="cat-grid">${cats
          .map(
            (c) => `<label class="cat-pick"><input type="radio" name="categoryId" value="${esc(c.id)}" ${c.id === sel ? 'checked' : ''}><span style="--c:${c.color}"><b>${esc(c.emoji)}</b>${esc(c.name)}</span></label>`,
          )
          .join('')}</div>
      </fieldset>
      <input name="note" placeholder="Nota (opcional): fritanga, taxi, pulpería..." maxlength="80" value="${e ? esc(e.note) : ''}">
      <input type="date" name="date" value="${e ? e.date : today()}" required aria-label="Fecha">
      <button class="btn primary" type="submit">${e ? 'Guardar cambios' : 'Guardar gasto'}</button>
      ${e ? `<button class="btn danger ghost" type="button" data-action="delete-expense" data-id="${esc(e.id)}">Eliminar</button>` : ''}
    </form>`);
}

function sheetIncome(i) {
  openSheet(`
    <h2>${i ? 'Editar ingreso extra' : 'Ingreso extra'}</h2>
    <p class="muted small">Treceavo mes, remesas, bonos, ventas, reembolsos. Si llega en dólares elige US$. Suma al disponible de la quincena en que llega.</p>
    <form data-form="income" class="form" data-id="${i ? esc(i.id) : ''}">
      ${amountField({ cents: i ? i.amount : 0, usdCents: i ? i.usd : null, cls: 'amount-input pos' })}
      <input name="note" placeholder="Concepto: remesa, treceavo, venta..." maxlength="80" value="${i ? esc(i.note) : ''}">
      <input type="date" name="date" value="${i ? i.date : today()}" required aria-label="Fecha">
      <button class="btn primary" type="submit">Guardar</button>
      ${i ? `<button class="btn danger ghost" type="button" data-action="delete-income" data-id="${esc(i.id)}">Eliminar</button>` : ''}
    </form>`);
}

function sheetBill(b, preset = {}) {
  const v = b || {
    name: preset.name || '',
    amount: 0,
    dueDay: Number(preset.day) || 1,
    every: preset.every != null ? Number(preset.every) : 1,
    anchorMonth: L.parseISO(today()).m,
    spread: Number(preset.every) >= 6,
    categoryId: preset.cat || 'servicios',
    active: true,
  };
  const days = [...Array.from({ length: 31 }, (_, i) => i + 1), 'last'];
  openSheet(`
    <h2>${b ? 'Editar gasto fijo' : 'Nuevo gasto fijo'}</h2>
    <form data-form="bill" class="form" data-id="${b ? esc(b.id) : ''}">
      <label>Nombre<input name="name" required maxlength="40" value="${esc(v.name)}" placeholder="Alquiler, luz, internet..." ${v.name ? '' : 'autofocus'}></label>
      <fieldset><legend>Monto <small>Si varía (como la luz), pon un promedio; al pagar puedes anotar el real. Si lo pactaste en dólares (alquiler, préstamo), elige US$ y se convierte solo.</small></legend>
        ${amountField({ cents: v.amount, usdCents: v.usd ?? null, cls: '', autofocus: !!v.name })}
      </fieldset>
      <div class="two">
        <label>Frecuencia<select name="every" data-toggle-every>${L.FRECUENCIAS.map((f) => `<option value="${f.every}" ${f.every === v.every ? 'selected' : ''}>${f.label}</option>`).join('')}</select></label>
        <label data-when-every="monthly">Vence el<select name="dueDay">${days.map((d) => `<option value="${d}" ${d === v.dueDay ? 'selected' : ''}>${d === 'last' ? 'Último día' : `Día ${d}`}</option>`).join('')}</select></label>
      </div>
      <label data-when-every="multi">Próximo mes en que toca pagar
        <select name="anchorMonth">${L.MESES_LARGO.map((m, i) => `<option value="${i + 1}" ${i + 1 === v.anchorMonth ? 'selected' : ''}>${m[0].toUpperCase() + m.slice(1)}</option>`).join('')}</select>
      </label>
      <label class="switch" data-when-every="multi"><input type="checkbox" name="spread" ${v.spread ? 'checked' : ''}><span>Apartar un poco cada quincena en vez de pagarlo de golpe</span></label>
      <label>Categoría<select name="categoryId">${state.categories.map((c) => `<option value="${esc(c.id)}" ${c.id === v.categoryId ? 'selected' : ''}>${esc(c.emoji)} ${esc(c.name)}</option>`).join('')}</select></label>
      ${b ? `<label class="switch"><input type="checkbox" name="active" ${v.active ? 'checked' : ''}><span>Activo</span></label>` : ''}
      <button class="btn primary" type="submit">Guardar</button>
      ${b ? `<button class="btn danger ghost" type="button" data-action="delete-bill" data-id="${esc(b.id)}">Eliminar</button>` : ''}
    </form>`);
  syncEveryFields();
}

function syncEveryFields() {
  const sel = $sheet.querySelector('[data-toggle-every]');
  if (!sel) return;
  const every = Number(sel.value);
  $sheet.querySelectorAll('[data-when-every="multi"]').forEach((el) => (el.hidden = every < 2));
  $sheet.querySelectorAll('[data-when-every="monthly"]').forEach((el) => (el.hidden = every === 0));
}

function sheetCategory(c) {
  const v = c || { name: '', emoji: '📌', color: Store.PALETA[state.categories.length % Store.PALETA.length], group: 'deseo', budget: 0 };
  openSheet(`
    <h2>${c ? 'Editar categoría' : 'Nueva categoría'}</h2>
    <form data-form="category" class="form" data-id="${c ? esc(c.id) : ''}">
      <div class="two narrow-first">
        <label>Emoji<input name="emoji" maxlength="4" value="${esc(v.emoji)}" class="center"></label>
        <label>Nombre<input name="name" required maxlength="40" value="${esc(v.name)}" ${c ? '' : 'autofocus'}></label>
      </div>
      <label>Sobre por quincena <small>Deja 0 si no quieres limitarla</small><input name="budget" inputmode="decimal" placeholder="${esc(localSymbol())}0" autocomplete="off" value="${v.budget ? (v.budget / 100).toFixed(2) : ''}" ${c ? 'autofocus' : ''}></label>
      <label>Tipo (para la regla 50/30/20)<select name="group">${Object.entries(Store.GRUPOS).map(([id, g]) => `<option value="${id}" ${id === v.group ? 'selected' : ''}>${g.label}</option>`).join('')}</select></label>
      <fieldset><legend>Color</legend><div class="swatches">${Store.PALETA.map((col) => `<label class="swatch"><input type="radio" name="color" value="${col}" ${col === v.color ? 'checked' : ''}><span style="background:${col}"></span></label>`).join('')}</div></fieldset>
      <button class="btn primary" type="submit">Guardar</button>
      ${c && c.id !== 'otros' ? `<button class="btn danger ghost" type="button" data-action="delete-cat" data-id="${esc(c.id)}">Eliminar (sus gastos pasan a "Otros")</button>` : ''}
    </form>`);
}

function sheetPay() {
  const s = state.settings;
  const opts1 = Array.from({ length: 15 }, (_, i) => i + 1).map((d) => `<option value="${d}" ${d === s.payDays[0] ? 'selected' : ''}>Día ${d}</option>`).join('');
  const opts2 = [...Array.from({ length: 15 }, (_, i) => i + 16), 'last']
    .map((d) => `<option value="${d}" ${d === s.payDays[1] ? 'selected' : ''}>${d === 'last' ? 'Último día del mes' : `Día ${d}`}</option>`)
    .join('');
  openSheet(`
    <h2>Pago por quincena</h2>
    <form data-form="pay" class="form">
      <label>Monto neto por quincena<input name="netPay" inputmode="decimal" required autofocus autocomplete="off" value="${(s.netPay / 100).toFixed(2)}"></label>
      <div class="two"><label>Primer pago<select name="pay1">${opts1}</select></label><label>Segundo pago<select name="pay2">${opts2}</select></label></div>
      <label>Si cae en fin de semana<select name="weekendRule"><option value="none" ${s.weekendRule === 'none' ? 'selected' : ''}>Me pagan ese mismo día</option><option value="before" ${s.weekendRule === 'before' ? 'selected' : ''}>Me pagan el viernes antes</option></select></label>
      <button class="btn primary" type="submit">Guardar</button>
    </form>`);
}

function sheetOverride() {
  const p = L.periodFor(today(), state.settings);
  const cur = state.payOverrides[p.key];
  openSheet(`
    <h2>${esc(L.periodLabel(p))}</h2>
    <p class="muted small">Solo cambia esta quincena. Tu pago normal es ${money(state.settings.netPay)}.</p>
    <form data-form="override" class="form" data-key="${esc(p.key)}">
      <input class="amount-input" name="amount" inputmode="decimal" required autofocus autocomplete="off" value="${cur != null ? (cur / 100).toFixed(2) : (state.settings.netPay / 100).toFixed(2)}" aria-label="Monto recibido">
      <button class="btn primary" type="submit">Guardar</button>
      ${cur != null ? '<button class="btn ghost" type="button" data-action="clear-override">Volver al pago normal</button>' : ''}
    </form>`);
}

function sheetSavings() {
  const s = state.settings.savings;
  openSheet(`
    <h2>Ahorro automático</h2>
    <p class="muted small">"Págate primero": se descuenta del disponible desde el día de pago. Lo ideal es mandarlo a otra cuenta ese mismo día.</p>
    <form data-form="savings" class="form">
      <div class="segmented"><label><input type="radio" name="type" value="percent" ${s.type === 'percent' ? 'checked' : ''}><span>Porcentaje</span></label><label><input type="radio" name="type" value="amount" ${s.type === 'amount' ? 'checked' : ''}><span>Monto fijo</span></label></div>
      <input class="amount-input" name="value" inputmode="decimal" required autofocus autocomplete="off" value="${s.type === 'percent' ? s.value : (s.value / 100).toFixed(2)}" aria-label="Valor">
      <button class="btn primary" type="submit">Guardar</button>
    </form>`);
}

function sheetBillAmount(billId, periodKey) {
  const p = L.periodByKey(periodKey, state.settings);
  const row = L.billsForPeriod(state, p).find((b) => b.bill.id === billId);
  if (!row) return;
  openSheet(`
    <h2>${esc(row.bill.name)}</h2>
    <p class="muted small">Monto real de esta quincena. El estimado es ${money(row.estimated)}.</p>
    <form data-form="bill-amount" class="form" data-id="${esc(billId)}" data-key="${esc(periodKey)}">
      <input class="amount-input" name="amount" inputmode="decimal" required autofocus autocomplete="off" value="${(row.amount / 100).toFixed(2)}" aria-label="Monto real">
      <label class="switch"><input type="checkbox" name="paid" checked><span>Marcar como ${row.kind === 'apartado' ? 'apartado' : 'pagado'}</span></label>
      <button class="btn primary" type="submit">Guardar</button>
    </form>`);
}

// ---------- render ----------

function render() {
  const r = route();
  document.body.dataset.route = r;
  if (!state.settings.setupDone) {
    $app.innerHTML = viewOnboarding();
  } else {
    const views = { inicio: viewInicio, movimientos: viewMovimientos, fijos: viewFijos, reportes: viewReportes, ajustes: viewAjustes };
    $app.innerHTML = views[r]();
  }
  renderToast();
}

// ---------- eventos ----------

function download(name, text, type) {
  const blob = new Blob([text], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 0);
}

const actions = {
  period: (el) => {
    const p = L.shiftPeriod(currentPeriod(), Number(el.dataset.delta), state.settings);
    ui.periodKey = p.key;
    render();
  },
  'period-today': () => {
    ui.periodKey = null;
    render();
  },
  'new-expense': () => sheetExpense(null),
  'edit-expense': (el) => sheetExpense(state.expenses.find((e) => e.id === el.dataset.id)),
  'delete-expense': (el) => {
    closeSheet();
    commit((s) => (s.expenses = s.expenses.filter((e) => e.id !== el.dataset.id)), { toast: 'Gasto eliminado', undo: true });
  },
  'new-income': () => sheetIncome(null),
  'edit-income': (el) => sheetIncome(state.incomes.find((i) => i.id === el.dataset.id)),
  'delete-income': (el) => {
    closeSheet();
    commit((s) => (s.incomes = s.incomes.filter((i) => i.id !== el.dataset.id)), { toast: 'Ingreso eliminado', undo: true });
  },
  'new-bill': (el) => sheetBill(null, el.dataset),
  'edit-bill': (el) => sheetBill(state.bills.find((b) => b.id === el.dataset.id)),
  'delete-bill': (el) => {
    closeSheet();
    commit((s) => (s.bills = s.bills.filter((b) => b.id !== el.dataset.id)), { toast: 'Gasto fijo eliminado', undo: true });
  },
  'toggle-bill': (el) =>
    commit((s) => {
      const k = el.dataset.period;
      s.billStatus[k] ||= {};
      const cur = s.billStatus[k][el.dataset.id] || {};
      s.billStatus[k][el.dataset.id] = { ...cur, paid: !cur.paid };
    }),
  'bill-amount': (el) => sheetBillAmount(el.dataset.id, el.dataset.period),
  'edit-cat': (el) => sheetCategory(state.categories.find((c) => c.id === el.dataset.id)),
  'new-cat': () => sheetCategory(null),
  'delete-cat': (el) => {
    closeSheet();
    commit(
      (s) => {
        const id = el.dataset.id;
        s.categories = s.categories.filter((c) => c.id !== id);
        s.expenses.forEach((e) => e.categoryId === id && (e.categoryId = 'otros'));
        s.bills.forEach((b) => b.categoryId === id && (b.categoryId = 'otros'));
      },
      { toast: 'Categoría eliminada', undo: true },
    );
  },
  'filter-cat': (el) => {
    ui.filter = el.dataset.id;
    location.hash = '#/movimientos';
  },
  filter: (el) => {
    ui.filter = el.dataset.id;
    render();
  },
  'edit-pay': () => sheetPay(),
  'edit-override': () => sheetOverride(),
  'clear-override': () => {
    closeSheet();
    const k = L.periodFor(today(), state.settings).key;
    commit((s) => delete s.payOverrides[k], { toast: 'Pago normal restaurado' });
  },
  'edit-savings': () => sheetSavings(),
  'close-sheet': () => closeSheet(),
  undo: () => {
    if (!ui.undo) return;
    state = Store.normalize(JSON.parse(ui.undo));
    Store.save(state, DEMO);
    ui.undo = null;
    ui.toast = null;
    render();
  },
  'export-json': () => download(`quincena-respaldo-${today()}.json`, JSON.stringify(state, null, 2), 'application/json'),
  'export-csv': () => download(`quincena-movimientos-${today()}.csv`, '﻿' + L.toCSV(state), 'text/csv;charset=utf-8'),
  reset: () => {
    if (!confirm('¿Borrar todos tus datos de este dispositivo? No se puede deshacer. Exporta un respaldo antes si lo necesitas.')) return;
    Store.clearAll(DEMO);
    state = DEMO ? Store.demoState() : Store.defaultState();
    Store.save(state, DEMO);
    ui.periodKey = null;
    location.hash = '#/inicio';
    render();
  },
};

document.addEventListener('click', (ev) => {
  const el = ev.target.closest('[data-action]');
  if (!el || el.tagName === 'INPUT') return;
  const fn = actions[el.dataset.action];
  if (fn) {
    ev.preventDefault();
    fn(el);
  }
});

// Cerrar la hoja tocando fuera de ella
$sheet.addEventListener('click', (ev) => {
  if (ev.target === $sheet) closeSheet();
});
$sheet.addEventListener('input', (ev) => ev.target.matches('[data-amount]') && syncFx());
$sheet.addEventListener('change', (ev) => ev.target.name === 'cur' && syncFx());

document.addEventListener('change', (ev) => {
  const el = ev.target;
  if (el.matches('[data-toggle-every]')) syncEveryFields();
  if (el.name === 'currency' && el.closest('form[data-form="onboarding"]')) el.form.elements.netPay.placeholder = `${symbolOf(el.value)}0`;
  if (el.matches('[data-autosave]')) {
    const name = el.name;
    commit((s) => {
      if (name === 'currency') {
        s.settings.currency = el.value;
        // El tipo de cambio de otra moneda no sirve: se precarga el oficial si lo conocemos.
        s.settings.usdRate = L.DEFAULT_USD_RATE[el.value] ?? null;
      }
      if (name === 'billBufferDays') s.settings.billBufferDays = Number(el.value);
      if (name === 'usdRate') {
        const r = Number(String(el.value).replace(',', '.'));
        s.settings.usdRate = r > 0 ? r : null;
      }
    }, { toast: name === 'currency' ? 'Moneda cambiada. Tus montos guardados no se convierten.' : 'Guardado' });
  }
  if (el.matches('[data-action="import-json"]') && el.files && el.files[0]) {
    const file = el.files[0];
    file.text().then((txt) => {
      try {
        const data = JSON.parse(txt);
        if (!data || !data.settings || !Array.isArray(data.expenses)) throw new Error('formato');
        if (!confirm('Esto reemplaza tus datos actuales con los del respaldo. ¿Continuar?')) return;
        commit((s) => Object.assign(s, Store.normalize(data)), { toast: 'Respaldo importado', undo: true });
      } catch {
        showToast('Ese archivo no es un respaldo válido de Quincena.');
      }
    });
    el.value = '';
  }
});

function readAmount(form, name = 'amount') {
  const v = L.parseAmount(form.elements[name].value);
  if (v == null || v < 0) {
    form.elements[name].setCustomValidity('Escribe un monto válido');
    form.elements[name].reportValidity();
    form.elements[name].addEventListener('input', () => form.elements[name].setCustomValidity(''), { once: true });
    return null;
  }
  return v;
}

const forms = {
  onboarding: (f) => {
    const netPay = readAmount(f, 'netPay');
    if (netPay == null) return;
    commit((s) => {
      s.settings.netPay = netPay;
      s.settings.payDays = [Number(f.elements.pay1.value), f.elements.pay2.value === 'last' ? 'last' : Number(f.elements.pay2.value)];
      s.settings.weekendRule = f.elements.weekendRule.value;
      s.settings.savings = { type: 'percent', value: Number(f.elements.savings.value) };
      if (s.settings.currency !== f.elements.currency.value) {
        s.settings.currency = f.elements.currency.value;
        s.settings.usdRate = L.DEFAULT_USD_RATE[f.elements.currency.value] ?? null;
      }
      s.settings.setupDone = true;
    });
    location.hash = '#/fijos';
    showToast('Listo. Ahora agrega tus gastos fijos.');
  },
  expense: (f) => {
    const m = readMoney(f);
    if (m == null || m.amount === 0) return;
    const amount = m.amount;
    const id = f.dataset.id;
    const data = { amount, usd: m.usd, categoryId: f.elements.categoryId.value, note: f.elements.note.value.trim(), date: f.elements.date.value || today() };
    closeSheet();
    commit(
      (s) => {
        if (id) Object.assign(s.expenses.find((e) => e.id === id), data);
        else s.expenses.push({ id: Store.uid(), createdAt: Date.now(), ...data });
      },
      { toast: id ? 'Gasto actualizado' : `Gasto de ${money(amount)} guardado`, undo: true },
    );
  },
  income: (f) => {
    const m = readMoney(f);
    if (m == null || m.amount === 0) return;
    const id = f.dataset.id;
    const data = { amount: m.amount, usd: m.usd, note: f.elements.note.value.trim(), date: f.elements.date.value || today() };
    closeSheet();
    commit(
      (s) => {
        if (id) Object.assign(s.incomes.find((i) => i.id === id), data);
        else s.incomes.push({ id: Store.uid(), createdAt: Date.now(), ...data });
      },
      { toast: 'Ingreso guardado', undo: true },
    );
  },
  bill: (f) => {
    const m = readMoney(f);
    if (m == null) return;
    const id = f.dataset.id;
    const every = Number(f.elements.every.value);
    const data = {
      name: f.elements.name.value.trim() || 'Gasto fijo',
      amount: m.amount,
      usd: m.usd,
      every,
      dueDay: f.elements.dueDay.value === 'last' ? 'last' : Number(f.elements.dueDay.value),
      anchorMonth: Number(f.elements.anchorMonth.value),
      spread: every >= 2 && f.elements.spread.checked,
      categoryId: f.elements.categoryId.value,
      active: f.elements.active ? f.elements.active.checked : true,
    };
    closeSheet();
    commit(
      (s) => {
        if (id) Object.assign(s.bills.find((b) => b.id === id), data);
        else s.bills.push({ id: Store.uid(), ...data });
      },
      { toast: id ? 'Gasto fijo actualizado' : 'Gasto fijo agregado', undo: true },
    );
  },
  category: (f) => {
    const budget = f.elements.budget.value.trim() ? readAmount(f, 'budget') : 0;
    if (budget == null) return;
    const id = f.dataset.id;
    const data = {
      name: f.elements.name.value.trim() || 'Categoría',
      emoji: f.elements.emoji.value.trim() || '📌',
      budget,
      group: f.elements.group.value,
      color: (f.elements.color && f.elements.color.value) || '#5F6A64',
    };
    closeSheet();
    commit(
      (s) => {
        if (id) Object.assign(s.categories.find((c) => c.id === id), data);
        else s.categories.splice(s.categories.length - 1, 0, { id: Store.uid(), ...data });
      },
      { toast: 'Categoría guardada' },
    );
  },
  pay: (f) => {
    const netPay = readAmount(f, 'netPay');
    if (netPay == null) return;
    closeSheet();
    commit(
      (s) => {
        s.settings.netPay = netPay;
        s.settings.payDays = [Number(f.elements.pay1.value), f.elements.pay2.value === 'last' ? 'last' : Number(f.elements.pay2.value)];
        s.settings.weekendRule = f.elements.weekendRule.value;
      },
      { toast: 'Pago actualizado' },
    );
    ui.periodKey = null;
  },
  override: (f) => {
    const amount = readAmount(f);
    if (amount == null) return;
    closeSheet();
    commit((s) => (s.payOverrides[f.dataset.key] = amount), { toast: 'Pago de esta quincena ajustado' });
  },
  savings: (f) => {
    const type = f.elements.type.value;
    const raw = f.elements.value.value;
    const value = type === 'percent' ? Math.min(100, Math.max(0, Number(String(raw).replace(',', '.')) || 0)) : L.parseAmount(raw);
    if (value == null) return;
    closeSheet();
    commit((s) => (s.settings.savings = { type, value }), { toast: 'Ahorro actualizado' });
  },
  'bill-amount': (f) => {
    const amount = readAmount(f);
    if (amount == null) return;
    closeSheet();
    commit((s) => {
      const k = f.dataset.key;
      s.billStatus[k] ||= {};
      s.billStatus[k][f.dataset.id] = { amount, paid: f.elements.paid.checked };
    });
  },
};

document.addEventListener('submit', (ev) => {
  const f = ev.target.closest('form[data-form]');
  if (!f) return;
  ev.preventDefault();
  const fn = forms[f.dataset.form];
  if (fn) fn(f);
});

window.addEventListener('hashchange', () => {
  closeSheet();
  if (route() !== 'movimientos') ui.filter = 'todas';
  render();
  window.scrollTo(0, 0);
});

// Mantener "hoy" correcto si la app queda abierta de un día para otro.
document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && render());

// Atajo: abrir directo el registro de gasto (?nuevo=1), útil como acceso directo en el teléfono.
render();
if (params.has('nuevo') && state.settings.setupDone) sheetExpense(null);

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
