import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  periodFor, periodByKey, shiftPeriod, payDatesForMonth, billDueDatesInPeriod, billsForPeriod,
  summarize, parseAmount, periodRange, fixedLoadByPayDay, spreadPerPeriod, toCSV,
  billAmount, fromUSD, makeFormatter, DEFAULT_USD_RATE,
} from '../src/logic.js';
import { normalize, defaultState, demoState } from '../src/store.js';

const S = { payDays: [15, 'last'], weekendRule: 'none', billBufferDays: 0, netPay: 1000000, savings: { type: 'percent', value: 10 } };

test('quincena del 15 va del 15 al día antes del último', () => {
  const p = periodFor('2026-10-20', S);
  assert.equal(p.key, '2026-10-1');
  assert.equal(p.start, '2026-10-15');
  assert.equal(p.end, '2026-10-30');
  assert.equal(p.days, 16);
});

test('quincena del último día cruza de mes', () => {
  const p = periodFor('2026-11-03', S);
  assert.equal(p.key, '2026-10-2');
  assert.equal(p.start, '2026-10-31');
  assert.equal(p.end, '2026-11-14');
  assert.equal(periodRange(p), '31 oct al 14 nov');
});

test('febrero: el último día es 28', () => {
  const p = periodFor('2027-02-20', S);
  assert.equal(p.start, '2027-02-15');
  assert.equal(p.end, '2027-02-27');
  assert.equal(periodFor('2027-02-28', S).key, '2027-02-2');
});

test('regla de fin de semana adelanta el pago al viernes', () => {
  // 15 de noviembre de 2026 es domingo
  const pd = payDatesForMonth(2026, 11, { ...S, weekendRule: 'before' });
  assert.equal(pd[0].date, '2026-11-13');
  const p = periodFor('2026-11-13', { ...S, weekendRule: 'before' });
  assert.equal(p.key, '2026-11-1');
});

test('navegar quincenas hacia adelante y atrás es consistente', () => {
  const p = periodByKey('2026-12-2', S);
  const next = shiftPeriod(p, 1, S);
  assert.equal(next.key, '2027-01-1');
  assert.equal(shiftPeriod(next, -1, S).key, '2026-12-2');
  assert.equal(shiftPeriod(p, -4, S).key, '2026-10-2');
});

test('un fijo que vence el día 5 lo paga la quincena del último día del mes anterior', () => {
  const bill = { id: 'b', amount: 50000, dueDay: 5, every: 1 };
  const pQ2 = periodByKey('2026-10-2', S); // 31 oct al 14 nov
  const pQ1 = periodByKey('2026-11-1', S); // 15 al 29 nov
  assert.deepEqual(billDueDatesInPeriod(bill, pQ2, S), ['2026-11-05']);
  assert.deepEqual(billDueDatesInPeriod(bill, pQ1, S), []);
});

test('margen de días mueve el vencimiento a la quincena anterior', () => {
  const bill = { id: 'b', amount: 50000, dueDay: 16, every: 1 };
  const withBuffer = { ...S, billBufferDays: 2 };
  assert.deepEqual(billDueDatesInPeriod(bill, periodByKey('2026-10-1', S), S), ['2026-10-16']);
  assert.deepEqual(billDueDatesInPeriod(bill, periodByKey('2026-10-1', withBuffer), withBuffer), []);
  assert.deepEqual(billDueDatesInPeriod(bill, periodByKey('2026-09-2', withBuffer), withBuffer), ['2026-10-16']);
});

test('bimestral respeta el mes ancla', () => {
  const luz = { id: 'luz', amount: 80000, dueDay: 20, every: 2, anchorMonth: 1 };
  const months = [];
  let p = periodByKey('2026-01-1', S);
  for (let i = 0; i < 24; i++) {
    if (billDueDatesInPeriod(luz, p, S).length) months.push(p.key);
    p = shiftPeriod(p, 1, S);
  }
  assert.deepEqual(months, ['2026-01-1', '2026-03-1', '2026-05-1', '2026-07-1', '2026-09-1', '2026-11-1']);
});

test('cada fijo mensual cae exactamente una vez por mes', () => {
  for (const dueDay of [1, 14, 15, 16, 28, 30, 31, 'last']) {
    const bill = { id: 'x', amount: 1, dueDay, every: 1 };
    let p = periodByKey('2026-01-1', S);
    let count = 0;
    for (let i = 0; i < 24; i++) { count += billDueDatesInPeriod(bill, p, S).length; p = shiftPeriod(p, 1, S); }
    assert.equal(count, 12, `dueDay ${dueDay}`);
  }
});

