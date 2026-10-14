import React from 'react';
import { useStore } from '../state/store.jsx';
import { PageHeader, Kpi, Card, Pill, Bar, rowProps } from '../components/ui.jsx';
import { pServ, pct, readinessState, planStats } from '../engine/engine.js';
import { TYPE_NAME } from '../engine/scenario.js';

export default function Fleet() {
  const st = useStore();
  const { S, plan, settings, open, can, highlight } = st;
  const k = planStats(S, settings, plan);
  const taskOf = (acId) => Object.entries(plan).find(([, r]) => r.ac === acId);
  const crewTask = (cId) => Object.entries(plan).find(([, r]) => r.crew === cId);
  const changedAc = new Set(highlight.map((id) => plan[id] && plan[id].ac).filter(Boolean));
  const alloc = {};
  for (const m of S.missions) if (plan[m.id].ac) alloc[m.cfg] = (alloc[m.cfg] || 0) + 1;
  const sortiesOf = (acId) => S.missions.filter((m) => plan[m.id].ac === acId);
  return (
    <>
      <PageHeader title="Fleet & Crew Readiness" desc="Serviceability forecast for every airframe, crew duty and rest state, and weapon stock — the inputs the optimiser is allowed to use. Maintenance and squadron updates re-plan instantly."
        sources={['Maint. log', 'Duty roster', 'Armament']} />
      <div className="kpis">
        <Kpi label="Ready" value={k.ready} tone="clear" sub={`of ${S.aircraft.length} airframes`} />
        <Kpi label="Watch" value={k.watch} tone="med" sub={`P(serviceable) < ${Math.round(settings.watchBelow * 100)}%`} />
        <Kpi label="Unserviceable" value={k.us} tone="high" sub="excluded from tasking" />
        <Kpi label="Fleet readiness" value={pct(k.avgReady)} sub="mean P(serviceable, 6 h)" tone="primary" />
        <Kpi label="Crews tasked" value={`${S.crews.length - k.crewsFree} / ${S.crews.length}`} sub={`${k.crewsFree} spare · duty limits enforced`} />
      </div>
      <Card title="Aircraft serviceability board" sub="Readiness predictor output per tail. Click a tile for the model breakdown; maintenance can report a change." style={{ marginTop: 18 }}
        right={!can('maint') ? <span className="muted" style={{ fontSize: 12 }}>Maintenance role can update serviceability</span> : null}>
        <div className="tiles">
          {S.aircraft.map((a) => {
            const rs = readinessState(a, settings);
            const t = taskOf(a.id);
            const p = pServ(a);
            return (
              <div key={a.id} className={`tile ${changedAc.has(a.id) ? 'changed' : ''}`} style={{ opacity: a.us ? 0.8 : 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button className="link-btn tile-id" style={{ color: 'var(--text-primary)', fontSize: 15, fontWeight: 600 }} onClick={() => open('aircraft', a.id)}>{a.us ? '✕ ' : ''}{a.id}</button>
                  <Pill tone={rs === 'ready' ? 'clear' : rs === 'watch' ? 'med' : 'high'} dot>{rs === 'us' ? 'U/S' : rs}</Pill>
                </div>
                <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{TYPE_NAME[a.type]} · {a.sqn}{a.ew ? ' · EW' : ''}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 10 }}><span className="sec">P(srv, 6 h)</span><b>{pct(p)}</b></div>
                <Bar value={p} color={rs === 'ready' ? 'var(--ready)' : rs === 'watch' ? 'var(--watch)' : 'var(--us)'} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 8 }} className="sec"><span>{a.hrs} h to insp.</span><span>{a.snags} snag{a.snags === 1 ? '' : 's'}</span></div>
                <div style={{ fontSize: 12, marginTop: 8, minHeight: 18 }}>
                  {t ? sortiesOf(a.id).map((m) => <button key={m.id} className="link-btn" style={{ display: 'block', color: changedAc.has(a.id) ? 'var(--changed)' : 'var(--primary)', fontWeight: 600 }} onClick={() => open('mission', m.id)}>→ {m.id} · {plan[m.id].crew}{plan[m.id].wave === 2 ? ' (2nd)' : ''}</button>)
                    : <span className="muted">{a.us ? (a.note || 'Unserviceable') : 'Spare'}</span>}
                </div>
                {can('maint') && <button className={`btn sm ${a.us ? 'approve' : 'ghost'}`} style={{ marginTop: 10, width: '100%' }} onClick={() => st.toggleUS(a.id)}>{a.us ? 'Mark serviceable' : 'Report U/S'}</button>}
              </div>
            );
          })}
        </div>
      </Card>
      <div className="grid g-2">
        <Card title="Crew duty & rest" sub="Qualifications, remaining duty hours and rest state. Duty limits are hard constraints." bodyClass=""
          right={!can('crew') ? <span className="muted" style={{ fontSize: 12 }}>Squadron Ops can update</span> : null}>
          <div className="tbl-wrap" style={{ marginTop: 12 }}>
            <table className="tbl">
              <thead><tr><th>Callsign</th><th>Qualified for</th><th>Duty left</th><th>Rest</th><th>Tasked</th></tr></thead>
              <tbody>
                {S.crews.map((c) => {
                  const t = crewTask(c.id);
                  return (
                    <tr key={c.id}>
                      <td className="mono cell-main"><button className="link-chip mono" onClick={() => open('crew', c.id)}>{c.id}</button></td>
                      <td style={{ fontSize: 12.5 }}>{c.q.join(' · ')}</td>
                      <td>
                        {can('crew') ? (
                          <span className="btn-row" style={{ gap: 6 }}>
                            <button className="btn ghost sm" style={{ padding: '2px 8px' }} onClick={() => st.setDuty(c.id, Math.max(0, c.duty - 1))} aria-label={`Reduce duty hours for ${c.id}`}>−</button>
                            <b>{c.duty} h</b>
                            <button className="btn ghost sm" style={{ padding: '2px 8px' }} onClick={() => st.setDuty(c.id, Math.min(12, c.duty + 1))} aria-label={`Increase duty hours for ${c.id}`}>+</button>
                          </span>
                        ) : <b>{c.duty} h</b>}
                      </td>
                      <td>
                        {can('crew') ? <button className={`pill ${c.rested ? 'clear' : 'med'}`} style={{ border: 'none', cursor: 'pointer' }} onClick={() => st.toggleRest(c.id)}>{c.rested ? 'Rested' : 'Not rested'} ⇄</button>
                          : <Pill tone={c.rested ? 'clear' : 'med'}>{c.rested ? 'Rested' : 'Not rested'}</Pill>}
                      </td>
                      <td>{t ? S.missions.filter((m) => plan[m.id].crew === c.id).map((m) => <button key={m.id} className="link-btn mono" style={{ color: 'var(--primary)', fontWeight: 600, marginRight: 8 }} onClick={() => open('mission', m.id)}>{m.id}</button>) : <span className="muted">Spare</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
        <div style={{ display: 'grid', gap: 18, alignContent: 'start' }}>
          <Card title="Weapon stock" sub="Configuration in stock vs. allocated by the current plan.">
            {Object.entries(S.stock).map(([cfg, n]) => (
              <div key={cfg} style={{ padding: '8px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}><b>{cfg}</b><span className="sec">{alloc[cfg] || 0} allocated / {n} in stock</span></div>
                <Bar value={n ? (alloc[cfg] || 0) / n : 0} color={(alloc[cfg] || 0) >= n ? 'var(--risk-med)' : 'var(--primary)'} height={8} />
              </div>
            ))}
            <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>If a configuration runs out, the lowest-priority mission is left unfilled with the reason shown.</p>
          </Card>
          <Card title="Readiness model" sub="Prototype predictor, trained on simulated maintenance & snag history.">
            <p style={{ fontSize: 13, lineHeight: 1.6 }} className="sec">P(serviceable, 6 h) = σ(3.2 − 0.25·snags − penalty), where the penalty grows when fewer than 10 h remain to the next inspection. Airframes below {Math.round(settings.watchBelow * 100)}% are flagged <b>Watch</b>; U/S airframes are excluded from the optimiser.</p>
          </Card>
        </div>
      </div>
    </>
  );
}
