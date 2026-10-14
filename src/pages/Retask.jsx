import React, { useMemo, useState } from 'react';
import { useStore } from '../state/store.jsx';
import { PageHeader, Card, Pill, ScorePill } from '../components/ui.jsx';
import Icon from '../components/Icon.jsx';
import { solve, diffPlans, planStats } from '../engine/engine.js';

function ChangeList({ changes, plan }) {
  if (!changes.length) return <p className="muted" style={{ fontSize: 13 }}>No sortie changed — the plan absorbed the change.</p>;
  return changes.map((c) => (
    <div key={c.id} className="alt" style={{ borderColor: 'var(--changed)' }}>
      <span className="mono" style={{ fontWeight: 600, color: 'var(--changed)' }}>{c.id}</span>
      <span className="mono" style={{ fontSize: 12.5 }}>{c.before} <b>→</b> {c.after}</span>
      <span>{plan && plan[c.id] && plan[c.id].score ? <ScorePill score={plan[c.id].score} /> : c.reason ? <Pill tone="high">{c.reason}</Pill> : null}</span>
    </div>
  ));
}

function WhatIf() {
  const st = useStore();
  const { S, plan, settings, can } = st;
  const [us, setUs] = useState([]);
  const [threat, setThreat] = useState(() => Object.fromEntries(['A', 'B', 'C', 'D'].map((k) => [k, S.areas[k].threat])));
  const [closed, setClosed] = useState([]);
  const dirty = us.length || closed.length || ['A', 'B', 'C', 'D'].some((k) => Math.abs(threat[k] - S.areas[k].threat) > 0.001);
  const preview = useMemo(() => {
    if (!dirty) return null;
    const T = structuredClone(S);
    for (const id of us) { const a = T.aircraft.find((x) => x.id === id); a.us = true; }
    for (const k of Object.keys(threat)) T.areas[k].threat = threat[k];
    for (const k of closed) T.areas[k].wx = 'closed';
    const r = solve(T, settings, plan);
    return { ...r, changes: diffPlans(T, plan, r.plan), stats: planStats(T, settings, r.plan) };
  }, [dirty, us, threat, closed, S, plan, settings]);
  const clear = () => { setUs([]); setClosed([]); setThreat(Object.fromEntries(['A', 'B', 'C', 'D'].map((k) => [k, S.areas[k].threat]))); };
  const toggle = (arr, set, v) => set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  return (
    <Card title="What-if simulator" sub="Test a change against the live plan without touching it. The optimiser re-solves a copy; commit only if you like the result."
      right={dirty ? <button className="link-btn" onClick={clear}>Clear</button> : null}>
      <div className="grid g-2e" style={{ marginTop: 0 }}>
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 8 }}>Take aircraft out of service</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {S.aircraft.filter((a) => !a.us).map((a) => (
              <button key={a.id} className={`pill ${us.includes(a.id) ? 'high' : 'neutral'}`} style={{ border: 'none', cursor: 'pointer', fontFamily: 'IBM Plex Mono, monospace' }} onClick={() => toggle(us, setUs, a.id)}>{us.includes(a.id) ? '✕ ' : ''}{a.id}</button>
            ))}
          </div>
          <div style={{ fontSize: 12.5, fontWeight: 600, margin: '16px 0 8px' }}>Close a sector for weather</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {['A', 'B', 'C', 'D'].map((k) => (
              <button key={k} disabled={S.areas[k].wx === 'closed'} className={`pill ${closed.includes(k) || S.areas[k].wx === 'closed' ? 'high' : 'neutral'}`} style={{ border: 'none', cursor: 'pointer' }} onClick={() => toggle(closed, setClosed, k)}>Sector {k}</button>
            ))}
          </div>
          <div style={{ fontSize: 12.5, fontWeight: 600, margin: '16px 0 4px' }}>Sector threat</div>
          {['A', 'B', 'C', 'D'].map((k) => (
            <label key={k} style={{ display: 'grid', gridTemplateColumns: '70px 1fr 44px', gap: 10, alignItems: 'center', fontSize: 12.5, padding: '3px 0' }}>
              <span>Sector {k}</span>
              <input type="range" min="0" max="1" step="0.05" value={threat[k]} onChange={(e) => setThreat({ ...threat, [k]: Number(e.target.value) })} aria-label={`Sector ${k} threat`} />
              <b className="right">{Math.round(threat[k] * 100)}%</b>
            </label>
          ))}
        </div>
        <div>
          {!preview && <div className="note info">Change something on the left to preview its ripple. Nothing is applied until you commit.</div>}
          {preview && (
            <>
              <div className="btn-row" style={{ justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13 }}><b>{preview.changes.length}</b> sortie{preview.changes.length === 1 ? '' : 's'} would change · solved in <b>{preview.ms.toFixed(1)} ms</b></span>
                <span className="sec" style={{ fontSize: 12.5 }}>{preview.stats.tasked}/{preview.stats.total} tasked · avg score {Math.round(preview.stats.avgScore)}</span>
              </div>
              <div style={{ marginTop: 8 }}><ChangeList changes={preview.changes} plan={preview.plan} /></div>
              <div className="btn-row" style={{ marginTop: 14 }}>
                <button className="btn" disabled={!can('whatif')} onClick={() => { st.commitWhatIf({ us, threat, closed }); clear(); }}>Commit to live plan</button>
                {!can('whatif') && <span className="muted" style={{ fontSize: 12 }}>Commander or AOC Planner only</span>}
              </div>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}

const EV_ICON = { snag: 'wrench', sam: 'radar', wx: 'cloud', tst: 'target' };

export default function Retask() {
  const st = useStore();
  const { S, plan, ripple, ripples, events, can, degraded, open } = st;
  return (
    <>
      <PageHeader title="Dynamic Retasking Console" desc="Inject real-world changes — a snag, a pop-up threat, weather, a new target — and watch the optimiser re-solve in milliseconds, moving only the affected sorties."
        sources={['Optimiser', 'Event feeds']}
        actions={<>
          <button className="btn ghost" onClick={st.resetScenario}><Icon name="refresh" size={14} />Reset scenario to 06:12</button>
          <button className="btn ghost" style={{ color: 'var(--risk-med)' }} onClick={st.toggleLink}><Icon name={degraded ? 'link' : 'unlink'} size={14} />{degraded ? 'Restore link' : 'Simulate link loss'}</button>
        </>} />
      <div className="grid g-4">
        {events.map((ev) => {
          const done = !!S.fired[ev.k];
          return (
            <div key={ev.k} className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 10, opacity: done ? 0.75 : 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--surface-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}><Icon name={EV_ICON[ev.k]} size={18} /></span>
                <Pill tone="neutral">{ev.feed}</Pill>
              </div>
              <div className="serif" style={{ fontSize: 16, fontWeight: 700 }}>{ev.title}</div>
              <div className="sec" style={{ fontSize: 12.5, flex: 1 }}>{ev.detail}</div>
              <button className="btn sm" disabled={done || !can('events') || degraded} onClick={() => st.fireEvent(ev.k)}>{done ? '✓ Injected' : 'Inject event'}</button>
            </div>
          );
        })}
      </div>
      {(!can('events') || degraded) && <p className="muted" style={{ fontSize: 12.5, marginTop: 10 }}>{degraded ? 'Event feeds are offline while the link is down — restore the link to receive events.' : `Event injection is for the Air Commander and AOC Planner. You are signed in as ${st.user.title}.`}</p>}

      <div className="grid g-2">
        <Card title="Last re-plan" sub="Before → after for every sortie that moved. Everything else stayed put (minimal-disruption bonus)." className={ripple ? 'tinted-change' : ''}>
          {!ripple && <div className="note info">Inject an event above. Suggested demo: <b>Snag on M-02 strike aircraft</b> — only M-02 should move (FX-08 → FX-05, score 83).</div>}
          {ripple && (
            <>
              <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'baseline' }}>
                <span className="serif" style={{ fontSize: 34, fontWeight: 700, color: 'var(--changed)' }}>{ripple.ms.toFixed(1)} ms</span>
                <span className="sec" style={{ fontSize: 13 }}>{ripple.changes.length} changed · {ripple.unchanged} unchanged · at {ripple.at}</span>
              </div>
              <p style={{ fontSize: 13.5, margin: '6px 0 10px' }}><b>{ripple.cause}</b>{ripple.detail ? ` — ${ripple.detail}` : ''}</p>
              <ChangeList changes={ripple.changes} plan={plan} />
              {ripple.changes[0] && <button className="btn modify sm" style={{ marginTop: 12 }} onClick={() => open('mission', ripple.changes[0].id)}>Review {ripple.changes[0].id} for approval</button>}
            </>
          )}
        </Card>
        <Card title="Retask history" sub="Every re-plan this session, newest first.">
          {ripples.length === 0 && <p className="muted" style={{ fontSize: 13 }}>No re-plans yet.</p>}
          {ripples.map((r, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '54px 1fr auto', gap: 10, padding: '9px 0', borderBottom: '1px solid var(--border-color)', fontSize: 13 }}>
              <span className="mono muted">{r.at}</span>
              <span>{r.cause}<span className="muted" style={{ display: 'block', fontSize: 12 }}>{r.baseline ? r.detail : r.changes.map((c) => c.id).join(', ') || 'no sortie moved'}</span></span>
              <span className="mono" style={{ fontSize: 12 }}>{r.ms.toFixed(1)} ms</span>
            </div>
          ))}
        </Card>
      </div>
      <div style={{ marginTop: 18 }}><WhatIf key={S.clock} /></div>
    </>
  );
}
