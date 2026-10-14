import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '../state/store.jsx';
import { alternatives, constraintReport, pServ, pct, FACTORS, planStats, solve, diffPlans, hhmm } from '../engine/engine.js';

const PAGE_LABEL = { overview: 'the air picture', tasking: 'the tasking plan', timeline: 'the sortie timeline', fleet: 'fleet & crew readiness', threat: 'threat & airspace', retask: 'the retask console', decisions: 'the decision queue', reports: 'reports', settings: 'settings' };

function explainMission(st, id) {
  const { S, plan, settings } = st;
  const m = S.missions.find((x) => x.id === id);
  if (!m) return `I can't find ${id}.`;
  const r = plan[id];
  if (!r.ac) return `${id} (${m.desc}) is ${r.status.toUpperCase()}: ${r.reason}. No constraint was relaxed to fill it — that's the commander's call.`;
  const top = FACTORS.map((f) => [f.label, r.parts[f.key], settings.weights[f.key]]).sort((a, b) => b[2] - b[1] - (a[2] - a[1]));
  const strong = [...top].sort((a, b) => b[1] / (b[2] || 1) - a[1] / (a[2] || 1)).slice(0, 2).map((x) => x[0].toLowerCase());
  const weak = top[0];
  const checks = constraintReport(S, settings, m, plan);
  const a = S.aircraft.find((x) => x.id === r.ac);
  return `${id} → ${r.ac} + ${r.crew}, score ${Math.round(r.score)}/100.\n\nStrongest factors: ${strong.join(' and ')}. Biggest drag: ${weak[0].toLowerCase()} (${weak[1].toFixed(1)} of ${weak[2]}).\n${r.ac} has P(serviceable) ${pct(pServ(a))}${a.ew ? ' and an EW pod' : ''}; sector threat ${pct(S.areas[m.area].threat)}.\nAll ${checks.filter((c) => c.ok).length}/${checks.length} hard constraints pass.`;
}
function whyNot(st, id) {
  const { S, plan, settings } = st;
  const alts = alternatives(S, settings, plan, id, 2);
  const r = plan[id];
  if (!r || !r.ac) return 'There is no current assignment to compare against.';
  if (!alts.length) return `No other free aircraft–crew pair can legally fly ${id}; the alternatives are all tasked or blocked by hard constraints.`;
  return `Runner-up for ${id}: ${alts[0].ac} + ${alts[0].crew} at ${Math.round(alts[0].score)} — ${(r.score - alts[0].score).toFixed(1)} points below the chosen ${r.ac} + ${r.crew}.${alts[1] ? `\nThird option: ${alts[1].ac} + ${alts[1].crew} at ${Math.round(alts[1].score)}.` : ''}\nThe commander can pick either with “Modify” and the rest of the plan re-solves around it.`;
}
function draftOrder(st) {
  const { S, plan } = st;
  const lines = S.missions.filter((m) => plan[m.id].ac).map((m) => `${m.id} ${m.type.padEnd(6)} TOT ${m.tot}  ${plan[m.id].ac}/${plan[m.id].crew}  ${m.cfg}  (${S.areas[m.area].name})`);
  const un = S.missions.filter((m) => !plan[m.id].ac).map((m) => `${m.id}: ${plan[m.id].reason}`);
  return `DRAFT TASKING ORDER — for commander approval\n\n${lines.join('\n')}${un.length ? `\n\nNot tasked:\n${un.join('\n')}` : ''}\n\nExport the signed version from Reports → Air Tasking Order.`;
}
function retaskSummary(st) {
  const r = st.ripple;
  if (!r) return 'No re-plan yet. Try the Retask console: inject “Snag on M-02 strike aircraft” and only M-02 should move.';
  return `Last re-plan at ${r.at}: “${r.cause}”${r.detail ? ` (${r.detail})` : ''}.\nSolved in ${r.ms.toFixed(1)} ms; ${r.changes.length} sortie(s) changed, ${r.unchanged} unchanged.\n${r.changes.map((c) => `• ${c.id}: ${c.before} → ${c.after}${c.reason ? ` — ${c.reason}` : ''}`).join('\n') || '• nothing moved'}`;
}
function atRisk(st) {
  const { S, plan, settings } = st;
  const k = planStats(S, settings, plan);
  const weak = S.missions.filter((m) => plan[m.id].score && plan[m.id].score < 80).map((m) => `${m.id} (${Math.round(plan[m.id].score)})`);
  const un = S.missions.filter((m) => !plan[m.id].ac).map((m) => `${m.id}: ${plan[m.id].reason}`);
  const watch = S.aircraft.filter((a) => !a.us && pServ(a) < settings.watchBelow).map((a) => a.id);
  return `${k.tasked}/${k.total} missions tasked.\nLower-confidence sorties (<80): ${weak.join(', ') || 'none'}.\nUnfilled/held: ${un.join('; ') || 'none'}.\nAirframes on watch: ${watch.join(', ') || 'none'}.\nHigh-threat sectors: ${Object.entries(S.areas).filter(([key, a]) => key !== 'H' && a.threat >= 0.6).map(([key, a]) => `${key} ${pct(a.threat)}`).join(', ') || 'none'}.`;
}

