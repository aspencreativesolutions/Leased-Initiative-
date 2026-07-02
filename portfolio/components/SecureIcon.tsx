"use client";

import { useState } from "react";

export function SecureIcon() {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="secure-icon-wrap"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <svg viewBox="0 0 200 200" className="secure-svg" aria-label="Secure lock icon">
        <rect
          x="58"
          y="92"
          width="84"
          height="68"
          rx="14"
          fill="#6366A8"
          className={hovered ? "secure-body secure-body--pulse" : "secure-body"}
        />
        <path
          d="M68 92V72a32 32 0 0 1 64 0v20"
          fill="none"
          stroke="#6366A8"
          strokeWidth="12"
          strokeLinecap="round"
          className={hovered ? "secure-shackle secure-shackle--lift" : "secure-shackle"}
        />
        <circle cx="100" cy="122" r="9" fill="white" />
        <rect x="95" y="128" width="10" height="16" rx="5" fill="white" />
      </svg>
    </div>
  );
}
