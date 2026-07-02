"use client";

import { useState } from "react";

const PLANS = [
  { id: "base", name: "Base", price: 29, features: ["2 classes / week", "App access", "Community chat"] },
  { id: "pro", name: "Pro", price: 49, features: ["Unlimited classes", "Nutrition guide", "1:1 check-in"] },
  { id: "elite", name: "Elite", price: 89, features: ["Everything in Pro", "Personal programming", "Recovery lounge"] },
];

const FAQ = [
  { q: "Can I pause my membership?", a: "Yes — pause anytime for up to 30 days." },
  { q: "Do you offer trials?", a: "First week is free with any annual plan." },
  { q: "Where are you located?", a: "Downtown studio + on-demand digital classes." },
];

type FitnessDemoProps = {
  preview?: boolean;
};

export function FitnessDemo({ preview = false }: FitnessDemoProps) {
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const [selectedPlan, setSelectedPlan] = useState("pro");
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const priceMultiplier = billing === "annual" ? 0.85 : 1;

  return (
    <div className={`demo-fitness ${preview ? "demo-fitness--preview" : ""}`}>
      <section className="demo-fitness-hero">
        <p className="demo-fitness-kicker">Forge Athletics · placeholder brand</p>
        <h1>Train harder. Recover smarter.</h1>
        <p className="demo-fitness-lead">
          High-intensity programming built for real schedules — customize this hero for your client.
        </p>
        <div className="demo-fitness-hero-cta">
          <button type="button" className="demo-fitness-btn demo-fitness-btn--primary">
            Start free trial
          </button>
          <button type="button" className="demo-fitness-btn demo-fitness-btn--ghost">
            Watch intro
          </button>
        </div>
        <div className="demo-fitness-stats">
          <div><strong>4.9</strong><span>App rating</span></div>
          <div><strong>12k+</strong><span>Members</span></div>
          <div><strong>40</strong><span>Weekly classes</span></div>
        </div>
      </section>

      <section className="demo-fitness-plans">
        <div className="demo-fitness-plans-head">
          <h2>Choose your plan</h2>
          <div className="demo-fitness-billing" role="group" aria-label="Billing period">
            <button
              type="button"
              className={billing === "monthly" ? "is-active" : undefined}
              onClick={() => setBilling("monthly")}
            >
              Monthly
            </button>
            <button
              type="button"
              className={billing === "annual" ? "is-active" : undefined}
              onClick={() => setBilling("annual")}
            >
              Annual · save 15%
            </button>
          </div>
        </div>

        <ul className="demo-fitness-plan-grid">
          {PLANS.map((plan) => {
            const price = Math.round(plan.price * priceMultiplier);
            const isSelected = selectedPlan === plan.id;
            return (
              <li key={plan.id}>
                <button
                  type="button"
                  className={`demo-fitness-plan ${isSelected ? "is-selected" : ""}`}
                  onClick={() => setSelectedPlan(plan.id)}
                >
                  <span className="demo-fitness-plan-name">{plan.name}</span>
                  <span className="demo-fitness-plan-price">
                    ${price}<small>/mo</small>
                  </span>
                  <ul>
                    {plan.features.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="demo-fitness-faq">
        <h2>FAQ</h2>
        <ul>
          {FAQ.map((item, i) => (
            <li key={item.q}>
              <button
                type="button"
                className="demo-fitness-faq-q"
                aria-expanded={openFaq === i}
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              >
                {item.q}
                <span aria-hidden>{openFaq === i ? "−" : "+"}</span>
              </button>
              {openFaq === i && <p className="demo-fitness-faq-a">{item.a}</p>}
            </li>
          ))}
        </ul>
      </section>

      <section className="demo-fitness-waitlist">
        <h2>Join the waitlist</h2>
        {submitted ? (
          <p className="demo-fitness-success">You're on the list — we'll be in touch soon.</p>
        ) : (
          <form
            className="demo-fitness-waitlist-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (email.trim()) setSubmitted(true);
            }}
          >
            <input
              type="email"
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button type="submit" className="demo-fitness-btn demo-fitness-btn--primary">
              Notify me
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
