export function SunnyMascot() {
  return (
    <div className="sunny-wrapper">
      <div className="sunny-inner">
        <svg viewBox="0 0 200 200" className="sunny-mascot">
          {/* rays */}
          <g className="sunny-rays">
            {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle) => (
              <g key={angle} transform={`rotate(${angle}, 100, 100)`}>
                <polygon points="100,18 96,50 104,50" fill="#C8850B" />
              </g>
            ))}
          </g>
          {/* center disc — no face */}
          <g className="sunny-center">
            <circle cx="100" cy="100" r="38" fill="#E09A20" />
          </g>
        </svg>
      </div>
    </div>
  );
}