test('apartar un gasto anual divide entre 24 quincenas', () => {
  const seguro = { id: 's', amount: 1200000, dueDay: 10, every: 12, anchorMonth: 3, spread: true };
  assert.equal(spreadPerPeriod(seguro), 50000);
  const state = { settings: S, bills: [seguro], billStatus: {} };
  const rows = billsForPeriod(state, periodByKey('2026-06-1', S));
  assert.equal(rows.length, 1);
  assert.equal(rows[0].kind, 'apartado');
  assert.equal(rows[0].amount, 50000);
});

test('resumen: disponible, por día y 50/30/20', () => {
  const state = {
    settings: S,
    categories: [
      { id: 'viv', group: 'necesidad', budget: 0 },
      { id: 'sup', group: 'necesidad', budget: 200000 },
      { id: 'ocio', group: 'deseo', budget: 100000 },
    ],
    bills: [{ id: 'renta', amount: 400000, dueDay: 20, every: 1, categoryId: 'viv' }],
    billStatus: { '2026-10-1': { renta: { paid: true, amount: 400000 } } },
    expenses: [
      { id: 'e1', amount: 50000, categoryId: 'sup', date: '2026-10-16' },
      { id: 'e2', amount: 30000, categoryId: 'ocio', date: '2026-10-17' },
      { id: 'fuera', amount: 99999, categoryId: 'ocio', date: '2026-10-31' },
    ],
    incomes: [{ id: 'i1', amount: 100000, date: '2026-10-18' }],
  };
  const s = summarize(state, periodByKey('2026-10-1', S), '2026-10-21');
  assert.equal(s.income, 1100000);
  assert.equal(s.savings, 100000); // 10% del sueldo base, no de los extras
  assert.equal(s.fixedTotal, 400000);
  assert.equal(s.spentTotal, 80000);
  assert.equal(s.available, 1100000 - 100000 - 400000 - 80000);
  assert.equal(s.daysLeft, 10); // 21 al 30 inclusive
  assert.equal(s.perDay, Math.floor(s.available / 10));
  assert.equal(s.unassigned, 1100000 - 100000 - 400000 - 300000);
  assert.deepEqual(s.groups, { necesidad: 450000, deseo: 30000, ahorro: 100000 });
});

test('pago distinto en una quincena (override)', () => {
  const state = { settings: S, categories: [], bills: [], expenses: [], incomes: [], payOverrides: { '2026-10-1': 1500000 } };
  assert.equal(summarize(state, periodByKey('2026-10-1', S), '2026-10-20').income, 1500000);
  assert.equal(summarize(state, periodByKey('2026-10-2', S), '2026-10-20').income, 1000000);
});

test('carga de fijos por quincena', () => {
  const state = { settings: S, bills: [
    { id: 'a', amount: 100, dueDay: 3, every: 1 },
    { id: 'b', amount: 300, dueDay: 20, every: 1 },
    { id: 'c', amount: 50, dueDay: 1, every: 0 },
  ] };
  const load = fixedLoadByPayDay(state, '2026-10-20');
  assert.equal(load[0].period.key.endsWith('-1'), true);
  assert.equal(load[0].total, 350);
  assert.equal(load[1].total, 150);
});

test('parseAmount entiende formatos comunes', () => {
  assert.equal(parseAmount('1,250.50'), 125050);
  assert.equal(parseAmount('1.250,50'), 125050);
  assert.equal(parseAmount('$ 300'), 30000);
  assert.equal(parseAmount('45,5'), 4550);
  assert.equal(parseAmount('12,000'), 1200000);
  assert.equal(parseAmount('1.250'), 125000);
  assert.equal(parseAmount('99.9'), 9990);
  assert.equal(parseAmount(''), null);
  assert.equal(parseAmount('abc'), null);
});

test('CSV escapa comas y comillas e incluye columna en dólares', () => {
  const csv = toCSV({
    settings: { currency: 'NIO' },
    categories: [{ id: 'c', name: 'Súper' }],
    expenses: [
      { date: '2026-10-16', categoryId: 'c', amount: 12345, note: 'leche, "pan"' },
      { date: '2026-10-17', categoryId: 'c', amount: 36624, usd: 1000, note: 'Netflix' },
    ],
    incomes: [],
  });
  const lines = csv.split('\n');
  assert.equal(lines[0], 'fecha,tipo,categoria,monto_nio,monto_usd,nota');
  assert.equal(lines[1], '2026-10-16,gasto,Súper,123.45,,"leche, ""pan"""');
  assert.equal(lines[2], '2026-10-17,gasto,Súper,366.24,10.00,Netflix');
});

