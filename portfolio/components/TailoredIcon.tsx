export function TailoredIcon() {
  const arms = [-60, -8, 44, 95, 148, 200, 258];

  return (
    <div className="tailored-icon-wrap">
      <svg viewBox="0 0 200 200" className="tailored-svg" aria-label="Network node">

        {/* everything spins together */}
        <g className="node-spinner">

          {arms.map((angle, i) => (
            // outer g: positional rotation (SVG attribute, invariant pivot at 100,100)
            <g key={angle} transform={`rotate(${angle}, 100, 100)`}>
              {/* inner g: scale in/out on hover — transform-origin is 100,100 (invariant under parent rotation) */}
              <g
                className={i % 2 === 0 ? "arm-even" : "arm-odd"}
                style={{ transformOrigin: "100px 100px" }}
              >
                <line x1="100" y1="78" x2="100" y2="46"
                  stroke="#4A7E9B" strokeWidth="3.5" strokeLinecap="round" />
                <circle cx="100" cy="40" r="7" fill="#4A7E9B" />
              </g>
            </g>
          ))}

          {/* hollow center circle */}
          <circle cx="100" cy="100" r="20"
            fill="white" stroke="#4A7E9B" strokeWidth="4" />

        </g>
      </svg>
    </div>
  );
}
