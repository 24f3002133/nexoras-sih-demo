import React, { useState } from 'react';
import { useStore, verifyChain } from '../state/store.jsx';
import { PageHeader, Kpi, Card, Seg, Pill, ScorePill, StatusPill, rowProps, FactorLegend } from '../components/ui.jsx';

const KIND_TONE = { DECISION: 'approve', EVENT: 'high', 'RE-PLAN': 'changed', PLAN: 'info', UPDATE: 'med', 'WHAT-IF': 'changed', LINK: 'med', ACCESS: 'neutral', CONFIG: 'neutral', REPORT: 'info', SYSTEM: 'neutral', FEED: 'neutral' };

export default function Decisions() {
  const st = useStore();
  const { S, plan, log, highlight, open, can } = st;
  const [tab, setTab] = useState('pending');
  const [verify, setVerify] = useState(null);
  const pending = S.missions.filter((m) => plan[m.id].status === 'proposed');
  const resolved = S.missions.filter((m) => plan[m.id].status !== 'proposed');
  const decisions = log.filter((e) => e.kind === 'DECISION').length;
  const rows = tab === 'pending' ? pending : resolved;
  const tampered = log.some((e) => e.tampered);
  return (
    <>
      <PageHeader title="Decision Queue & Audit Log" desc="The commander's workbench — every recommendation awaiting a decision — and a tamper-evident, hash-chained record of every event, re-plan and decision."
        sources={['Decision log', 'SHA-256 chain']}
        actions={can('decide') && pending.length > 0 ? <button className="btn approve" onClick={st.approveAll}>Approve all {pending.length} proposed</button> : null} />
      <div className="kpis">
        <Kpi label="Awaiting decision" value={pending.length} tone={pending.length ? 'high' : 'clear'} sub="commander approval required" />
        <Kpi label="Approved" value={S.missions.filter((m) => plan[m.id].status === 'approved').length} tone="clear" sub="released to squadrons" />
        <Kpi label="Held / unfilled" value={S.missions.filter((m) => ['held', 'unfilled'].includes(plan[m.id].status)).length} tone="med" sub="with recorded reasons" />
        <Kpi label="Log entries" value={log.length} sub={`${decisions} decisions recorded`} />
        <Kpi label="Queued offline" value={st.queued} sub={st.degraded ? 'sync on reconnect' : 'link up'} tone={st.queued ? 'med' : undefined} />
      </div>
      <div style={{ marginTop: 22 }}>
        <Seg options={[['pending', `Awaiting decision (${pending.length})`], ['resolved', `Resolved (${resolved.length})`]]} value={tab} onChange={setTab} />
      </div>
      <Card style={{ marginTop: 12 }} bodyClass="">
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th>Mission</th><th>Recommendation</th><th>Score</th><th>Status</th><th>Why</th>{can('decide') && tab === 'pending' && <th />}</tr></thead>
            <tbody>
              {rows.map((m) => {
                const r = plan[m.id];
                return (
                  <tr key={m.id} className={`click ${highlight.includes(m.id) ? 'changed' : ''}`} {...rowProps(() => open('mission', m.id))}>
                    <td><div className="cell-main mono">{m.id}</div><div className="cell-sub">{m.desc}</div></td>
                    <td className="mono">{r.ac ? `${r.ac} + ${r.crew}` : '—'}</td>
                    <td><ScorePill score={r.score} /></td>
                    <td><StatusPill r={r} changed={highlight.includes(m.id)} /></td>
                    <td style={{ fontSize: 12.5 }} className="sec">{r.reason || (r.parts ? `Top factors: priority ${r.parts.priority.toFixed(0)}, readiness ${r.parts.readiness.toFixed(0)}, crew ${r.parts.crew.toFixed(0)}` : '')}</td>
                    {can('decide') && tab === 'pending' && (
                      <td onClick={(e) => e.stopPropagation()}>
                        <span className="btn-row" style={{ gap: 6, flexWrap: 'nowrap' }}>
                          <button className="btn approve sm" onClick={() => st.approve(m.id)}>Approve</button>
                          <button className="btn ghost sm" style={{ color: 'var(--act-modify)' }} onClick={() => open('mission', m.id)}>Modify / hold</button>
                        </span>
                      </td>
                    )}
                  </tr>
                );
              })}
              {rows.length === 0 && <tr><td colSpan={6} className="muted" style={{ textAlign: 'center', padding: 36 }}>{tab === 'pending' ? 'Nothing awaiting a decision.' : 'No resolved sorties yet.'}</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Hash-chained audit log" sub="Each entry stores sha256(previous hash | seq | time | kind | actor | text). Editing any past entry breaks every hash after it."
        style={{ marginTop: 18 }} bodyClass=""
        right={<div className="btn-row">
          <button className="btn sm" onClick={() => setVerify(verifyChain(log))}>Verify chain</button>
          {!tampered ? <button className="btn ghost sm" onClick={() => { st.tamperDemo(); setVerify(null); }}>Tamper test</button>
            : <button className="btn ghost sm" onClick={() => { st.undoTamper(); setVerify(null); }}>Restore original</button>}
        </div>}>
        {verify && (
          <div style={{ padding: '0 20px' }}>
            {verify.ok
              ? <div className="note ok">✓ Chain intact — {verify.n} entries verified. Head hash <span className="mono">{verify.head.slice(0, 24)}…</span></div>
              : <div className="note" style={{ background: 'var(--risk-high-wash)', color: 'var(--risk-high)' }}>✕ Chain broken at entry #{verify.at} — the record was altered after it was written. Tampering is detected, not hidden.</div>}
          </div>
        )}
        <div className="tbl-wrap" style={{ marginTop: 12, maxHeight: 480, overflowY: 'auto' }}>
          <table className="tbl">
            <thead><tr><th>#</th><th>Time</th><th>Kind</th><th>Actor</th><th>Entry</th><th>Hash</th></tr></thead>
            <tbody>
              {[...log].reverse().map((e) => (
                <tr key={e.seq} style={e.tampered ? { background: 'var(--risk-high-wash)' } : undefined}>
                  <td className="muted mono">{e.seq}</td>
                  <td className="mono">{e.t}</td>
                  <td><Pill tone={KIND_TONE[e.kind] || 'neutral'}>{e.kind}</Pill></td>
                  <td style={{ fontSize: 12.5 }}>{e.actor}</td>
                  <td style={{ fontSize: 13 }}>{e.text}</td>
                  <td className="mono muted" style={{ fontSize: 11.5 }} title={e.hash}>{e.hash.slice(0, 12)}…</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