function whatIf(st, text) {
  const up = text.toUpperCase();
  const T = structuredClone(st.S);
  const parts = [];
  for (const mm of up.matchAll(/FX-?(\d{1,2})/g)) {
    const id = `FX-${mm[1].padStart(2, '0')}`; const a = T.aircraft.find((x) => x.id === id);
    if (a && !a.us) { a.us = true; parts.push(`${id} U/S`); }
  }
  for (const mm of up.matchAll(/SECTOR ([ABCD])[^.]*?(CLOS|WEATHER)/g)) { T.areas[mm[1]].wx = 'closed'; parts.push(`Sector ${mm[1]} closed`); }
  for (const mm of up.matchAll(/(?:THREAT[^0-9]*?SECTOR ([ABCD])|SECTOR ([ABCD])[^0-9]*?THREAT)[^0-9]*?(\d{1,3})/g)) { const k = mm[1] || mm[2]; T.areas[k].threat = Math.min(1, Number(mm[3]) / 100); parts.push(`Sector ${k} threat ${mm[3]}%`); }
  if (!parts.length) return 'Tell me what to change, for example “what if FX-05 goes U/S?”, “what if Sector C closes for weather?” or “what if threat in Sector B rises to 80?”.';
  const r = solve(T, st.settings, st.plan);
  const ch = diffPlans(T, st.plan, r.plan);
  const k = planStats(T, st.settings, r.plan);
  return `What-if (${parts.join(', ')}) — simulated on a copy, live plan untouched.\nSolved in ${r.ms.toFixed(1)} ms · ${k.tasked}/${k.total} tasked${k.wave2 ? ` · ${k.wave2} via second sortie` : ''}.\n${ch.map((c) => `• ${c.id}: ${c.before} → ${c.after}${c.reason ? ` (${c.reason})` : ''}`).join('\n') || '• No sortie would change.'}\nTo apply it, use Retask console → What-if → Commit.`;
}
function brief(st) {
  const { S, plan, settings } = st;
  const k = planStats(S, settings, plan);
  return `Situation at ${hhmm(S.clock)}: ${k.ready}/${S.aircraft.length} aircraft ready (${k.watch} watch, ${k.us} U/S). ${k.tasked}/${k.total} missions tasked, ${k.approved} approved, average score ${Math.round(k.avgScore)}. ${k.highThreat} high-threat sector(s).${st.ripple ? ` Last retask: “${st.ripple.cause}” — ${st.ripple.changes.length} changed.` : ''}`;
}
function compare(st, a, b) {
  const pa = st.plan[a], pb = st.plan[b];
  if (!pa || !pb) return 'I can only compare missions that exist, e.g. “compare M-01 and M-02”.';
  const row = (id, r) => `${id}: ${r.ac ? `${r.ac}+${r.crew}, score ${Math.round(r.score)}` : r.status}`;
  if (!pa.parts || !pb.parts) return `${row(a, pa)}\n${row(b, pb)}`;
  const diffs = FACTORS.map((f) => [f.label, pa.parts[f.key] - pb.parts[f.key]]).filter(([, d]) => Math.abs(d) >= 0.5).sort((x, y) => Math.abs(y[1]) - Math.abs(x[1]));
  return `${row(a, pa)}\n${row(b, pb)}\nBiggest differences: ${diffs.slice(0, 3).map(([l, d]) => `${l.toLowerCase()} ${d > 0 ? '+' : ''}${d.toFixed(1)} for ${a}`).join('; ') || 'none'}.`;
}

