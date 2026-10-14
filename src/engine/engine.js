// Decision engine: readiness predictor, threat-risk scorer, two-stage optimiser, retask ripple.
// Prototype solver = priority-weighted Hungarian assignment (aircraft, then crew) under hard
// constraints. Production target = Google OR-Tools CP-SAT with the same objective + constraints.
import { ROLES, TYPE_NAME } from './scenario.js';

export const FACTORS = [
  { key: 'priority', label: 'Mission priority', desc: 'HQ priority 1–5' },
  { key: 'readiness', label: 'Aircraft readiness', desc: 'Predicted serviceability' },
  { key: 'crew', label: 'Crew fit', desc: 'Qualified, duty margin, rest' },
  { key: 'threat', label: 'Threat exposure', desc: 'Lower is better (EW pod helps)' },
  { key: 'weapon', label: 'Weapon-load match', desc: 'Configuration in stock' },
  { key: 'weather', label: 'Weather window', desc: 'Open / marginal / closed' },
];

// Logistic readiness model: P(serviceable over next 6 h)
export function pServ(a) {
  if (a.us) return 0;
  const risk = 0.25 * a.snags + (a.hrs < 10 ? (10 - a.hrs) * 0.25 : 0);
  return 1 / (1 + Math.exp(-(3.2 - risk)));
}
export function readinessState(a, settings) {
  if (a.us) return 'us';
  return pServ(a) < settings.watchBelow ? 'watch' : 'ready';
}
export const wxPts = (w) => (w === 'open' ? 1 : w === 'marginal' ? 0.5 : 0);

export function feasibleAC(S, settings, m, a) {
  const ar = S.areas[m.area];
  const why = [];
  if (a.us) why.push('Aircraft unserviceable');
  if (!ROLES[a.type].includes(m.type)) why.push(`Role not supported by ${TYPE_NAME[a.type]}`);
  if (!a.us && a.hrs < m.dur) why.push('Maintenance due inside sortie');
  if (!S.stock[m.cfg]) why.push(`No ${m.cfg} stock`);
  if (ar.wx === 'closed') why.push('Weather below minima');
  if (ar.air === 'closed') why.push('Airspace closed');
  if (ar.threat >= settings.ewThreshold && !a.ew) why.push(`Threat ≥ ${Math.round(settings.ewThreshold * 100)}% needs EW pod`);
  return why;
}
export function feasibleCrew(S, settings, m, c) {
  const why = [];
  if (!c.q.includes(m.type)) why.push(`Crew not qualified for ${m.type}`);
  if (c.duty < m.dur + settings.dutyMargin) why.push('Would exceed duty limit');
  return why;
}
export function crewFit(m, c) {
  return (0.6 + 0.4 * Math.min(1, (c.duty - m.dur) / 4)) * (c.rested ? 1 : 0.85);
}
function acPart(S, settings, m, a) {
  const W = settings.weights;
  const ar = S.areas[m.area];
  const exp = ar.threat * (a.ew ? 0.7 : 1);
  return {
    priority: (W.priority * m.pri) / 5,
    readiness: W.readiness * pServ(a),
    threat: W.threat * (1 - exp),
    weapon: W.weapon,
    weather: W.weather * wxPts(ar.wx),
    exposure: exp,
  };
}
export function scoreOf(S, settings, m, a, c) {
  const p = acPart(S, settings, m, a);
  const crew = settings.weights.crew * crewFit(m, c);
  const parts = { priority: p.priority, readiness: p.readiness, crew, threat: p.threat, weapon: p.weapon, weather: p.weather };
  const total = Object.values(parts).reduce((s, v) => s + v, 0);
  return { total, parts, exposure: p.exposure };
}
const mult = (m) => 1 + (m.pri - 1) * 0.5;

// ---- time model: a sortie occupies [TOT - 30 min (start-up, transit), TOT + duration] ----
export const totMin = (m) => { const [h, mm] = String(m.tot).split(':').map(Number); return h * 60 + mm; };
export const blockOf = (m) => ({ start: totMin(m) - 30, end: totMin(m) + Math.round(m.dur * 60) });
const overlaps = (a, b, gap) => a.start < b.end + gap && b.start < a.end + gap;

