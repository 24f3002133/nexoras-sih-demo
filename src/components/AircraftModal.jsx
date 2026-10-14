import React from 'react';
import { useStore } from '../state/store.jsx';
import { Pill, Bar, ModalFrame, ScorePill, rowProps } from './ui.jsx';
import { pServ, pct, readinessState, hhmm } from '../engine/engine.js';
import { TYPE_NAME, ROLES } from '../engine/scenario.js';
import { MiniLane } from '../pages/Timeline.jsx';

export default function AircraftModal({ id }) {
  const st = useStore();
  const { S, plan, settings, open, can } = st;
  const a = S.aircraft.find((x) => x.id === id);
  if (!a) return null;
  const rs = readinessState(a, settings);
  const sorties = S.missions.filter((m) => plan[m.id].ac === a.id);
  const flown = sorties.reduce((h, m) => h + m.dur, 0);
  const p = pServ(a);
  const risk = 0.25 * a.snags + (a.hrs < 10 ? (10 - a.hrs) * 0.25 : 0);
  return (
    <ModalFrame label={`Aircraft ${a.id}`} width={820}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <Pill tone={rs === 'ready' ? 'clear' : rs === 'watch' ? 'med' : 'high'} dot>{rs === 'us' ? 'Unserviceable' : rs === 'watch' ? 'Watch' : 'Ready'}</Pill>
        <Pill tone="neutral">{a.sqn}</Pill>
        {a.ew && <Pill tone="info">EW pod</Pill>}
      </div>
      <h2 className="modal-title mono">{a.id} <span className="serif" style={{ fontSize: 20, fontWeight: 600 }}>· {TYPE_NAME[a.type]}</span></h2>
      <div style={{ marginTop: 14 }}>
        <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>Today, 05:00–18:00 · hatched = turnaround ({settings.turnaround} min)</div>
        <MiniLane items={sorties} gap={settings.turnaround} us={a.us} />
      </div>
      <div className="modal-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div style={{ minWidth: 0 }}>
          <h3 className="sec-title">Readiness predictor</h3>
          <p className="sec" style={{ fontSize: 12.5 }}>P(serviceable over next 6 h) = σ(3.2 − risk), where risk = 0.25 × open snags + a penalty when fewer than 10 h remain to inspection.</p>
          <div className="serif" style={{ fontSize: 40, fontWeight: 700, marginTop: 10 }}>{pct(p)}</div>
          <Bar value={p} color={rs === 'ready' ? 'var(--ready)' : rs === 'watch' ? 'var(--watch)' : 'var(--us)'} height={8} />
          <div className="kv" style={{ marginTop: 12 }}><span>Open snags</span><span>{a.snags}</span></div>
          <div className="kv"><span>Hours to next inspection</span><span>{a.hrs} h ({Math.max(0, a.hrs - flown)} h after today's sorties)</span></div>
          <div className="kv"><span>Risk term</span><span>{a.us ? '—' : risk.toFixed(2)}</span></div>
          <div className="kv"><span>Roles</span><span>{ROLES[a.type].join(', ')}</span></div>
          {a.note && <div className="note">{a.note}</div>}
        </div>
        <div style={{ minWidth: 0 }}>
          <h3 className="sec-title">Sorties today</h3>
          {sorties.length === 0 && <p className="muted" style={{ fontSize: 13 }}>{a.us ? 'Unserviceable — not available to the optimiser.' : 'Spare — available for retasking.'}</p>}
          {sorties.map((m) => (
            <div key={m.id} className="alt" style={{ cursor: 'pointer' }} {...rowProps(() => open('mission', m.id))}>
              <span><span className="mono" style={{ fontWeight: 600 }}>{m.id}</span> · {m.type}<span className="muted" style={{ display: 'block', fontSize: 12 }}>{hhmm(plan[m.id].start)}–{hhmm(plan[m.id].end)} · {plan[m.id].crew}{plan[m.id].wave === 2 ? ' · 2nd sortie' : ''}</span></span>
              <ScorePill score={plan[m.id].score} />
            </div>
          ))}
          <h3 className="sec-title" style={{ marginTop: 22 }}>Maintenance update</h3>
          <p className="sec" style={{ fontSize: 12.5, marginBottom: 10 }}>Reporting a change re-solves the plan instantly; only affected sorties move.</p>
          <button className={`btn ${a.us ? 'approve' : 'danger'}`} disabled={!can('maint')} onClick={() => st.toggleUS(a.id)}>{a.us ? 'Mark serviceable' : 'Report unserviceable'}</button>
          {!can('maint') && <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>Maintenance role only — switch role from the sidebar.</p>}
        </div>
      </div>
    </ModalFrame>
  );
}
