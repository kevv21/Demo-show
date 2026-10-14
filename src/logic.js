// Lógica pura de Quincena: sin DOM ni almacenamiento, para poder probarla con `node --test`.
// Convenciones:
//  - Fechas como texto 'YYYY-MM-DD'. La aritmética se hace en UTC para no depender del horario de verano.
//  - Montos en centavos (enteros) para evitar errores de punto flotante.

const DAY = 86400000;
const pad = (n) => String(n).padStart(2, '0');

export const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
export const MESES_LARGO = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

// ---------- Fechas ----------

export function parseISO(s) {
  const [y, m, d] = s.split('-').map(Number);
  return { y, m, d };
}
const toUTC = (s) => {
  const { y, m, d } = parseISO(s);
  return Date.UTC(y, m - 1, d);
};
const fromUTC = (t) => {
  const dt = new Date(t);
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
};
export const ymd = (y, m, d) => fromUTC(Date.UTC(y, m - 1, d));
export const addDays = (s, n) => fromUTC(toUTC(s) + n * DAY);
export const daysBetween = (a, b) => Math.round((toUTC(b) - toUTC(a)) / DAY);
export const lastDayOfMonth = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();
export const weekday = (s) => new Date(toUTC(s)).getUTCDay(); // 0 = domingo
export function todayISO(now = new Date()) {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
function monthShift(y, m, k) {
  const t = y * 12 + (m - 1) + k;
  return { y: Math.floor(t / 12), m: (t % 12) + 1 };
}
export function dayInMonth(y, m, day) {
  const last = lastDayOfMonth(y, m);
  return day === 'last' ? last : Math.min(Number(day), last);
}
export function shortDate(iso) {
  const { m, d } = parseISO(iso);
  return `${d} ${MESES[m - 1]}`;
}

// ---------- Quincenas ----------

// Si el día de pago cae en fin de semana y la regla es 'before', se paga el viernes anterior.
function adjustForWeekend(iso, rule) {
  if (rule !== 'before') return iso;
  const wd = weekday(iso);
  if (wd === 6) return addDays(iso, -1);
  if (wd === 0) return addDays(iso, -2);
  return iso;
}

export function payDatesForMonth(y, m, settings) {
  const days = settings.payDays
    .map((d) => ({ d, n: dayInMonth(y, m, d) }))
    .sort((a, b) => a.n - b.n);
  return days.map((x, i) => {
    const nominal = ymd(y, m, x.n);
    return { key: `${y}-${pad(m)}-${i + 1}`, nominal, date: adjustForWeekend(nominal, settings.weekendRule) };
  });
}

function payDatesAround(dateISO, settings) {
  const { y, m } = parseISO(dateISO);
  return [-1, 0, 1, 2]
    .flatMap((k) => {
      const mm = monthShift(y, m, k);
      return payDatesForMonth(mm.y, mm.m, settings);
    })
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

// Una quincena empieza el día que te pagan y termina el día antes del siguiente pago.
export function periodFor(dateISO, settings) {
  const list = payDatesAround(dateISO, settings);
  let idx = 0;
  for (let i = 0; i < list.length; i++) if (list[i].date <= dateISO) idx = i;
  const cur = list[idx];
  const next = list[idx + 1];
  return {
    key: cur.key,
    payDate: cur.date,
    start: cur.date,
    end: addDays(next.date, -1),
    nextPayDate: next.date,
    days: daysBetween(cur.date, next.date),
  };
}

export function periodByKey(key, settings) {
  const [y, m, i] = key.split('-').map(Number);
  const pd = payDatesForMonth(y, m, settings)[i - 1];
  return periodFor(pd.date, settings);
}

export function shiftPeriod(period, delta, settings) {
  let p = period;
  for (let i = 0; i < Math.abs(delta); i++) {
    p = delta > 0 ? periodFor(p.nextPayDate, settings) : periodFor(addDays(p.start, -1), settings);
  }
  return p;
}

export function periodLabel(period) {
  return `Quincena del ${shortDate(period.payDate)}`;
}
export function periodRange(period) {
  const a = parseISO(period.start);
  const b = parseISO(period.end);
  if (a.m === b.m) return `${a.d} al ${b.d} ${MESES[b.m - 1]}`;
  return `${a.d} ${MESES[a.m - 1]} al ${b.d} ${MESES[b.m - 1]}`;
}

// ---------- Gastos fijos ----------

export const FRECUENCIAS = [
  { every: 0, label: 'Cada quincena' },
  { every: 1, label: 'Mensual' },
  { every: 2, label: 'Bimestral' },
  { every: 3, label: 'Trimestral' },
  { every: 6, label: 'Semestral' },
  { every: 12, label: 'Anual' },
];
export const frecuenciaLabel = (every) => (FRECUENCIAS.find((f) => f.every === every) || FRECUENCIAS[1]).label;

// Fechas de vencimiento del gasto fijo que le tocan a esta quincena.
// Un vencimiento le toca a la quincena cuyo pago llega en o antes de (vencimiento - margen).
export function billDueDatesInPeriod(bill, period, settings) {
  if (bill.every === 0) return [period.start];
  const buffer = settings.billBufferDays || 0;
  const { y, m } = parseISO(period.start);
  const out = [];
  for (let k = -1; k <= 2; k++) {
    const mm = monthShift(y, m, k);
    const anchor = bill.anchorMonth || 1;
    if (bill.every > 1 && ((((mm.m - anchor) % bill.every) + bill.every) % bill.every) !== 0) continue;
    const due = ymd(mm.y, mm.m, dayInMonth(mm.y, mm.m, bill.dueDay));
    const eff = addDays(due, -buffer);
    if (eff >= period.start && eff <= period.end) out.push(due);
  }
  return out;
}

// Gastos no mensuales con "apartar" activo: se guarda una parte cada quincena (fondo de previsión).
// ---------- Moneda local y dólares ----------

// Monedas soportadas con el locale de su país, para que el símbolo y los separadores salgan bien (C$1,250.50).
export const MONEDAS = [
  { code: 'NIO', name: 'Córdoba nicaragüense', plural: 'córdobas', locale: 'es-NI' },
  { code: 'USD', name: 'Dólar estadounidense', plural: 'dólares', locale: 'es-US' },
  { code: 'CRC', name: 'Colón costarricense', plural: 'colones', locale: 'es-CR' },
  { code: 'HNL', name: 'Lempira hondureño', plural: 'lempiras', locale: 'es-HN' },
  { code: 'GTQ', name: 'Quetzal guatemalteco', plural: 'quetzales', locale: 'es-GT' },
  { code: 'MXN', name: 'Peso mexicano', plural: 'pesos', locale: 'es-MX' },
  { code: 'COP', name: 'Peso colombiano', plural: 'pesos', locale: 'es-CO' },
  { code: 'DOP', name: 'Peso dominicano', plural: 'pesos', locale: 'es-DO' },
  { code: 'PEN', name: 'Sol peruano', plural: 'soles', locale: 'es-PE' },
  { code: 'CLP', name: 'Peso chileno', plural: 'pesos', locale: 'es-CL' },
  { code: 'ARS', name: 'Peso argentino', plural: 'pesos', locale: 'es-AR' },
  { code: 'EUR', name: 'Euro', plural: 'euros', locale: 'es-ES' },
];
export const DEFAULT_CURRENCY = 'NIO';

// Tipo de cambio oficial de referencia (moneda local por US$1). Solo se precarga para el córdoba;
// para otras monedas el usuario lo escribe en Ajustes.
export const DEFAULT_USD_RATE = { NIO: 36.6243 };

// Centavos de dólar a centavos de moneda local.
export const fromUSD = (usdCents, rate) => Math.round(usdCents * rate);

// Hay montos en dólares solo si la moneda local no es el dólar y hay tipo de cambio.
export const usesUSD = (settings) => settings.currency !== 'USD';

// Monto en moneda local de un gasto fijo; si se pactó en dólares se convierte con el tipo de cambio actual.
export function billAmount(bill, settings) {
  if (bill.usd == null) return bill.amount;
  if (settings.currency === 'USD') return bill.usd;
  return fromUSD(bill.usd, settings.usdRate || 0);
}

export const isSpread = (bill) => bill.every >= 2 && !!bill.spread;
export const spreadPerPeriod = (bill, settings) =>
  Math.round((settings ? billAmount(bill, settings) : bill.amount) / (bill.every * 2));

export function billsForPeriod(state, period) {
  const status = (state.billStatus && state.billStatus[period.key]) || {};
  const rows = [];
  for (const bill of state.bills) {
    if (bill.active === false) continue;
    const st = status[bill.id];
    if (isSpread(bill)) {
      const dues = billDueDatesInPeriod(bill, period, state.settings);
      const part = spreadPerPeriod(bill, state.settings);
      rows.push({
        bill,
        kind: 'apartado',
        date: period.start,
        estimated: part,
        amount: st && st.amount != null ? st.amount : part,
        paid: !!(st && st.paid),
        dueInPeriod: dues[0] || null,
      });
      continue;
    }
    const full = billAmount(bill, state.settings);
    for (const date of billDueDatesInPeriod(bill, period, state.settings)) {
      rows.push({
        bill,
        kind: 'pago',
        date,
        estimated: full,
        amount: st && st.amount != null ? st.amount : full,
        paid: !!(st && st.paid),
      });
    }
  }
  return rows.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

// ---------- Resumen de la quincena ----------

const inPeriod = (iso, p) => iso >= p.start && iso <= p.end;

export function savingsFor(settings, base) {
  const s = settings.savings || { type: 'percent', value: 0 };
  if (s.type === 'amount') return Math.max(0, Math.round(s.value || 0));
  return Math.max(0, Math.round((base * (s.value || 0)) / 100));
}

export function summarize(state, period, today = todayISO()) {
  const { settings, categories } = state;
  const catById = Object.fromEntries(categories.map((c) => [c.id, c]));
  const override = state.payOverrides && state.payOverrides[period.key];
  const base = override != null ? override : settings.netPay || 0;
  const extrasList = (state.incomes || []).filter((i) => inPeriod(i.date, period));
  const extras = extrasList.reduce((s, i) => s + i.amount, 0);
  const income = base + extras;
  const savings = savingsFor(settings, base);

  const bills = billsForPeriod(state, period);
  const fixedTotal = bills.reduce((s, b) => s + b.amount, 0);
  const fixedPaid = bills.filter((b) => b.paid).reduce((s, b) => s + b.amount, 0);

  const expenses = (state.expenses || []).filter((e) => inPeriod(e.date, period));
  const spentBy = {};
  for (const e of expenses) spentBy[e.categoryId] = (spentBy[e.categoryId] || 0) + e.amount;
  const spentTotal = expenses.reduce((s, e) => s + e.amount, 0);

  const envelopes = categories
    .filter((c) => (c.budget || 0) > 0 || spentBy[c.id])
    .map((c) => ({ cat: c, budget: c.budget || 0, spent: spentBy[c.id] || 0, remaining: (c.budget || 0) - (spentBy[c.id] || 0) }))
    .sort((a, b) => b.budget - a.budget || b.spent - a.spent);
  const budgetTotal = categories.reduce((s, c) => s + (c.budget || 0), 0);

  // Regla 50/30/20 real: fijos y gastos variables según el grupo de su categoría; el ahorro aparte.
  const groups = { necesidad: 0, deseo: 0, ahorro: savings };
  for (const b of bills) groups[(catById[b.bill.categoryId] || {}).group || 'necesidad'] += b.amount;
  for (const e of expenses) groups[(catById[e.categoryId] || {}).group || 'deseo'] += e.amount;

  const available = income - savings - fixedTotal - spentTotal;
  let daysLeft;
  if (today < period.start) daysLeft = period.days;
  else if (today > period.end) daysLeft = 0;
  else daysLeft = daysBetween(today, period.end) + 1;
  const perDay = daysLeft > 0 && available > 0 ? Math.floor(available / daysLeft) : 0;

  return {
    period,
    base,
    extras,
    extrasList,
    income,
    savings,
    bills,
    fixedTotal,
    fixedPaid,
    fixedPending: fixedTotal - fixedPaid,
    expenses,
    spentTotal,
    envelopes,
    budgetTotal,
    planned: savings + fixedTotal + budgetTotal,
    unassigned: income - savings - fixedTotal - budgetTotal,
    available,
    daysLeft,
    perDay,
    elapsed: Math.min(1, Math.max(0, daysBetween(period.start, today) + 1) / period.days),
    groups,
  };
}

// Qué tan cargadas quedan las dos quincenas del mes con los gastos fijos (mes típico).
export function fixedLoadByPayDay(state, refDate = todayISO()) {
  const p1 = periodFor(refDate, state.settings);
  const p2 = shiftPeriod(p1, 1, state.settings);
  const load = (p) => billsForPeriod(state, p).reduce((s, b) => s + b.estimated, 0);
  const slots = [p1, p2].map((p) => ({ period: p, total: load(p) }));
  // Orden fijo: primero la quincena cuyo pago es el primero del mes.
  return slots.sort((a, b) => a.period.key.slice(-1) - b.period.key.slice(-1));
}

export function trend(state, period, n = 6, today = todayISO()) {
  const out = [];
  let p = period;
  for (let i = 0; i < n; i++) {
    const s = summarize(state, p, today);
    out.unshift({ period: p, income: s.income, fixed: s.fixedTotal, spent: s.spentTotal, savings: s.savings });
    p = shiftPeriod(p, -1, state.settings);
  }
  return out;
}

// ---------- Montos ----------

// Acepta "1,250.50", "1.250,50", "$ 300", "300.5". Devuelve centavos o null.
export function parseAmount(input) {
  if (input == null) return null;
  let s = String(input).trim().replace(/[^\d.,-]/g, '');
  if (!s || s === '-') return null;
  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  if (lastComma >= 0 && lastDot >= 0) {
    const dec = lastComma > lastDot ? ',' : '.';
    const thou = dec === ',' ? '.' : ',';
    s = s.split(thou).join('').replace(dec, '.');
  } else if (lastComma >= 0) {
    const tail = s.length - lastComma - 1;
    s = tail === 2 || tail === 1 ? s.replace(',', '.').split(',').join('') : s.split(',').join('');
  } else if (lastDot >= 0 && /^\d{1,3}(\.\d{3})+$/.test(s)) {
    s = s.split('.').join('');
  }
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}

function numberFormat(locale, currency, digits) {
  const base = { style: 'currency', currency, minimumFractionDigits: digits, maximumFractionDigits: digits };
  try {
    return new Intl.NumberFormat(locale, { ...base, currencyDisplay: 'narrowSymbol' });
  } catch {
    // Navegadores viejos sin narrowSymbol
    return new Intl.NumberFormat(locale, base);
  }
}

export function makeFormatter(currency = DEFAULT_CURRENCY) {
  const locale = (MONEDAS.find((m) => m.code === currency) || { locale: 'es' }).locale;
  const fmt2 = numberFormat(locale, currency, 2);
  const fmt0 = numberFormat(locale, currency, 0);
  const usd2 = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const usd0 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
  return {
    money: (cents) => ((cents || 0) % 100 === 0 ? fmt0 : fmt2).format((cents || 0) / 100),
    round: (cents) => fmt0.format(Math.round((cents || 0) / 100)),
    // Dólares siempre con "US$" para no confundirlos con el símbolo local.
    usd: (cents) => `US$${((cents || 0) % 100 === 0 ? usd0 : usd2).format((cents || 0) / 100)}`,
  };
}

// ---------- Exportar ----------

export function toCSV(state) {
  const catById = Object.fromEntries(state.categories.map((c) => [c.id, c.name]));
  const esc = (v) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const usd = (m) => (m.usd != null ? (m.usd / 100).toFixed(2) : '');
  const rows = [];
  for (const e of state.expenses) rows.push([e.date, 'gasto', catById[e.categoryId] || '', (e.amount / 100).toFixed(2), usd(e), e.note || '']);
  for (const i of state.incomes || []) rows.push([i.date, 'ingreso extra', '', (i.amount / 100).toFixed(2), usd(i), i.note || '']);
  rows.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  rows.unshift(['fecha', 'tipo', 'categoria', `monto_${state.settings ? state.settings.currency.toLowerCase() : 'local'}`, 'monto_usd', 'nota']);
  return rows.map((r) => r.map(esc).join(',')).join('\n');
}