// Hungarian algorithm (min-cost, square)
function hungarian(cost) {
  const n = cost.length;
  const u = new Array(n + 1).fill(0), v = new Array(n + 1).fill(0), p = new Array(n + 1).fill(0), way = new Array(n + 1).fill(0);
  for (let i = 1; i <= n; i++) {
    p[0] = i;
    let j0 = 0;
    const minv = new Array(n + 1).fill(Infinity), used = new Array(n + 1).fill(false);
    do {
      used[j0] = true;
      const i0 = p[j0];
      let delta = Infinity, j1 = 0;
      for (let j = 1; j <= n; j++)
        if (!used[j]) {
          const cur = cost[i0 - 1][j - 1] - u[i0] - v[j];
          if (cur < minv[j]) { minv[j] = cur; way[j] = j0; }
          if (minv[j] < delta) { delta = minv[j]; j1 = j; }
        }
      for (let j = 0; j <= n; j++) {
        if (used[j]) { u[p[j]] += delta; v[j] -= delta; } else minv[j] -= delta;
      }
      j0 = j1;
    } while (p[j0] !== 0);
    do { const j1 = way[j0]; p[j0] = p[j1]; j0 = j1; } while (j0);
  }
  const ans = new Array(n).fill(-1);
  for (let j = 1; j <= n; j++) if (p[j]) ans[p[j] - 1] = j - 1;
  return ans;
}
function assign(rows, cols, valueFn) {
  const R = rows.length, C = cols.length, n = R + C, BIG = 1e6, cost = [];
  for (let i = 0; i < n; i++) {
    const r = [];
    for (let j = 0; j < n; j++) {
      if (i < R) {
        if (j < C) { const val = valueFn(rows[i], cols[j]); r.push(val === null ? BIG * 2 : BIG - val); } else r.push(BIG);
      } else r.push(0);
    }
    cost.push(r);
  }
  const a = hungarian(cost), out = {};
  for (let i = 0; i < R; i++) {
    const j = a[i];
    if (j >= 0 && j < C && valueFn(rows[i], cols[j]) !== null) out[i] = j;
  }
  return out;
}

function unfilledReason(S, settings, m) {
  const ar = S.areas[m.area];
  if (ar.wx === 'closed') return `Weather below minima in ${ar.name}`;
  if (ar.air === 'closed') return `Airspace closed in ${ar.name}`;
  if (!S.aircraft.some((a) => !feasibleAC(S, settings, m, a).length)) return `No serviceable aircraft with ${m.type} role`;
  return 'Higher-priority missions took the remaining assets';
}

