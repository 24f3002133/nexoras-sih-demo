import { hhmm, pServ, readinessState, pct, FACTORS } from './engine.js';
import { TYPE_NAME } from './scenario.js';
import { sha256 } from './sha256.js';

const line = (n = 72, ch = '=') => ch.repeat(n);
const pad = (s, n) => String(s).padEnd(n).slice(0, n);

function header(st, title) {
  return [
    line(),
    `AIR POWER OPS CONSOLE — ${title.toUpperCase()}`,
    'SIH 2026 prototype · PS SIH26250 · SIMULATED DATA — NOT FOR OPERATIONAL USE',
    `Generated ${hhmm(st.S.clock)} hrs by ${st.user ? `${st.user.title} (${st.user.name})` : 'system'}`,
    line(),
    '',
  ];
}
function footer(body) {
  const h = sha256(body);
  return { text: `${body}\n${line(72, '-')}\nSHA-256: ${h}\n`, hash: h };
}

export function atoText(st) {
  const { S, plan } = st;
  const L = header(st, 'Air Tasking Order (tasking sheet)');
  L.push(`${pad('MSN', 6)}${pad('TYPE', 8)}${pad('PRI', 5)}${pad('AREA', 6)}${pad('TOT', 7)}${pad('ACFT', 8)}${pad('CREW', 9)}${pad('CFG', 7)}${pad('SCORE', 7)}STATUS`);
  L.push(line(72, '-'));
  for (const m of S.missions) {
    const r = plan[m.id];
    L.push(`${pad(m.id, 6)}${pad(m.type, 8)}${pad(m.pri, 5)}${pad(m.area, 6)}${pad(m.tot, 7)}${pad(r.ac || '—', 8)}${pad(r.crew || '—', 9)}${pad(m.cfg, 7)}${pad(r.score ? Math.round(r.score) : '—', 7)}${r.status.toUpperCase()}${r.reason ? ' (' + r.reason + ')' : ''}`);
  }
  L.push('', 'Hard constraints enforced: role fit · crew duty limits · maintenance due · weapon stock · airspace open · weather minima · EW pod above threat threshold.');
  L.push('Every tasking requires commander approval before release.');
  return footer(L.join('\n'));
}
export function atoCsv(st) {
  const { S, plan } = st;
  const rows = [['mission', 'type', 'priority', 'area', 'tot', 'aircraft', 'crew', 'config', 'score', 'status', 'reason', ...FACTORS.map((f) => f.key)]];
  for (const m of S.missions) {
    const r = plan[m.id];
    rows.push([m.id, m.type, m.pri, m.area, m.tot, r.ac || '', r.crew || '', m.cfg, r.score ? r.score.toFixed(1) : '', r.status, r.reason || '', ...FACTORS.map((f) => (r.parts ? r.parts[f.key].toFixed(1) : ''))]);
  }
  return rows.map((r) => r.map((c) => (String(c).includes(',') ? `"${c}"` : c)).join(',')).join('\n');
}
export function readinessText(st) {
  const { S, plan, settings } = st;
  const L = header(st, 'Fleet readiness report');
  L.push(`${pad('ACFT', 8)}${pad('TYPE', 18)}${pad('SQN', 8)}${pad('STATE', 8)}${pad('P(SRV 6H)', 11)}${pad('HRS', 6)}${pad('SNAGS', 7)}${pad('EW', 4)}TASKED`);
  L.push(line(72, '-'));
  for (const a of S.aircraft) {
    const m = Object.entries(plan).find(([, r]) => r.ac === a.id);
    L.push(`${pad(a.id, 8)}${pad(TYPE_NAME[a.type], 18)}${pad(a.sqn, 8)}${pad(readinessState(a, settings).toUpperCase(), 8)}${pad(pct(pServ(a)), 11)}${pad(a.hrs, 6)}${pad(a.snags, 7)}${pad(a.ew ? 'Y' : '-', 4)}${m ? m[0] : '—'}${a.note ? '  [' + a.note + ']' : ''}`);
  }
  L.push('', 'Crew', line(72, '-'));
  for (const c of S.crews) {
    const m = Object.entries(plan).find(([, r]) => r.crew === c.id);
    L.push(`${pad(c.id, 9)}${pad(c.q.join('/'), 28)}${pad(c.duty + ' h left', 11)}${pad(c.rested ? 'rested' : 'NOT rested', 12)}${m ? m[0] : '—'}`);
  }
  L.push('', `Weapon stock: A2A ${S.stock.A2A} · PGM ${S.stock.PGM} · RECCE ${S.stock.RECCE}`);
  return footer(L.join('\n'));
}
export function threatText(st) {
  const { S, settings } = st;
  const L = header(st, 'Threat & airspace brief');
  for (const [k, a] of Object.entries(S.areas)) {
    L.push(`${pad(a.name, 12)} threat ${pad(pct(a.threat), 5)} weather ${pad(a.wx, 9)} airspace ${pad(a.air, 7)} EW pod ${a.threat >= settings.ewThreshold ? 'REQUIRED' : 'not req.'}   NOTAM: ${a.notam}`);
    if (S.threatHistory[k]) L.push(`${' '.repeat(12)} trend (8 periods): ${S.threatHistory[k].map((v) => Math.round(v * 100)).join(' → ')}`);
  }
  return footer(L.join('\n'));
}
export function debriefText(st) {
  const { log, ripples } = st;
  const L = header(st, 'Debrief report — events, retasks and decisions');
  L.push(`Retask events: ${ripples.length}`);
  for (const r of [...ripples].reverse()) {
    L.push(`  [${r.at}] ${r.cause}${r.detail ? ' — ' + r.detail : ''} · solved in ${r.ms.toFixed(1)} ms · ${r.changes.length} changed / ${r.unchanged} unchanged`);
    for (const c of r.changes) L.push(`      ${c.id}: ${c.before} → ${c.after}${c.reason ? ' (' + c.reason + ')' : ''}`);
  }
  L.push('', 'Decision & event log', line(72, '-'));
  for (const e of log) L.push(`#${pad(e.seq, 4)} ${e.t}  ${pad(e.kind, 9)} ${pad(e.actor, 26)} ${e.text}`);
  return footer(L.join('\n'));
}
export function auditJson(st) {
  const body = JSON.stringify({
    product: 'Air Power Ops Console (SIH 2026 prototype, simulated data)',
    generated: hhmm(st.S.clock),
    chain: 'sha256(prev|seq|t|kind|actor|text)',
    entries: st.log.map(({ seq, t, kind, actor, text, prev, hash }) => ({ seq, t, kind, actor, text, prev, hash })),
  }, null, 2);
  return { text: body, hash: sha256(body) };
}
