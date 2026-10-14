// Simulated air base scenario — all data is synthetic sample data for the SIH 2026 prototype.
// The same scenario backs the numbers quoted in the idea deck (12 aircraft, 10 crews, 8 missions,
// 4 dynamic events, worked example M-02 -> FX-05 + ARJUN = 83).

export const ROLES = {
  MR: ['CAP', 'STRIKE', 'ESCORT'],
  AS: ['CAP', 'ESCORT', 'ALERT'],
  ST: ['STRIKE'],
  RC: ['RECCE', 'STRIKE'],
};
export const TYPE_NAME = { MR: 'Multirole', AS: 'Air superiority', ST: 'Strike', RC: 'Recce / strike' };

export const MISSION_TYPES = ['CAP', 'STRIKE', 'ESCORT', 'ALERT', 'RECCE'];

export const FEEDS = [
  { id: 'ac', name: 'Aircraft availability', src: 'Squadron maintenance log', age: 4, max: 15 },
  { id: 'crew', name: 'Crew status', src: 'Crew duty roster', age: 9, max: 30 },
  { id: 'wpn', name: 'Weapon loads', src: 'Armament section stock', age: 12, max: 30 },
  { id: 'air', name: 'Airspace (NOTAM)', src: 'Airspace cell / NOTAM', age: 6, max: 30 },
  { id: 'wx', name: 'Weather', src: 'Met section', age: 3, max: 15 },
  { id: 'thr', name: 'Threat picture', src: 'Air picture / intel cell', age: 2, max: 5 },
  { id: 'pri', name: 'Mission priorities', src: 'HQ tasking', age: 7, max: 60 },
];

export function baseScenario() {
  return {
    clock: 6 * 60 + 12,
    aircraft: [
      { id: 'FX-01', type: 'MR', ew: true, us: false, hrs: 42, snags: 0, sqn: '7 Sqn' },
      { id: 'FX-02', type: 'MR', ew: true, us: false, hrs: 31, snags: 1, sqn: '7 Sqn' },
      { id: 'FX-03', type: 'AS', ew: false, us: false, hrs: 55, snags: 0, sqn: '3 Sqn' },
      { id: 'FX-04', type: 'MR', ew: false, us: false, hrs: 18, snags: 1, sqn: '7 Sqn' },
      { id: 'FX-05', type: 'ST', ew: false, us: false, hrs: 26, snags: 0, sqn: '9 Sqn' },
      { id: 'FX-06', type: 'AS', ew: true, us: false, hrs: 9, snags: 2, sqn: '3 Sqn' },
      { id: 'FX-07', type: 'RC', ew: false, us: false, hrs: 38, snags: 0, sqn: '11 Sqn' },
      { id: 'FX-08', type: 'ST', ew: true, us: false, hrs: 47, snags: 1, sqn: '9 Sqn' },
      { id: 'FX-09', type: 'MR', ew: false, us: false, hrs: 22, snags: 0, sqn: '7 Sqn' },
      { id: 'FX-10', type: 'RC', ew: true, us: false, hrs: 14, snags: 1, sqn: '11 Sqn' },
      { id: 'FX-11', type: 'AS', ew: false, us: true, hrs: 0, snags: 3, sqn: '3 Sqn', note: 'Scheduled maintenance' },
      { id: 'FX-12', type: 'MR', ew: false, us: true, hrs: 0, snags: 2, sqn: '7 Sqn', note: 'Engine inspection' },
    ],
    crews: [
      { id: 'ARJUN', q: ['CAP', 'ESCORT', 'ALERT', 'STRIKE'], duty: 8, rested: true },
      { id: 'BAAZ', q: ['STRIKE', 'RECCE'], duty: 6, rested: true },
      { id: 'CHETAK', q: ['CAP', 'ESCORT', 'ALERT'], duty: 7, rested: true },
      { id: 'DHRUV', q: ['STRIKE', 'ESCORT', 'CAP'], duty: 4, rested: false },
      { id: 'GARUDA', q: ['RECCE', 'STRIKE'], duty: 7, rested: true },
      { id: 'KESARI', q: ['CAP', 'ALERT'], duty: 9, rested: true },
      { id: 'NAAG', q: ['STRIKE'], duty: 5, rested: true },
      { id: 'SHERA', q: ['CAP', 'ESCORT', 'STRIKE'], duty: 6, rested: true },
      { id: 'TOOFAN', q: ['RECCE', 'CAP'], duty: 3, rested: true },
      { id: 'VEER', q: ['ALERT', 'CAP', 'ESCORT'], duty: 7, rested: false },
    ],
    stock: { A2A: 10, PGM: 3, RECCE: 2 },
    areas: {
      A: { name: 'Sector A', threat: 0.2, wx: 'open', air: 'open', notam: 'None active' },
      B: { name: 'Sector B', threat: 0.35, wx: 'marginal', air: 'open', notam: 'Corridor B2 height-restricted' },
      C: { name: 'Sector C', threat: 0.7, wx: 'open', air: 'open', notam: 'None active' },
      D: { name: 'Sector D', threat: 0.5, wx: 'open', air: 'open', notam: 'Range D1 active 0900–1100' },
      H: { name: 'Home base', threat: 0.05, wx: 'open', air: 'open', notam: 'None active' },
    },
    missions: [
      { id: 'M-01', type: 'CAP', pri: 5, area: 'A', dur: 3, cfg: 'A2A', desc: 'Combat air patrol, northern corridor', tot: '07:30' },
      { id: 'M-02', type: 'STRIKE', pri: 4, area: 'C', dur: 2, cfg: 'PGM', desc: 'Strike on bridge, Sector C', tot: '08:15' },
      { id: 'M-03', type: 'RECCE', pri: 3, area: 'B', dur: 2, cfg: 'RECCE', desc: 'Route reconnaissance', tot: '09:00' },
      { id: 'M-04', type: 'ESCORT', pri: 4, area: 'C', dur: 2, cfg: 'A2A', desc: 'Escort for M-02 package', tot: '08:15' },
      { id: 'M-05', type: 'ALERT', pri: 5, area: 'H', dur: 4, cfg: 'A2A', desc: 'Air defence alert, home base', tot: '06:30' },
      { id: 'M-06', type: 'STRIKE', pri: 3, area: 'D', dur: 2, cfg: 'PGM', desc: 'Strike on logistics hub', tot: '12:45' },
      { id: 'M-07', type: 'CAP', pri: 2, area: 'D', dur: 3, cfg: 'A2A', desc: 'CAP over Sector D', tot: '14:30' },
      { id: 'M-08', type: 'RECCE', pri: 2, area: 'A', dur: 1.5, cfg: 'RECCE', desc: 'Battle damage assessment', tot: '15:30' },
    ],
    // 8-period threat history per sector (for the trend chart), oldest -> newest
    threatHistory: {
      A: [0.12, 0.14, 0.15, 0.18, 0.17, 0.2, 0.19, 0.2],
      B: [0.3, 0.28, 0.33, 0.31, 0.36, 0.34, 0.35, 0.35],
      C: [0.42, 0.48, 0.52, 0.55, 0.61, 0.66, 0.68, 0.7],
      D: [0.4, 0.44, 0.47, 0.45, 0.49, 0.52, 0.5, 0.5],
    },
    feeds: FEEDS.map((f) => ({ ...f })),
    fired: {},
    pinned: {},
    held: {},
    approved: {},
  };
}

