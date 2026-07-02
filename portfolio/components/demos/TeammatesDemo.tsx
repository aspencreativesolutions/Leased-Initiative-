"use client";

import { useEffect, useRef, useState } from "react";

type Chore = {
  id: string;
  title: string;
  pointsAward: number;
  penaltyPoints: number;
  isSurpriseBonus: boolean;
};

const MOCK_CHORES: Chore[] = [
  { id: "1", title: "Vacuum living room", pointsAward: 10, penaltyPoints: 2, isSurpriseBonus: false },
  { id: "2", title: "Take out trash", pointsAward: 8, penaltyPoints: 0, isSurpriseBonus: false },
  { id: "3", title: "Clean bathroom", pointsAward: 15, penaltyPoints: 3, isSurpriseBonus: false },
  { id: "4", title: "Organize pantry", pointsAward: 20, penaltyPoints: 0, isSurpriseBonus: true },
];

const BRAND_SEGMENTS = [
  { bg: "#001a5e", text: "#ffffff" },
  { bg: "#ffb800", text: "#001a5e" },
  { bg: "#1a3d8f", text: "#ffffff" },
  { bg: "#ffd04d", text: "#001a5e" },
  { bg: "#e8edf5", text: "#001a5e" },
  { bg: "#ffe8a3", text: "#001a5e" },
] as const;

const NOTIF_OPTIONS = [
  { v: "EMAIL", label: "Email summaries" },
  { v: "SMS", label: "Text pings" },
  { v: "BOTH", label: "Email + text" },
  { v: "NONE", label: "Quiet mode" },
] as const;

function segmentStyle(poolLen: number) {
  if (poolLen === 0) return { background: "#e8edf5" };
  return {
    background: `conic-gradient(from -90deg, ${Array.from({ length: poolLen }, (_, i) => {
      const seg = BRAND_SEGMENTS[i % BRAND_SEGMENTS.length];
      const a = (360 / poolLen) * i;
      const b = (360 / poolLen) * (i + 1);
      return `${seg.bg} ${a}deg ${b}deg`;
    }).join(", ")})`,
  };
}

type TeammatesDemoProps = {
  preview?: boolean;
};

