import React from 'react';

// Minimal stroke icon set (24x24, currentColor)
const P = {
  plane: 'M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z',
  users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M22 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  radar: 'M19.07 4.93A10 10 0 0 0 6.99 3.34 M4 6h.01 M2.29 9.62A10 10 0 1 0 21.31 8.35 M16.24 7.76A6 6 0 1 0 8.23 16.67 M12 18h.01 M17.99 11.66A6 6 0 0 1 15.77 16.67 M12 12m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0 M13.41 10.59l5.66-5.66',
  cloud: 'M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9z',
  target: 'M12 12m-10 0a10 10 0 1 0 20 0a10 10 0 1 0 -20 0 M12 12m-6 0a6 6 0 1 0 12 0a6 6 0 1 0 -12 0 M12 12m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0',
  wrench: 'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z',
  zap: 'M13 2 3 14h9l-1 8 10-12h-9l1-8z',
  file: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8',
  check: 'M20 6 9 17l-5-5',
  x: 'M18 6 6 18 M6 6l12 12',
  alert: 'M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z M12 9v4 M12 17h.01',
  link: 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71 M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71',
  unlink: 'M18.84 12.25l1.72-1.71a5 5 0 0 0-7.07-7.07l-1.72 1.71 M5.17 11.75l-1.71 1.71a5 5 0 0 0 7.07 7.07l1.71-1.71 M8 2v3 M2 8h3 M16 22v-3 M22 16h-3',
  lock: 'M5 11h14v10H5z M8 11V7a4 4 0 0 1 8 0v4',
  refresh: 'M21 2v6h-6 M3 12a9 9 0 0 1 15-6.7L21 8 M3 22v-6h6 M21 12a9 9 0 0 1-15 6.7L3 16',
  chart: 'M3 3v18h18 M7 16v-4 M12 16V8 M17 16v-7',
  moon: 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z',
  sun: 'M12 12m-5 0a5 5 0 1 0 10 0a5 5 0 1 0 -10 0 M12 1v2 M12 21v2 M4.22 4.22l1.42 1.42 M18.36 18.36l1.42 1.42 M1 12h2 M21 12h2 M4.22 19.78l1.42-1.42 M18.36 5.64l1.42-1.42',
  search: 'M11 11m-8 0a8 8 0 1 0 16 0a8 8 0 1 0 -16 0 M21 21l-4.35-4.35',
  download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M7 10l5 5 5-5 M12 15V3',
  hash: 'M4 9h16 M4 15h16 M10 3 8 21 M16 3l-2 18',
  layers: 'M12 2 2 7l10 5 10-5-10-5z M2 17l10 5 10-5 M2 12l10 5 10-5',
  sliders: 'M4 21v-7 M4 10V3 M12 21v-9 M12 8V3 M20 21v-5 M20 12V3 M1 14h6 M9 8h6 M17 16h6',
  crosshair: 'M12 12m-10 0a10 10 0 1 0 20 0a10 10 0 1 0 -20 0 M22 12h-4 M6 12H2 M12 6V2 M12 22v-4',
  clock: 'M12 12m-10 0a10 10 0 1 0 20 0a10 10 0 1 0 -20 0 M12 6v6l4 2',
  user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  play: 'M5 3l14 9-14 9V3z',
  pause: 'M6 4h4v16H6z M14 4h4v16h-4z',
  edit: 'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7 M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z',
};

export default function Icon({ name, size = 16, stroke = 2, style, className }) {
  const d = P[name] || P.file;
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={stroke}
      strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', flexShrink: 0, ...style }} className={className} aria-hidden="true">
      {d.split(' M').map((seg, i) => <path key={i} d={(i ? 'M' : '') + seg} />)}
    </svg>
  );
}

// Radar roundel used as the console seal and the background watermark (not an official emblem)
export function RadarSeal({ size = 58, sweep = false, className, style }) {
  return (
    <svg viewBox="0 0 200 200" width={size} height={size} className={className} style={style} aria-hidden="true">
      <circle cx="100" cy="100" r="94" fill="none" stroke="currentColor" strokeWidth="3" />
      <circle cx="100" cy="100" r="68" fill="none" stroke="currentColor" strokeWidth="2" opacity=".7" />
      <circle cx="100" cy="100" r="42" fill="none" stroke="currentColor" strokeWidth="2" opacity=".55" />
      <line x1="6" y1="100" x2="194" y2="100" stroke="currentColor" strokeWidth="1.5" opacity=".5" />
      <line x1="100" y1="6" x2="100" y2="194" stroke="currentColor" strokeWidth="1.5" opacity=".5" />
      {Array.from({ length: 24 }).map((_, i) => {
        const a = (i * Math.PI) / 12;
        return <line key={i} x1={100 + 88 * Math.cos(a)} y1={100 + 88 * Math.sin(a)} x2={100 + 94 * Math.cos(a)} y2={100 + 94 * Math.sin(a)} stroke="currentColor" strokeWidth="2" />;
      })}
      <g className={sweep ? 'sweep' : undefined}>
        <path d="M100 100 L100 6 A94 94 0 0 1 166.5 33.5 Z" fill="currentColor" opacity=".22" />
        <line x1="100" y1="100" x2="166.5" y2="33.5" stroke="currentColor" strokeWidth="2.5" />
      </g>
      <path d="M100 82 l5 10 13 3 -13 3 -5 10 -5 -10 -13 -3 13 -3z" fill="currentColor" />
    </svg>
  );
}
