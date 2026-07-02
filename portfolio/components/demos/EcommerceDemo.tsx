"use client";

import { useMemo, useState } from "react";

const PRODUCTS = [
  { id: "linen-set", name: "Linen sheet set", price: 148, qty: 1 },
  { id: "ceramic-mug", name: "Ceramic mug — sage", price: 32, qty: 2 },
];

type Step = "cart" | "shipping" | "payment" | "confirm";

type EcommerceDemoProps = {
  preview?: boolean;
};

export function EcommerceDemo({ preview = false }: EcommerceDemoProps) {
  const [step, setStep] = useState<Step>("cart");
  const [items, setItems] = useState(PRODUCTS);
  const [shipping, setShipping] = useState({ name: "", address: "", city: "" });
  const [payment, setPayment] = useState({ card: "", expiry: "" });

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.qty, 0),
    [items],
  );
  const shippingCost = subtotal > 100 ? 0 : 8;
  const total = subtotal + shippingCost;

  const updateQty = (id: string, delta: number) => {
    setItems((prev) =>
      prev
        .map((item) =>
          item.id === id
            ? { ...item, qty: Math.max(0, item.qty + delta) }
            : item,
        )
        .filter((item) => item.qty > 0),
    );
  };

  const steps: Step[] = ["cart", "shipping", "payment", "confirm"];
  const stepIndex = steps.indexOf(step);

  return (
    <div className={`demo-ecommerce ${preview ? "demo-ecommerce--preview" : ""}`}>
      <header className="demo-ecommerce-header">
        <span className="demo-ecommerce-logo">Atelier Home</span>
        <span className="demo-ecommerce-badge">Demo checkout</span>
      </header>

      <ol className="demo-ecommerce-steps" aria-label="Checkout progress">
        {steps.map((s, i) => (
          <li key={s} className={i <= stepIndex ? "is-done" : undefined}>
            <span>{i + 1}</span>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </li>
        ))}
      </ol>

      <div className="demo-ecommerce-layout">
        <div className="demo-ecommerce-main">
          {step === "cart" && (
            <>
              <h1>Your bag</h1>
              {items.length === 0 ? (
                <p className="demo-ecommerce-empty">Your bag is empty — add items to continue.</p>
              ) : (
                <ul className="demo-ecommerce-items">
                  {items.map((item) => (
                    <li key={item.id}>
                      <div className="demo-ecommerce-item-thumb" aria-hidden />
                      <div className="demo-ecommerce-item-info">
                        <strong>{item.name}</strong>
                        <span>${item.price}</span>
                      </div>
                      <div className="demo-ecommerce-qty">
                        <button type="button" onClick={() => updateQty(item.id, -1)} aria-label="Decrease quantity">
                          −
                        </button>
                        <span>{item.qty}</span>
                        <button type="button" onClick={() => updateQty(item.id, 1)} aria-label="Increase quantity">
                          +
                        </button>
                      </div>
                      <span className="demo-ecommerce-line-total">${item.price * item.qty}</span>
                    </li>
                  ))}
                </ul>
              )}
              <button
                type="button"
                className="demo-ecommerce-btn"
                disabled={items.length === 0}
                onClick={() => setStep("shipping")}
              >
                Continue to shipping
              </button>
            </>
          )}

          {step === "shipping" && (
            <>
              <h1>Shipping details</h1>
              <form
                className="demo-ecommerce-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  setStep("payment");
                }}
              >
                <label>
                  Full name
                  <input
                    value={shipping.name}
                    onChange={(e) => setShipping({ ...shipping, name: e.target.value })}
                    placeholder="Jordan Lee"
                    required
                  />
                </label>
                <label>
                  Address
                  <input
                    value={shipping.address}
                    onChange={(e) => setShipping({ ...shipping, address: e.target.value })}
                    placeholder="123 Sample Street"
                    required
                  />
                </label>
                <label>
                  City
                  <input
                    value={shipping.city}
                    onChange={(e) => setShipping({ ...shipping, city: e.target.value })}
                    placeholder="Portland"
                    required
                  />
                </label>
                <div className="demo-ecommerce-form-actions">
                  <button type="button" className="demo-ecommerce-btn-ghost" onClick={() => setStep("cart")}>
                    Back
                  </button>
                  <button type="submit" className="demo-ecommerce-btn">
                    Continue to payment
                  </button>
                </div>
              </form>
            </>
          )}

          {step === "payment" && (
            <>
              <h1>Payment</h1>
              <form
                className="demo-ecommerce-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  setStep("confirm");
                }}
              >
                <label>
                  Card number
                  <input
                    value={payment.card}
                    onChange={(e) => setPayment({ ...payment, card: e.target.value })}
                    placeholder="4242 4242 4242 4242"
                    required
                  />
                </label>
                <label>
                  Expiry
                  <input
                    value={payment.expiry}
                    onChange={(e) => setPayment({ ...payment, expiry: e.target.value })}
                    placeholder="MM/YY"
                    required
                  />
                </label>
                <div className="demo-ecommerce-form-actions">
                  <button type="button" className="demo-ecommerce-btn-ghost" onClick={() => setStep("shipping")}>
                    Back
                  </button>
                  <button type="submit" className="demo-ecommerce-btn">
                    Place order
                  </button>
                </div>
              </form>
            </>
          )}

          {step === "confirm" && (
            <div className="demo-ecommerce-confirm">
              <div className="demo-ecommerce-confirm-icon" aria-hidden>
                ✓
              </div>
              <h1>Order confirmed</h1>
              <p>
                Thanks, {shipping.name || "there"}! Your order #{Math.floor(Math.random() * 90000 + 10000)} is on its way to{" "}
                {shipping.city || "your city"}.
              </p>
              <button type="button" className="demo-ecommerce-btn" onClick={() => setStep("cart")}>
                Start over
              </button>
            </div>
          )}
        </div>

        <aside className="demo-ecommerce-summary">
          <h2>Order summary</h2>
          <div className="demo-ecommerce-summary-row">
            <span>Subtotal</span>
            <span>${subtotal}</span>
          </div>
          <div className="demo-ecommerce-summary-row">
            <span>Shipping</span>
            <span>{shippingCost === 0 ? "Free" : `$${shippingCost}`}</span>
          </div>
          <div className="demo-ecommerce-summary-total">
            <span>Total</span>
            <span>${total}</span>
          </div>
        </aside>
      </div>
    </div>
  );
}
