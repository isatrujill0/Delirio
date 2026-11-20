/** Soft illustrated weather glyph: sun, cloud, or both, picked from the condition text. */
export function WeatherArt({ condition }: { condition: string }) {
  const c = condition.toLowerCase();
  const sun = !/lluv|nubl|cubiert|torment/.test(c) || /parcial|sol/.test(c);
  const cloud = /nub|lluv|cubiert|torment/.test(c);
  const rain = /lluv|torment/.test(c);
  return (
    <svg className="weather-art" viewBox="0 0 120 100" aria-hidden="true">
      <defs>
        <radialGradient id="wa-sun" cx="0.4" cy="0.4" r="0.7">
          <stop offset="0" stopColor="#fff2b8" />
          <stop offset="0.6" stopColor="#ffd27a" />
          <stop offset="1" stopColor="#f6a95c" />
        </radialGradient>
        <linearGradient id="wa-cloud" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#c9c2ff" />
        </linearGradient>
        <linearGradient id="wa-haze" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#f2b6d4" stopOpacity="0.8" />
          <stop offset="1" stopColor="#b8adff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <ellipse cx="60" cy="90" rx="46" ry="7" fill="url(#wa-haze)" opacity="0.5" />
      {sun && (
        <g>
          {Array.from({ length: 8 }, (_, i) => {
            const a = (i * Math.PI) / 4;
            return <line key={i} x1={48 + Math.cos(a) * 25} y1={40 + Math.sin(a) * 25} x2={48 + Math.cos(a) * 32} y2={40 + Math.sin(a) * 32} stroke="#ffd27a" strokeWidth="4" strokeLinecap="round" />;
          })}
          <circle cx="48" cy="40" r="19" fill="url(#wa-sun)" />
        </g>
      )}
      {cloud && <path d="M44 80 h46 a14 14 0 0 0 0 -28 a20 20 0 0 0 -38 -4 a13 13 0 0 0 -8 32 z" fill="url(#wa-cloud)" opacity="0.96" />}
      {rain && [58, 72, 86].map((x) => <line key={x} x1={x} y1="86" x2={x - 4} y2="96" stroke="#b8d4ff" strokeWidth="3.5" strokeLinecap="round" />)}
    </svg>
  );
}
