import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { baseScenario, DEFAULT_SETTINGS, applyEvent, EVENTS } from '../engine/scenario.js';
import { solve, diffPlans, hhmm } from '../engine/engine.js';
import { sha256 } from '../engine/sha256.js';

export const USERS = {
  commander: { key: 'commander', badge: 'C', title: 'Air Commander', name: 'Gp Capt R. Menon', unit: 'Air Operations Centre', perms: ['decide', 'solve', 'events', 'weights', 'whatif'] },
  planner: { key: 'planner', badge: 'P', title: 'AOC Planner', name: 'Wg Cdr S. Iyer', unit: 'AOC Plans Cell', perms: ['solve', 'events', 'weights', 'whatif'] },
  squadron: { key: 'squadron', badge: 'S', title: 'Squadron Ops', name: 'Sqn Ldr K. Bedi', unit: '7 Sqn Operations', perms: ['crew'] },
  maintenance: { key: 'maintenance', badge: 'M', title: 'Maintenance', name: 'Flt Lt P. Rao', unit: 'Engineering Wing', perms: ['maint'] },
};
export const PERM_LABEL = {
  decide: 'Approve / modify / hold tasking',
  solve: 'Run optimiser & what-if',
  events: 'Inject dynamic events',
  weights: 'Tune optimiser weights',
  whatif: 'Commit what-if changes',
  crew: 'Update crew duty & rest',
  maint: 'Update aircraft serviceability',
};

const GENESIS = '0'.repeat(64);
export function hashEntry(prev, e) {
  return sha256(`${prev}|${e.seq}|${e.t}|${e.kind}|${e.actor}|${e.text}`);
}
function pushLog(log, entry) {
  const prev = log.length ? log[log.length - 1].hash : GENESIS;
  const seq = log.length + 1;
  const e = { seq, ...entry };
  e.prev = prev;
  e.hash = hashEntry(prev, e);
  return [...log, e];
}
export function verifyChain(log) {
  let prev = GENESIS;
  for (let i = 0; i < log.length; i++) {
    const e = log[i];
    if (e.prev !== prev || hashEntry(prev, e) !== e.hash) return { ok: false, at: e.seq };
    prev = e.hash;
  }
  return { ok: true, n: log.length, head: prev };
}

function readPref(k, d) {
  try { return localStorage.getItem(k) || d; } catch { return d; }
}
function writePref(k, v) {
  try { localStorage.setItem(k, v); } catch { /* ignore */ }
}

const SAVE_KEY = 'ap-console-state-v2';
const PERSIST = ['S', 'settings', 'plan', 'solveMs', 'log', 'ripple', 'ripples', 'highlight', 'queued', 'session', 'page'];

function freshState() {
  const S = baseScenario();
  const settings = structuredClone(DEFAULT_SETTINGS);
  const { plan, ms } = solve(S, settings, {});
  let log = [];
  log = pushLog(log, { t: hhmm(S.clock - 12), kind: 'SYSTEM', actor: 'system', text: 'Console started · 7/7 feeds connected' });
  log = pushLog(log, { t: hhmm(S.clock - 2), kind: 'FEED', actor: 'system', text: 'Air picture fused · 12 aircraft, 10 crews, 8 missions' });
  log = pushLog(log, { t: hhmm(S.clock), kind: 'PLAN', actor: 'optimiser', text: `Baseline plan solved in ${ms.toFixed(1)} ms · 8/8 missions tasked` });
  const base = { cause: 'Baseline plan from HQ tasking', detail: '8/8 missions tasked', changes: [], ms, at: hhmm(S.clock), unchanged: S.missions.length, baseline: true };
  return { S, settings, plan, solveMs: ms, log, ripple: null, ripples: [base], highlight: [], queued: 0 };
}

