"use client";

import { useState, type FormEvent } from "react";

type FormStatus = "idle" | "loading" | "success" | "error";

export function ContactForm() {
  const [status, setStatus] = useState<FormStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage("");

    const form = e.currentTarget;
    const data = new FormData(form);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"),
          email: data.get("email"),
          message: data.get("message"),
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error ?? "Something went wrong. Please try again.");
      }

      setStatus("success");
      form.reset();
    } catch (err) {
      setStatus("error");
      setErrorMessage(
        err instanceof Error ? err.message : "Something went wrong. Please try again."
      );
    }
  }

  if (status === "success") {
    return (
      <div className="text-center">
        <p className="text-sm font-bold text-neutral-900">Message sent</p>
        <p className="mt-2 text-xs text-neutral-500">
          Thanks for reaching out. I&apos;ll get back to you soon.
        </p>
        <button
          type="button"
          onClick={() => setStatus("idle")}
          className="link-subtle mt-6 text-[11px] tracking-wider"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="name" className="section-label">
          Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          autoComplete="name"
          className="input mt-2"
          placeholder="Your name"
        />
      </div>
      <div>
        <label htmlFor="email" className="section-label">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="input mt-2"
          placeholder="you@example.com"
        />
      </div>
      <div>
        <label htmlFor="message" className="section-label">
          Message
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={5}
          className="input mt-2 resize-y"
          placeholder="What would you like to talk about?"
        />
      </div>
      {status === "error" && (
        <p className="text-xs text-red-600" role="alert">
          {errorMessage}
        </p>
      )}
      <button
        type="submit"
        disabled={status === "loading"}
        className="btn-primary w-full sm:w-auto"
      >
        {status === "loading" ? "Sending…" : "SEND"}
      </button>
    </form>
  );
}
