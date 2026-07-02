"use client";

import Link from "next/link";
import { useEffect } from "react";
import type { DemoEntry } from "./registry";

type DemoSandboxShellProps = {
  demo: DemoEntry;
  children: React.ReactNode;
};

export function DemoSandboxShell({ demo, children }: DemoSandboxShellProps) {
  useEffect(() => {
    document.body.classList.add("demo-sandbox-active");
    return () => document.body.classList.remove("demo-sandbox-active");
  }, []);

  return (
    <div className="demo-sandbox" style={{ ["--demo-accent" as string]: demo.accent }}>
      <header className="demo-sandbox-bar">
        <div className="demo-sandbox-bar-start">
          <Link href="/portfolio" className="demo-sandbox-back">
            ← Back to portfolio
          </Link>
          <span className="demo-sandbox-badge">Interactive demo</span>
        </div>
        <div className="demo-sandbox-bar-meta">
          <h1 className="demo-sandbox-title">{demo.title}</h1>
          <p className="demo-sandbox-subtitle">{demo.subtitle}</p>
        </div>
        <button
          type="button"
          className="demo-sandbox-reset"
          onClick={() => window.location.reload()}
        >
          Reset demo
        </button>
      </header>

      <div className="demo-sandbox-stage" aria-label={`${demo.title} sandbox`}>
        {children}
      </div>
    </div>
  );
}
