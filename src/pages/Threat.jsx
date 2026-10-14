import React from 'react';
import { useStore } from '../state/store.jsx';
import { PageHeader, Kpi, Card, ThreatPill, Pill, Bar, threatTone, rowProps } from '../components/ui.jsx';
import TheatreMap from '../components/TheatreMap.jsx';
import { pct } from '../engine/engine.js';

const LINE = { A: '#1b3a6b', B: '#4f7fc0', C: '#b4213d', D: '#9a6a0e' };

function TrendChart() {
  const { S, settings } = useStore();
  const W = 640, H = 260, L = 44, R = 60, T = 16, B = 30;
  const x = (i) => L + (i / 7) * (W - L - R);
  const y = (v) => T + (1 - v) * (H - T - B);
  const periods = ['T-7', 'T-6', 'T-5', 'T-4', 'T-3', 'T-2', 'T-1', 'Now'];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Threat trend by sector over 8 periods">
      {[0, 0.25, 0.5, 0.75, 1].map((v) => (
        <g key={v}>
          <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="var(--border-color)" />
          <text x={L - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill="var(--text-muted)">{v * 100}%</text>
        </g>
      ))}
      <line x1={L} x2={W - R} y1={y(settings.ewThreshold)} y2={y(settings.ewThreshold)} stroke="var(--risk-high)" strokeDasharray="5 4" />
      <text x={W - R + 4} y={y(settings.ewThreshold) + 4} fontSize="10.5" fill="var(--risk-high)">EW req.</text>
      {periods.map((p, i) => <text key={p} x={x(i)} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--text-muted)">{p}</text>)}
      {Object.entries(S.threatHistory).map(([k, d]) => (
        <g key={k}>
          <polyline points={d.map((v, i) => `${x(i)},${y(v)}`).join(' ')} fill="none" stroke={LINE[k]} strokeWidth="2.2" strokeLinejoin="round" />
          {d.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r="2.6" fill={LINE[k]} />)}
          <text x={x(7) + 8} y={y(d[7]) + 4} fontSize="12" fontWeight="700" fill={LINE[k]}>{k} {Math.round(d[7] * 100)}%</text>
        </g>
      ))}
    </svg>
  );
}

export default function Threat() {
  const { S, plan, settings, open } = useStore();
  const sectors = ['A', 'B', 'C', 'D'];
  const tasked = S.missions.filter((m) => plan[m.id].ac && m.area !== 'H');
  return (
    <>
      <PageHeader title="Threat & Airspace" desc="Threat-risk scoring by sector from the fused air picture, with weather minima, airspace status and NOTAMs — the hard limits every sortie is checked against."
        sources={['Threat picture', 'Met', 'NOTAM']} />
      <div className="kpis">
        {sectors.map((k) => {
          const a = S.areas[k];
          return <Kpi key={k} label={`${a.name}`} value={pct(a.threat)} tone={threatTone(a.threat)} sub={`${a.wx === 'closed' ? 'Weather closed' : 'Weather ' + a.wx} · ${a.threat >= settings.ewThreshold ? 'EW pod required' : 'EW not required'}`} />;
        })}
      </div>
      <div className="grid g-2e">
        <Card title="Threat trend by sector" sub="8-period history from the threat picture feed. Dashed line = EW-pod threshold set in Settings."><TrendChart /></Card>
        <Card title="Theatre picture" sub="Click a sector for its threat breakdown."><TheatreMap height={300} compact /></Card>
      </div>
      <Card title="Airspace, weather & NOTAM status" sub="Hard limits checked for every sortie — a closed sector is never tasked." style={{ marginTop: 18 }} bodyClass="">
        <div className="tbl-wrap" style={{ marginTop: 12 }}>
          <table className="tbl">
            <thead><tr><th>Sector</th><th>Threat</th><th>Weather</th><th>Airspace</th><th>NOTAM</th><th>EW pod</th><th>Missions</th></tr></thead>
            <tbody>
              {Object.entries(S.areas).map(([k, a]) => (
                <tr key={k} className={k !== 'H' ? 'click' : ''} {...(k !== 'H' ? rowProps(() => open('sector', k)) : {})}>
                  <td className="cell-main">{a.name}</td>
                  <td><ThreatPill t={a.threat} /></td>
                  <td><Pill tone={a.wx === 'open' ? 'clear' : a.wx === 'marginal' ? 'med' : 'high'}>{a.wx}</Pill></td>
                  <td><Pill tone={a.air === 'open' ? 'clear' : 'high'}>{a.air}</Pill></td>
                  <td style={{ fontSize: 12.5 }}>{a.notam}</td>
                  <td>{a.threat >= settings.ewThreshold ? <Pill tone="high">Required</Pill> : <span className="muted">—</span>}</td>
                  <td className="mono" style={{ fontSize: 12.5 }}>{S.missions.filter((m) => m.area === k).map((m) => m.id).join(', ') || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Card title="Exposure by tasked sortie" sub="Sector threat × (0.7 if the aircraft carries an EW pod). Lower exposure earns more of the 15-point threat factor." style={{ marginTop: 18 }}>
        {tasked.map((m) => {
          const r = plan[m.id];
          const a = S.aircraft.find((x) => x.id === r.ac);
          return (
            <div key={m.id} className="exp-row" {...rowProps(() => open('mission', m.id))}>
              <span className="mono" style={{ fontWeight: 600 }}>{m.id}</span>
              <Bar value={r.exposure} color={r.exposure >= 0.6 ? 'var(--risk-high)' : r.exposure >= 0.4 ? 'var(--risk-med)' : 'var(--risk-clear)'} height={8} />
              <span className="sec">{r.ac} · {S.areas[m.area].name}{a && a.ew ? ' · EW' : ''}</span>
              <b className="right">{pct(r.exposure)}</b>
            </div>
          );
        })}
      </Card>
    </>
  );
}
