import React from 'react';
import { useStore } from '../state/store.jsx';
import { Pill, Bar, ModalFrame, ScorePill, rowProps } from './ui.jsx';
import { hhmm, crewFit } from '../engine/engine.js';
import { MiniLane } from '../pages/Timeline.jsx';

export default function CrewModal({ id }) {
  const st = useStore();
  const { S, plan, settings, open, can } = st;
  const c = S.crews.find((x) => x.id === id);
  if (!c) return null;
  const sorties = S.missions.filter((m) => plan[m.id].crew === c.id);
  const used = sorties.reduce((h, m) => h + m.dur, 0);
  return (
    <ModalFrame label={`Crew ${c.id}`} width={780}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <Pill tone={c.rested ? 'clear' : 'med'} dot>{c.rested ? 'Rested' : 'Not rested'}</Pill>
        <Pill tone="neutral">{sorties.length ? `${sorties.length} sortie${sorties.length > 1 ? 's' : ''} today` : 'Spare'}</Pill>
      </div>
      <h2 className="modal-title mono">{c.id} <span className="serif" style={{ fontSize: 20, fontWeight: 600 }}>· aircrew</span></h2>
      <div style={{ marginTop: 14 }}>
        <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>Today, 05:00–18:00 · hatched = minimum rest ({settings.crewRest} min)</div>
        <MiniLane items={sorties} gap={settings.crewRest} />
      </div>
      <div className="modal-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div style={{ minWidth: 0 }}>
          <h3 className="sec-title">Duty & rest</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, margin: '10px 0 6px' }}><span className="sec">Duty hours used by today's plan</span><b>{used} / {c.duty} h</b></div>
          <Bar value={c.duty ? used / c.duty : 0} color={c.duty - used < settings.dutyMargin ? 'var(--risk-high)' : 'var(--primary)'} height={8} />
          <div className="kv" style={{ marginTop: 12 }}><span>Safety margin kept</span><span>{settings.dutyMargin} h</span></div>
          <div className="kv"><span>Qualified for</span><span>{c.q.join(', ')}</span></div>
          <div className="kv"><span>Crew-fit factor</span><span>{c.rested ? '100%' : '85% (not rested)'}</span></div>
          <h3 className="sec-title" style={{ marginTop: 22 }}>Squadron update</h3>
          <div className="btn-row" style={{ marginTop: 8 }}>
            <button className="btn ghost sm" disabled={!can('crew')} onClick={() => st.toggleRest(c.id)}>Mark {c.rested ? 'not rested' : 'rested'}</button>
            <button className="btn ghost sm" disabled={!can('crew')} onClick={() => st.setDuty(c.id, Math.max(0, c.duty - 1))}>− 1 h duty</button>
            <button className="btn ghost sm" disabled={!can('crew')} onClick={() => st.setDuty(c.id, Math.min(12, c.duty + 1))}>+ 1 h duty</button>
          </div>
          {!can('crew') && <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>Squadron Ops role only — switch role from the sidebar.</p>}
        </div>
        <div style={{ minWidth: 0 }}>
          <h3 className="sec-title">Sorties</h3>
          {sorties.length === 0 && <p className="muted" style={{ fontSize: 13 }}>Not tasked — available for retasking.</p>}
          {sorties.map((m) => (
            <div key={m.id} className="alt" style={{ cursor: 'pointer' }} {...rowProps(() => open('mission', m.id))}>
              <span><span className="mono" style={{ fontWeight: 600 }}>{m.id}</span> · {m.type} · {plan[m.id].ac}<span className="muted" style={{ display: 'block', fontSize: 12 }}>{hhmm(plan[m.id].start)}–{hhmm(plan[m.id].end)} · fit {Math.round(crewFit(m, c) * 100)}%</span></span>
              <ScorePill score={plan[m.id].score} />
            </div>
          ))}
        </div>
      </div>
    </ModalFrame>
  );
}