export const DEFAULT_SETTINGS = {
  weights: { priority: 30, readiness: 20, crew: 15, threat: 15, weapon: 10, weather: 10 },
  ewThreshold: 0.8,
  dutyMargin: 0.5,
  stability: 4,
  watchBelow: 0.93,
  turnaround: 90, // min between an aircraft's sorties (refuel, re-arm, checks)
  crewRest: 60, // min between a crew's sorties
};

export const EVENTS = [
  {
    k: 'snag',
    title: 'Snag on M-02 strike aircraft',
    detail: 'Hydraulic failure, aircraft U/S',
    icon: 'wrench',
    feed: 'Aircraft availability',
  },
  { k: 'sam', title: 'Pop-up SAM in Sector A', detail: 'Threat 20% → 85%, EW pod now required', icon: 'radar', feed: 'Threat picture' },
  { k: 'wx', title: 'Weather closes Sector D', detail: 'Below minima for 3 hours', icon: 'cloud', feed: 'Weather' },
  { k: 'tst', title: 'New time-sensitive target', detail: 'Priority-5 strike, Sector B', icon: 'target', feed: 'Mission priorities' },
];

// Mutates a scenario copy for the given event. Returns a human-readable detail line.
export function applyEvent(S, k, plan) {
  if (k === 'snag') {
    const id = (plan['M-02'] && plan['M-02'].ac) || 'FX-04';
    const a = S.aircraft.find((x) => x.id === id);
    a.us = true;
    a.note = 'Hydraulic snag';
    return `${id} hydraulic failure, U/S`;
  }
  if (k === 'sam') {
    S.areas.A.threat = 0.85;
    S.threatHistory.A = [...S.threatHistory.A.slice(1), 0.85];
    return 'Threat in Sector A 20% → 85%; EW pod now required';
  }
  if (k === 'wx') {
    S.areas.D.wx = 'closed';
    return 'Sector D below minima for 3 hours';
  }
  if (k === 'tst') {
    const t = S.clock + 45;
    S.missions.push({ id: 'M-09', type: 'STRIKE', pri: 5, area: 'B', dur: 1.5, cfg: 'PGM', desc: 'Time-sensitive mobile target', tot: `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}` });
    return 'Priority-5 strike added in Sector B (M-09)';
  }
  return '';
}