// Solve the full plan. prevPlan gives the stability (minimal-disruption) bonus.
export function solve(S, settings, prevPlan = {}) {
  const t0 = (typeof performance !== 'undefined' ? performance : Date).now();
  const STAB = settings.stability;
  const out = {};
  const usedAC = new Set(), usedCrew = new Set();
  const pinned = { ...S.pinned };
  for (const mid in pinned) {
    const m = S.missions.find((x) => x.id === mid), pin = pinned[mid];
    const a = S.aircraft.find((x) => x.id === pin.ac), c = S.crews.find((x) => x.id === pin.crew);
    if (m && a && c && !S.held[mid] && !feasibleAC(S, settings, m, a).length && !feasibleCrew(S, settings, m, c).length) {
      out[mid] = { ac: a.id, crew: c.id, pinned: true };
      usedAC.add(a.id); usedCrew.add(c.id);
    }
  }
  const ms = S.missions.filter((m) => !out[m.id] && !S.held[m.id]);
  const acs = S.aircraft.filter((a) => !usedAC.has(a.id));
  const st1 = assign(ms, acs, (m, a) => {
    if (feasibleAC(S, settings, m, a).length) return null;
    if (!S.crews.some((c) => !usedCrew.has(c.id) && !feasibleCrew(S, settings, m, c).length)) return null;
    const p = acPart(S, settings, m, a);
    const keep = prevPlan[m.id] && prevPlan[m.id].ac === a.id ? STAB : 0;
    return mult(m) * (p.priority + p.readiness + p.threat + p.weapon + p.weather + keep);
  });
  const withAC = [];
  for (const i in st1) withAC.push({ m: ms[i], a: acs[st1[i]] });
  const crews = S.crews.filter((c) => !usedCrew.has(c.id));
  const st2 = assign(withAC, crews, (r, c) =>
    feasibleCrew(S, settings, r.m, c).length
      ? null
      : mult(r.m) * (1 + settings.weights.crew * crewFit(r.m, c) + (prevPlan[r.m.id] && prevPlan[r.m.id].crew === c.id ? STAB : 0)),
  );
  for (const i in st2) { const r = withAC[i]; out[r.m.id] = { ac: r.a.id, crew: crews[st2[i]].id }; }
  // weapon stock: drop lowest-priority over-allocations
  const byCfg = {};
  for (const mid in out) { const m = S.missions.find((x) => x.id === mid); (byCfg[m.cfg] = byCfg[m.cfg] || []).push(m); }
  for (const cfg in byCfg) {
    const list = byCfg[cfg].sort((a, b) => b.pri - a.pri);
    while (list.length > S.stock[cfg]) { const m = list.pop(); out[m.id] = { reason: `Weapon stock exhausted (${cfg})` }; }
  }
  // ---- second wave: fill remaining missions with aircraft/crews already flying, if turnaround allows ----
  const blocks = (key, id) => Object.entries(out).filter(([, o]) => o[key] === id).map(([mid]) => blockOf(S.missions.find((x) => x.id === mid)));
  const hoursOn = (key, id) => Object.entries(out).filter(([, o]) => o[key] === id).reduce((h, [mid]) => h + S.missions.find((x) => x.id === mid).dur, 0);
  const cfgUsed = (cfg) => Object.entries(out).filter(([mid, o]) => o.ac && S.missions.find((x) => x.id === mid).cfg === cfg).length;
  const waiting = S.missions.filter((m) => !S.held[m.id] && !(out[m.id] && out[m.id].ac)).sort((a, b) => b.pri - a.pri);
  for (const m of waiting) {
    if (cfgUsed(m.cfg) >= (S.stock[m.cfg] || 0)) continue;
    const b = blockOf(m);
    let best = null;
    for (const a of S.aircraft) {
      if (feasibleAC(S, settings, m, a).length) continue;
      if (blocks('ac', a.id).some((x) => overlaps(x, b, settings.turnaround))) continue;
      if (a.hrs - hoursOn('ac', a.id) < m.dur) continue;
      for (const c of S.crews) {
        if (!c.q.includes(m.type)) continue;
        if (c.duty - hoursOn('crew', c.id) < m.dur + settings.dutyMargin) continue;
        if (blocks('crew', c.id).some((x) => overlaps(x, b, settings.crewRest))) continue;
        const sc = scoreOf(S, settings, m, a, c).total;
        if (!best || sc > best.sc) best = { a, c, sc };
      }
    }
    if (best) out[m.id] = { ac: best.a.id, crew: best.c.id, wave: 2 };
  }

  const res = {};
  for (const m of S.missions) {
    if (S.held[m.id]) { res[m.id] = { status: 'held', reason: S.held[m.id], ...blockOf(m) }; continue; }
    const o = out[m.id];
    if (o && o.ac) {
      const a = S.aircraft.find((x) => x.id === o.ac), c = S.crews.find((x) => x.id === o.crew);
      const sc = scoreOf(S, settings, m, a, c);
      res[m.id] = {
        status: S.approved[m.id] === `${o.ac}/${o.crew}` ? 'approved' : 'proposed',
        ac: o.ac, crew: o.crew, score: sc.total, parts: sc.parts, exposure: sc.exposure, pinned: !!o.pinned, wave: o.wave || 1, ...blockOf(m),
      };
    } else res[m.id] = { status: 'unfilled', reason: (o && o.reason) || unfilledReason(S, settings, m), ...blockOf(m) };
  }
  const ms_ = (typeof performance !== 'undefined' ? performance : Date).now() - t0;
  return { plan: res, ms: ms_ };
}

export function alternatives(S, settings, plan, mid, n = 3) {
  const m = S.missions.find((x) => x.id === mid);
  if (!m) return [];
  const cur = plan[mid];
  const b = blockOf(m);
  const clash = (key, id, gap) => Object.entries(plan).some(([k, r]) => k !== mid && r[key] === id && overlaps(blockOf(S.missions.find((x) => x.id === k)), b, gap));
  const opts = [];
  for (const a of S.aircraft) {
    if (clash('ac', a.id, settings.turnaround) || feasibleAC(S, settings, m, a).length) continue;
    for (const c of S.crews) {
      if (clash('crew', c.id, settings.crewRest) || feasibleCrew(S, settings, m, c).length) continue;
      if (cur && cur.ac === a.id && cur.crew === c.id) continue;
      opts.push({ ac: a.id, crew: c.id, score: scoreOf(S, settings, m, a, c).total });
    }
  }
  return opts.sort((x, y) => y.score - x.score).slice(0, n);
}

