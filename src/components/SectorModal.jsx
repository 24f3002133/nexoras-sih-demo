import React from 'react';
import { useStore } from '../state/store.jsx';
import { Pill, ThreatPill, ScorePill, StatusPill, Spark, ModalFrame, rowProps } from './ui.jsx';
import { pct } from '../engine/engine.js';

export default function SectorModal({ id }) {
  const { S, plan, settings, open, highlight } = useStore();
  const ar = S.areas[id];
  if (!ar) return null;
  const ms = S.missions.filter((m) => m.area === id);
  const hist = S.threatHistory[id] || [ar.threat];
  const sams = ar.threat >= 0.6 ? (S.fired.sam && id === 'A' ? ['SAM-A1 (pop-up, mobile)'] : [`SAM-${id}1 (fixed site)`]) : [];
  return (
    <ModalFrame label={ar.name} width={860}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}><Pill tone="info">Sector {id}</Pill><ThreatPill t={ar.threat} />{ar.threat >= settings.ewThreshold && <Pill tone="high">EW pod required</Pill>}{ar.wx === 'closed' && <Pill tone="high">Weather closed</Pill>}</div>
      <h2 className="modal-title">{ar.name}</h2>
      <div className="modal-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div style={{ minWidth: 0 }}>
          <h3 className="sec-title">Threat-risk scorer</h3>
          <p className="sec" style={{ fontSize: 12.5 }}>Fused from the threat picture (surface-to-air and air threats by sector), airspace and weather feeds.</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 14, flexWrap: 'wrap' }}>
            <span className="serif" style={{ fontSize: 40, fontWeight: 700 }}>{pct(ar.threat)}</span>
            <Spark data={hist} w={180} h={44} />
          </div>
          <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>8-period trend: {hist.map((v) => Math.round(v * 100)).join(' → ')}</p>
          <div className="kv" style={{ marginTop: 14 }}><span>Known threat sites</span><span>{sams.length ? sams.join(', ') : 'None above 60%'}</span></div>
          <div className="kv"><span>Weather</span><span>{ar.wx}</span></div>
          <div className="kv"><span>Airspace</span><span>{ar.air}</span></div>
          <div className="kv"><span>NOTAM</span><span>{ar.notam}</span></div>
          <div className="kv"><span>Exposure without EW pod</span><span>{pct(ar.threat)}</span></div>
          <div className="kv"><span>Exposure with EW pod</span><span>{pct(ar.threat * 0.7)}</span></div>
        </div>
        <div style={{ minWidth: 0 }}>
          <h3 className="sec-title">Missions in this sector</h3>
          {ms.length === 0 && <p className="muted" style={{ fontSize: 13 }}>No missions planned.</p>}
          {ms.map((m) => (
            <div key={m.id} className="alt" style={{ cursor: 'pointer', alignItems: 'flex-start' }} {...rowProps(() => open('mission', m.id))}>
              <span><span className="mono" style={{ fontWeight: 600 }}>{m.id}</span> · {m.type} · TOT {m.tot}<span className="muted" style={{ display: 'block', fontSize: 12 }}>{plan[m.id].ac ? `${plan[m.id].ac} / ${plan[m.id].crew}` : plan[m.id].reason}</span></span>
              <span style={{ display: 'grid', gap: 6, justifyItems: 'end' }}><ScorePill score={plan[m.id].score} /><StatusPill r={plan[m.id]} changed={highlight.includes(m.id)} /></span>
            </div>
          ))}
        </div>
      </div>
    </ModalFrame>
  );
}
