import { baseScenario, DEFAULT_SETTINGS, applyEvent, EVENTS } from '../src/engine/scenario.js';
import { solve, diffPlans, planStats } from '../src/engine/engine.js';
const S = baseScenario(), st = DEFAULT_SETTINGS;
let { plan, ms } = solve(S, st, {});
const show = (p) => S.missions.map((m) => `${m.id} ${p[m.id].ac || '-'} ${p[m.id].crew || p[m.id].reason || ''} ${p[m.id].score ? Math.round(p[m.id].score) : ''}`).join('\n');
console.log('BASELINE', ms.toFixed(2) + 'ms\n' + show(plan));
console.log(planStats(S, st, plan));
for (const ev of EVENTS) {
  const before = plan; applyEvent(S, ev.k, plan);
  const r = solve(S, st, before); plan = r.plan;
  console.log(`\n== ${ev.k} (${r.ms.toFixed(2)} ms) changes:`, diffPlans(S, before, plan));
}
console.log('\nFINAL\n' + show(plan));

// turnaround demo: ground 3 airframes
const T = baseScenario();
for (const id of ['FX-01', 'FX-02', 'FX-07']) T.aircraft.find((a) => a.id === id).us = true;
const r2 = solve(T, st, {});
console.log('\nGROUNDED 3:', T.missions.map((m) => `${m.id}:${r2.plan[m.id].ac || '-'}${r2.plan[m.id].wave === 2 ? '(w2)' : ''}`).join(' '), r2.ms.toFixed(2) + 'ms');
