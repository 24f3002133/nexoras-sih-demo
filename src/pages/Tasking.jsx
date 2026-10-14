import React, { useState } from 'react';
import { useStore } from '../state/store.jsx';
import { PageHeader, Kpi, Card, ScorePill, StatusPill, download, rowProps, FactorLegend } from '../components/ui.jsx';
import { planStats } from '../engine/engine.js';
import { MISSION_TYPES } from '../engine/scenario.js';
import { atoCsv } from '../engine/reports.js';
import { FactorStack } from './Overview.jsx';

export default function Tasking() {
  const st = useStore();
  const { S, plan, settings, highlight, open, can } = st;
  const k = planStats(S, settings, plan);
  const [q, setQ] = useState('');
  const [area, setArea] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const rows = S.missions.filter((m) => {
    const r = plan[m.id];
    const hay = `${m.id} ${m.desc} ${r.ac || ''} ${r.crew || ''}`.toLowerCase();
    return (!q || hay.includes(q.toLowerCase())) && (!area || m.area === area) && (!type || m.type === type) && (!status || r.status === status);
  });
  const any = q || area || type || status;
  return (
    <>
      <PageHeader title="Air Tasking Plan" desc="The optimiser's allocation of aircraft, crews and weapons to every prioritised mission under hard constraints — each line explainable and awaiting commander approval."
        sources={['Optimiser', 'HQ tasking']}
        actions={<>
          <button className="btn ghost" onClick={() => { download('tasking_plan.csv', atoCsv(st), 'text/csv'); st.toast('Tasking plan exported as CSV'); }}>Export CSV ({S.missions.length})</button>
          {can('decide') && <button className="btn approve" disabled={!S.missions.some((m) => plan[m.id].status === 'proposed')} onClick={st.approveAll}>Approve all proposed</button>}
        </>} />
      <div className="kpis">
        <Kpi label="Missions" value={k.total} sub="from HQ tasking" />
        <Kpi label="Tasked" value={k.tasked} tone="clear" sub={`${Math.round((k.tasked / k.total) * 100)}% coverage`} />
        <Kpi label="Approved" value={k.approved} tone="primary" sub="released to squadrons" />
        <Kpi label="Unfilled / held" value={`${k.unfilled} / ${k.held}`} tone={k.unfilled + k.held ? 'high' : undefined} sub="reasons shown, never hidden" />
      </div>
      <section className="card" style={{ marginTop: 18 }}>
        <div className="filters">
          <input className="input" placeholder="Search mission, aircraft or crew…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search" />
          <select className="select" value={area} onChange={(e) => setArea(e.target.value)} aria-label="Sector"><option value="">All sectors</option>{Object.entries(S.areas).map(([k2, a]) => <option key={k2} value={k2}>{a.name}</option>)}</select>
          <select className="select" value={type} onChange={(e) => setType(e.target.value)} aria-label="Mission type"><option value="">All mission types</option>{MISSION_TYPES.map((t) => <option key={t}>{t}</option>)}</select>
          <select className="select" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status"><option value="">All statuses</option><option value="proposed">Proposed</option><option value="approved">Approved</option><option value="held">On hold</option><option value="unfilled">Unfilled</option></select>
          {any && <button className="link-btn" onClick={() => { setQ(''); setArea(''); setType(''); setStatus(''); }}>Clear filters</button>}
          <span className="muted" style={{ fontSize: 12.5, marginLeft: 'auto' }}>{rows.length} results</span>
        </div>
      </section>
      <Card style={{ marginTop: 18 }} bodyClass="">
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th>Mission</th><th>Type · priority</th><th>Area · TOT</th><th>Aircraft</th><th>Crew</th><th>Factor mix</th><th>Score</th><th>Status</th>{can('decide') && <th />}</tr></thead>
            <tbody>
              {rows.map((m) => {
                const r = plan[m.id];
                return (
                  <tr key={m.id} className={`click ${highlight.includes(m.id) ? 'changed' : ''}`} {...rowProps(() => open('mission', m.id))}>
                    <td><div className="cell-main mono">{m.id}</div><div className="cell-sub">{m.desc}</div></td>
                    <td>{m.type}<div className="cell-sub">Priority {m.pri} · {m.cfg}</div></td>
                    <td>{S.areas[m.area].name}<div className="cell-sub">TOT {m.tot} · {m.dur} h</div></td>
                    <td className="mono">{r.ac || '—'}</td>
                    <td className="mono">{r.crew || '—'}</td>
                    <td>{r.parts ? <FactorStack parts={r.parts} width={110} /> : <span className="c-high" style={{ fontSize: 12.5 }}>{r.reason}</span>}</td>
                    <td><ScorePill score={r.score} /></td>
                    <td><StatusPill r={r} changed={highlight.includes(m.id)} /></td>
                    {can('decide') && <td onClick={(e) => e.stopPropagation()}>{r.status === 'proposed' && <button className="btn approve sm" onClick={() => st.approve(m.id)}>Approve</button>}</td>}
                  </tr>
                );
              })}
              {rows.length === 0 && <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40 }} className="muted">No missions match these filters.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
      <p className="muted" style={{ fontSize: 12, marginTop: 12, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>Factor mix: <FactorLegend /> · hover a bar for the exact points.</p>
    </>
  );
}
