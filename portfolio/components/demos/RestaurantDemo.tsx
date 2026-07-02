"use client";

import { useState } from "react";

const DATES = ["Fri 14", "Sat 15", "Sun 16", "Mon 17"];
const TIMES = ["5:30 PM", "6:00 PM", "6:30 PM", "7:00 PM", "7:30 PM", "8:00 PM"];

type RestaurantDemoProps = {
  preview?: boolean;
};

export function RestaurantDemo({ preview = false }: RestaurantDemoProps) {
  const [party, setParty] = useState(2);
  const [date, setDate] = useState(DATES[1]);
  const [time, setTime] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (time && name.trim()) setConfirmed(true);
  };

  if (confirmed && time) {
    return (
      <div className={`demo-restaurant ${preview ? "demo-restaurant--preview" : ""}`}>
        <div className="demo-restaurant-hero demo-restaurant-hero--compact">
          <p className="demo-restaurant-kicker">Ember &amp; Vine</p>
          <h1>You're booked!</h1>
        </div>
        <div className="demo-restaurant-confirm-card">
          <p>
            Table for <strong>{party}</strong> on <strong>{date}</strong> at <strong>{time}</strong>
          </p>
          <p className="demo-restaurant-confirm-name">Under the name {name}</p>
          <button type="button" className="demo-restaurant-btn" onClick={() => setConfirmed(false)}>
            Make another reservation
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`demo-restaurant ${preview ? "demo-restaurant--preview" : ""}`}>
      <div className="demo-restaurant-hero">
        <p className="demo-restaurant-kicker">Ember &amp; Vine · Sample copy</p>
        <h1>Reserve your table</h1>
        <p>Warm wood-fired dining in the heart of the city.</p>
      </div>

      <form className="demo-restaurant-form" onSubmit={handleConfirm}>
        <fieldset>
          <legend>Party size</legend>
          <div className="demo-restaurant-party">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <button
                key={n}
                type="button"
                className={party === n ? "is-active" : undefined}
                onClick={() => setParty(n)}
              >
                {n}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend>Date</legend>
          <div className="demo-restaurant-dates">
            {DATES.map((d) => (
              <button
                key={d}
                type="button"
                className={date === d ? "is-active" : undefined}
                onClick={() => setDate(d)}
              >
                {d}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend>Time</legend>
          <div className="demo-restaurant-times">
            {TIMES.map((t) => (
              <button
                key={t}
                type="button"
                className={time === t ? "is-active" : undefined}
                onClick={() => setTime(t)}
              >
                {t}
              </button>
            ))}
          </div>
        </fieldset>

        <label className="demo-restaurant-label">
          Name on reservation
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            required
          />
        </label>

        <button type="submit" className="demo-restaurant-btn" disabled={!time}>
          Confirm reservation
        </button>
      </form>
    </div>
  );
}
