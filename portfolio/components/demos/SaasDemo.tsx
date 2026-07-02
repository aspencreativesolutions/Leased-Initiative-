"use client";

import { useState } from "react";

const NAV = ["Overview", "Reports", "Customers", "Settings"];

const METRICS = [
  { id: "mrr", label: "MRR", value: "$42.8k", change: "+12.4%" },
  { id: "users", label: "Active users", value: "8,241", change: "+5.1%" },
  { id: "churn", label: "Churn", value: "2.1%", change: "-0.3%" },
  { id: "nps", label: "NPS", value: "67", change: "+4" },
];

const CHART = [
  { label: "Mon", value: 62 },
  { label: "Tue", value: 74 },
  { label: "Wed", value: 58 },
  { label: "Thu", value: 88 },
  { label: "Fri", value: 91 },
  { label: "Sat", value: 45 },
  { label: "Sun", value: 52 },
];

type SaasDemoProps = {
  preview?: boolean;
};

export function SaasDemo({ preview = false }: SaasDemoProps) {
  const [activeNav, setActiveNav] = useState("Overview");
  const [range, setRange] = useState<"7d" | "30d" | "90d">("7d");
  const [selectedBar, setSelectedBar] = useState<string | null>("Thu");

  return (
    <div className={`demo-saas ${preview ? "demo-saas--preview" : ""}`}>
      <aside className="demo-saas-sidebar">
        <span className="demo-saas-logo">PulseMetrics</span>
        <nav aria-label="Dashboard">
          <ul>
            {NAV.map((item) => (
              <li key={item}>
                <button
                  type="button"
                  className={activeNav === item ? "is-active" : undefined}
                  onClick={() => setActiveNav(item)}
                >
                  {item}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      <div className="demo-saas-main">
        <header className="demo-saas-header">
          <div>
            <h1>{activeNav}</h1>
            <p>Sample analytics workspace — replace with your product data.</p>
          </div>
          <div className="demo-saas-range" role="group" aria-label="Date range">
            {(["7d", "30d", "90d"] as const).map((r) => (
              <button
                key={r}
                type="button"
                className={range === r ? "is-active" : undefined}
                onClick={() => setRange(r)}
              >
                {r}
              </button>
            ))}
          </div>
        </header>

        <div className="demo-saas-metrics">
          {METRICS.map((m) => (
            <article key={m.id} className="demo-saas-metric">
              <span className="demo-saas-metric-label">{m.label}</span>
              <strong>{m.value}</strong>
              <span className="demo-saas-metric-change">{m.change}</span>
            </article>
          ))}
        </div>

        <section className="demo-saas-chart-card">
          <div className="demo-saas-chart-head">
            <h2>Weekly engagement</h2>
            {selectedBar && (
              <span className="demo-saas-chart-tip">
                {selectedBar}: {CHART.find((c) => c.label === selectedBar)?.value}% active
              </span>
            )}
          </div>
          <div className="demo-saas-chart" role="img" aria-label="Bar chart of weekly engagement">
            {CHART.map((bar) => (
              <button
                key={bar.label}
                type="button"
                className={selectedBar === bar.label ? "is-selected" : undefined}
                style={{ ["--h" as string]: `${bar.value}%` }}
                onClick={() => setSelectedBar(bar.label)}
                aria-label={`${bar.label}: ${bar.value} percent`}
              >
                <span className="demo-saas-bar" />
                <span className="demo-saas-bar-label">{bar.label}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="demo-saas-table">
          <h2>Recent activity</h2>
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Plan</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Northwind Co.</td>
                <td>Pro</td>
                <td><span className="demo-saas-pill demo-saas-pill--green">Active</span></td>
              </tr>
              <tr>
                <td>Blue Harbor</td>
                <td>Starter</td>
                <td><span className="demo-saas-pill demo-saas-pill--amber">Trial</span></td>
              </tr>
              <tr>
                <td>Studio Lumen</td>
                <td>Enterprise</td>
                <td><span className="demo-saas-pill demo-saas-pill--green">Active</span></td>
              </tr>
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
