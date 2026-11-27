/** SYNK wordmark: the name under a soft wave, two signals in tune ("en sintonía"). */
export function SynkLogo({ size = 'md' }: { size?: 'md' | 'lg' | 'xl' }) {
  return (
    <span className={`logo logo-${size}`} aria-label="SYNK">
      <svg className="logo-arc" viewBox="0 0 60 14" aria-hidden="true">
        <path d="M3 7 C10 0 16 0 22 7 S34 14 40 7 S52 0 57 7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
      <span aria-hidden="true">SYNK</span>
    </span>
  );
}

/** Large translucent petals and a wave rising from the bottom edge of the screen. */
export function Petals() {
  return (
    <div className="petals" aria-hidden="true">
      <svg viewBox="0 0 1200 360" preserveAspectRatio="xMidYMax slice">
        <defs>
          <linearGradient id="pg1" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#c9bfff" stopOpacity="0.85" />
            <stop offset="0.55" stopColor="#7d78e6" stopOpacity="0.55" />
            <stop offset="1" stopColor="#3e48b8" stopOpacity="0.2" />
          </linearGradient>
          <linearGradient id="pg2" x1="1" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e2c9ff" stopOpacity="0.75" />
            <stop offset="0.6" stopColor="#8f7cf0" stopOpacity="0.45" />
            <stop offset="1" stopColor="#3a43b0" stopOpacity="0.15" />
          </linearGradient>
          <linearGradient id="pg3" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#a9b6ff" stopOpacity="0.6" />
            <stop offset="1" stopColor="#2c3497" stopOpacity="0.1" />
          </linearGradient>
          <linearGradient id="vein" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#fff" stopOpacity="0" />
            <stop offset="0.5" stopColor="#fff" stopOpacity="0.35" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
        </defs>
        <g className="petal-a">
          <path d="M-60 360 C-40 220 60 120 210 110 C330 104 360 200 330 360 Z" fill="url(#pg1)" />
          <path d="M40 330 C90 230 170 170 260 150" stroke="url(#vein)" strokeWidth="2" fill="none" />
        </g>
        <g className="petal-b">
          <path d="M200 360 C230 190 380 80 560 96 C700 110 740 230 700 360 Z" fill="url(#pg2)" />
          <path d="M300 340 C360 220 460 150 590 132" stroke="url(#vein)" strokeWidth="2" fill="none" />
        </g>
        <g className="petal-c">
          <path d="M560 360 C600 230 720 150 880 170 C1000 186 1040 280 1010 360 Z" fill="url(#pg1)" opacity="0.8" />
        </g>
        <g className="petal-d">
          <path d="M860 360 C900 250 1020 190 1160 210 C1260 226 1280 300 1260 360 Z" fill="url(#pg2)" opacity="0.85" />
          <path d="M930 340 C990 270 1060 236 1170 228" stroke="url(#vein)" strokeWidth="2" fill="none" />
        </g>
        <path className="wave" d="M0 300 C200 250 380 330 600 290 C820 250 1000 320 1200 280 L1200 360 L0 360 Z" fill="url(#pg3)" />
      </svg>
    </div>
  );
}
