"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { homeHeroMorph } from "@/lib/placeholders";

const FADE_MS = 900;
const HOLD_MS = 1200;

export function MorphingHeroImage() {
  const [index, setIndex] = useState(0);
  const [first] = homeHeroMorph.images;

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) return;

    const interval = setInterval(() => {
      setIndex((current) => (current + 1) % homeHeroMorph.images.length);
    }, HOLD_MS + FADE_MS);

    return () => clearInterval(interval);
  }, []);

  return (
    <figure
      className="home-hero-image morph-hero"
      aria-label="ClientCraft client dashboard on a smartphone, cycling through light and dark themes"
    >
      <div className="morph-hero-frame">
        {homeHeroMorph.images.map((image, i) => (
          <Image
            key={image.src}
            src={image.src}
            alt={i === 0 ? first.alt : ""}
            width={homeHeroMorph.width}
            height={homeHeroMorph.height}
            className="morph-hero-image"
            style={{
              opacity: i === index ? 1 : 0,
              zIndex: i === index ? 2 : 1,
              transition: `opacity ${FADE_MS}ms linear`,
            }}
            priority={i < 2}
          />
        ))}
      </div>
    </figure>
  );
}
