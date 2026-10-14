import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '../state/store.jsx';

const ms = (st) => (st.ripple ? st.ripple.ms.toFixed(1) : '<10');
const nChanged = (st) => (st.ripple ? st.ripple.changes.length : 0);

// Guided demo: each step drives the real console, then waits so the viewer can read it.
const STEPS = [
  {
    run: (st) => { if (!st.session) st.login('commander'); else if (st.session !== 'commander') st.switchRole('commander'); st.resetScenario(true); st.setViewTime(null); st.go('overview'); },
    title: 'Air picture',
    text: () => '7 feeds fused into one picture: 12 aircraft, 10 crews, 8 missions. The optimiser has tasked 8/8, and every line is scored and explainable.',
    dwell: 7000,
  },
  { run: (st) => st.go('timeline'), title: 'Sortie timeline', text: () => 'Every sortie on the clock, with aircraft turnaround and crew rest built in as hard limits.', dwell: 6000 },
  { run: (st) => st.setViewTime(9 * 60), title: 'Scrub the day', text: () => 'Move the clock to 09:00 and the map shows who is airborne and where, mission by mission.', dwell: 6000 },
  {
    run: (st) => { st.setViewTime(null); st.go('retask'); st.fireEvent('snag'); },
    title: 'A snag hits',
    text: (st) => `Hydraulic failure on FX-08. Re-solved in ${ms(st)} ms: only M-02 moved, to FX-05 + ARJUN. The other ${st.ripple ? st.ripple.unchanged : 7} sorties stayed put.`,
    dwell: 7500,
  },
  { run: (st) => st.open('mission', 'M-02'), title: 'Why this choice', text: () => 'FX-05 + ARJUN scores 24 + 19.2 + 15 + 4.5 + 10 + 10 = 83. All hard constraints pass, and ranked alternatives sit below.', dwell: 8500 },
  { run: (st) => st.approve('M-02'), title: 'Commander approves', text: () => 'The decision is written to the SHA-256 hash-chained audit log, with who approved it and when.', dwell: 6000 },
  {
    run: (st) => { st.close(); st.fireEvent('sam'); },
    title: 'Pop-up SAM',
    text: (st) => `Sector A threat jumps to 85%, so an EW pod becomes mandatory. ${nChanged(st)} sorties were re-balanced in ${ms(st)} ms.`,
    dwell: 7500,
  },
  { run: (st) => st.go('overview'), title: 'Map updates', text: () => 'Retasked routes turn violet and the new SAM ring appears in Sector A. Click any route or aircraft to drill in.', dwell: 6500 },
  { run: (st) => st.fireEvent('wx'), title: 'Weather closes Sector D', text: () => 'M-06 and M-07 are flagged unfilled with the reason shown. No rule is bent silently; the commander decides.', dwell: 7000 },
  { run: (st) => st.fireEvent('tst'), title: 'Time-sensitive target', text: (st) => `A priority-5 strike, M-09, is filled in ${ms(st)} ms from the assets the weather freed.`, dwell: 6500 },
  { run: (st) => st.go('decisions'), title: 'Decision log', text: () => 'Every event, re-plan and decision in one queue and one tamper-evident chain. Try “Tamper test”, then “Verify chain”.', dwell: 7000 },
  { run: (st) => st.toggleCopilot(true, 'why M-02'), title: 'Ops Copilot', text: () => 'Explains any assignment in plain language and runs what-ifs on request. It advises; the commander decides.', dwell: 7500 },
  {
    run: (st) => { st.toggleCopilot(false); st.go('overview'); },
    title: 'Tour complete',
    text: () => 'Fuse → Predict → Optimise → Retask → Approve. Explore freely, switch roles from the sidebar, or reset from the Retask console.',
    dwell: 0,
  },
];

export default function Tour() {
  const st = useStore();
  const ref = useRef(st);
  ref.current = st;
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [ran, setRan] = useState(-1);

  useEffect(() => { if (!st.tourOn) { setI(0); setRan(-1); setPaused(false); } }, [st.tourOn]);
  useEffect(() => {
    if (!st.tourOn || ran === i) return;
    STEPS[i].run(ref.current);
    setRan(i);
  }, [i, st.tourOn, ran]);
  useEffect(() => {
    if (!st.tourOn || paused || !STEPS[i].dwell || ran !== i) return undefined;
    const id = setTimeout(() => setI((x) => Math.min(STEPS.length - 1, x + 1)), STEPS[i].dwell);
    return () => clearTimeout(id);
  }, [i, paused, st.tourOn, ran]);

  if (!st.tourOn || !st.session) return null;
  const step = STEPS[i];
  const last = i === STEPS.length - 1;
  return (
    <div className="tour" role="dialog" aria-live="polite" aria-label="Guided demo">
      <div className="tour-top">
        <span className="tour-step mono">{i + 1} / {STEPS.length}</span>
        <b>{step.title}</b>
      </div>
      <p>{step.text(st)}</p>
      <div className="tour-progress"><i style={{ width: `${((i + 1) / STEPS.length) * 100}%` }} /></div>
      <div className="btn-row" style={{ gap: 8 }}>
        {!last && <button className="btn sm" onClick={() => setPaused(!paused)}>{paused ? '▶ Resume' : '❚❚ Pause'}</button>}
        {!last && <button className="btn ghost sm" onClick={() => setI(i + 1)}>Next →</button>}
        <button className={`btn ${last ? '' : 'ghost'} sm`} onClick={st.endTour}>{last ? 'Finish' : 'Exit tour'}</button>
      </div>
    </div>
  );
}
