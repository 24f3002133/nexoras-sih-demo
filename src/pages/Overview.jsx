import React, { useState } from 'react';
import { useStore } from '../state/store.jsx';
import { PageHeader, Kpi, Card, Seg, ScorePill, StatusPill, Bar, ThreatPill, FACTOR_COLORS, FactorLegend, rowProps } from '../components/ui.jsx';
import TheatreMap from '../components/TheatreMap.jsx';
import TimeScrubber from '../components/TimeScrubber.jsx';
import { planStats, readinessState, pServ, FACTORS } from '../engine/engine.js';

export { FACTOR_COLORS };

export function FactorStack({ parts, width = 140 }) {
  if (!parts) return <span className="muted">—</span>;
  return (
    <div style={{ display: 'flex', width, height: 8, borderRadius: 99, overflow: 'hidden', background: 'var(--surface-muted)' }} title={FACTORS.map((f) => `${f.label}: ${parts[f.key].toFixed(1)}`).join('\n')}>
      {FACTORS.map((f, i) => <i key={f.key} style={{ width: `${parts[f.key]}%`, background: FACTOR_COLORS[i] }} />)}
    </div>
  );
}

function FeedPanel() {
  const { S, degraded } = useStore();
  return (
    <Card title="Feed freshness" sub="7 operational feeds fused into the air picture. Pill = freshness limit; stale data is flagged, never silently used.">
      {S.feeds.map((f) => {
        const stale = f.age > f.max;
        const r = Math.min(1, f.age / f.max);
        return (
          <div key={f.id} style={{ display: 'grid', gridTemplateColumns: '1fr 110px 74px', gap: 12, alignItems: 'center', padding: '7px 0', fontSize: 13 }}>
            <span>{f.name}<span className="muted" style={{ fontSize: 11.5, display: 'block' }}>{f.src}</span></span>
            <Bar value={r} color={stale ? 'var(--risk-high)' : r > 0.7 ? 'var(--risk-med)' : 'var(--risk-clear)'} />
            <span className={stale ? 'c-high' : ''} style={{ fontSize: 12, fontWeight: 600, textAlign: 'right' }}>{stale ? `STALE ${f.age}m` : `${f.age}m / ≤${f.max}m`}</span>
          </div>
        );
      })}
      <p className="muted" style={{ fontSize: 11.5, marginTop: 8 }}>{degraded ? 'Link down — feeds ageing; optimiser running on last-known data.' : `${S.feeds.filter((f) => f.age <= f.max).length}/7 feeds fresh`}</p>
    </Card>
  );
}

