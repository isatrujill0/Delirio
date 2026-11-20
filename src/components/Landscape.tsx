import { memo, useId } from 'react';
import type { Landscape } from '../types';

function ridge(seed: number, baseY: number, amp: number, w = 400, h = 260): string {
  const pts: string[] = [];
  for (let x = 0; x <= w; x += 10) {
    const y = baseY - amp * (0.55 * Math.sin((x / w) * Math.PI * (1.2 + (seed % 3) * 0.4) + seed) + 0.3 * Math.sin((x / w) * Math.PI * 4.3 + seed * 2.1) + 0.15 * Math.sin((x / w) * Math.PI * 9 + seed * 0.7));
    pts.push(`${x},${y.toFixed(1)}`);
  }
  return `M0,${h} L${pts.join(' L')} L${w},${h} Z`;
}

/** Hand-tuned layered landscape illustration (SVG, no image files). */
export const LandscapeArt = memo(function LandscapeArt({ scene, className = '' }: { scene: Landscape; className?: string }) {
  const id = useId().replace(/:/g, '');
  const [deep, mid, soft, glow, light] = scene.palette;
  const night = scene.sun === 'luna';
  const seed = scene.id.length * 1.7;
  return (
    <svg className={`landscape ${className}`} viewBox="0 0 400 260" preserveAspectRatio="xMidYMid slice" role="img" aria-label={scene.title}>
      <defs>
        <linearGradient id={`sky${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={night ? deep : mid} />
          <stop offset="0.55" stopColor={night ? mid : soft} />
          <stop offset="1" stopColor={night ? soft : glow} />
        </linearGradient>
        <radialGradient id={`sun${id}`}>
          <stop offset="0" stopColor={light} />
          <stop offset="0.45" stopColor={light} stopOpacity="0.9" />
          <stop offset="1" stopColor={light} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`mist${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={light} stopOpacity="0" />
          <stop offset="1" stopColor={light} stopOpacity="0.45" />
        </linearGradient>
      </defs>
      <rect width="400" height="260" fill={`url(#sky${id})`} />
      {night &&
        Array.from({ length: 40 }, (_, i) => (
          <circle key={i} cx={(i * 97.3) % 400} cy={(i * 53.7) % 140} r={i % 7 === 0 ? 1.6 : 0.9} fill={light} opacity={0.4 + ((i * 13) % 6) / 10} />
        ))}
      <circle cx={night ? 300 : 260} cy={night ? 60 : 120} r={night ? 34 : 70} fill={`url(#sun${id})`} />
      {night && <circle cx="300" cy="60" r="16" fill={light} />}
      <path d={ridge(seed, 150, 38)} fill={soft} opacity="0.75" />
      <rect y="130" width="400" height="60" fill={`url(#mist${id})`} />
      <path d={ridge(seed + 2, 185, 32)} fill={mid} opacity="0.85" />
      <path d={ridge(seed + 5, 222, 24)} fill={deep} />
      {scene.id === 'lago' && <rect y="226" width="400" height="34" fill={soft} opacity="0.55" />}
    </svg>
  );
});