function initialState() {
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch { saved = null; }
  const valid = saved && saved.S && saved.plan && Array.isArray(saved.log) && saved.S.missions && saved.settings && saved.settings.turnaround != null;
  return {
    ...freshState(),
    session: null, page: 'overview',
    ...(valid ? Object.fromEntries(PERSIST.filter((k) => k in saved).map((k) => [k, saved[k]])) : {}),
    restored: !!valid,
    degraded: false, linkLostAt: null,
    modal: null, modalStack: [], paletteOpen: false, copilotOpen: false, toastMsg: null,
    viewTime: null, tourOn: false,
    theme: readPref('ap-theme', 'light'), density: readPref('ap-density', 'comfortable'),
    lastSync: Date.now(), events: EVENTS,
  };
}

const Ctx = createContext(null);
export const useStore = () => useContext(Ctx);

export function StoreProvider({ children }) {
  const [st, setSt] = useState(initialState);
  const toastTimer = useRef(null);

  useEffect(() => {
    document.documentElement.dataset.theme = st.theme;
    document.documentElement.dataset.density = st.density;
    writePref('ap-theme', st.theme);
    writePref('ap-density', st.density);
  }, [st.theme, st.density]);

  // keep the session across a page refresh (per-browser convenience; Reset scenario clears it)
  useEffect(() => {
    const id = setTimeout(() => {
      try { localStorage.setItem(SAVE_KEY, JSON.stringify(Object.fromEntries(PERSIST.map((k) => [k, st[k]])))); } catch { /* storage unavailable */ }
    }, 400);
    return () => clearTimeout(id);
  }, [st.S.clock, st.plan, st.log, st.settings, st.session, st.page, st.queued]);

  // feed freshness simulation: one feed refreshes every few seconds; all age while the link is down
  useEffect(() => {
    const id = setInterval(() => {
      setSt((p) => {
        const S = { ...p.S, feeds: p.S.feeds.map((f) => ({ ...f })) };
        if (p.degraded) {
          S.feeds.forEach((f) => { f.age += 3; });
          return { ...p, S };
        }
        S.feeds.forEach((f) => { f.age = Math.min(f.age + 1, f.max - 1); });
        const f = S.feeds[Math.floor(Math.random() * S.feeds.length)];
        f.age = 0;
        return { ...p, S, lastSync: Date.now() };
      });
    }, 5000);
    return () => clearInterval(id);
  }, []);

  const toast = useCallback((msg) => setSt((p) => ({ ...p, toastMsg: msg })), []);
  useEffect(() => {
    if (!st.toastMsg) return undefined;
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setSt((p) => ({ ...p, toastMsg: null })), 3200);
    return () => clearTimeout(toastTimer.current);
  }, [st.toastMsg]);

  const actor = (p) => (p.session ? `${USERS[p.session].badge}:${USERS[p.session].name}` : 'system');
  const can = useCallback((perm) => !!st.session && USERS[st.session].perms.includes(perm), [st.session]);

  // Re-solve after a scenario change and record the ripple
  const resolveWith = (p, S, cause, detail, kind = 'EVENT', extra = {}, keep = []) => {
    const before = p.plan;
    const { plan, ms } = solve(S, p.settings, before);
    const changes = diffPlans(S, before, plan);
    let log = p.log;
    S.clock += 2;
    log = pushLog(log, { t: hhmm(S.clock), kind, actor: actor(p), text: `${cause}${detail ? ' — ' + detail : ''}` });
    log = pushLog(log, { t: hhmm(S.clock), kind: 'RE-PLAN', actor: 'optimiser', text: `Re-solved in ${ms.toFixed(1)} ms · ${changes.length} sortie${changes.length === 1 ? '' : 's'} changed` });
    for (const ch of changes) if (S.approved[ch.id] && !keep.includes(ch.id)) delete S.approved[ch.id];
    const ripple = { cause, detail, changes, ms, at: hhmm(S.clock), unchanged: S.missions.length - changes.length, ...extra };
    return { ...p, S, plan, solveMs: ms, log, ripple, ripples: [ripple, ...p.ripples].slice(0, 12), highlight: changes.map((c) => c.id) };
  };

  const actions = useMemo(() => ({
    login: (role) => { window.scrollTo(0, 0); setSt((p) => ({ ...p, session: role, page: 'overview', log: pushLog(p.log, { t: hhmm(p.S.clock), kind: 'ACCESS', actor: `${USERS[role].badge}:${USERS[role].name}`, text: `Signed in as ${USERS[role].title}` }) })); },
    logout: () => setSt((p) => ({ ...p, session: null, modal: null, modalStack: [], copilotOpen: false, paletteOpen: false, tourOn: false })),
    switchRole: (role) => setSt((p) => ({ ...p, session: role, log: pushLog(p.log, { t: hhmm(p.S.clock), kind: 'ACCESS', actor: `${USERS[role].badge}:${USERS[role].name}`, text: `Role switched to ${USERS[role].title}` }) })),
    go: (page) => { setSt((p) => ({ ...p, page, modal: null, modalStack: [], paletteOpen: false })); window.scrollTo({ top: 0, behavior: 'smooth' }); },
    open: (type, id) => setSt((p) => ({ ...p, modalStack: p.modal && !(p.modal.type === type && p.modal.id === id) ? [...p.modalStack, p.modal] : p.modalStack, modal: { type, id }, paletteOpen: false })),
    back: () => setSt((p) => ({ ...p, modal: p.modalStack[p.modalStack.length - 1] || null, modalStack: p.modalStack.slice(0, -1) })),
    close: () => setSt((p) => ({ ...p, modal: null, modalStack: [] })),
    setViewTime: (t) => setSt((p) => ({ ...p, viewTime: t })),
    startTour: () => setSt((p) => ({ ...p, tourOn: true, copilotOpen: false })),
    endTour: () => setSt((p) => ({ ...p, tourOn: false })),
    togglePalette: (v) => setSt((p) => ({ ...p, paletteOpen: v ?? !p.paletteOpen })),
    toggleCopilot: (v, seed) => setSt((p) => ({ ...p, copilotOpen: v ?? !p.copilotOpen, copilotSeed: seed || null })),
    setTheme: (theme) => setSt((p) => ({ ...p, theme })),
    toggleTheme: () => setSt((p) => ({ ...p, theme: p.theme === 'dark' ? 'light' : 'dark' })),
    setDensity: (density) => setSt((p) => ({ ...p, density })),
    toast,

    fireEvent: (k) => {
      setSt((p) => {
        if (p.S.fired[k]) return p;
        const S = structuredClone(p.S);
        S.fired[k] = true;
        const ev = EVENTS.find((e) => e.k === k);
        const detail = applyEvent(S, k, p.plan);
        const S2 = { ...S };
        const feed = S2.feeds.find((f) => f.name === ev.feed);
        if (feed) feed.age = 0;
        return resolveWith(p, S2, ev.title, detail, 'EVENT', { k });
      });
      toast('Event injected — plan re-solved, affected sorties highlighted');
    },
    resetScenario: (silent) => {
      setSt((p) => {
        const f = freshState();
        const log = pushLog(f.log, { t: hhmm(f.S.clock), kind: 'SYSTEM', actor: actor(p), text: 'Scenario reset to 06:12 baseline' });
        return { ...p, ...f, log, degraded: false, linkLostAt: null, modal: null, modalStack: [], viewTime: null };
      });
      if (!silent) toast('Scenario reset to the 06:12 baseline');
    },
    approve: (mid) => setSt((p) => {
      const r = p.plan[mid];
      if (!r || !r.ac) return p;
      const S = structuredClone(p.S);
      S.clock += 1;
      S.approved[mid] = `${r.ac}/${r.crew}`;
      const plan = { ...p.plan, [mid]: { ...r, status: 'approved' } };
      const log = pushLog(p.log, { t: hhmm(S.clock), kind: 'DECISION', actor: actor(p), text: `${p.degraded ? '[queued offline] ' : ''}APPROVED ${mid} → ${r.ac} / ${r.crew} (score ${Math.round(r.score)})` });
      return { ...p, S, plan, log, queued: p.degraded ? p.queued + 1 : p.queued, toastMsg: `${mid} approved${p.degraded ? ' — queued for sync' : ''}` };
    }),
    approveAll: () => setSt((p) => {
      const S = structuredClone(p.S);
      let log = p.log; const plan = { ...p.plan }; let n = 0;
      for (const m of S.missions) {
        const r = plan[m.id];
        if (r && r.ac && r.status === 'proposed') {
          S.approved[m.id] = `${r.ac}/${r.crew}`; plan[m.id] = { ...r, status: 'approved' }; n++;
          log = pushLog(log, { t: hhmm(S.clock), kind: 'DECISION', actor: actor(p), text: `${p.degraded ? '[queued offline] ' : ''}APPROVED ${m.id} → ${r.ac} / ${r.crew} (score ${Math.round(r.score)})` });
        }
      }
      S.clock += 1;
      return { ...p, S, plan, log, queued: p.degraded ? p.queued + n : p.queued, toastMsg: `${n} sortie${n === 1 ? '' : 's'} approved` };
    }),
    modify: (mid, ac, crew) => setSt((p) => {
      const S = structuredClone(p.S);
      S.pinned[mid] = { ac, crew };
      S.approved[mid] = `${ac}/${crew}`;
      const next = resolveWith(p, S, `Commander modified ${mid}`, `${ac} / ${crew} pinned`, 'DECISION', {}, [mid]);
      return { ...next, toastMsg: `${mid} modified → ${ac} / ${crew}; plan re-solved around it` };
    }),
    hold: (mid, reason) => setSt((p) => {
      const S = structuredClone(p.S);
      S.held[mid] = reason || 'Held by commander';
      delete S.approved[mid];
      const next = resolveWith(p, S, `Commander held ${mid}`, reason || 'Held by commander', 'DECISION');
      return { ...next, toastMsg: `${mid} on hold — freed assets re-allocated` };
    }),
    release: (mid) => setSt((p) => {
      const S = structuredClone(p.S);
      delete S.held[mid];
      const next = resolveWith(p, S, `Hold released on ${mid}`, '', 'DECISION');
      return { ...next, toastMsg: `${mid} released back to the optimiser` };
    }),

    toggleUS: (id) => setSt((p) => {
      const S = structuredClone(p.S);
      const a = S.aircraft.find((x) => x.id === id);
      a.us = !a.us;
      if (a.us) { a.note = 'Reported U/S by maintenance'; } else { a.note = undefined; if (a.hrs === 0) a.hrs = 50; if (a.snags > 1) a.snags = 1; }
      const next = resolveWith(p, S, `Maintenance update: ${id} ${a.us ? 'U/S' : 'serviceable'}`, '', 'UPDATE');
      return { ...next, toastMsg: `${id} marked ${a.us ? 'unserviceable' : 'serviceable'} — plan re-solved` };
    }),
    toggleRest: (id) => setSt((p) => {
      const S = structuredClone(p.S);
      const c = S.crews.find((x) => x.id === id);
      c.rested = !c.rested;
      const next = resolveWith(p, S, `Crew update: ${id} ${c.rested ? 'rested' : 'not rested'}`, '', 'UPDATE');
      return { ...next, toastMsg: `${id} marked ${c.rested ? 'rested' : 'not rested'}` };
    }),
    setDuty: (id, duty) => setSt((p) => {
      const S = structuredClone(p.S);
      S.crews.find((x) => x.id === id).duty = duty;
      return resolveWith(p, S, `Crew update: ${id} duty hours left = ${duty} h`, '', 'UPDATE');
    }),
    commitWhatIf: (wi) => setSt((p) => {
      const S = structuredClone(p.S);
      const parts = [];
      for (const id of wi.us) { const a = S.aircraft.find((x) => x.id === id); if (a && !a.us) { a.us = true; a.note = 'What-if: U/S'; parts.push(`${id} U/S`); } }
      for (const k of Object.keys(wi.threat)) if (Math.abs(S.areas[k].threat - wi.threat[k]) > 0.001) { parts.push(`Sector ${k} threat ${Math.round(wi.threat[k] * 100)}%`); S.areas[k].threat = wi.threat[k]; }
      for (const k of wi.closed) if (S.areas[k].wx !== 'closed') { S.areas[k].wx = 'closed'; parts.push(`Sector ${k} closed (weather)`); }
      const next = resolveWith(p, S, 'What-if committed', parts.join(', ') || 'no changes', 'WHAT-IF');
      return { ...next, toastMsg: 'What-if committed to the live plan' };
    }),

    setWeight: (k, v) => setSt((p) => {
      const settings = { ...p.settings, weights: { ...p.settings.weights, [k]: v } };
      const { plan, ms } = solve(p.S, settings, p.plan);
      return { ...p, settings, plan, solveMs: ms };
    }),
    setSetting: (k, v) => setSt((p) => {
      const settings = { ...p.settings, [k]: v };
      const { plan, ms } = solve(p.S, settings, p.plan);
      return { ...p, settings, plan, solveMs: ms };
    }),
    resetWeights: () => setSt((p) => {
      const settings = structuredClone(DEFAULT_SETTINGS);
      const { plan, ms } = solve(p.S, settings, p.plan);
      return { ...p, settings, plan, solveMs: ms, log: pushLog(p.log, { t: hhmm(p.S.clock), kind: 'CONFIG', actor: actor(p), text: 'Optimiser weights reset to 30/20/15/15/10/10' }) };
    }),
    logWeights: () => setSt((p) => {
      const w = p.settings.weights;
      return { ...p, log: pushLog(p.log, { t: hhmm(p.S.clock), kind: 'CONFIG', actor: actor(p), text: `Optimiser weights set to ${w.priority}/${w.readiness}/${w.crew}/${w.threat}/${w.weapon}/${w.weather}` }) };
    }),

    toggleLink: () => setSt((p) => {
      if (!p.degraded) {
        const log = pushLog(p.log, { t: hhmm(p.S.clock), kind: 'LINK', actor: 'system', text: 'Link to AOC network lost — degraded mode, last-known data in use' });
        return { ...p, degraded: true, linkLostAt: hhmm(p.S.clock), log, toastMsg: 'Link lost — running on last-known data' };
      }
      const S = { ...p.S, feeds: p.S.feeds.map((f) => ({ ...f, age: Math.min(f.age, 1) })) };
      let log = pushLog(p.log, { t: hhmm(p.S.clock + 1), kind: 'LINK', actor: 'system', text: `Link restored · ${p.queued} queued decision${p.queued === 1 ? '' : 's'} synced` });
      return { ...p, S, degraded: false, queued: 0, linkLostAt: null, log, lastSync: Date.now(), toastMsg: `Reconnected — ${p.queued} queued decision${p.queued === 1 ? '' : 's'} synced` };
    }),
    tamperDemo: () => setSt((p) => {
      const i = p.log.findIndex((e) => e.kind === 'DECISION' || e.kind === 'PLAN');
      if (i < 0) return p;
      const log = p.log.map((e, j) => (j === i ? { ...e, text: e.text.replace(/\d+/, (n) => String(Number(n) + 1)), tampered: true } : e));
      return { ...p, log, toastMsg: `Entry #${log[i].seq} edited without re-hashing — run Verify chain` };
    }),
    undoTamper: () => setSt((p) => {
      let log = [];
      for (const e of p.log) log = pushLog(log, { t: e.t, kind: e.kind, actor: e.actor, text: e.tampered ? e.text.replace(/\d+/, (n) => String(Number(n) - 1)) : e.text });
      return { ...p, log, toastMsg: 'Original entry restored' };
    }),
    logReport: (name, hash) => setSt((p) => ({ ...p, log: pushLog(p.log, { t: hhmm(p.S.clock), kind: 'REPORT', actor: actor(p), text: `${name} generated · sha256 ${hash.slice(0, 16)}…` }) })),
  }), [toast]);

  const value = useMemo(() => ({ ...st, ...actions, can, user: st.session ? USERS[st.session] : null }), [st, actions, can]);

  // keyboard: Ctrl/Cmd+K palette, Esc closes
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); if (st.session) actions.togglePalette(); }
      if (e.key === 'Escape') { setSt((p) => (p.paletteOpen ? { ...p, paletteOpen: false } : p.modal ? { ...p, modal: p.modalStack[p.modalStack.length - 1] || null, modalStack: p.modalStack.slice(0, -1) } : p)); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [st.session, actions]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
