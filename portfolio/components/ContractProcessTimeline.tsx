import { contractTimeline } from "@/lib/contractTimeline";

/** Inline icons — replace with custom SVGs or an icon library later */
function TimelineIcon({ type }: { type: (typeof contractTimeline.steps)[number]["icon"] }) {
  switch (type) {
    case "discovery":
      return (
        <svg viewBox="0 0 48 48" fill="none" aria-hidden>
          <rect x="12" y="8" width="24" height="32" rx="2" stroke="white" strokeWidth="2" />
          <path d="M16 16h16M16 22h12M16 28h8" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M30 32l6 6" stroke="white" strokeWidth="2" strokeLinecap="round" />
          <path d="M32 30l4 4" stroke="white" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "draft":
      return (
        <svg viewBox="0 0 48 48" fill="none" aria-hidden>
          <rect x="14" y="10" width="20" height="28" rx="2" stroke="white" strokeWidth="2" />
          <path d="M18 18h12M18 24h12M18 30h8" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M16 18l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="34" cy="34" r="6" fill="white" />
          <path d="M32 34l1.5 1.5 3-3" stroke="#171717" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case "status":
      return (
        <svg viewBox="0 0 48 48" fill="none" aria-hidden>
          <circle cx="16" cy="16" r="4" stroke="white" strokeWidth="1.5" />
          <circle cx="32" cy="16" r="4" stroke="white" strokeWidth="1.5" />
          <circle cx="16" cy="32" r="4" stroke="white" strokeWidth="1.5" />
          <circle cx="32" cy="32" r="4" stroke="white" strokeWidth="1.5" />
          <path d="M20 16h8M16 20v8M32 20v6" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M30 32l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case "tracked":
      return (
        <svg viewBox="0 0 48 48" fill="none" aria-hidden>
          <rect x="12" y="10" width="22" height="28" rx="2" stroke="white" strokeWidth="2" />
          <path d="M16 20h14M16 26h10" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M28 32c2 0 4-1.5 4-3.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
          <rect x="30" y="28" width="10" height="10" rx="1.5" stroke="white" strokeWidth="1.5" />
          <path d="M32 32h6M32 35h4" stroke="white" strokeWidth="1" strokeLinecap="round" />
        </svg>
      );
  }
}

export function ContractProcessTimeline() {
  const [step1, step2, step3, step4] = contractTimeline.steps;

  return (
    <figure className="contract-timeline" aria-labelledby="contract-timeline-title">
      <p className="section-label">The journey</p>
      <figcaption id="contract-timeline-title" className="contract-timeline-title">
        {contractTimeline.title}
      </figcaption>

      <div className="contract-timeline-desktop" role="list">
        <div className="contract-timeline-grid">
          <div className="contract-timeline-step-wrap contract-timeline-step-wrap--1">
            <StepCard step={step1} />
            <span className="contract-timeline-connector" aria-hidden />
          </div>

          <div className="contract-timeline-step-wrap contract-timeline-step-wrap--3">
            <StepCard step={step3} />
            <span className="contract-timeline-connector" aria-hidden />
          </div>

          <div className="contract-timeline-rail" aria-hidden>
            <div className="contract-timeline-line" />
            <span className="contract-timeline-arrow" />
          </div>

          <span className="contract-timeline-node contract-timeline-node--1" />
          <span className="contract-timeline-node contract-timeline-node--2" />
          <span className="contract-timeline-node contract-timeline-node--3" />
          <span className="contract-timeline-node contract-timeline-node--4" />

          <div className="contract-timeline-step-wrap contract-timeline-step-wrap--2 contract-timeline-step-wrap--below">
            <span className="contract-timeline-connector" aria-hidden />
            <StepCard step={step2} />
          </div>

          <div className="contract-timeline-step-wrap contract-timeline-step-wrap--4 contract-timeline-step-wrap--below">
            <span className="contract-timeline-connector" aria-hidden />
            <StepCard step={step4} />
          </div>
        </div>
      </div>

      <ol className="contract-timeline-mobile">
        {contractTimeline.steps.map((step, index) => (
          <li key={step.id} className="contract-timeline-mobile-step">
            <div className="contract-timeline-mobile-marker">
              <span className="contract-timeline-node contract-timeline-node--sm" />
              {index < contractTimeline.steps.length - 1 && (
                <span className="contract-timeline-mobile-line" aria-hidden />
              )}
            </div>
            <StepCard step={step} compact />
          </li>
        ))}
      </ol>
    </figure>
  );
}

function StepCard({
  step,
  compact = false,
}: {
  step: (typeof contractTimeline.steps)[number];
  compact?: boolean;
}) {
  return (
    <div
      className={`contract-timeline-step ${compact ? "contract-timeline-step--compact" : ""}`}
      role="listitem"
    >
      <div className="contract-timeline-icon">
        <TimelineIcon type={step.icon} />
      </div>
      <div className="contract-timeline-copy">
        <p className="contract-timeline-step-label">{step.label}</p>
        <h3 className="contract-timeline-step-title">{step.title}</h3>
        <p className="contract-timeline-step-desc">{step.description}</p>
      </div>
    </div>
  );
}
