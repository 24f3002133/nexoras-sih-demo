import React, { useState } from 'react';
import { useStore } from '../state/store.jsx';
import { PageHeader, Kpi, Card, Seg, Pill, rowProps } from '../components/ui.jsx';
import TimeScrubber, { T0, T1, xPct } from '../components/TimeScrubber.jsx';
import TheatreMap from '../components/TheatreMap.jsx';
import { hhmm, planStats } from '../engine/engine.js';

const HOURS = Array.from({ length: (T1 - T0) / 60 + 1 }, (_, i) => T0 + i * 60);
const w = (a, b) => `${((Math.min(b, T1) - Math.max(a, T0)) / (T1 - T0)) * 100}%`;

function Bar({ m, r, changed, onOpen }) {
  const cls = ['gbar', r.status, changed ? 'changed' : '', r.wave === 2 ? 'w2' : ''].join(' ');
  return (
    <button className={cls} style={{ left: xPct(r.start), width: w(r.start, r.end) }} onClick={onOpen}
      title={`${m.id} ${m.type} · ${hhmm(r.start)}–${hhmm(r.end)} · ${r.ac || ''} ${r.crew || ''}${r.score ? ' · score ' + Math.round(r.score) : ''}`}>
      <span className="mono">{m.id}</span><span className="gbar-sub">{m.type}{r.status === 'approved' ? ' ✓' : ''}{r.wave === 2 ? ' · 2nd' : ''}</span>
    </button>
  );
}

// Compact single lane used inside the aircraft and crew popups
export function MiniLane({ items, gap, us }) {
  const { plan, open, highlight } = useStore();
  return (
    <div className="gtrack mini" style={us ? { background: 'repeating-linear-gradient(45deg, var(--surface-muted) 0 6px, transparent 6px 12px)' } : undefined}>
      {HOURS.map((h) => <i key={h} className="gtick" style={{ left: xPct(h) }} />)}
      {items.map((m) => (
        <React.Fragment key={m.id}>
          <Bar m={m} r={plan[m.id]} changed={highlight.includes(m.id)} onOpen={() => open('mission', m.id)} />
          <span className="gturn" style={{ left: xPct(plan[m.id].end), width: w(plan[m.id].end, plan[m.id].end + gap) }} />
        </React.Fragment>
      ))}
      {HOURS.filter((_, i) => i % 2 === 1).map((h) => <span key={'l' + h} className="glabel" style={{ left: xPct(h) }}>{hhmm(h).slice(0, 2)}</span>)}
    </div>
  );
}

