import React, { Suspense, lazy } from 'react';
import { useStore, USERS } from '../state/store.jsx';
import Icon, { RadarSeal } from './Icon.jsx';
import { useNow, download } from './ui.jsx';
import { atoText } from '../engine/reports.js';

const Overview = lazy(() => import('../pages/Overview.jsx'));
const Tasking = lazy(() => import('../pages/Tasking.jsx'));
const Timeline = lazy(() => import('../pages/Timeline.jsx'));
const Fleet = lazy(() => import('../pages/Fleet.jsx'));
const Threat = lazy(() => import('../pages/Threat.jsx'));
const Retask = lazy(() => import('../pages/Retask.jsx'));
const Decisions = lazy(() => import('../pages/Decisions.jsx'));
const Reports = lazy(() => import('../pages/Reports.jsx'));
const Settings = lazy(() => import('../pages/Settings.jsx'));
const MissionModal = lazy(() => import('./MissionModal.jsx'));
const SectorModal = lazy(() => import('./SectorModal.jsx'));
const AircraftModal = lazy(() => import('./AircraftModal.jsx'));
const CrewModal = lazy(() => import('./CrewModal.jsx'));
const CommandPalette = lazy(() => import('./CommandPalette.jsx'));
const Copilot = lazy(() => import('./Copilot.jsx'));

export const NAV = [
  ['overview', '▤', 'Air picture'],
  ['tasking', '▦', 'Tasking plan'],
  ['timeline', '▭', 'Sortie timeline'],
  ['fleet', '✈', 'Fleet & crew'],
  ['threat', '◎', 'Threat & airspace'],
  ['retask', '⟳', 'Retask console'],
  ['decisions', '⛓', 'Decision log'],
  ['reports', '▧', 'Reports'],
  ['settings', '⚙', 'Settings'],
];
const SHORT = { overview: 'Picture', tasking: 'Tasking', timeline: 'Timeline', fleet: 'Fleet', threat: 'Threat', retask: 'Retask', decisions: 'Decisions', reports: 'Reports', settings: 'Settings' };
const PAGES = { overview: Overview, tasking: Tasking, timeline: Timeline, fleet: Fleet, threat: Threat, retask: Retask, decisions: Decisions, reports: Reports, settings: Settings };

function Ticker() {
  const st = useStore();
  const now = useNow(1000);
  const items = [...st.log].reverse().slice(0, 7);
  const html = items.map((e) => `<b>${e.t}</b> ${e.kind} — ${e.text}`).join('  •  ');
  const ago = Math.max(1, Math.round((now - st.lastSync) / 1000));
  return (
    <div className={`ticker ${st.degraded ? 'degraded' : ''}`} role="status" aria-live="off">
      <span className="ping" style={{ color: st.degraded ? 'var(--risk-med)' : 'var(--risk-high)' }} />
      <span className="live-lbl" style={{ color: st.degraded ? 'var(--risk-med)' : 'var(--risk-high)' }}>{st.degraded ? 'Offline' : 'Live'}</span>
      <div className="marquee-wrap">
        <div className="marquee">
          <span dangerouslySetInnerHTML={{ __html: html }} />
          <span dangerouslySetInnerHTML={{ __html: html }} />
        </div>
      </div>
      <span className="ticker-meta">{st.log.length} log entries</span>
      <span className="ticker-meta">{st.degraded ? `Link lost ${st.linkLostAt}` : `Synced ${ago}s ago`}</span>
    </div>
  );
}

