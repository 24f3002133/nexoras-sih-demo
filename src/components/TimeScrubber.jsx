import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '../state/store.jsx';
import { hhmm } from '../engine/engine.js';

export const T0 = 5 * 60, T1 = 18 * 60;
export const xPct = (t) => `${((Math.max(T0, Math.min(T1, t)) - T0) / (T1 - T0)) * 100}%`;

// Shared clock for the map and the timeline: live (= console clock) or scrubbed.
export default function TimeScrubber({ compact }) {
  const { S, viewTime, setViewTime } = useStore();
  const [playing, setPlaying] = useState(false);
  const tRef = useRef(viewTime ?? S.clock);
  tRef.current = viewTime ?? S.clock;
  useEffect(() => {
    if (!playing) return undefined;
    const id = setInterval(() => {
      const n = tRef.current + 5;
      if (n >= T1) { setPlaying(false); setViewTime(T1); return; }
      setViewTime(n);
    }, 110);
    return () => clearInterval(id);
  }, [playing, setViewTime]);
  useEffect(() => () => setPlaying(false), []);
  const t = viewTime ?? S.clock;
  const live = viewTime == null;
  return (
    <div className="scrubber" style={compact ? { marginTop: 10 } : undefined}>
      <button className="btn sm" onClick={() => { if (!playing && t >= T1 - 5) setViewTime(T0); setPlaying(!playing); }} aria-label={playing ? 'Pause time playback' : 'Play the day'}>{playing ? '❚❚ Pause' : '▶ Play day'}</button>
      <input id={compact ? 'scrub-compact' : 'scrub-main'} type="range" min={T0} max={T1} step="5" value={t} onChange={(e) => { setPlaying(false); setViewTime(Number(e.target.value)); }} aria-label="Time of day" />
      <span className="scrub-time mono">{hhmm(t)}</span>
      {live ? <span className="pill clear"><span className="d" />Live</span> : <button className="btn ghost sm" onClick={() => { setPlaying(false); setViewTime(null); }}>Back to live {hhmm(S.clock)}</button>}
    </div>
  );
}
