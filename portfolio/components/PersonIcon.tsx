"use client";

import { useState } from "react";

export function PersonIcon() {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="person-icon-wrap"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <svg viewBox="0 0 200 220" className="person-svg" aria-label="Person icon">
        {/* body — static */}
        <ellipse cx="100" cy="157" rx="58" ry="38" fill="#5C8A72" />
        {/* head — wobbles on hover, transitions back on leave */}
        <circle
          cx="100" cy="88" r="24" fill="#5C8A72"
          className={hovered ? "person-head person-head--wobble" : "person-head person-head--return"}
        />
      </svg>
    </div>
  );
}
