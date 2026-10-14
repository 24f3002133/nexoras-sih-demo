import React, { useState } from 'react';
import { useStore, USERS, PERM_LABEL } from '../state/store.jsx';
import { RadarSeal } from '../components/Icon.jsx';

export default function Login() {
  const { login, plan, S, startTour } = useStore();
  const [role, setRole] = useState('commander');
  const tasked = S.missions.filter((m) => plan[m.id] && plan[m.id].ac).length;
  return (
    <main className="login">
      <div className="tricolour" aria-hidden="true" />
      <div className="login-top">
        <RadarSeal size={38} style={{ color: '#E8ECF3' }} />
        <div>
          <div className="k">Smart India Hackathon 2026 · SIH26250 · Team NEXORAS_</div>
          <div className="n">Air Power — Dynamic Air Operations &amp; Resource Optimisation</div>
        </div>
      </div>
      <RadarSeal className="login-radar" size={560} sweep />
      <div className="login-card">
        <div className="login-left">
          <div>
            <h1>Air Power Ops Console</h1>
            <p style={{ fontSize: 14, color: '#C5D0E0', marginTop: 6 }}>Fuse · Predict · Optimise · Retask — with the commander in the loop</p>
          </div>
          <div className="login-stats">
            <div className="login-stat"><div className="v">{S.aircraft.length} aircraft · {S.crews.length} crews</div><div className="l">Fused from 7 live feeds into one air picture</div></div>
            <div className="login-stat"><div className="v" style={{ color: '#9FE3C9' }}>{tasked} / {S.missions.length} missions tasked</div><div className="l">Explainable plan, re-solved in milliseconds on any change</div></div>
          </div>
        </div>
        <div className="login-right">
          <h2>Sign in</h2>
          <p style={{ fontSize: 14, color: '#4A555F', marginTop: 6 }}>Pick a demo role. Each role sees only the actions it is allowed to take.</p>
          <div style={{ marginTop: 14 }} role="radiogroup" aria-label="Demo role">
            {Object.values(USERS).map((u) => (
              <button key={u.key} role="radio" aria-checked={role === u.key} className={`role-card ${role === u.key ? 'on' : ''}`} onClick={() => setRole(u.key)} onDoubleClick={() => login(u.key)}>
                <span className="role-badge">{u.badge}</span>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'block', fontWeight: 600, fontSize: 14 }}>{u.title}</span>
                  <span style={{ display: 'block', fontSize: 12, color: '#6C7780', marginTop: 2 }}>{u.perms.map((p) => PERM_LABEL[p]).join(' · ')}</span>
                </span>
              </button>
            ))}
          </div>
          <button className="btn" style={{ width: '100%', marginTop: 18, padding: '12px 16px', background: '#1b3a6b' }} onClick={() => login(role)}>
            Enter console as {USERS[role].title}
          </button>
          <button className="btn ghost" style={{ width: '100%', marginTop: 10, padding: '11px 16px', background: '#fff', color: '#1b3a6b', borderColor: '#1b3a6b' }} onClick={startTour}>
            ▶ Take the 90-second guided tour
          </button>
          <p style={{ fontSize: 12, color: '#6C7780', marginTop: 16, lineHeight: 1.5 }}>
            Demo environment — no credentials are collected. All aircraft, crews, missions and threats are synthetic sample data.
            You can switch roles at any time from the sidebar.
          </p>
        </div>
      </div>
    </main>
  );
}
