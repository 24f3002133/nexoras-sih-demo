import React, { useMemo } from 'react';
import { useStore } from '../state/store.jsx';
import { hhmm } from '../engine/engine.js';

export const SECTORS = {
  A: { pts: '40,40 300,30 310,170 60,190', c: [178, 104] },
  C: { pts: '310,25 600,40 592,188 322,174', c: [458, 104] },
  B: { pts: '58,196 316,180 302,300 72,322', c: [186, 252] },
  D: { pts: '322,180 592,196 600,328 306,304', c: [458, 256] },
};
const BASE = [118, 380];
const KM = 1; // 1 svg unit ≈ 1 km

function contour(cx, cy, R, ph) {
  const pts = [];
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    const r = R * (1 + 0.16 * Math.sin(3 * a + ph) + 0.09 * Math.sin(5 * a + ph * 2));
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * 0.72 * Math.sin(a)).toFixed(1)}`);
  }
  return `M${pts.join('L')}Z`;
}
const quad = (p0, c, p2, u) => [
  (1 - u) * (1 - u) * p0[0] + 2 * (1 - u) * u * c[0] + u * u * p2[0],
  (1 - u) * (1 - u) * p0[1] + 2 * (1 - u) * u * c[1] + u * u * p2[1],
];
const PLANE = 'M0 -8 L1.6 -3 L8 1 L8 3 L1.6 1.4 L1.2 5.5 L3.4 7.4 L3.4 8.4 L0 7.6 L-3.4 8.4 L-3.4 7.4 L-1.2 5.5 L-1.6 1.4 L-8 3 L-8 1 L-1.6 -3 Z';

// Stylised (fictional) theatre: four sectors + home base. Shading = threat level.
export default function TheatreMap({ height = 380, onSector, showRoutes = true, compact = false }) {
  const { S, plan, highlight, open, settings, viewTime } = useStore();
  const t = viewTime ?? S.clock;
  const go = onSector || ((k) => open('sector', k));
  const terrain = useMemo(() => [
    [200, 120, 70, 0.4], [470, 250, 80, 1.7], [520, 90, 55, 2.6], [190, 270, 45, 4.1],
  ].flatMap(([x, y, R, ph]) => [1, 0.68, 0.38].map((k, i) => ({ d: contour(x, y, R * k, ph + i * 0.5), i }))), []);
  const routes = showRoutes ? S.missions.filter((m) => plan[m.id] && plan[m.id].ac) : [];
  const count = {};
  routes.forEach((m) => { count[m.area] = (count[m.area] || 0) + 1; });
  const seen = {};
  const geo = routes.map((m) => {
    if (m.area === 'H') return { m, home: true };
    const i = (seen[m.area] = (seen[m.area] || 0) + 1);
    const [cx, cy] = SECTORS[m.area].c;
    const n = count[m.area];
    const tx = cx - (n * 50) / 2 + (i - 1) * 50 + 5, ty = cy + 34;
    const ctrl = [(BASE[0] + tx) / 2 - 20, (BASE[1] + ty) / 2];
    return { m, tgt: [tx, ty], ctrl };
  });
  const airborne = geo.map((g) => {
    const r = plan[g.m.id];
    if (!(r.start <= t && t < r.end)) return null;
    const p = (t - r.start) / (r.end - r.start);
    let pos, nxt;
    if (g.home) {
      const a = p * Math.PI * 6;
      pos = [BASE[0] + 26 * Math.cos(a), BASE[1] - 40 + 18 * Math.sin(a)];
      nxt = [BASE[0] + 26 * Math.cos(a + 0.1), BASE[1] - 40 + 18 * Math.sin(a + 0.1)];
    } else if (p < 0.25) {
      const u = p / 0.25; pos = quad(BASE, g.ctrl, g.tgt, u); nxt = quad(BASE, g.ctrl, g.tgt, Math.min(1, u + 0.02));
    } else if (p < 0.75) {
      const a = ((p - 0.25) / 0.5) * Math.PI * 4;
      pos = [g.tgt[0] + 14 + 12 * Math.cos(a), g.tgt[1] - 14 + 9 * Math.sin(a)];
      nxt = [g.tgt[0] + 14 + 12 * Math.cos(a + 0.1), g.tgt[1] - 14 + 9 * Math.sin(a + 0.1)];
    } else {
      const u = 1 - (p - 0.75) / 0.25; pos = quad(BASE, g.ctrl, g.tgt, u); nxt = quad(BASE, g.ctrl, g.tgt, Math.max(0, u - 0.02));
    }
    const ang = (Math.atan2(nxt[1] - pos[1], nxt[0] - pos[0]) * 180) / Math.PI + 90;
    return { id: g.m.id, ac: r.ac, pos, ang, ch: highlight.includes(g.m.id) };
  }).filter(Boolean);

  return (
    <div style={{ background: 'var(--map-bg)', border: '1px solid var(--border-color)', borderRadius: 10, overflow: 'hidden' }}>
      <svg viewBox="0 0 640 420" width="100%" height={height} role="img" aria-label={`Theatre map at ${hhmm(t)}: sectors A to D shaded by threat level, ${airborne.length} aircraft airborne`} style={{ display: 'block' }}>
        <defs>
          <pattern id="grid" width="80" height="70" patternUnits="userSpaceOnUse"><path d="M80 0H0V70" fill="none" stroke="var(--map-grid)" strokeWidth="1" /></pattern>
          <pattern id="wx" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="10" stroke="var(--text-muted)" strokeWidth="3" opacity=".35" /></pattern>
          <marker id="arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--primary)" /></marker>
          <marker id="arrc" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--changed)" /></marker>
        </defs>
        <rect width="640" height="420" fill="url(#grid)" />
        {terrain.map((c, i) => <path key={i} d={c.d} fill="none" stroke="var(--map-line)" strokeWidth={c.i === 0 ? 1.2 : 0.9} opacity={0.55 - c.i * 0.1} />)}
        <path d="M0 210 C120 190 200 240 330 205 S520 170 640 215" fill="none" stroke="var(--map-line)" strokeWidth="5" opacity=".6" />
        <path d="M260 0 C250 80 300 140 280 210 S300 330 270 420" fill="none" stroke="var(--map-line)" strokeWidth="2" strokeDasharray="6 6" opacity=".7" />
        {/* grid references */}
        {Array.from({ length: 8 }).map((_, i) => <text key={'gx' + i} x={i * 80 + 40} y="12" textAnchor="middle" fontSize="9" fill="var(--text-muted)" fontFamily="IBM Plex Mono, monospace">{41 + i}</text>)}
        {Array.from({ length: 6 }).map((_, i) => <text key={'gy' + i} x="5" y={i * 70 + 38} fontSize="9" fill="var(--text-muted)" fontFamily="IBM Plex Mono, monospace">{36 - i}</text>)}
        {/* range rings from home base */}
        {[150, 300].map((r) => (
          <g key={r}>
            <circle cx={BASE[0]} cy={BASE[1]} r={r * KM} fill="none" stroke="var(--primary)" strokeOpacity=".22" strokeDasharray="2 5" />
            <text x={BASE[0] + r * 0.72} y={BASE[1] - r * 0.69} fontSize="9.5" fill="var(--primary)" opacity=".6">{r} km</text>
          </g>
        ))}
        {Object.entries(SECTORS).map(([k, s]) => {
          const ar = S.areas[k];
          const op = 0.08 + 0.55 * ar.threat;
          const sam = ar.threat >= 0.6;
          return (
            <g key={k} onClick={() => go(k)} style={{ cursor: 'pointer' }} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && go(k)} aria-label={`${ar.name}, threat ${Math.round(ar.threat * 100)} percent`}>
              <polygon points={s.pts} fill="var(--risk-high)" fillOpacity={op} stroke="var(--text-primary)" strokeOpacity=".55" strokeWidth="1.5" />
              {ar.wx === 'closed' && <polygon points={s.pts} fill="url(#wx)" />}
              {sam && (
                <g>
                  <circle cx={s.c[0] + 40} cy={s.c[1] + 18} r={30 + ar.threat * 30} fill="var(--risk-high)" fillOpacity=".06" stroke="var(--risk-high)" strokeWidth="1.5" strokeDasharray="4 4" />
                  <path d={`M${s.c[0] + 40} ${s.c[1] + 9} l8 14 h-16 z`} fill="var(--risk-high)" />
                  <text x={s.c[0] + 52} y={s.c[1] + 26} fontSize="9.5" fontWeight="700" fill="var(--risk-high)">SAM</text>
                </g>
              )}
              <text x={s.c[0]} y={s.c[1] - 8} textAnchor="middle" fontFamily="Source Serif 4, serif" fontWeight="700" fontSize="20" fill="var(--text-primary)">{k}</text>
              {!compact && <text x={s.c[0]} y={s.c[1] + 12} textAnchor="middle" fontSize="12" fontWeight="600" fill="var(--text-primary)">
                {Math.round(ar.threat * 100)}% threat{ar.wx !== 'open' ? ` · wx ${ar.wx}` : ''}{ar.threat >= settings.ewThreshold ? ' · EW req.' : ''}
              </text>}
            </g>
          );
        })}
        {geo.map((g) => {
          const ch = highlight.includes(g.m.id);
          if (g.home) {
            return (
              <g key={g.m.id} onClick={() => open('mission', g.m.id)} style={{ cursor: 'pointer' }}>
                <ellipse cx={BASE[0]} cy={BASE[1] - 40} rx="26" ry="18" fill="none" stroke={ch ? 'var(--changed)' : 'var(--primary)'} strokeWidth="1.3" strokeDasharray="3 4" />
                <text x={BASE[0] + 30} y={BASE[1] - 52} fontSize="10.5" fontWeight="600" fill="var(--primary)" fontFamily="IBM Plex Mono, monospace">{g.m.id} ALERT</text>
              </g>
            );
          }
          const [tx, ty] = g.tgt;
          return (
            <g key={g.m.id} onClick={() => open('mission', g.m.id)} style={{ cursor: 'pointer' }}>
              <path d={`M${BASE[0]} ${BASE[1]} Q ${g.ctrl[0]} ${g.ctrl[1]} ${tx} ${ty}`} fill="none" stroke={ch ? 'var(--changed)' : 'var(--primary)'} strokeWidth={ch ? 2.2 : 1.3} strokeDasharray={ch ? '6 4' : 'none'} opacity=".7" markerEnd={`url(#${ch ? 'arrc' : 'arr'})`} />
              <rect x={tx - 2} y={ty + 4} width="40" height="15" rx="3" fill="var(--card-bg)" stroke={ch ? 'var(--changed)' : 'var(--border-color)'} />
              <text x={tx + 18} y={ty + 15} textAnchor="middle" fontSize="10" fontWeight="700" fill={ch ? 'var(--changed)' : 'var(--text-primary)'} fontFamily="IBM Plex Mono, monospace">{g.m.id}</text>
            </g>
          );
        })}
        {airborne.map((a) => (
          <g key={a.id} transform={`translate(${a.pos[0].toFixed(1)} ${a.pos[1].toFixed(1)})`} onClick={() => open('mission', a.id)} style={{ cursor: 'pointer' }}>
            <circle r="11" fill="var(--card-bg)" opacity=".85" />
            <path d={PLANE} transform={`rotate(${a.ang.toFixed(0)})`} fill={a.ch ? 'var(--changed)' : 'var(--primary)'} />
            {!compact && <text x="12" y="-8" fontSize="9.5" fontWeight="700" fill="var(--text-primary)" fontFamily="IBM Plex Mono, monospace">{a.ac}</text>}
          </g>
        ))}
        <g>
          <rect x={BASE[0] - 9} y={BASE[1] - 9} width="18" height="18" transform={`rotate(45 ${BASE[0]} ${BASE[1]})`} fill="var(--primary)" />
          <text x={BASE[0]} y={BASE[1] + 30} textAnchor="middle" fontSize="11.5" fontWeight="700" fill="var(--text-primary)">HOME BASE</text>
        </g>
        {/* scale bar */}
        <g transform="translate(470 396)" fill="var(--text-muted)" fontSize="9.5">
          <rect x="0" y="0" width="50" height="5" fill="var(--text-muted)" />
          <rect x="50" y="0" width="50" height="5" fill="none" stroke="var(--text-muted)" />
          <text x="0" y="-4" textAnchor="middle">0</text><text x="50" y="-4" textAnchor="middle">50</text><text x="100" y="-4" textAnchor="middle">100 km</text>
        </g>
        <g transform="translate(612 380)" fill="var(--text-muted)" fontSize="11" fontWeight="700">
          <path d="M0 -26 L6 -10 L0 -14 L-6 -10 Z" fill="var(--text-muted)" />
          <text x="0" y="2" textAnchor="middle">N</text>
        </g>
        <g transform="translate(560 26)">
          <rect x="-4" y="-13" width="78" height="20" rx="4" fill="var(--card-bg)" stroke="var(--border-color)" />
          <text x="35" y="1" textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--text-primary)" fontFamily="IBM Plex Mono, monospace">{hhmm(t)} · {airborne.length} up</text>
        </g>
      </svg>
      {!compact && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', alignItems: 'center', padding: '10px 14px', borderTop: '1px solid var(--border-color)', fontSize: 11.5, color: 'var(--text-muted)' }}>
          <span>Low threat</span>
          <span style={{ width: 100, height: 8, borderRadius: 99, background: 'linear-gradient(90deg, color-mix(in srgb, var(--risk-high) 12%, var(--map-bg)), var(--risk-high))' }} />
          <span>High threat</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><svg width="14" height="14" viewBox="-8 -8 16 16"><path d={PLANE} fill="var(--primary)" /></svg>Airborne</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><svg width="22" height="8"><line x1="0" y1="4" x2="22" y2="4" stroke="var(--primary)" strokeWidth="2" /></svg>Sortie route</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><svg width="22" height="8"><line x1="0" y1="4" x2="22" y2="4" stroke="var(--changed)" strokeWidth="2" strokeDasharray="5 3" /></svg>Retasked</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><svg width="12" height="12"><path d="M6 1 l5 10 h-10z" fill="var(--risk-high)" /></svg>SAM site</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><svg width="14" height="14"><rect width="14" height="14" fill="url(#wx)" stroke="var(--text-muted)" /></svg>Weather closed</span>
          <span>Fictional theatre · grid squares ≈ 80 km</span>
        </div>
      )}
    </div>
  );
}
