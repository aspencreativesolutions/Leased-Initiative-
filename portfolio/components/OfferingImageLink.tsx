"use client";

import Image from "next/image";
import Link from "next/link";

type OfferingImageLinkProps = {
  src: string;
  alt: string;
  tooltip: string;
  href?: string;
  width: number;
  height: number;
  wrapClassName?: string;
  imageClassName?: string;
};

export function OfferingImageLink({
  src,
  alt,
  tooltip,
  href,
  width,
  height,
  wrapClassName = "offering-image-wrap",
  imageClassName = "offering-image",
}: OfferingImageLinkProps) {
  const image = (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={imageClassName}
      unoptimized
    />
  );

  const tooltipEl = (
    <span className="offering-image-tooltip" role="tooltip">
      {tooltip}
    </span>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={wrapClassName}
        aria-label={tooltip}
        target={href.startsWith("http") ? "_blank" : undefined}
        rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
      >
        {image}
        {tooltipEl}
      </Link>
    );
  }

  return (
    <button type="button" className={wrapClassName} aria-label={tooltip}>
      {image}
      {tooltipEl}
    </button>
  );
}
