export type PaymentPartnerLogo = {
  src: string;
  alt: string;
  className?: string;
};

export const paymentPartnerLogos: PaymentPartnerLogo[] = [
  {
    src: "/images/payment-logos/stripe.png",
    alt: "Stripe",
    className: "h-7 sm:h-8",
  },
  {
    src: "/images/payment-logos/paypal.png",
    alt: "PayPal",
    className: "h-9 sm:h-10",
  },
  {
    src: "/images/payment-logos/square.png",
    alt: "Square",
    className: "h-8 w-8 sm:h-9 sm:w-9",
  },
];