function answer(st, text, ctxId) {
  const t = text.toLowerCase();
  const S = st.S;
  if (/what if|what-if|simulate|suppose/.test(t)) return whatIf(st, text);
  const cmp = text.toUpperCase().match(/M-?0?(\d)\D+M-?0?(\d)/);
  if (/compare|versus|\bvs\b/.test(t) && cmp) return compare(st, `M-0${cmp[1]}`, `M-0${cmp[2]}`);
  if (/brief|summary|summar|status|overview|situation/.test(t) && !/retask|last/.test(t)) return brief(st);
  if (/^(help|\?|hi|hello|hey)\b/.test(t)) return null;
  const mm = text.toUpperCase().match(/M-?0?(\d)\b/);
  if (/why not|runner|alternative/.test(t)) return whyNot(st, mm ? `M-0${mm[1]}` : ctxId || 'M-02');
  if (mm) return explainMission(st, `M-0${mm[1]}`);
  const ac = text.toUpperCase().match(/FX-?(\d{1,2})/);
  if (ac) {
    const id = `FX-${ac[1].padStart(2, '0')}`; const a = S.aircraft.find((x) => x.id === id);
    if (!a) return `No aircraft ${id}.`;
    const tk = Object.entries(st.plan).filter(([, r]) => r.ac === id).map(([m, r]) => `${m} with ${r.crew} (${hhmm(r.start)}–${hhmm(r.end)})`);
    return `${id}: ${a.us ? 'UNSERVICEABLE' + (a.note ? ` (${a.note})` : '') : `P(serviceable, 6 h) ${pct(pServ(a))}`}, ${a.hrs} h to inspection, ${a.snags} open snag(s)${a.ew ? ', EW pod fitted' : ''}. ${tk.length ? `Tasked on ${tk.join('; ')}.` : 'Not tasked.'}`;
  }
  const crew = S.crews.find((c) => t.includes(c.id.toLowerCase()));
  if (crew) { const tk = Object.entries(st.plan).find(([, r]) => r.crew === crew.id); return `${crew.id}: qualified ${crew.q.join(', ')}; ${crew.duty} h duty left; ${crew.rested ? 'rested' : 'not rested'}. ${tk ? `Tasked on ${tk[0]}.` : 'Spare.'}`; }
  if (/retask|chang|ripple|what happened/.test(t)) return retaskSummary(st);
  if (/risk|unfilled|weak|problem|concern/.test(t)) return atRisk(st);
  if (/order|ato|tasking sheet|draft/.test(t)) return draftOrder(st);
  if (/sector|threat|sam|weather/.test(t)) return Object.entries(S.areas).filter(([k]) => k !== 'H').map(([k, a]) => `Sector ${k}: threat ${pct(a.threat)}, weather ${a.wx}, airspace ${a.air}${a.threat >= st.settings.ewThreshold ? ' — EW pod required' : ''}`).join('\n');
  if (/approve|pending|decision/.test(t)) { const n = S.missions.filter((m) => st.plan[m.id].status === 'proposed').length; return `${n} sortie(s) await commander approval. ${st.can('decide') ? 'Use “Approve all proposed” on the Tasking plan or open each mission to approve, modify or hold.' : 'Only the Air Commander can approve.'}`; }
  if (/explain|why/.test(t) && ctxId) return explainMission(st, ctxId);
  return null;
}
const HELP = 'I can explain any assignment (try “why M-02?”), compare alternatives (“why not the runner-up?”), report aircraft or crew status (“FX-05”, “ARJUN”), summarise the last retask, list sorties at risk, or draft the tasking order. Ask “brief me”, “compare M-01 and M-02”, or a what-if such as “what if FX-05 goes U/S?”. I only read the console\'s data — I never change the plan myself.';

