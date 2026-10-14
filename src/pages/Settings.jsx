import React from 'react';
import { useStore, PERM_LABEL, USERS } from '../state/store.jsx';
import { PageHeader, Card, Seg, Pill } from '../components/ui.jsx';
import { FACTORS } from '../engine/engine.js';
import { FACTOR_COLORS } from './Overview.jsx';

function Row({ title, sub, children }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 18, alignItems: 'center', padding: '14px 0', borderTop: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
      <div style={{ minWidth: 200, flex: 1 }}><div style={{ fontWeight: 600, fontSize: 14 }}>{title}</div>{sub && <div className="sec" style={{ fontSize: 12.5, marginTop: 2 }}>{sub}</div>}</div>
      <div>{children}</div>
    </div>
  );
}

export default function Settings() {
  const st = useStore();
  const { settings, can, user } = st;
  const W = settings.weights;
  const sum = Object.values(W).reduce((a, b) => a + b, 0);
  const canW = can('weights');
  return (
    <>
      <PageHeader title="Settings" desc="Optimiser weights, hard-constraint thresholds, resilience and appearance. Weight changes re-solve the plan live." sources={['Config']} />
      <section className="card card-pad" style={{ marginTop: 22, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <span className="role-badge" style={{ width: 48, height: 48, fontSize: 18, background: 'var(--primary)' }}>{user.badge}</span>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div className="serif" style={{ fontSize: 18, fontWeight: 700 }}>{user.name}</div>
          <div className="sec" style={{ fontSize: 13 }}>{user.title} · {user.unit}</div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{user.perms.map((p) => <Pill key={p} tone="info">{PERM_LABEL[p]}</Pill>)}</div>
      </section>
      <div className="grid g-2e">
        <Card title="Optimiser weights" sub={`Allocation score = Σ weight × factor score. Current total ${sum} (default 100). ${canW ? 'Drag to re-solve live.' : 'Commander or AOC Planner can change these.'}`}
          right={canW ? <button className="link-btn" onClick={st.resetWeights}>Reset defaults</button> : null}>
          {FACTORS.map((f, i) => (
            <label key={f.key} style={{ display: 'grid', gridTemplateColumns: '150px 1fr 36px', gap: 12, alignItems: 'center', padding: '8px 0', fontSize: 13 }}>
              <span><span className="st-dot" style={{ background: FACTOR_COLORS[i], marginRight: 8 }} />{f.label}</span>
              <input type="range" min="0" max="50" step="1" value={W[f.key]} disabled={!canW} onChange={(e) => st.setWeight(f.key, Number(e.target.value))} onMouseUp={st.logWeights} onTouchEnd={st.logWeights} aria-label={`${f.label} weight`} />
              <b className="right">{W[f.key]}</b>
            </label>
          ))}
          <div className="note info" style={{ fontSize: 12.5 }}>Plan re-solved in {st.solveMs.toFixed(1)} ms with these weights. Default 30 / 20 / 15 / 15 / 10 / 10 reproduces the worked example (M-02 → FX-05 + ARJUN = 83 after the FX-08 snag).</div>
        </Card>
        <Card title="Hard-constraint thresholds" sub="Never traded off for score — only the commander changes them.">
          <Row title="EW pod required at threat ≥" sub="Sorties into sectors at or above this threat need an EW-pod aircraft">
            <span className="btn-row"><input type="range" min="0.5" max="0.95" step="0.05" value={settings.ewThreshold} disabled={!can('decide')} onChange={(e) => st.setSetting('ewThreshold', Number(e.target.value))} aria-label="EW threshold" /><b>{Math.round(settings.ewThreshold * 100)}%</b></span>
          </Row>
          <Row title="Crew duty margin" sub="Spare duty hours a crew must keep after the sortie">
            <span className="btn-row"><input type="range" min="0" max="2" step="0.5" value={settings.dutyMargin} disabled={!can('decide')} onChange={(e) => st.setSetting('dutyMargin', Number(e.target.value))} aria-label="Duty margin" /><b>{settings.dutyMargin} h</b></span>
          </Row>
          <Row title="Aircraft turnaround" sub="Minimum time between two sorties of the same airframe">
            <span className="btn-row"><input id="set-turn" type="range" min="45" max="180" step="15" value={settings.turnaround} disabled={!can('decide')} onChange={(e) => st.setSetting('turnaround', Number(e.target.value))} aria-label="Turnaround minutes" /><b>{settings.turnaround} min</b></span>
          </Row>
          <Row title="Crew rest between sorties" sub="Minimum rest before a crew flies again">
            <span className="btn-row"><input id="set-rest" type="range" min="30" max="180" step="15" value={settings.crewRest} disabled={!can('decide')} onChange={(e) => st.setSetting('crewRest', Number(e.target.value))} aria-label="Crew rest minutes" /><b>{settings.crewRest} min</b></span>
          </Row>
          <Row title="Minimal-disruption bonus" sub="Score bonus for keeping a sortie's current assets when re-planning">
            <span className="btn-row"><input type="range" min="0" max="10" step="1" value={settings.stability} disabled={!canW} onChange={(e) => st.setSetting('stability', Number(e.target.value))} aria-label="Stability bonus" /><b>{settings.stability}</b></span>
          </Row>
          <Row title="Readiness 'Watch' below" sub="Airframes under this P(serviceable) are flagged for engineering">
            <span className="btn-row"><input type="range" min="0.85" max="0.97" step="0.01" value={settings.watchBelow} onChange={(e) => st.setSetting('watchBelow', Number(e.target.value))} aria-label="Watch threshold" /><b>{Math.round(settings.watchBelow * 100)}%</b></span>
          </Row>
        </Card>
        <Card title="Resilience" sub="How the console behaves when the network fails.">
          <Row title="Link to AOC network" sub="Simulate a link loss: feeds age, a banner appears, decisions queue and sync on reconnect">
            <Seg options={[['up', 'Online'], ['down', 'Link lost']]} value={st.degraded ? 'down' : 'up'} onChange={(v) => ((v === 'down') !== st.degraded) && st.toggleLink()} />
          </Row>
          <Row title="Deployment" sub="Production target: on-premise, air-gapped (Docker Compose), TLS inside the network, RBAC">
            <Pill tone="neutral">Prototype: static web app</Pill>
          </Row>
          <Row title="Audit log" sub="SHA-256 hash chain; verify it from the Decision log page">
            <button className="btn ghost sm" onClick={() => st.go('decisions')}>Open decision log</button>
          </Row>
        </Card>
        <Card title="Appearance" sub="Applies only to this browser.">
          <Row title="Theme"><Seg options={[['light', 'Light'], ['dark', 'Dark']]} value={st.theme} onChange={st.setTheme} /></Row>
          <Row title="Density" sub="Row height on tables"><Seg options={[['comfortable', 'Comfortable'], ['compact', 'Compact']]} value={st.density} onChange={st.setDensity} /></Row>
          <Row title="Demo role" sub="Switch to see role-based access in action">
            <select className="select" value={st.session} onChange={(e) => st.switchRole(e.target.value)}>{Object.values(USERS).map((u) => <option key={u.key} value={u.key}>{u.title}</option>)}</select>
          </Row>
        </Card>
      </div>
    </>
  );
}
