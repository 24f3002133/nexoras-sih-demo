import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../state/store.jsx';
import { NAV } from './AppShell.jsx';

export default function CommandPalette() {
  const st = useStore();
  const { S, plan } = st;
  const [q, setQ] = useState('');
  const [i, setI] = useState(0);
  const ref = useRef(null);
  useEffect(() => { ref.current && ref.current.focus(); }, []);
  const items = useMemo(() => {
    const all = [
      ...NAV.map(([k, , l]) => ({ g: 'Pages', label: l, hint: 'Go to', run: () => st.go(k) })),
      ...S.missions.map((m) => ({ g: 'Missions', label: `${m.id} · ${m.desc}`, hint: plan[m.id].ac ? `${plan[m.id].ac} / ${plan[m.id].crew}` : plan[m.id].status, run: () => st.open('mission', m.id) })),
      ...S.aircraft.map((a) => ({ g: 'Aircraft', label: a.id, hint: a.us ? 'U/S' : a.sqn, run: () => st.open('aircraft', a.id) })),
      ...['A', 'B', 'C', 'D'].map((k) => ({ g: 'Sectors', label: S.areas[k].name, hint: `${Math.round(S.areas[k].threat * 100)}% threat`, run: () => st.open('sector', k) })),
      ...S.crews.map((c) => ({ g: 'Crews', label: c.id, hint: `${c.duty} h duty left`, run: () => st.go('fleet') })),
      ...st.events.filter((e) => !S.fired[e.k]).map((e) => ({ g: 'Actions', label: `Inject: ${e.title}`, hint: st.can('events') ? 'Event' : 'not permitted', run: () => (st.can('events') ? (st.fireEvent(e.k), st.go('retask')) : st.toast('Not permitted for this role')) })),
      { g: 'Actions', label: st.theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme', hint: 'Theme', run: st.toggleTheme },
      { g: 'Actions', label: st.degraded ? 'Restore link' : 'Simulate link loss', hint: 'Resilience', run: st.toggleLink },
      { g: 'Actions', label: 'Reset scenario to 06:12', hint: 'Demo', run: st.resetScenario },
      { g: 'Actions', label: 'Open AI copilot', hint: 'Assist', run: () => st.toggleCopilot(true) },
    ];
    const s = q.trim().toLowerCase();
    return s ? all.filter((x) => `${x.label} ${x.hint} ${x.g}`.toLowerCase().includes(s)) : all;
  }, [q, S, plan, st]);
  const run = (it) => { st.togglePalette(false); it.run(); };
  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setI((x) => Math.min(items.length - 1, x + 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setI((x) => Math.max(0, x - 1)); }
    if (e.key === 'Enter' && items[i]) run(items[i]);
  };
  let lastG = null;
  return (
    <div className="backdrop" onClick={() => st.togglePalette(false)}>
      <div className="palette" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Command palette">
        <input ref={ref} value={q} onChange={(e) => { setQ(e.target.value); setI(0); }} onKeyDown={onKey} placeholder="Search missions, aircraft, sectors, pages or actions…" aria-label="Search" />
        <div className="pal-list">
          {items.length === 0 && <div className="muted" style={{ padding: 18, fontSize: 13 }}>No matches.</div>}
          {items.slice(0, 60).map((it, k) => {
            const head = it.g !== lastG ? <div className="pal-grp">{it.g}</div> : null;
            lastG = it.g;
            return (
              <React.Fragment key={k}>
                {head}
                <button className={`pal-item ${k === i ? 'on' : ''}`} onMouseEnter={() => setI(k)} onClick={() => run(it)}>
                  <span>{it.label}</span><span className="muted" style={{ fontSize: 12 }}>{it.hint}</span>
                </button>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}
