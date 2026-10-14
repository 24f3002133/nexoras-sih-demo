import React, { useState } from 'react';
import { useStore } from '../state/store.jsx';
import { Pill, StatusPill, ThreatPill, Bar, ModalFrame, FACTOR_COLORS, scoreWord } from './ui.jsx';
import { FACTORS, alternatives, constraintReport, pServ, pct, readinessState, hhmm } from '../engine/engine.js';
import { TYPE_NAME } from '../engine/scenario.js';

export default function MissionModal({ id }) {
  const st = useStore();
  const { S, plan, settings, highlight, ripple, can, open } = st;
  const m = S.missions.find((x) => x.id === id);
  const [mode, setMode] = useState(null); // 'modify' | 'hold'
  const [pick, setPick] = useState(0);
  const [reason, setReason] = useState('Await updated intelligence');
  if (!m) return null;
  const r = plan[m.id];
  const ar = S.areas[m.area];
  const a = r.ac ? S.aircraft.find((x) => x.id === r.ac) : null;
  const c = r.crew ? S.crews.find((x) => x.id === r.crew) : null;
  const alts = alternatives(S, settings, plan, m.id, 3);
  const checks = constraintReport(S, settings, m, plan);
  const ripChange = ripple && ripple.changes.find((x) => x.id === m.id);
  const W = settings.weights;
  const decide = can('decide');
  const otherSorties = (key, v) => S.missions.filter((x) => x.id !== m.id && plan[x.id][key] === v);

  return (
    <ModalFrame label={`Mission ${m.id}`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span className="mono" style={{ fontWeight: 600, fontSize: 13 }}>{m.id}</span>
            <Pill tone="info">{m.type}</Pill>
            <Pill tone="neutral">Priority {m.pri}</Pill>
            {r.wave === 2 && <Pill tone="neutral">2nd sortie (turnaround)</Pill>}
            <StatusPill r={r} changed={highlight.includes(m.id)} />
          </div>
          <h2 className="modal-title">{m.desc}</h2>
          <p className="sec" style={{ fontSize: 14, marginTop: 4 }}>
            <button className="link-chip" onClick={() => open('sector', m.area)} disabled={m.area === 'H'}>{ar.name}</button> · TOT {m.tot} · airborne {hhmm(r.start)}–{hhmm(r.end)} · {m.cfg} configuration
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="muted" style={{ fontSize: 12 }}>Allocation score</div>
          <div className="serif" style={{ fontSize: 44, fontWeight: 700, lineHeight: 1.05 }}>
            <span className={r.score ? 'c-primary' : 'c-high'}>{r.score ? Math.round(r.score) : '—'}</span><span className="muted" style={{ fontSize: 20 }}>/100</span>
          </div>
          <div className="muted" style={{ fontSize: 12 }}>{r.score ? `${scoreWord(r.score)} · ` : ''}{checks.filter((x) => x.ok).length}/{checks.length} hard constraints satisfied</div>
        </div>
      </div>

      {(decide || r.status === 'held') && (
        <div className="btn-row" style={{ marginTop: 18 }}>
          {r.status === 'held' ? (
            <button className="btn approve" disabled={!decide} onClick={() => st.release(m.id)}>Release hold</button>
          ) : (
            <>
              <button className="btn approve glow" disabled={!decide || !r.ac || r.status === 'approved'} onClick={() => st.approve(m.id)}>{r.status === 'approved' ? '✓ Approved' : 'Approve'}</button>
              <button className={`btn ${mode === 'modify' ? 'modify' : 'ghost'}`} style={mode === 'modify' ? {} : { color: 'var(--act-modify)', borderColor: 'var(--act-modify)' }} disabled={!decide || !alts.length} onClick={() => setMode(mode === 'modify' ? null : 'modify')}>Modify…</button>
              <button className={`btn ${mode === 'hold' ? 'hold' : 'ghost'}`} style={mode === 'hold' ? {} : { color: 'var(--act-hold)', borderColor: 'var(--act-hold)' }} disabled={!decide} onClick={() => setMode(mode === 'hold' ? null : 'hold')}>Hold…</button>
            </>
          )}
        </div>
      )}
      {!decide && <p className="muted" style={{ fontSize: 12.5, marginTop: 14 }}>Only the Air Commander can approve, modify or hold. You are signed in as {st.user.title} — switch role from the sidebar to try it.</p>}
      {mode === 'modify' && alts[pick] && (
        <div className="note info" style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <span>Pick an alternative below, then</span>
          <button className="btn modify sm" onClick={() => { const o = alts[pick]; st.modify(m.id, o.ac, o.crew); setMode(null); }}>Modify to {alts[pick].ac} / {alts[pick].crew}</button>
          <span>The optimiser re-solves the rest of the plan around your choice.</span>
        </div>
      )}
      {mode === 'hold' && (
        <div className="note" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', background: 'color-mix(in srgb, var(--act-hold) 12%, transparent)', color: 'var(--act-hold)' }}>
          <label htmlFor="hold-reason">Reason</label>
          <input id="hold-reason" className="input" style={{ flex: 1, minWidth: 200 }} value={reason} onChange={(e) => setReason(e.target.value)} />
          <button className="btn hold sm" onClick={() => { st.hold(m.id, reason); setMode(null); }}>Hold mission</button>
        </div>
      )}
      {ripChange && (
        <div className="note change"><b>Retasked at {ripple.at}</b> after “{ripple.cause}”: {ripChange.before} → {ripChange.after}. Re-solved in {ripple.ms.toFixed(1)} ms; {ripple.unchanged} other sortie{ripple.unchanged === 1 ? '' : 's'} left unchanged.</div>
      )}
      {r.wave === 2 && <div className="note info">Second sortie of the day for {r.ac}{otherSorties('ac', r.ac).length ? ` (also flies ${otherSorties('ac', r.ac).map((x) => x.id).join(', ')})` : ''}. Turnaround ≥ {settings.turnaround} min and crew rest ≥ {settings.crewRest} min are enforced.</div>}
      {r.status === 'unfilled' && <div className="note" style={{ background: 'var(--risk-high-wash)', color: 'var(--risk-high)' }}><b>Unfilled:</b> {r.reason}. The commander is alerted; no constraint is relaxed silently.</div>}
      {r.status === 'held' && <div className="note" style={{ background: 'color-mix(in srgb, var(--act-hold) 12%, transparent)', color: 'var(--act-hold)' }}><b>On hold:</b> {r.reason}. Assets were released to other missions.</div>}

      <div className="modal-grid">
        <div style={{ minWidth: 0 }}>
          <div className="sec-block">
            <h3 className="sec-title">Why this assignment</h3>
            <p className="sec" style={{ fontSize: 12.5, marginBottom: 10 }}>Score = Σ (weight × factor score), rounded. Weights are set by the commander in Settings.</p>
            {FACTORS.map((f, i) => {
              const v = r.parts ? r.parts[f.key] : 0;
              return (
                <div className="factor" key={f.key}>
                  <span><b style={{ fontWeight: 600 }}><i className="fdot" style={{ background: FACTOR_COLORS[i] }} />{f.label}</b><span className="muted" style={{ display: 'block', fontSize: 11.5 }}>{f.desc}</span></span>
                  <Bar value={W[f.key] ? v / W[f.key] : 0} color={FACTOR_COLORS[i]} height={8} />
                  <span className="right mono" style={{ fontSize: 12.5 }}>{v.toFixed(1)} / {W[f.key]}</span>
                </div>
              );
            })}
            {r.parts && (
              <div className="note info mono" style={{ fontSize: 12 }}>
                {m.id} → {r.ac} + {r.crew} = {FACTORS.map((f) => r.parts[f.key].toFixed(1)).join(' + ')} = <b>{Math.round(r.score)}</b>
              </div>
            )}
          </div>
          <div className="sec-block">
            <h3 className="sec-title">Hard constraints (never traded off)</h3>
            {checks.map((x) => (
              <div className="check" key={x.label}>
                <span className={x.ok ? 'ok' : 'no'}>{x.ok ? '✓' : '✕'}</span>
                <span style={{ fontWeight: 500 }}>{x.label}</span>
                <span className="muted">{x.note}</span>
              </div>
            ))}
          </div>
          <div className="sec-block">
            <h3 className="sec-title">Next-best alternatives</h3>
            <p className="sec" style={{ fontSize: 12.5 }}>Feasible options whose aircraft and crew are free at this time (turnaround and rest respected).</p>
            {alts.length === 0 && <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>No other feasible aircraft–crew pair is free.</p>}
            {alts.map((o, i) => (
              <div key={o.ac + o.crew} className={`alt ${mode === 'modify' && pick === i ? 'sel' : ''}`} onClick={() => mode === 'modify' && setPick(i)} style={{ cursor: mode === 'modify' ? 'pointer' : 'default' }}>
                <span className="mono" style={{ fontWeight: 600 }}>{i + 2}. <button className="link-chip mono" onClick={(e) => { e.stopPropagation(); open('aircraft', o.ac); }}>{o.ac}</button> + <button className="link-chip mono" onClick={(e) => { e.stopPropagation(); open('crew', o.crew); }}>{o.crew}</button></span>
                <span className="muted">{r.score ? `${(o.score - r.score).toFixed(1)} vs chosen` : ''}</span>
                <span style={{ fontWeight: 600 }}>{Math.round(o.score)}</span>
              </div>
            ))}
            {mode !== 'modify' && alts.length > 0 && decide && <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>Click “Modify…” to choose one of these.</p>}
          </div>
        </div>
        <div style={{ minWidth: 0 }}>
          <h3 className="sec-title" style={{ marginBottom: 6 }}>Mission</h3>
          <div className="kv"><span>Type</span><span>{m.type}</span></div>
          <div className="kv"><span>Priority (HQ)</span><span>{m.pri} / 5</span></div>
          <div className="kv"><span>Area</span><span>{m.area === 'H' ? ar.name : <button className="link-chip" onClick={() => open('sector', m.area)}>{ar.name} →</button>}</span></div>
          <div className="kv"><span>Time on target</span><span>{m.tot}</span></div>
          <div className="kv"><span>Airborne window</span><span>{hhmm(r.start)}–{hhmm(r.end)}</span></div>
          <div className="kv"><span>Weapon config</span><span>{m.cfg} ({S.stock[m.cfg] || 0} in stock)</span></div>

          <h3 className="sec-title" style={{ margin: '22px 0 6px' }}>Aircraft</h3>
          {a ? (<>
            <div className="kv"><span>Tail</span><span><button className="link-chip mono" onClick={() => open('aircraft', a.id)}>{a.id} →</button> · {TYPE_NAME[a.type]}</span></div>
            <div className="kv"><span>Squadron</span><span>{a.sqn}</span></div>
            <div className="kv"><span>P(serviceable, 6 h)</span><span>{pct(pServ(a))} · {readinessState(a, settings)}</span></div>
            <div className="kv"><span>Hours to inspection</span><span>{a.hrs} h</span></div>
            <div className="kv"><span>EW pod</span><span>{a.ew ? 'Fitted' : 'Not fitted'}</span></div>
          </>) : <p className="muted" style={{ fontSize: 13 }}>No aircraft assigned.</p>}

          <h3 className="sec-title" style={{ margin: '22px 0 6px' }}>Crew</h3>
          {c ? (<>
            <div className="kv"><span>Callsign</span><span><button className="link-chip mono" onClick={() => open('crew', c.id)}>{c.id} →</button></span></div>
            <div className="kv"><span>Qualified for</span><span>{c.q.join(', ')}</span></div>
            <div className="kv"><span>Duty hours left</span><span>{c.duty} h</span></div>
            <div className="kv"><span>Rest</span><span>{c.rested ? 'Rested' : 'Not rested (−15% fit)'}</span></div>
          </>) : <p className="muted" style={{ fontSize: 13 }}>No crew assigned.</p>}

          <h3 className="sec-title" style={{ margin: '22px 0 6px' }}>Sector</h3>
          <div className="kv"><span>Threat</span><span><ThreatPill t={ar.threat} /></span></div>
          <div className="kv"><span>Exposure (after EW)</span><span>{r.exposure != null ? pct(r.exposure) : '—'}</span></div>
          <div className="kv"><span>Weather</span><span>{ar.wx}</span></div>
          <div className="kv"><span>Airspace</span><span>{ar.air}</span></div>
          <div className="kv"><span>NOTAM</span><span>{ar.notam}</span></div>
        </div>
      </div>
    </ModalFrame>
  );
}
