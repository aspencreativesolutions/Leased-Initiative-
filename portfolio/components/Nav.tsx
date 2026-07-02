"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/Logo";
import { site } from "@/lib/site";

export function Nav() {
  const pathname = usePathname();

  return (
    <header className="site-header">
      <div className="site-header-main">
        <Logo />

        <nav className="site-header-nav" aria-label="Primary">
          <ul className="flex flex-wrap justify-end gap-x-5 gap-y-2">
            {site.categoryNav.map(({ href, label }) => {
              const isActive =
                pathname === href ||
                (href !== "/" && pathname.startsWith(`${href}/`));
              return (
                <li key={href}>
                  <Link
                    href={href}
                    className={isActive ? "is-active" : undefined}
                  >
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}