export default function Copilot() {
  const st = useStore();
  const ctxId = st.modal && st.modal.type === 'mission' ? st.modal.id : null;
  const ctx = ctxId ? `mission ${ctxId}` : PAGE_LABEL[st.page];
  const [msgs, setMsgs] = useState([{ who: 'bot', text: `I'm looking at ${ctx}. Ask me why a sortie was assigned, what changed in the last retask, or for a draft tasking order. I explain — the commander decides.` }]);
  const [draft, setDraft] = useState('');
  const [listening, setListening] = useState(false);
  const end = useRef(null);
  const recRef = useRef(null);
  useEffect(() => { end.current && end.current.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);
  const [mode, setMode] = useState('explainer');
  const ask = async (q, shown) => {
    const local = answer(st, q, ctxId);
    if (local) { setMsgs((m) => [...m, { who: 'me', text: shown || q }, { who: 'bot', text: local }]); return; }
    setMsgs((m) => [...m, { who: 'me', text: shown || q }, { who: 'bot', text: '…', pending: true }]);
    let text = HELP;
    try {
      const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), 9000);
      const k = planStats(st.S, st.settings, st.plan);
      const context = { clock: hhmm(st.S.clock), stats: k, missions: st.S.missions.map((m) => ({ id: m.id, type: m.type, pri: m.pri, area: m.area, tot: m.tot, ...st.plan[m.id], parts: undefined })), sectors: st.S.areas, lastRetask: st.ripple && { cause: st.ripple.cause, changes: st.ripple.changes } };
      const res = await fetch('./api/ask', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ question: q, context }), signal: ctl.signal });
      clearTimeout(to);
      if (res.ok) { const j = await res.json(); if (j && j.answer) { text = j.answer; setMode('llm'); } }
    } catch { /* offline or no API: stay in explainer mode */ }
    setMsgs((m) => [...m.filter((x) => !x.pending), { who: 'bot', text }]);
  };
  useEffect(() => { if (st.copilotSeed) ask(st.copilotSeed, 'Why this assignment (M-02)?'); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const send = () => { if (!draft.trim()) return; ask(draft.trim()); setDraft(''); };
  const SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
  const mic = () => {
    if (!SR) { setMsgs((m) => [...m, { who: 'bot', text: 'Voice input is not supported in this browser — type your question instead.' }]); return; }
    if (listening && recRef.current) { recRef.current.stop(); return; }
    const rec = new SR(); rec.lang = 'en-IN'; rec.interimResults = false;
    rec.onresult = (e) => setDraft((d) => (d ? d + ' ' : '') + e.results[0][0].transcript);
    rec.onend = () => setListening(false);
    recRef.current = rec; setListening(true); rec.start();
  };
  return (
    <div className="copilot" role="dialog" aria-label="Ops copilot">
      <div className="cp-head">
        <div className="cp-av">AI</div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--copilot-accent)', display: 'flex', gap: 8, alignItems: 'center' }}>Ops Copilot <span className="cp-mode">{mode === 'llm' ? 'LLM connected' : 'Grounded explainer'}</span></div>
          <div className="muted" style={{ fontSize: 11.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Context: {ctx}</div>
        </div>
        {msgs.length > 1 && <button className="cp-chip" style={{ marginLeft: 'auto' }} onClick={() => setMsgs(msgs.slice(0, 1))}>Clear</button>}
      </div>
      <div className="cp-msgs">
        {msgs.map((m, i) => <div key={i} className={`cp-msg ${m.who}`}>{m.text}</div>)}
        <div ref={end} />
      </div>
      <div className="cp-chips">
        <button className="cp-chip" onClick={() => ask(`why ${ctxId || 'M-02'}`, `Why this assignment${ctxId ? ` (${ctxId})` : ' (M-02)'}?`)}>Why this assignment?</button>
        <button className="cp-chip" onClick={() => ask(`why not runner-up ${ctxId || 'M-02'}`, 'Why not the runner-up?')}>Why not the runner-up?</button>
        <button className="cp-chip" onClick={() => ask('what changed in the last retask', 'Summarise the last retask')}>Summarise last retask</button>
        <button className="cp-chip" onClick={() => ask('which sorties are at risk', 'Which sorties are at risk?')}>Sorties at risk</button>
        <button className="cp-chip" onClick={() => ask('draft tasking order', 'Draft the tasking order')}>Draft tasking order</button>
        <button className="cp-chip" onClick={() => ask('what if FX-05 goes u/s', 'What if FX-05 goes U/S?')}>What if FX-05 goes U/S?</button>
        <button className="cp-chip" onClick={() => ask('brief me', 'Brief me')}>Brief me</button>
      </div>
      <div className="cp-input">
        <textarea value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder="Ask about a mission, aircraft, crew or sector…" aria-label="Ask the copilot" />
        <button className="cp-send" style={{ background: listening ? 'var(--risk-high)' : 'var(--surface-muted)', color: listening ? '#fff' : 'var(--text-primary)' }} onClick={mic} aria-label="Voice input" title="Voice input">{listening ? '■' : '🎙'}</button>
        <button className="cp-send" onClick={send} aria-label="Send">➤</button>
      </div>
    </div>
  );
}
