// Persistencia local (localStorage). Los datos nunca salen del dispositivo salvo que exportes un respaldo.
import { addDays, parseISO, periodFor, shiftPeriod, todayISO } from './logic.js';

const KEY = 'quincena:v1';
const DEMO_KEY = 'quincena:demo';
export const SCHEMA_VERSION = 1;

export const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);

export const GRUPOS = {
  necesidad: { label: 'Necesidades', meta: 50 },
  deseo: { label: 'Gustos', meta: 30 },
  ahorro: { label: 'Ahorro y deudas extra', meta: 20 },
};

export const PALETA = ['#5B6CF0', '#2E9BC6', '#1F8A5B', '#E08A1E', '#D6478F', '#C0392B', '#E0565B', '#A35BD6', '#7A6FF0', '#8A7A55', '#C08A2E', '#13201A', '#5F6A64'];

export function defaultCategories() {
  return [
    { id: 'vivienda', name: 'Vivienda', emoji: '🏠', color: '#5B6CF0', group: 'necesidad', budget: 0 },
    { id: 'servicios', name: 'Servicios', emoji: '💡', color: '#2E9BC6', group: 'necesidad', budget: 0 },
    { id: 'super', name: 'Súper y despensa', emoji: '🛒', color: '#1F8A5B', group: 'necesidad', budget: 0 },
    { id: 'transporte', name: 'Transporte', emoji: '🚌', color: '#E08A1E', group: 'necesidad', budget: 0 },
    { id: 'salud', name: 'Salud', emoji: '💊', color: '#D6478F', group: 'necesidad', budget: 0 },
    { id: 'deudas', name: 'Deudas', emoji: '💳', color: '#C0392B', group: 'necesidad', budget: 0 },
    { id: 'comida', name: 'Comida fuera', emoji: '🌮', color: '#E0565B', group: 'deseo', budget: 0 },
    { id: 'ocio', name: 'Salidas y ocio', emoji: '🎉', color: '#A35BD6', group: 'deseo', budget: 0 },
    { id: 'suscripciones', name: 'Suscripciones', emoji: '📺', color: '#7A6FF0', group: 'deseo', budget: 0 },
    { id: 'hormiga', name: 'Gastos hormiga', emoji: '☕', color: '#8A7A55', group: 'deseo', budget: 0 },
    { id: 'personal', name: 'Ropa y personal', emoji: '👕', color: '#C08A2E', group: 'deseo', budget: 0 },
    { id: 'metas', name: 'Metas y ahorro extra', emoji: '🐷', color: '#13201A', group: 'ahorro', budget: 0 },
    { id: 'otros', name: 'Otros', emoji: '📦', color: '#5F6A64', group: 'deseo', budget: 0 },
  ];
}

export function defaultState() {
  return {
    version: SCHEMA_VERSION,
    settings: {
      setupDone: false,
      currency: 'MXN',
      netPay: 0,
      payDays: [15, 'last'],
      weekendRule: 'none',
      billBufferDays: 0,
      savings: { type: 'percent', value: 10 },
    },
    categories: defaultCategories(),
    bills: [],
    billStatus: {},
    expenses: [],
    incomes: [],
    payOverrides: {},
  };
}

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
const int = (v, d = 0) => (Number.isFinite(Number(v)) ? Math.round(Number(v)) : d);
const isISO = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
const str = (v, max = 80) => String(v ?? '').slice(0, max);

// Valida y completa cualquier estado (incluido un respaldo importado) para que la app nunca truene.
export function normalize(raw) {
  const base = defaultState();
  if (!isObj(raw)) return base;
  const s = isObj(raw.settings) ? raw.settings : {};
  const payDays = Array.isArray(s.payDays) && s.payDays.length === 2 ? s.payDays : base.settings.payDays;
  const settings = {
    setupDone: !!s.setupDone,
    currency: /^[A-Z]{3}$/.test(s.currency) ? s.currency : 'MXN',
    netPay: Math.max(0, int(s.netPay)),
    payDays: payDays.map((d) => (d === 'last' ? 'last' : Math.min(31, Math.max(1, int(d, 15))))),
    weekendRule: s.weekendRule === 'before' ? 'before' : 'none',
    billBufferDays: Math.min(10, Math.max(0, int(s.billBufferDays))),
    savings: isObj(s.savings)
      ? { type: s.savings.type === 'amount' ? 'amount' : 'percent', value: Math.max(0, Number(s.savings.value) || 0) }
      : base.settings.savings,
  };
  const categories = Array.isArray(raw.categories) && raw.categories.length
    ? raw.categories.filter(isObj).map((c) => ({
        id: str(c.id || uid(), 40),
        name: str(c.name || 'Categoría', 40),
        emoji: str(c.emoji || '📦', 8),
        color: /^#[0-9a-fA-F]{6}$/.test(c.color) ? c.color : '#5F6A64',
        group: GRUPOS[c.group] ? c.group : 'deseo',
        budget: Math.max(0, int(c.budget)),
      }))
    : base.categories;
  if (!categories.some((c) => c.id === 'otros')) categories.push(defaultCategories().find((c) => c.id === 'otros'));
  const catIds = new Set(categories.map((c) => c.id));
  const bills = (Array.isArray(raw.bills) ? raw.bills : []).filter(isObj).map((b) => ({
    id: str(b.id || uid(), 40),
    name: str(b.name || 'Gasto fijo', 40),
    amount: Math.max(0, int(b.amount)),
    dueDay: b.dueDay === 'last' ? 'last' : Math.min(31, Math.max(1, int(b.dueDay, 1))),
    every: [0, 1, 2, 3, 6, 12].includes(int(b.every, 1)) ? int(b.every, 1) : 1,
    anchorMonth: Math.min(12, Math.max(1, int(b.anchorMonth, 1))),
    spread: !!b.spread,
    categoryId: catIds.has(b.categoryId) ? b.categoryId : 'otros',
    active: b.active !== false,
  }));
  const moves = (list, withCat) =>
    (Array.isArray(list) ? list : [])
      .filter((e) => isObj(e) && isISO(e.date) && Number.isFinite(Number(e.amount)))
      .map((e) => ({
        id: str(e.id || uid(), 40),
        amount: Math.max(0, int(e.amount)),
        date: e.date,
        note: str(e.note, 80),
        ...(withCat ? { categoryId: catIds.has(e.categoryId) ? e.categoryId : 'otros' } : {}),
        createdAt: int(e.createdAt, Date.now()),
      }));
  return {
    version: SCHEMA_VERSION,
    settings,
    categories,
    bills,
    billStatus: isObj(raw.billStatus) ? raw.billStatus : {},
    expenses: moves(raw.expenses, true),
    incomes: moves(raw.incomes, false),
    payOverrides: isObj(raw.payOverrides) ? raw.payOverrides : {},
  };
}

