"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  assistantConfig,
  faqPairs,
  findFaqMatch,
  type FaqPair,
} from "@/lib/faq";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

function createMessage(role: ChatMessage["role"], text: string): ChatMessage {
  return { id: `${role}-${Date.now()}-${Math.random()}`, role, text };
}

export function AssistantChat() {
  const panelId = useId();
  const inputId = useId();
  const messagesRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    createMessage("assistant", assistantConfig.greeting),
  ]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("keydown", handleKeyDown);
    inputRef.current?.focus();

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    const node = messagesRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [messages, isOpen]);

  function respondWithFaq(faq: FaqPair) {
    setMessages((prev) => [
      ...prev,
      createMessage("user", faq.question),
      createMessage("assistant", faq.answer),
    ]);
  }

  function handleSubmit() {
    const trimmed = input.trim();
    if (!trimmed) return;

    const match = findFaqMatch(trimmed);
    const answer = match?.answer ?? assistantConfig.fallback;

    setMessages((prev) => [
      ...prev,
      createMessage("user", trimmed),
      createMessage("assistant", answer),
    ]);
    setInput("");
  }

  return (
    <div className="assistant-root">
      {isOpen && (
        <div
          id={panelId}
          className="assistant-panel"
          role="dialog"
          aria-modal="false"
          aria-labelledby={`${panelId}-title`}
        >
          <header className="assistant-header">
            <div>
              <p id={`${panelId}-title`} className="assistant-title">
                {assistantConfig.title}
              </p>
              <p className="assistant-subtitle">Quick answers, no wait</p>
            </div>
            <button
              type="button"
              className="assistant-close"
              onClick={() => setIsOpen(false)}
              aria-label="Close assistant"
            >
              ×
            </button>
          </header>

          <div ref={messagesRef} className="assistant-messages" aria-live="polite">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`assistant-message assistant-message-${message.role}`}
              >
                {message.text}
              </div>
            ))}
          </div>

          <div className="assistant-suggestions">
            <p className="assistant-suggestions-label">Common questions</p>
            <div className="assistant-suggestion-list">
              {faqPairs.map((faq) => (
                <button
                  key={faq.id}
                  type="button"
                  className="assistant-suggestion"
                  onClick={() => respondWithFaq(faq)}
                >
                  {faq.question}
                </button>
              ))}
            </div>
          </div>

          <form
            className="assistant-form"
            onSubmit={(event) => {
              event.preventDefault();
              handleSubmit();
            }}
          >
            <label htmlFor={inputId} className="sr-only">
              Ask a question
            </label>
            <input
              ref={inputRef}
              id={inputId}
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Type your question…"
              className="assistant-input"
              autoComplete="off"
            />
            <button type="submit" className="assistant-send" disabled={!input.trim()}>
              Send
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        className="assistant-toggle"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => setIsOpen((open) => !open)}
      >
        {assistantConfig.buttonLabel}
      </button>
    </div>
  );
}