function FleetMini() {
  const { S, settings, open, highlight, plan } = useStore();
  const changedAc = new Set(highlight.map((id) => plan[id] && plan[id].ac).filter(Boolean));
  return (
    <Card title="Fleet readiness" sub="P(serviceable) over the next 6 h from the readiness predictor.">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6 }}>
        {S.aircraft.map((a) => {
          const rs = readinessState(a, settings);
          const bg = rs === 'ready' ? 'var(--ready)' : rs === 'watch' ? 'var(--watch)' : 'var(--us)';
          return (
            <button key={a.id} onClick={() => open('aircraft', a.id)} title={`${a.id} · ${rs.toUpperCase()} · P=${Math.round(pServ(a) * 100)}%`}
              style={{ border: 'none', borderRadius: 6, padding: '7px 0', background: bg, color: rs === 'us' ? 'var(--text-secondary)' : '#fff', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'IBM Plex Mono, monospace', boxShadow: changedAc.has(a.id) ? '0 0 0 2px var(--changed)' : 'none' }}>
              {a.us ? '✕ ' : ''}{a.id.slice(3)}
            </button>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 14, marginTop: 12, fontSize: 11.5, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
        <span><span className="st-dot" style={{ background: 'var(--ready)' }} /> Ready</span>
        <span><span className="st-dot" style={{ background: 'var(--watch)' }} /> Watch</span>
        <span><span className="st-dot" style={{ background: 'var(--us)' }} /> U/S</span>
        <span><span className="st-dot" style={{ boxShadow: '0 0 0 2px var(--changed)' }} /> Retasked</span>
      </div>
    </Card>
  );
}

export default function Overview() {
  const st = useStore();
  const { S, plan, settings, highlight, open } = st;
  const k = planStats(S, settings, plan);
  const [sort, setSort] = useState('score');
  const rows = [...S.missions].sort((a, b) => {
    if (sort === 'pri') return b.pri - a.pri;
    if (sort === 'tot') return String(a.tot).localeCompare(String(b.tot));
    return (plan[b.id].score || -1) - (plan[a.id].score || -1);
  });
  const pending = S.missions.filter((m) => plan[m.id].status === 'proposed').length;
  return (
    <>
      <PageHeader title="Air Situation Overview" desc="One fused, real-time air picture — aircraft, crews, weapons, airspace, weather, threats and mission priorities — with the optimiser's current tasking plan and the commander's decisions." sources={['7 feeds', 'Optimiser', 'Decision log']} />
      <div className="kpis">
        <Kpi label="Aircraft ready" value={`${k.ready} / ${S.aircraft.length}`} sub={`${k.watch} watch · ${k.us} U/S`} />
        <Kpi label="Missions tasked" value={`${k.tasked} / ${k.total}`} sub={k.unfilled ? `${k.unfilled} unfilled · ${k.held} held` : 'all missions covered'} tone={k.unfilled ? 'high' : 'clear'} />
        <Kpi label="Awaiting approval" value={pending} sub={`${k.approved} approved`} tone={pending ? 'med' : 'clear'} />
        <Kpi label="High-threat sectors (≥60%)" value={k.highThreat} sub="EW pod required ≥ 80%" tone={k.highThreat ? 'high' : 'clear'} />
        <Kpi label="Avg. tasking score" value={Math.round(k.avgScore)} sub="0–100, explainable" tone="primary" />
        <Kpi label="Last re-plan" value={`${st.solveMs.toFixed(1)} ms`} sub="in-browser solver" />
      </div>
      <div className="grid g-2">
        <Card title="Theatre picture" sub="Sectors shaded by threat; aircraft fly their routes as the clock runs. Press ▶ Play day, or click a sector, route or aircraft to drill down." bodyClass="card-body">
          <TheatreMap height={360} />
          <TimeScrubber compact />
          <div className="sector-grid">
            {['A', 'B', 'C', 'D'].map((k2) => {
              const a = S.areas[k2];
              const n = S.missions.filter((m) => m.area === k2 && plan[m.id].ac).length;
              return (
                <button key={k2} onClick={() => open('sector', k2)} style={{ textAlign: 'left', border: '1px solid var(--border-color)', borderRadius: 8, padding: '10px 12px', background: 'var(--surface-subtle)', cursor: 'pointer', color: 'var(--text-primary)', minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}><b className="serif" style={{ fontSize: 15 }}>{a.name}</b><ThreatPill t={a.threat} /></div>
                  <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>{n} sortie{n === 1 ? '' : 's'} · weather {a.wx}{a.threat >= settings.ewThreshold ? ' · EW req.' : ''}</div>
                </button>
              );
            })}
          </div>
        </Card>
        <div style={{ display: 'grid', gap: 18, alignContent: 'start' }}>
          <FeedPanel />
          <FleetMini />
        </div>
      </div>
      <Card title="Today's tasking — ranked" sub={<>Every sortie with its allocation score and factor mix. Open a row to see why it was chosen and the next-best alternatives.<br /><FactorLegend /></>}
        right={<Seg options={[['score', 'Score'], ['pri', 'Priority'], ['tot', 'Time on target']]} value={sort} onChange={setSort} />} style={{ marginTop: 18 }} bodyClass="">
        <div className="tbl-wrap" style={{ marginTop: 12 }}>
          <table className="tbl">
            <thead><tr><th>#</th><th>Mission</th><th>Type · area</th><th>Aircraft · crew</th><th>TOT</th><th>Factor mix</th><th>Score</th><th>Sector threat</th><th>Status</th></tr></thead>
            <tbody>
              {rows.map((m, i) => {
                const r = plan[m.id];
                return (
                  <tr key={m.id} className={`click ${highlight.includes(m.id) ? 'changed' : ''}`} {...rowProps(() => open('mission', m.id))}>
                    <td className="muted">{i + 1}</td>
                    <td><div className="cell-main mono">{m.id}</div><div className="cell-sub">{m.desc}</div></td>
                    <td>{m.type} · {S.areas[m.area].name}<div className="cell-sub">Priority {m.pri} · {m.cfg}</div></td>
                    <td className="mono">{r.ac ? `${r.ac} · ${r.crew}` : <span className="c-high" style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12.5 }}>{r.reason}</span>}</td>
                    <td className="mono">{m.tot}</td>
                    <td><FactorStack parts={r.parts} width={120} /></td>
                    <td><ScorePill score={r.score} /></td>
                    <td><ThreatPill t={S.areas[m.area].threat} /></td>
                    <td><StatusPill r={r} changed={highlight.includes(m.id)} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