function safeGet(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function load(demo) {
  const raw = safeGet(demo ? DEMO_KEY : KEY);
  if (raw) {
    try {
      return normalize(JSON.parse(raw));
    } catch {
      /* respaldo corrupto: se ignora y se usa el estado inicial */
    }
  }
  return demo ? demoState() : defaultState();
}

export function save(state, demo) {
  try {
    localStorage.setItem(demo ? DEMO_KEY : KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function clearAll(demo) {
  try {
    localStorage.removeItem(demo ? DEMO_KEY : KEY);
  } catch {
    /* sin acceso a almacenamiento */
  }
}

// Datos de ejemplo relativos a hoy, para probar la app sin capturar nada.
export function demoState(today = todayISO()) {
  const st = defaultState();
  st.settings = { ...st.settings, setupDone: true, netPay: 1200000, savings: { type: 'percent', value: 10 } };
  const budgets = { super: 180000, transporte: 70000, comida: 60000, ocio: 50000, hormiga: 30000, personal: 30000, salud: 20000 };
  st.categories = st.categories.map((c) => ({ ...c, budget: budgets[c.id] || 0 }));
  const { m } = parseISO(today);
  st.bills = [
    { id: 'renta', name: 'Renta', amount: 650000, dueDay: 1, every: 1, anchorMonth: 1, spread: false, categoryId: 'vivienda', active: true },
    { id: 'luz', name: 'Luz (CFE)', amount: 90000, dueDay: 20, every: 2, anchorMonth: ((m - 1) % 2) + 1, spread: false, categoryId: 'servicios', active: true },
    { id: 'internet', name: 'Internet', amount: 54900, dueDay: 10, every: 1, anchorMonth: 1, spread: false, categoryId: 'servicios', active: true },
    { id: 'cel', name: 'Celular', amount: 29900, dueDay: 22, every: 1, anchorMonth: 1, spread: false, categoryId: 'servicios', active: true },
    { id: 'gas', name: 'Gas', amount: 45000, dueDay: 25, every: 1, anchorMonth: 1, spread: false, categoryId: 'servicios', active: true },
    { id: 'stream', name: 'Streaming', amount: 21900, dueDay: 18, every: 1, anchorMonth: 1, spread: false, categoryId: 'suscripciones', active: true },
    { id: 'seguro', name: 'Seguro del auto', amount: 960000, dueDay: 15, every: 12, anchorMonth: 3, spread: true, categoryId: 'transporte', active: true },
  ];
  const cur = periodFor(today, st.settings);
  const plan = [
    ['super', 'Súper semanal', 92000, 0], ['hormiga', 'Café', 6500, 0], ['transporte', 'Gasolina', 50000, 1],
    ['comida', 'Tacos', 18000, 1], ['hormiga', 'Oxxo', 4500, 2], ['ocio', 'Cine', 26000, 3],
    ['super', 'Mercado', 31000, 4], ['hormiga', 'Café', 6500, 4], ['comida', 'Comida del trabajo', 15000, 5],
    ['personal', 'Corte de cabello', 18000, 6], ['salud', 'Farmacia', 12000, 7], ['transporte', 'Uber', 9800, 7],
  ];
  const expenses = [];
  for (let back = 0; back < 6; back++) {
    const p = shiftPeriod(cur, -back, st.settings);
    plan.forEach(([categoryId, note, amount, offset], i) => {
      const date = addDays(p.start, offset + (back % 2));
      if (date > today || date > p.end) return;
      const wiggle = 1 + (((i * 7 + back * 13) % 9) - 4) / 20;
      expenses.push({ id: uid(), categoryId, note, amount: Math.round((amount * wiggle) / 100) * 100, date, createdAt: Date.now() });
    });
    // Quincenas pasadas: fijos marcados como pagados.
    if (back > 0) st.billStatus[p.key] = Object.fromEntries(st.bills.map((b) => [b.id, { paid: true }]));
  }
  st.billStatus[cur.key] = { renta: { paid: true } };
  st.expenses = expenses;
  st.incomes = [{ id: uid(), amount: 150000, note: 'Venta en línea', date: cur.start, createdAt: Date.now() }];
  return st;
}
