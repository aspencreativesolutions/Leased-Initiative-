import Image from "next/image";
import type { Offering } from "@/lib/site";
import { OfferingImageLink } from "@/components/OfferingImageLink";

type OfferingCardProps = {
  offering: Offering;
};

export function OfferingCard({ offering }: OfferingCardProps) {
  const { title, description, icon, image, featured } = offering;
  const hasMedia = Boolean(icon || image);
  const fillHeight = Boolean(image?.fillHeight);

  const media = icon ? (
    <div className="offering-card-media">
      <Image
        src={icon.src}
        alt={icon.alt}
        width={128}
        height={128}
        className="offering-icon-img"
        unoptimized
      />
      {icon.label ? (
        <p className="offering-icon-label">{icon.label}</p>
      ) : null}
    </div>
  ) : image ? (
    <div
      className={`offering-card-media${
        image.variant === "logo" ? " offering-card-media--logo" : ""
      }${fillHeight ? " offering-card-media--fill" : ""}`}
    >
      {fillHeight ? (
        <div className="offering-image-fill-frame">
          <Image
            src={image.src}
            alt={image.alt}
            fill
            sizes="50vw"
            className="offering-image offering-image--fill-height"
            unoptimized
          />
        </div>
      ) : image.tooltip ? (
        <OfferingImageLink
          src={image.src}
          alt={image.alt}
          tooltip={image.tooltip}
          href={image.href}
          width={image.width ?? 1024}
          height={image.height ?? 341}
          wrapClassName={
            image.variant === "logo"
              ? "offering-image-wrap offering-image-logo-shell"
              : "offering-image-wrap"
          }
          imageClassName={
            image.variant === "logo"
              ? "offering-image offering-image--logo"
              : "offering-image offering-image--illustration"
          }
        />
      ) : (
        <Image
          src={image.src}
          alt={image.alt}
          width={image.width ?? 1024}
          height={image.height ?? 341}
          className={
            image.variant === "logo"
              ? "offering-image offering-image--logo"
              : "offering-image offering-image--illustration"
          }
          unoptimized
        />
      )}
    </div>
  ) : null;

  return (
    <li
      className={`offering-card${featured ? " offering-card-featured" : ""}${
        hasMedia && !featured && !fillHeight ? " offering-card--with-media" : ""
      }${fillHeight ? " offering-card--fill-media" : ""}`}
    >
      <div
        className={
          featured
            ? undefined
            : `offering-card-layout${
                fillHeight ? " offering-card-layout--stretch" : ""
              }`
        }
      >
        <div className="offering-card-content">
          {title ? <h3 className="offering-title">{title}</h3> : null}
          <p className={`offering-body${title ? "" : " offering-body--solo"}`}>
            {description}
          </p>
        </div>
        {!featured && media}
      </div>
    </li>
  );
}
