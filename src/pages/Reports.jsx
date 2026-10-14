import React, { useState } from 'react';
import { useStore } from '../state/store.jsx';
import { PageHeader, Pill, download } from '../components/ui.jsx';
import Icon from '../components/Icon.jsx';
import { atoText, atoCsv, readinessText, threatText, debriefText, auditJson } from '../engine/reports.js';
import { sha256 } from '../engine/sha256.js';
import { hhmm } from '../engine/engine.js';

const REPORTS = [
  { k: 'ato', title: 'Air Tasking Order — tasking sheet', desc: 'Mission-by-mission allocation of aircraft, crew and weapons with scores, status and the hard constraints enforced.', who: 'Squadron Ops · AOC Plans Cell', when: 'On every approved plan release', tag: 'Scheduled', build: atoText, file: 'ATO_tasking_sheet.txt' },
  { k: 'csv', title: 'Tasking plan — data export', desc: 'Machine-readable CSV with every factor score, for the planning cell or downstream systems.', who: 'AOC Plans Cell', when: 'On demand', tag: 'On-demand', build: (st) => { const t = atoCsv(st); return { text: t, hash: sha256(t) }; }, file: 'tasking_plan.csv', type: 'text/csv' },
  { k: 'ready', title: 'Fleet readiness report', desc: 'Serviceability forecast per airframe, crew duty & rest, and weapon stock — the inputs the optimiser used.', who: 'Engineering Wing · Squadron COs', when: 'Daily · 05:30', tag: 'Scheduled', build: readinessText, file: 'fleet_readiness.txt' },
  { k: 'threat', title: 'Threat & airspace brief', desc: 'Threat by sector with 8-period trend, weather minima, airspace status, NOTAMs and EW-pod requirements.', who: 'Air Commander · Intel cell', when: 'Every 2 hours', tag: 'Scheduled', build: threatText, file: 'threat_airspace_brief.txt' },
  { k: 'debrief', title: 'Debrief report', desc: 'Every event, re-plan (with before → after) and decision of the day, in order — for post-mission review.', who: 'Air Commander · DS faculty', when: 'End of flying day', tag: 'On-demand', build: debriefText, file: 'debrief_report.txt' },
  { k: 'audit', title: 'Audit dossier — hash-chained log', desc: 'JSON export of the tamper-evident decision log with each entry\'s previous and own SHA-256 hash.', who: 'Inspection / audit', when: 'On demand', tag: 'On-demand', build: auditJson, file: 'audit_dossier.json', type: 'application/json' },
];

export default function Reports() {
  const st = useStore();
  const [last, setLast] = useState({});
  const gen = (r) => {
    const out = r.build(st);
    download(r.file, out.text, r.type || 'text/plain');
    st.logReport(r.title, out.hash);
    setLast({ ...last, [r.k]: { hash: out.hash, at: hhmm(st.S.clock) } });
    st.toast(`${r.title} generated — sha256 ${out.hash.slice(0, 12)}…`);
  };
  return (
    <>
      <PageHeader title="Reports & Outputs" desc="One-click, hash-stamped outputs: the tasking sheet for squadrons, readiness and threat briefs, the day's debrief, and an audit dossier that proves the record was not altered."
        sources={['Optimiser', 'Decision log']} />
      <div className="grid g-2e">
        {REPORTS.map((r) => (
          <div key={r.k} className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--surface-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}><Icon name="file" size={18} /></span>
              <Pill tone={r.tag === 'Scheduled' ? 'neutral' : 'info'}>{r.tag}</Pill>
            </div>
            <h2 className="card-title">{r.title}</h2>
            <p className="sec" style={{ fontSize: 13.5, lineHeight: 1.5 }}>{r.desc}</p>
            <p className="muted" style={{ fontSize: 12.5, lineHeight: 1.6 }}>Recipients: {r.who}<br />{r.when}</p>
            <div className="btn-row" style={{ marginTop: 'auto' }}>
              <button className="btn" onClick={() => gen(r)}><Icon name="download" size={14} />Generate now</button>
              <span className="muted" style={{ fontSize: 12 }}>{last[r.k] ? <>sha256 <span className="mono">{last[r.k].hash.slice(0, 16)}…</span> · {last[r.k].at}</> : 'Hash-verified'}</span>
            </div>
          </div>
        ))}
      </div>
      <section className="card card-pad" style={{ marginTop: 18 }}>
        <h2 className="card-title">Live outputs in the console</h2>
        <p className="card-sub">The same outputs, interactive.</p>
        <div className="btn-row" style={{ marginTop: 14 }}>
          {[['tasking', 'Tasking sheet'], ['fleet', 'Fleet readiness board'], ['threat', 'Threat map'], ['retask', 'What-if simulator'], ['decisions', 'Decision log']].map(([p, l]) => (
            <button key={p} className="btn ghost" onClick={() => st.go(p)}>{l} →</button>
          ))}
        </div>
      </section>
    </>
  );
}