export default function Timeline() {
  const st = useStore();
  const { S, plan, settings, highlight, open, viewTime } = st;
  const [lanes, setLanes] = useState('aircraft');
  const now = S.clock;
  const t = viewTime ?? now;
  const k = planStats(S, settings, plan);
  const tasked = S.missions.filter((m) => plan[m.id].ac);
  const airborneAt = (time) => tasked.filter((m) => plan[m.id].start <= time && time < plan[m.id].end).length;
  let peak = 0, peakAt = T0;
  for (let x = T0; x <= T1; x += 15) { const n = airborneAt(x); if (n > peak) { peak = n; peakAt = x; } }
  const rows = lanes === 'aircraft' ? S.aircraft : S.crews;
  const key = lanes === 'aircraft' ? 'ac' : 'crew';
  const gap = lanes === 'aircraft' ? settings.turnaround : settings.crewRest;
  const pending = S.missions.filter((m) => !plan[m.id].ac);
  return (
    <>
      <PageHeader title="Sortie Timeline" desc="The air tasking plan on the clock: when each aircraft and crew flies, the turnaround and rest between sorties, and who is airborne at any moment of the day."
        sources={['Optimiser', 'Duty roster']} />
      <div className="kpis">
        <Kpi label="Sorties today" value={k.tasked} sub={`${k.total - k.tasked} unfilled or held`} />
        <Kpi label="Second sorties" value={k.wave2} sub={`via ≥ ${settings.turnaround} min turnaround`} tone="primary" />
        <Kpi label="Airborne at" value={`${airborneAt(t)} @ ${hhmm(t)}`} sub={viewTime == null ? 'live clock' : 'scrubbed time'} />
        <Kpi label="Peak concurrent" value={peak} sub={`at ${hhmm(peakAt)}`} />
        <Kpi label="First / last recovery" value={tasked.length ? `${hhmm(Math.min(...tasked.map((m) => plan[m.id].start)))}–${hhmm(Math.max(...tasked.map((m) => plan[m.id].end)))}` : '—'} sub="block times" />
      </div>
      <Card title={lanes === 'aircraft' ? 'Aircraft lanes' : 'Crew lanes'} sub={`Bars run from start-up (TOT − 30 min) to recovery. Hatched blocks are the minimum ${lanes === 'aircraft' ? `turnaround (${settings.turnaround} min)` : `crew rest (${settings.crewRest} min)`}; no sortie can start inside one.`}
        right={<Seg options={[['aircraft', 'Aircraft'], ['crew', 'Crews']]} value={lanes} onChange={setLanes} />} style={{ marginTop: 18 }}>
        <TimeScrubber />
        <div className="gantt-wrap">
          <div className="gantt">
            <div className="grow ghead">
              <div className="glane-label" />
              <div className="gtrack head">
                {HOURS.map((h) => <span key={h} className="ghour" style={{ left: xPct(h) }}>{hhmm(h)}</span>)}
              </div>
            </div>
            {rows.map((row) => {
              const items = S.missions.filter((m) => plan[m.id][key] === row.id);
              const used = items.reduce((h, m) => h + m.dur, 0);
              const isAc = lanes === 'aircraft';
              return (
                <div className="grow" key={row.id}>
                  <div className="glane-label" {...rowProps(() => open(isAc ? 'aircraft' : 'crew', row.id))}>
                    <span className="mono" style={{ fontWeight: 600 }}>{isAc && row.us ? '✕ ' : ''}{row.id}</span>
                    <span className="muted" style={{ fontSize: 11.5 }}>{isAc ? (row.us ? 'U/S' : `${row.sqn}${row.ew ? ' · EW' : ''}`) : `${used}/${row.duty} h duty${row.rested ? '' : ' · not rested'}`}</span>
                  </div>
                  <div className="gtrack" style={isAc && row.us ? { background: 'repeating-linear-gradient(45deg, var(--surface-muted) 0 6px, transparent 6px 12px)' } : undefined}>
                    {HOURS.map((h) => <i key={h} className="gtick" style={{ left: xPct(h) }} />)}
                    {items.map((m) => (
                      <React.Fragment key={m.id}>
                        <Bar m={m} r={plan[m.id]} changed={highlight.includes(m.id)} onOpen={() => open('mission', m.id)} />
                        <span className="gturn" style={{ left: xPct(plan[m.id].end), width: w(plan[m.id].end, plan[m.id].end + gap) }} />
                      </React.Fragment>
                    ))}
                    {isAc && row.us && <span className="gnote">{row.note || 'Unserviceable'}</span>}
                  </div>
                </div>
              );
            })}
            {pending.length > 0 && (
              <div className="grow">
                <div className="glane-label"><span style={{ fontWeight: 600, color: 'var(--risk-high)' }}>Not tasked</span><span className="muted" style={{ fontSize: 11.5 }}>{pending.length} mission{pending.length > 1 ? 's' : ''}</span></div>
                <div className="gtrack">
                  {HOURS.map((h) => <i key={h} className="gtick" style={{ left: xPct(h) }} />)}
                  {pending.map((m) => <Bar key={m.id} m={m} r={plan[m.id]} changed={highlight.includes(m.id)} onOpen={() => open('mission', m.id)} />)}
                </div>
              </div>
            )}
            <div className="gnow" style={{ left: `calc(132px + (100% - 132px) * ${(now - T0) / (T1 - T0)})` }}><span>Now {hhmm(now)}</span></div>
            {viewTime != null && <div className="gnow scrub" style={{ left: `calc(132px + (100% - 132px) * ${(viewTime - T0) / (T1 - T0)})` }}><span>{hhmm(viewTime)}</span></div>}
          </div>
        </div>
        <div className="glegend">
          <span><i className="gsw proposed" />Proposed</span>
          <span><i className="gsw approved" />Approved</span>
          <span><i className="gsw changed" />Retasked</span>
          <span><i className="gsw w2" />Second sortie</span>
          <span><i className="gsw turn" />Turnaround / rest</span>
          <span><i className="gsw unfilled" />Unfilled / held</span>
          <span><i className="gsw now" />Now</span>
        </div>
      </Card>
      <div className="grid g-2">
        <Card title={`Airborne picture at ${hhmm(t)}`} sub="Scrub or play the day above — aircraft move along their routes on the map.">
          <TheatreMap height={330} compact />
        </Card>
        <Card title="How turnaround works" sub="Second sorties are found after the main assignment.">
          <ol className="steps">
            <li><b>Stage 1 — one sortie per airframe.</b> The optimiser assigns aircraft, then crews, to every mission it can, highest priority first.</li>
            <li><b>Stage 2 — second sorties.</b> Missions still uncovered may use an airframe that is already flying, if it lands ≥ {settings.turnaround} min before (or takes off ≥ {settings.turnaround} min after) and its inspection hours allow.</li>
            <li><b>Crew too.</b> A crew needs ≥ {settings.crewRest} min rest between sorties and total sortie hours within its duty limit minus a {settings.dutyMargin} h margin.</li>
          </ol>
          <div className="note info">Try it: in <button className="link-chip" onClick={() => st.go('retask')}>Retask console → What-if</button>, ground FX-01, FX-02 and FX-07. M-08 is then covered by a second sortie.</div>
          {k.wave2 > 0 && <div className="note ok">{k.wave2} mission{k.wave2 > 1 ? 's are' : ' is'} currently covered by a second sortie.</div>}
          <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {pending.map((m) => <Pill key={m.id} tone="high">{m.id}: {plan[m.id].reason}</Pill>)}
          </div>
        </Card>
      </div>
    </>
  );
}