export default function AppShell() {
  const st = useStore();
  const Page = PAGES[st.page] || Overview;
  const pending = st.S.missions.filter((m) => st.plan[m.id] && st.plan[m.id].status === 'proposed').length;
  const u = st.user;
  const exportAto = () => {
    const r = atoText(st);
    download(`ATO_${st.S.clock}.txt`, r.text);
    st.logReport('Air Tasking Order', r.hash);
    st.toast('Tasking sheet exported (hash-stamped)');
  };
  return (
    <>
      <aside className="sidebar" aria-label="Main navigation">
        <div className="brand">
          <div>
            <div className="brand-name"><b>A</b>ir <b>P</b>ower</div>
            <div className="brand-name"><b>O</b>ps Console</div>
          </div>
          <div className="brand-mono" title="Air Power Ops Console — use the sidebar to switch sections">AP</div>
        </div>
        <nav className="nav">
          {NAV.map(([k, ico, label]) => (
            <button key={k} className={`nav-btn ${st.page === k ? 'active' : ''}`} onClick={() => st.go(k)} aria-current={st.page === k ? 'page' : undefined}>
              <span className="nav-ico" aria-hidden="true">{ico}</span>{label}
            </button>
          ))}
        </nav>
        <button className={`queue-btn ${st.page === 'decisions' ? 'active' : ''} ${pending === 0 ? 'ok' : ''}`} onClick={() => st.go('decisions')}>
          {pending === 0 ? '✓ All sorties approved' : u && u.perms.includes('decide') ? `${pending} awaiting your decision` : `${pending} pending commander approval`}
        </button>
        <div className="signed">
          <div className="lbl">Signed in as</div>
          <div className="nm">{u.name}</div>
          <div className="rl">{u.title} · {u.unit}</div>
          <div className="links">
            <select className="link-btn" aria-label="Switch demo role" value={st.session} onChange={(e) => st.switchRole(e.target.value)} style={{ cursor: 'pointer' }}>
              {Object.values(USERS).map((x) => <option key={x.key} value={x.key}>Role: {x.title}</option>)}
            </select>
            <button className="link-btn" onClick={st.logout}>Sign out</button>
          </div>
        </div>
      </aside>

      <nav className="tabbar" aria-label="Sections">
        {NAV.map(([k, ico, label]) => (
          <button key={k} className={st.page === k ? 'on' : ''} onClick={() => st.go(k)} aria-current={st.page === k ? 'page' : undefined}>
            <span aria-hidden="true">{ico}</span>{SHORT[k]}
          </button>
        ))}
      </nav>
      <div className="main">
        <div className="bg-glow" aria-hidden="true" />
        <RadarSeal className="watermark" size={460} sweep />
        <div className="content">
          <div className="topbar">
            <Ticker />
            <button className="tool-btn icon" onClick={st.toggleTheme} title={st.theme === 'dark' ? 'Switch to light' : 'Switch to dark'} aria-label="Toggle dark mode">
              <Icon name={st.theme === 'dark' ? 'moon' : 'sun'} size={18} />
            </button>
            <button className="tool-btn tour-btn" onClick={st.startTour} disabled={st.tourOn}>▶ Demo tour</button>
            <button className="tool-btn" onClick={() => st.togglePalette(true)}>Search <span className="kbd">Ctrl K</span></button>
            <button className="tool-btn" onClick={exportAto}><Icon name="download" size={14} />Export ATO</button>
          </div>
          <div className="scope-row">
            <span className="chip">Scope: Air Operations Centre · Sectors A–D</span>
            {st.ripple && <span className="chip" style={{ color: 'var(--changed)' }}>Last retask {st.ripple.at}: {st.ripple.changes.length} changed in {st.ripple.ms.toFixed(1)} ms</span>}
          </div>
          {st.degraded && (
            <div className="banner" role="alert">
              <Icon name="unlink" size={18} />
              <span><b>Link to AOC network lost at {st.linkLostAt}.</b> Showing last-known data; feeds are ageing and decisions are queued ({st.queued}) until the link returns.</span>
              <button className="tool-btn" onClick={st.toggleLink}>Restore link</button>
            </div>
          )}
          <Suspense fallback={<div style={{ padding: 40 }} className="muted">Loading…</div>}>
            <Page />
          </Suspense>
        </div>
      </div>

      <Suspense fallback={null}>
        {st.modal && st.modal.type === 'mission' && <MissionModal key={st.modal.id} id={st.modal.id} />}
        {st.modal && st.modal.type === 'sector' && <SectorModal key={st.modal.id} id={st.modal.id} />}
        {st.modal && st.modal.type === 'aircraft' && <AircraftModal key={st.modal.id} id={st.modal.id} />}
        {st.modal && st.modal.type === 'crew' && <CrewModal key={st.modal.id} id={st.modal.id} />}
        {st.paletteOpen && <CommandPalette />}
        {st.copilotOpen && <Copilot />}
      </Suspense>
      <button className="fab glow" onClick={() => st.toggleCopilot()} aria-label={st.copilotOpen ? 'Close copilot' : 'Open copilot'}>
        {st.copilotOpen ? '✕' : 'AI'}
      </button>
      {st.toastMsg && <div className="toast" role="status">{st.toastMsg}</div>}
    </>
  );
}