test('formato de dinero: decimales solo si hay centavos', () => {
  const f = makeFormatter('MXN');
  assert.equal(f.money(8550), '$85.50');
  assert.equal(f.money(120000), '$1,200');
  assert.equal(f.round(120049), '$1,200');
});

test('córdobas se muestran con C$ y dólares con US$', () => {
  const f = makeFormatter('NIO');
  assert.equal(f.money(125050), 'C$1,250.50');
  assert.equal(f.money(1200000), 'C$12,000');
  assert.equal(f.round(1099999), 'C$11,000');
  assert.equal(f.usd(25000), 'US$250');
  assert.equal(f.usd(999), 'US$9.99');
  // Otras monedas de la región mantienen su símbolo local, no el código ISO.
  assert.match(makeFormatter('CRC').round(100000), /₡/);
  assert.match(makeFormatter('HNL').round(100000), /^L/);
});

test('fijo en dólares se convierte con el tipo de cambio vigente', () => {
  const settings = { ...S, currency: 'NIO', usdRate: 36.6243 };
  const alquiler = { id: 'a', amount: 0, usd: 25000, dueDay: 1, every: 1 };
  assert.equal(fromUSD(25000, 36.6243), 915608);
  assert.equal(billAmount(alquiler, settings), 915608);
  // Si cambia el tipo de cambio, el monto local se recalcula.
  assert.equal(billAmount(alquiler, { ...settings, usdRate: 37 }), 925000);
  // Si la moneda local ya es el dólar, se usa tal cual.
  assert.equal(billAmount(alquiler, { ...settings, currency: 'USD' }), 25000);
  // Fijo normal en córdobas no se toca.
  assert.equal(billAmount({ amount: 110000 }, settings), 110000);
  const state = { settings, bills: [alquiler], billStatus: {}, categories: [], expenses: [], incomes: [] };
  const p = periodByKey('2026-10-2', settings); // 31 oct al 14 nov: le toca el día 1
  assert.equal(billsForPeriod(state, p)[0].amount, 915608);
  assert.equal(summarize(state, p, '2026-11-02').fixedTotal, 915608);
});

test('apartar un fijo anual en dólares usa el monto convertido', () => {
  const settings = { ...S, currency: 'NIO', usdRate: 36.6243 };
  const seguro = { id: 's', amount: 0, usd: 48000, dueDay: 10, every: 12, anchorMonth: 3, spread: true };
  assert.equal(spreadPerPeriod(seguro, settings), Math.round(fromUSD(48000, 36.6243) / 24));
});

test('estado inicial en córdobas con tipo de cambio oficial', () => {
  const st = defaultState();
  assert.equal(st.settings.currency, 'NIO');
  assert.equal(st.settings.usdRate, DEFAULT_USD_RATE.NIO);
});

test('normalize: moneda desconocida pasa a córdobas; otra moneda sin tasa queda sin configurar', () => {
  assert.equal(normalize({ settings: { currency: 'XXX' } }).settings.currency, 'NIO');
  const crc = normalize({ settings: { currency: 'CRC' } }).settings;
  assert.equal(crc.currency, 'CRC');
  assert.equal(crc.usdRate, null);
  assert.equal(normalize({ settings: { currency: 'NIO', usdRate: '37.1' } }).settings.usdRate, 37.1);
  assert.equal(normalize({ settings: { currency: 'NIO', usdRate: -5 } }).settings.usdRate, DEFAULT_USD_RATE.NIO);
});

test('normalize conserva montos en dólares y los deja en null si no vienen', () => {
  const st = normalize({
    settings: { currency: 'NIO' },
    bills: [
      { id: 'a', name: 'Alquiler', amount: 915608, usd: 25000, dueDay: 1, every: 1 },
      { id: 'b', name: 'Luz', amount: 110000, dueDay: 20, every: 1 },
    ],
    expenses: [
      { id: 'e', amount: 36624, usd: 1000, date: '2026-10-16', categoryId: 'otros' },
      { id: 'f', amount: 5000, date: '2026-10-16', categoryId: 'otros' },
    ],
  });
  assert.equal(st.bills[0].usd, 25000);
  assert.equal(st.bills[1].usd, null);
  assert.equal(st.expenses[0].usd, 1000);
  assert.equal(st.expenses[1].usd, null);
});

test('la demo está en córdobas y su plan cuadra', () => {
  const st = demoState('2026-10-14');
  assert.equal(st.settings.currency, 'NIO');
  const s = summarize(st, periodFor('2026-10-14', st.settings), '2026-10-14');
  assert.ok(s.income > 0 && s.fixedTotal > 0 && s.spentTotal > 0);
  assert.ok(st.bills.some((b) => b.usd != null), 'al menos un fijo en dólares');
});
