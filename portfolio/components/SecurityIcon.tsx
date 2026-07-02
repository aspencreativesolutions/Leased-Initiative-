import type { ReactNode } from "react";

type SecurityIconName = "lock" | "key" | "wifi" | "card";
type SecurityIconProps = { name: SecurityIconName; className?: string };

const icons: Record<SecurityIconName, ReactNode> = {
  lock: (
    <>
      {/* shackle */}
      <path
        d="M7.5 11V7.5a4.5 4.5 0 0 1 9 0V11"
        fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round"
      />
      {/* body */}
      <rect x="3" y="11" width="18" height="12" rx="3.5" fill="currentColor" />
      {/* keyhole circle */}
      <circle cx="12" cy="16" r="2.2" fill="white" />
      {/* keyhole slot */}
      <rect x="10.9" y="17" width="2.2" height="3.5" rx="1.1" fill="white" />
    </>
  ),

  key: (
    <>
      {/* bow — outer ring */}
      <circle cx="8.5" cy="10.5" r="5.5" fill="currentColor" />
      {/* bow — inner hole */}
      <circle cx="8.5" cy="10.5" r="2.6" fill="white" />
      {/* shaft */}
      <rect x="13.5" y="9.3" width="8" height="2.4" rx="1.2" fill="currentColor" />
      {/* tooth 1 */}
      <rect x="18" y="11.7" width="2.2" height="3" rx="0.8" fill="currentColor" />
      {/* tooth 2 */}
      <rect x="15" y="11.7" width="1.8" height="2.2" rx="0.7" fill="currentColor" />
    </>
  ),

  wifi: (
    <>
      {/* outer arc */}
      <path
        d="M1.5 8.5a15 15 0 0 1 21 0"
        fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round"
      />
      {/* mid arc */}
      <path
        d="M5 12a10 10 0 0 1 14 0"
        fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round"
      />
      {/* inner arc */}
      <path
        d="M8.5 15.5a5.5 5.5 0 0 1 7 0"
        fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round"
      />
      {/* dot */}
      <circle cx="12" cy="20" r="2" fill="currentColor" />
    </>
  ),

  card: (
    <>
      {/* card body */}
      <rect x="1.5" y="4" width="21" height="16" rx="3" fill="currentColor" />
      {/* magnetic stripe */}
      <rect x="1.5" y="8" width="21" height="4" fill="white" opacity="0.12" />
      {/* EMV chip body */}
      <rect x="4" y="13.5" width="6.5" height="4.5" rx="1.2" fill="white" opacity="0.88" />
      {/* chip circuit lines */}
      <line x1="7.25" y1="13.5" x2="7.25" y2="18" stroke="currentColor" strokeWidth="0.55" opacity="0.35" />
      <line x1="4" y1="15.75" x2="10.5" y2="15.75" stroke="currentColor" strokeWidth="0.55" opacity="0.35" />
      {/* card number dots */}
      <circle cx="13.5" cy="17" r="1" fill="white" opacity="0.55" />
      <circle cx="16"   cy="17" r="1" fill="white" opacity="0.55" />
      <circle cx="18.5" cy="17" r="1" fill="white" opacity="0.55" />
      <circle cx="21"   cy="17" r="1" fill="white" opacity="0.55" />
      {/* contactless symbol */}
      <path
        d="M14 13a2.5 2.5 0 0 1 0 3.5"
        fill="none" stroke="white" strokeWidth="1.1" strokeLinecap="round" opacity="0.6"
      />
      <path
        d="M15.5 11.5a5 5 0 0 1 0 6.5"
        fill="none" stroke="white" strokeWidth="1.1" strokeLinecap="round" opacity="0.4"
      />
    </>
  ),
};

export function SecurityIcon({ name, className }: SecurityIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {icons[name]}
    </svg>
  );
}
