export function SunnyMascot() {
  return (
    <div className="sunny-wrapper">
    <svg viewBox="0 0 200 200" className="mascot-svg sunny-mascot">
      <g className="sunny-petals">
        {[0, 40, 80, 120, 160, 200, 240, 280, 320].map((angle) => (
          <g key={angle} transform={`rotate(${angle}, 100, 100)`}>
            <ellipse cx="100" cy="38" rx="15" ry="23" fill="#2A2620" />
          </g>
        ))}
      </g>
      <g className="sunny-center">
        <circle cx="100" cy="100" r="35" fill="#C9A84C" />
        <ellipse cx="90" cy="97" rx="4" ry="5" fill="#2A2620" />
        <ellipse cx="110" cy="97" rx="4" ry="5" fill="#2A2620" />
        <path d="M88,111 Q100,120 112,111" stroke="#2A2620" strokeWidth="3" fill="none" strokeLinecap="round" />
      </g>
    </svg>
    </div>
  );
}

export function MascotSeries() {
  return (
    <section className="mascot-series">

      {/* ── SPLAT ── */}
      <div className="mascot-card">
        <svg viewBox="0 0 200 200" className="mascot-svg">
          <g className="splat-arms">
            {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
              <g key={angle} transform={`rotate(${angle}, 100, 100)`}>
                <ellipse cx="100" cy="36" rx="13" ry="20" fill="#C1722F" />
              </g>
            ))}
          </g>
          <circle cx="100" cy="100" r="50" fill="#C1722F" className="splat-body" />
          <ellipse cx="90" cy="96" rx="5" ry="6" fill="#F5EDD8" />
          <ellipse cx="110" cy="96" rx="5" ry="6" fill="#F5EDD8" />
          <path d="M86,112 Q100,124 114,112" stroke="#F5EDD8" strokeWidth="4" fill="none" strokeLinecap="round" />
        </svg>
      </div>

      {/* ── SUNNY ── */}
      <div className="mascot-card">
        <svg viewBox="0 0 200 200" className="mascot-svg">
          <g className="sunny-petals">
            {[0, 40, 80, 120, 160, 200, 240, 280, 320].map((angle) => (
              <g key={angle} transform={`rotate(${angle}, 100, 100)`}>
                <ellipse cx="100" cy="38" rx="16" ry="24" fill="#F2E08A" />
              </g>
            ))}
          </g>
          <g className="sunny-center">
            <circle cx="100" cy="100" r="36" fill="#C1722F" />
            <ellipse cx="90" cy="97" rx="4.5" ry="5.5" fill="#F2E08A" />
            <ellipse cx="110" cy="97" rx="4.5" ry="5.5" fill="#F2E08A" />
            <path d="M87,110 Q100,120 113,110" stroke="#F2E08A" strokeWidth="3.5" fill="none" strokeLinecap="round" />
          </g>
        </svg>
      </div>

      {/* ── SWIRLY ── */}
      <div className="mascot-card">
        <svg viewBox="0 0 200 200" className="mascot-svg">
          <g className="swirly-rays">
            {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle) => (
              <g key={angle} transform={`rotate(${angle}, 100, 100)`}>
                <ellipse cx="100" cy="30" rx="8" ry="13" fill="#F2C94C" />
              </g>
            ))}
          </g>
          <circle cx="100" cy="100" r="52" fill="#3D7A7A" />
          <g className="swirly-spiral">
            <path
              d="M100,100 C100,82 118,74 128,84 C138,94 133,114 116,120 C99,126 78,116 75,98 C72,80 86,62 106,60"
              stroke="#F2C94C" strokeWidth="11" fill="none" strokeLinecap="round"
            />
            <ellipse cx="95" cy="95" rx="4" ry="5" fill="#3D7A7A" />
            <ellipse cx="109" cy="91" rx="4" ry="5" fill="#3D7A7A" />
            <path d="M92,106 Q101,114 111,106" stroke="#3D7A7A" strokeWidth="3" fill="none" strokeLinecap="round" />
          </g>
        </svg>
      </div>

    </section>
  );
}
