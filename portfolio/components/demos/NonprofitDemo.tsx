"use client";

import { useState } from "react";

const TIERS = [
  { id: "25", amount: 25, impact: "Provides a week of meals for one family." },
  { id: "50", amount: 50, impact: "Funds school supplies for five students." },
  { id: "100", amount: 100, impact: "Supports a community health workshop." },
  { id: "250", amount: 250, impact: "Sponsors a month of after-school programs." },
];

type NonprofitDemoProps = {
  preview?: boolean;
};

export function NonprofitDemo({ preview = false }: NonprofitDemoProps) {
  const [frequency, setFrequency] = useState<"once" | "monthly">("once");
  const [selectedTier, setSelectedTier] = useState("50");
  const [customAmount, setCustomAmount] = useState("");
  const [step, setStep] = useState<"select" | "details" | "thanks">("select");
  const [donor, setDonor] = useState({ name: "", email: "" });

  const amount =
    customAmount.trim() !== ""
      ? Number.parseInt(customAmount, 10) || 0
      : Number.parseInt(selectedTier, 10);

  const selectedImpact = TIERS.find((t) => t.id === selectedTier)?.impact;

  if (step === "thanks") {
    return (
      <div className={`demo-nonprofit ${preview ? "demo-nonprofit--preview" : ""}`}>
        <div className="demo-nonprofit-thanks">
          <div className="demo-nonprofit-thanks-icon" aria-hidden>
            ♥
          </div>
          <h1>Thank you, {donor.name || "friend"}!</h1>
          <p>
            Your {frequency === "monthly" ? "monthly " : ""}gift of <strong>${amount}</strong> helps
            Harbor Hope Foundation serve our community.
          </p>
          <button type="button" className="demo-nonprofit-btn" onClick={() => setStep("select")}>
            Make another gift
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`demo-nonprofit ${preview ? "demo-nonprofit--preview" : ""}`}>
      <header className="demo-nonprofit-header">
        <p className="demo-nonprofit-org">Harbor Hope Foundation</p>
        <h1>Give with confidence</h1>
        <p>100% of demo donations are simulated — replace with your nonprofit story.</p>
      </header>

      <div className="demo-nonprofit-frequency" role="group" aria-label="Donation frequency">
        <button
          type="button"
          className={frequency === "once" ? "is-active" : undefined}
          onClick={() => setFrequency("once")}
        >
          One-time
        </button>
        <button
          type="button"
          className={frequency === "monthly" ? "is-active" : undefined}
          onClick={() => setFrequency("monthly")}
        >
          Monthly
        </button>
      </div>

      {step === "select" && (
        <>
          <section className="demo-nonprofit-tiers">
            <h2>Select an impact level</h2>
            <ul>
              {TIERS.map((tier) => (
                <li key={tier.id}>
                  <button
                    type="button"
                    className={selectedTier === tier.id && !customAmount ? "is-selected" : undefined}
                    onClick={() => {
                      setSelectedTier(tier.id);
                      setCustomAmount("");
                    }}
                  >
                    <span className="demo-nonprofit-tier-amount">${tier.amount}</span>
                    <span className="demo-nonprofit-tier-impact">{tier.impact}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <label className="demo-nonprofit-custom">
            Or enter a custom amount
            <div>
              <span>$</span>
              <input
                type="number"
                min={1}
                placeholder="Other"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
              />
            </div>
          </label>

          {selectedImpact && !customAmount && (
            <p className="demo-nonprofit-impact-note">{selectedImpact}</p>
          )}

          <button
            type="button"
            className="demo-nonprofit-btn"
            disabled={amount < 1}
            onClick={() => setStep("details")}
          >
            Continue · ${amount}{frequency === "monthly" ? "/mo" : ""}
          </button>
        </>
      )}

      {step === "details" && (
        <form
          className="demo-nonprofit-form"
          onSubmit={(e) => {
            e.preventDefault();
            setStep("thanks");
          }}
        >
          <h2>Your details</h2>
          <label>
            Full name
            <input
              value={donor.name}
              onChange={(e) => setDonor({ ...donor, name: e.target.value })}
              placeholder="Alex Morgan"
              required
            />
          </label>
          <label>
            Email
            <input
              type="email"
              value={donor.email}
              onChange={(e) => setDonor({ ...donor, email: e.target.value })}
              placeholder="alex@email.com"
              required
            />
          </label>
          <p className="demo-nonprofit-secure">🔒 Secure demo — no payment is processed.</p>
          <div className="demo-nonprofit-form-actions">
            <button type="button" className="demo-nonprofit-btn-ghost" onClick={() => setStep("select")}>
              Back
            </button>
            <button type="submit" className="demo-nonprofit-btn">
              Complete ${amount} gift
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
