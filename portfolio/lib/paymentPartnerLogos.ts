export type PaymentPartnerLogo = {
  src: string;
  alt: string;
  href: string;
  className?: string;
};

export const paymentPartnerLogos: PaymentPartnerLogo[] = [
  {
    src: "/images/payment-logos/stripe.png",
    alt: "Stripe",
    href: "https://stripe.com",
    className: "h-7 sm:h-8",
  },
  {
    src: "/images/payment-logos/paypal.png",
    alt: "PayPal",
    href: "https://www.paypal.com",
    className: "h-9 sm:h-10",
  },
  {
    src: "/images/payment-logos/square.png",
    alt: "Square",
    href: "https://squareup.com",
    className: "h-8 w-8 sm:h-9 sm:w-9",
  },
  {
    src: "/images/payment-logos/zelle.png",
    alt: "Zelle",
    href: "https://www.zellepay.com",
    className: "h-7 sm:h-8",
  },
];