export function TeammatesDemo({ preview = false }: TeammatesDemoProps) {
  const [screen, setScreen] = useState<"landing" | "house">(preview ? "house" : "landing");
  const [points, setPoints] = useState(42);
  const [members, setMembers] = useState([
    { name: "Jordan", role: "HOST" as const, points: 42 },
    { name: "Sam", role: "MEMBER" as const, points: 38 },
    { name: "Alex", role: "MEMBER" as const, points: 31 },
  ]);
  const [notif, setNotif] = useState("EMAIL");
  const [rewardsEnabled, setRewardsEnabled] = useState(true);
  const [penaltiesEnabled, setPenaltiesEnabled] = useState(false);

  const [phase, setPhase] = useState<"idle" | "loading" | "spinning" | "result">("idle");
  const [flashIdx, setFlashIdx] = useState(0);
  const [picked, setPicked] = useState<Chore | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [rotation, setRotation] = useState(0);
  const timers = useRef<number[]>([]);

  const pool = MOCK_CHORES;
  const n = pool.length;
  const slice = n > 0 ? 360 / n : 0;

  useEffect(() => () => {
    timers.current.forEach((id) => window.clearTimeout(id));
  }, []);

  function clearTimers() {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  }

  function spin() {
    setMsg(null);
    setPicked(null);
    setPhase("loading");
    clearTimers();

    window.setTimeout(() => {
      const winner = Math.floor(Math.random() * pool.length);
      setPhase("spinning");
      const totalTicks = 22 + winner;
      const start = Math.floor(Math.random() * pool.length);
      const stepDeg = 360 / pool.length;
      let k = 0;

      const runStep = () => {
        const idx = k === totalTicks - 1 ? winner : (start + k) % pool.length;
        setFlashIdx(idx);
        setRotation((r) => r + stepDeg);
        k += 1;
        if (k < totalTicks) {
          const delay = 55 + (k / totalTicks) * 240;
          const tid = window.setTimeout(runStep, delay);
          timers.current.push(tid);
        } else {
          setPicked(pool[winner]);
          setPhase("result");
        }
      };
      runStep();
    }, 350);
  }

  function completeChore() {
    if (!picked) return;
    if (rewardsEnabled) {
      setPoints((p) => p + picked.pointsAward);
      setMembers((prev) =>
        prev.map((m) =>
          m.role === "HOST" ? { ...m, points: m.points + picked.pointsAward } : m,
        ),
      );
      setMsg("Nice! Points added to your total.");
    } else {
      setMsg("Marked complete (rewards off).");
    }
  }

  function missChore() {
    if (!picked || !penaltiesEnabled) return;
    setPoints((p) => Math.max(0, p - picked.penaltyPoints));
    setMembers((prev) =>
      prev.map((m) =>
        m.role === "HOST"
          ? { ...m, points: Math.max(0, m.points - picked.penaltyPoints) }
          : m,
      ),
    );
    setMsg("Recorded a miss — stay kind, it happens.");
  }

  if (screen === "landing") {
    return (
      <div className={`demo-teammates ${preview ? "demo-teammates--preview" : ""}`}>
        <header className="demo-teammates-header">
          <div className="demo-teammates-brand">
            <div className="demo-teammates-logo-mark" aria-hidden>
              HM
            </div>
            <div>
              <p className="demo-teammates-brand-name">Housemates</p>
              <p className="demo-teammates-brand-tag">Chores, together — lightly competitive.</p>
            </div>
          </div>
          <button type="button" className="demo-teammates-btn demo-teammates-btn--gold" onClick={() => setScreen("house")}>
            Open demo house
          </button>
        </header>

        <main className="demo-teammates-landing">
          <section className="demo-teammates-landing-copy">
            <h1>
              Turn the chore list into a{" "}
              <span className="demo-teammates-accent">smooth little game</span> for your whole house.
            </h1>
            <p>
              Create a house, invite roommates, spin the wheel for playful assignments, and sprinkle
              in surprise bonus tasks when the host feels mischievous.
            </p>
            <ul className="demo-teammates-features">
              {[
                "Game periods from 1–14 days",
                "Per-chore points & optional penalties",
                "Notification style per person",
                "Wheel with motion + cheery sounds",
              ].map((t) => (
                <li key={t}>
                  <span aria-hidden>✓</span>
                  {t}
                </li>
              ))}
            </ul>
          </section>

          <section className="demo-teammates-landing-wheel">
            <p className="demo-teammates-landing-wheel-title">Tonight&apos;s spin</p>
            <p className="demo-teammates-landing-wheel-desc">
              Everyone sees the same playful wheel — whoever lands on it claims bragging rights (and
              the sponge).
            </p>
            <div className="demo-teammates-wheel-stage demo-teammates-wheel-stage--sm">
              <div className="demo-teammates-wheel-pointer" aria-hidden />
              <div className="demo-teammates-wheel-ring">
                <div
                  className="demo-teammates-wheel-disc demo-teammates-wheel-disc--sm"
                  style={segmentStyle(4)}
                />
                <div className="demo-teammates-wheel-hub demo-teammates-wheel-hub--sm">
                  <span className="demo-teammates-wheel-hub-dot" />
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className={`demo-teammates ${preview ? "demo-teammates--preview" : ""}`}>
      <header className="demo-teammates-house-header">
        <div>
          {!preview && (
            <button type="button" className="demo-teammates-back" onClick={() => setScreen("landing")}>
              ← Landing
            </button>
          )}
          <h1>Maple Loft</h1>
          <p>7-day game period · demo period 2025-W24</p>
        </div>
        <div className="demo-teammates-points">
          <span>Your points</span>
          <strong>{points}</strong>
        </div>
      </header>

      <div className="demo-teammates-house-grid">
        <section className="demo-teammates-wheel-card">
          <div className="demo-teammates-wheel-card-head">
            <div>
              <h2>Chore wheel</h2>
              <p>Round <span>2025-W24</span></p>
            </div>
            <button
              type="button"
              className="demo-teammates-btn demo-teammates-btn--gold"
              disabled={phase === "spinning" || phase === "loading"}
              onClick={spin}
            >
              {phase === "spinning" || phase === "loading" ? "Spinning…" : "Spin the wheel"}
            </button>
          </div>

          <div className="demo-teammates-wheel-stage">
            <div className="demo-teammates-wheel-pointer" aria-hidden />
            <div className="demo-teammates-wheel-ring">
              <div
                className={`demo-teammates-wheel-disc ${preview ? "demo-teammates-wheel-disc--sm" : ""}`}
                style={{
                  ...segmentStyle(n),
                  transform: `rotate(${rotation}deg)`,
                  transition: phase === "spinning" ? "transform 0.07s linear" : "none",
                }}
              >
                {pool.map((c, i) => {
                  const mid = -90 + (i + 0.5) * slice;
                  const colors = BRAND_SEGMENTS[i % BRAND_SEGMENTS.length];
                  const active = phase === "spinning" && i === flashIdx;
                  const label = c.title.length > 16 ? `${c.title.slice(0, 15)}…` : c.title;
                  return (
                    <span
                      key={c.id}
                      className="demo-teammates-wheel-label"
                      style={{
                        color: colors.text,
                        transform: `rotate(${mid}deg) translateX(38%) rotate(${-mid}deg)`,
                        opacity: phase === "spinning" ? (active ? 1 : 0.45) : 0.92,
                        fontWeight: active ? 700 : 600,
                      }}
                    >
                      {label}
                      {c.isSurpriseBonus ? " ✨" : ""}
                    </span>
                  );
                })}
              </div>
              <div className={`demo-teammates-wheel-hub ${preview ? "demo-teammates-wheel-hub--sm" : ""}`}>
                <span className="demo-teammates-wheel-hub-dot" />
              </div>
            </div>

            {phase === "spinning" && pool[flashIdx] && (
              <p className="demo-teammates-wheel-flash">{pool[flashIdx].title}</p>
            )}

            {picked && phase === "result" && (
              <div className="demo-teammates-wheel-result">
                <p className="demo-teammates-wheel-result-kicker">You landed on</p>
                <p className="demo-teammates-wheel-result-title">{picked.title}</p>
                {picked.isSurpriseBonus && (
                  <p className="demo-teammates-wheel-result-surprise">Surprise bonus ✨</p>
                )}
                <div className="demo-teammates-wheel-result-actions">
                  <button type="button" className="demo-teammates-btn demo-teammates-btn--gold" onClick={completeChore}>
                    I did it
                  </button>
                  {penaltiesEnabled && picked.penaltyPoints > 0 && (
                    <button type="button" className="demo-teammates-btn demo-teammates-btn--ghost" onClick={missChore}>
                      Couldn&apos;t finish ({picked.penaltyPoints} pt penalty)
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {msg && <p className="demo-teammates-msg">{msg}</p>}
          {pool.length > 0 && phase !== "result" && (
            <p className="demo-teammates-wheel-hint">
              {pool.length} chores eligible this round — spin for luck of the draw.
            </p>
          )}
        </section>

        <aside className="demo-teammates-sidebar">
          <section className="demo-teammates-panel">
            <h3>Your notifications</h3>
            <p>Pick how nudgy we should be. (Demo — preferences are saved locally.)</p>
            <div className="demo-teammates-pills">
              {NOTIF_OPTIONS.map((o) => (
                <button
                  key={o.v}
                  type="button"
                  className={notif === o.v ? "is-active" : undefined}
                  onClick={() => setNotif(o.v)}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </section>

          <section className="demo-teammates-panel">
            <h3>House rules</h3>
            <label className="demo-teammates-toggle">
              <span>Point rewards for finished chores</span>
              <input
                type="checkbox"
                checked={rewardsEnabled}
                onChange={(e) => setRewardsEnabled(e.target.checked)}
              />
            </label>
            <label className="demo-teammates-toggle">
              <span>Friendly penalties for misses</span>
              <input
                type="checkbox"
                checked={penaltiesEnabled}
                onChange={(e) => setPenaltiesEnabled(e.target.checked)}
              />
            </label>
          </section>

          <section className="demo-teammates-panel">
            <h3>Scoreboard</h3>
            <ul className="demo-teammates-scoreboard">
              {members
                .slice()
                .sort((a, b) => b.points - a.points)
                .map((m) => (
                  <li key={m.name}>
                    <span>
                      {m.name}
                      {m.role === "HOST" && <em>host</em>}
                    </span>
                    <strong>{m.points} pts</strong>
                  </li>
                ))}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
