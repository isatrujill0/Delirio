import { useState } from 'react';
import type { MoodValue } from '../types';
import { moodLabel } from '../services/wellbeing';

const DAY = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const W = 600;
const H = 150;
const PAD_Y = 16;

/** Mood over the last days: one series, 2px line, soft area, tappable points, table for screen readers. */
export function MoodChart({ points }: { points: { date: string; value: MoodValue | null }[] }) {
  const [active, setActive] = useState<number | null>(null);
  const n = points.length;
  const x = (i: number) => (n === 1 ? W / 2 : (i / (n - 1)) * W);
  const y = (v: number) => PAD_Y + ((5 - v) / 4) * (H - PAD_Y * 2);

  // Split into runs of consecutive logged days so missing days show as gaps.
  const runs: { i: number; v: number }[][] = [];
  points.forEach((p, i) => {
    if (p.value === null) return;
    const last = runs[runs.length - 1];
    if (last && last[last.length - 1].i === i - 1) last.push({ i, v: p.value });
    else runs.push([{ i, v: p.value }]);
  });
  const line = (r: { i: number; v: number }[]) => r.map((p, k) => `${k ? 'L' : 'M'}${x(p.i).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
  const area = (r: { i: number; v: number }[]) => `${line(r)} L${x(r[r.length - 1].i)},${H} L${x(r[0].i)},${H} Z`;
  const dayName = (iso: string) => DAY[new Date(`${iso}T12:00`).getDay()];

  return (
    <figure className="mood-chart">
      <div className="mood-plot">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="mood-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#b49cff" stopOpacity="0.45" />
              <stop offset="1" stopColor="#b49cff" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[1, 3, 5].map((v) => (
            <line key={v} x1="0" x2={W} y1={y(v)} y2={y(v)} className="mood-grid" vectorEffect="non-scaling-stroke" />
          ))}
          {runs.map((r, k) => (
            <g key={k}>
              {r.length > 1 && <path d={area(r)} fill="url(#mood-area)" />}
              <path d={line(r)} className="mood-line" vectorEffect="non-scaling-stroke" />
            </g>
          ))}
        </svg>
        {points.map((p, i) =>
          p.value === null ? null : (
            <button
              key={p.date}
              className={`mood-pt ${active === i ? 'is-active' : ''}`}
              style={{ left: `${(x(i) / W) * 100}%`, top: `${(y(p.value) / H) * 100}%` }}
              onClick={() => setActive(active === i ? null : i)}
              aria-label={`${dayName(p.date)}: ${moodLabel(p.value)}`}
            >
              <i />
              {active === i && <span className="mood-tip">{moodLabel(p.value)}</span>}
            </button>
          ),
        )}
      </div>
      <div className="mood-days" aria-hidden="true">
        {points.map((p, i) => (
          <span key={p.date} className={i === n - 1 ? 'is-today' : ''}>
            {i === n - 1 ? 'hoy' : dayName(p.date)}
          </span>
        ))}
      </div>
      <table className="sr-only">
        <caption>Cómo te has sentido los últimos {n} días</caption>
        <tbody>
          {points.map((p) => (
            <tr key={p.date}>
              <th scope="row">{p.date}</th>
              <td>{p.value === null ? 'Sin registro' : moodLabel(p.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
