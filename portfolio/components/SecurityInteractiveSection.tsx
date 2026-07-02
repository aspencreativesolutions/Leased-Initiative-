"use client";

import { SecurityIcon } from "@/components/SecurityIcon";
import { securityIcons, securitySection } from "@/lib/security";

export function SecurityInteractiveSection() {
  return (
    <section className="security-section" aria-labelledby="security-heading">
      <p className="section-label">{securitySection.label}</p>
      <h2 id="security-heading" className="archive-hero-title mt-3 max-w-2xl">
        {securitySection.heading}
      </h2>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-neutral-700 sm:text-base">
        {securitySection.intro}
      </p>
      <p className="security-explore-hint">{securitySection.exploreHint}</p>

      <ul className="security-icon-row" role="list">
        {securityIcons.map((icon) => (
          <li key={icon.id} className="security-icon-item">
            <div
              className="security-icon-wrap"
              tabIndex={0}
              aria-label={icon.tooltip}
            >
              <span className="security-icon-badge">
                <SecurityIcon name={icon.id} className="security-icon-svg" />
              </span>
              <p className="security-icon-tooltip" role="tooltip">
                {icon.tooltip}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