// Why each aircraft was or was not usable for a mission (explainability panel)
export function constraintReport(S, settings, m, plan) {
  const r = plan[m.id];
  const checks = [];
  const ar = S.areas[m.area];
  const a = r && r.ac ? S.aircraft.find((x) => x.id === r.ac) : null;
  const c = r && r.crew ? S.crews.find((x) => x.id === r.crew) : null;
  checks.push({ label: 'Role fit', ok: !!a && ROLES[a.type].includes(m.type), note: a ? `${TYPE_NAME[a.type]} can fly ${m.type}` : '—' });
  checks.push({ label: 'Crew qualified', ok: !!c && c.q.includes(m.type), note: c ? `${c.id}: ${c.q.join(', ')}` : '—' });
  checks.push({ label: 'Crew duty limit', ok: !!c && c.duty >= m.dur + settings.dutyMargin, note: c ? `${c.duty} h left vs ${m.dur} h sortie + ${settings.dutyMargin} h margin` : '—' });
  checks.push({ label: 'Maintenance due', ok: !!a && a.hrs >= m.dur, note: a ? `${a.hrs} h to next inspection` : '—' });
  checks.push({ label: 'Weapon stock', ok: !!S.stock[m.cfg], note: `${m.cfg}: ${S.stock[m.cfg] || 0} in stock` });
  checks.push({ label: 'Airspace open', ok: ar.air !== 'closed', note: `${ar.name}: ${ar.air}` });
  checks.push({ label: 'Weather minima', ok: ar.wx !== 'closed', note: `${ar.name}: ${ar.wx}` });
  const needEw = ar.threat >= settings.ewThreshold;
  checks.push({ label: 'EW pod (high threat)', ok: !needEw || (!!a && a.ew), note: needEw ? `Threat ${Math.round(ar.threat * 100)}% — EW pod required` : `Threat ${Math.round(ar.threat * 100)}% — not required` });
  const others = (key, id) => Object.entries(plan).filter(([k, x]) => k !== m.id && x[key] === id).map(([k]) => blockOf(S.missions.find((y) => y.id === k)));
  const b = blockOf(m);
  const gapTo = (list) => list.reduce((g, x) => Math.min(g, x.end <= b.start ? b.start - x.end : x.start >= b.end ? x.start - b.end : -1), Infinity);
  if (a) {
    const g = gapTo(others('ac', a.id));
    checks.push({ label: 'Aircraft turnaround', ok: g === Infinity || g >= settings.turnaround, note: g === Infinity ? 'Only sortie for this airframe today' : `${g} min to its other sortie (≥ ${settings.turnaround} min needed)` });
  }
  if (c) {
    const g = gapTo(others('crew', c.id));
    checks.push({ label: 'Crew rest between sorties', ok: g === Infinity || g >= settings.crewRest, note: g === Infinity ? 'Only sortie for this crew today' : `${g} min rest before/after (≥ ${settings.crewRest} min needed)` });
  }
  return checks;
}

export function diffPlans(S, before, after) {
  const changes = [];
  for (const m of S.missions) {
    const a = before[m.id], b = after[m.id];
    const fmt = (x) => (!x ? 'new' : x.ac ? `${x.ac} / ${x.crew}` : x.status);
    if (!a) { changes.push({ id: m.id, before: 'new', after: fmt(b), reason: b && b.reason }); continue; }
    if (fmt(a) !== fmt(b)) changes.push({ id: m.id, before: fmt(a), after: fmt(b), reason: b && b.reason });
  }
  return changes;
}

export function planStats(S, settings, plan) {
  const ms = S.missions;
  const tasked = ms.filter((m) => plan[m.id] && plan[m.id].ac).length;
  const approved = ms.filter((m) => plan[m.id] && plan[m.id].status === 'approved').length;
  const unfilled = ms.filter((m) => plan[m.id] && plan[m.id].status === 'unfilled').length;
  const held = ms.filter((m) => plan[m.id] && plan[m.id].status === 'held').length;
  const ready = S.aircraft.filter((a) => readinessState(a, settings) === 'ready').length;
  const watch = S.aircraft.filter((a) => readinessState(a, settings) === 'watch').length;
  const us = S.aircraft.filter((a) => a.us).length;
  const srv = S.aircraft.filter((a) => !a.us);
  const avgReady = srv.length ? srv.reduce((s, a) => s + pServ(a), 0) / S.aircraft.length : 0;
  const crewsFree = S.crews.filter((c) => !Object.values(plan).some((p) => p.crew === c.id)).length;
  const wave2 = ms.filter((m) => plan[m.id] && plan[m.id].wave === 2).length;
  const highThreat = Object.entries(S.areas).filter(([k, a]) => k !== 'H' && a.threat >= 0.6).length;
  const scores = ms.map((m) => plan[m.id]).filter((p) => p && p.ac).map((p) => p.score);
  const avgScore = scores.length ? scores.reduce((s, v) => s + v, 0) / scores.length : 0;
  return { total: ms.length, tasked, approved, unfilled, held, ready, watch, us, avgReady, crewsFree, highThreat, avgScore, wave2 };
}

export const riskBand = (t) => (t >= 0.6 ? 'high' : t >= 0.4 ? 'med' : 'clear');
export const pct = (x) => `${Math.round(x * 100)}%`;
export const hhmm = (t) => `${String(Math.floor(t / 60) % 24).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
