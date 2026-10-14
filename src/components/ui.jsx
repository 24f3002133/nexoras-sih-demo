import React, { useEffect, useState } from 'react';
import { useStore } from '../state/store.jsx';
import { RadarSeal } from './Icon.jsx';
import { hhmm } from '../engine/engine.js';

export function useNow(ms = 1000) {
  const [n, setN] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setN(Date.now()), ms); return () => clearInterval(id); }, [ms]);
  return n;
}

export function PageHeader({ title, desc, sources = [], actions }) {
  const { S, lastSync, degraded } = useStore();
  const now = useNow(1000);
  const ago = Math.max(1, Math.round((now - lastSync) / 1000));
  return (
    <div className="page-head">
      <div style={{ minWidth: 0, flex: 1 }}>
        <h1 className="page-title">{title}</h1>
        <p className="page-desc">{desc}</p>
        {actions && <div className="page-actions">{actions}</div>}
      </div>
      <div className="gov">
        <div className="gov-top">
          <div className="gov-txt">
            <div className="gov-kicker">Smart India Hackathon 2026 · SIH26250</div>
            <div className="gov-name">Air Power — Dynamic Air<br />Operations &amp; Resource Optimisation</div>
            <div className="gov-sub">Problem owner: MoD · Defence Services Staff College</div>
          </div>
          <RadarSeal className="gov-seal" />
        </div>
        <div className="gov-meta">
          {degraded ? <span style={{ color: 'var(--risk-med)' }}>● Link down · last-known data</span> : <span><span className="dot">●</span> Verified {ago}s ago</span>}
          <span>·</span>
          <span>As of {hhmm(S.clock)} hrs</span>
          {sources.length > 0 && <><span>·</span><span>{sources.join(' · ')}</span></>}
        </div>
      </div>
    </div>
  );
}

export function Kpi({ label, value, sub, tone }) {
  return (
    <div className="kpi">
      <div className="k-lbl">{label}</div>
      <div className={`k-val ${tone ? 'c-' + tone : ''}`}>{value}</div>
      {sub && <div className="k-sub">{sub}</div>}
    </div>
  );
}

export function Card({ title, sub, right, children, className = '', bodyClass = 'card-body', style }) {
  return (
    <section className={`card ${className}`} style={style}>
      {(title || right) && (
        <div className="card-head">
          <div style={{ minWidth: 0 }}>
            {title && <h2 className="card-title">{title}</h2>}
            {sub && <p className="card-sub">{sub}</p>}
          </div>
          {right}
        </div>
      )}
      <div className={bodyClass}>{children}</div>
    </section>
  );
}

export function Pill({ tone = 'neutral', dot = false, children, title }) {
  return <span className={`pill ${tone}`} title={title}>{dot && <span className="d" />}{children}</span>;
}

// Score is a quality measure, not a risk or an action, so it gets its own navy scale (never red/amber/green).
export function scoreTone() { return 'primary'; }
export function scoreWord(s) { return s >= 90 ? 'Excellent' : s >= 80 ? 'Strong' : s >= 70 ? 'Fair' : 'Weak'; }
export function ScorePill({ score }) {
  if (score == null) return <Pill tone="neutral">—</Pill>;
  const s = Math.round(score);
  return (
    <span className="score-pill" title={`Allocation score ${s}/100 · ${scoreWord(s)}`}>
      <b>{s}</b>
      <span className="score-meter"><i style={{ width: `${s}%` }} /></span>
      <span className="score-word">{scoreWord(s)}</span>
    </span>
  );
}

export const FACTOR_COLORS = ['var(--primary)', '#14907f', '#7a8597', '#3ba3d9', '#c9a227', '#c2577c'];
export function FactorLegend({ compact }) {
  const names = ['Priority', 'Readiness', 'Crew fit', 'Threat', 'Weapon', 'Weather'];
  return (
    <span className="factor-legend" style={compact ? { fontSize: 11 } : undefined}>
      {names.map((n, i) => <span key={n}><i style={{ background: FACTOR_COLORS[i] }} />{n}</span>)}
    </span>
  );
}

// Makes a table row or card behave like a button for mouse and keyboard
export function rowProps(fn) {
  return { onClick: fn, tabIndex: 0, role: 'button', onKeyDown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); } } };
}

export function ModalFrame({ label, width, children }) {
  const { close, back, modalStack } = useStore();
  return (
    <div className="backdrop" onClick={close}>
      <div className="modal" style={width ? { width: `min(${width}px, 100%)` } : undefined} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={label}>
        <div className="modal-bar">
          {modalStack.length > 0 ? <button className="modal-back" onClick={back}>← Back</button> : <span />}
          <button className="modal-x" onClick={close} aria-label="Close">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
export function threatTone(t) { return t >= 0.6 ? 'high' : t >= 0.4 ? 'med' : 'clear'; }
export function ThreatPill({ t }) {
  const w = t >= 0.6 ? 'High' : t >= 0.4 ? 'Medium' : 'Low';
  return <Pill tone={threatTone(t)} dot>{Math.round(t * 100)}% · {w}</Pill>;
}
export function StatusPill({ r, changed }) {
  if (!r) return null;
  const map = { proposed: ['info', 'Proposed'], approved: ['approve', 'Approved'], held: ['hold', 'On hold'], unfilled: ['high', 'Unfilled'] };
  const [tone, label] = map[r.status] || ['neutral', r.status];
  return (
    <span style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap' }}>
      <Pill tone={tone}>{label}</Pill>
      {changed && <Pill tone="changed">Retasked</Pill>}
      {r.pinned && <Pill tone="modify">Modified</Pill>}
    </span>
  );
}

export function Bar({ value, color = 'var(--primary)', height = 6, width }) {
  return (
    <div className="bar" style={{ height, width }}>
      <i style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%`, background: color }} />
    </div>
  );
}

export function Spark({ data, color = 'var(--risk-high)', w = 84, h = 24 }) {
  const max = Math.max(...data, 1e-6), min = Math.min(...data);
  const rng = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - 2 - ((v - min) / rng) * (h - 4)}`).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={w} cy={h - 2 - ((data[data.length - 1] - min) / rng) * (h - 4)} r="2.2" fill={color} />
    </svg>
  );
}

export function Seg({ options, value, onChange }) {
  return (
    <div className="seg" role="tablist">
      {options.map(([v, l]) => (
        <button key={v} role="tab" aria-selected={value === v} className={value === v ? 'on' : ''} onClick={() => onChange(v)}>{l}</button>
      ))}
    </div>
  );
}

export function PermNote({ perm, children }) {
  const { can, user } = useStore();
  if (can(perm)) return null;
  return <span className="muted" style={{ fontSize: 12 }}>{children || `Not available to ${user ? user.title : 'this role'}`}</span>;
}

export function download(name, text, type = 'text/plain') {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
