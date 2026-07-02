import Image from "next/image";
import type { SiteImageSlot } from "@/lib/placeholders";

type SiteImageProps = SiteImageSlot & {
  className?: string;
  imageClassName?: string;
  showSlotLabel?: boolean;
  priority?: boolean;
};

export function SiteImage({
  src,
  alt,
  slotLabel,
  width,
  height,
  className,
  imageClassName,
  showSlotLabel = true,
  priority = false,
}: SiteImageProps) {
  return (
    <figure className={`site-image ${className ?? ""}`.trim()}>
      <div className="site-image-frame">
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          className={`site-image-media ${imageClassName ?? ""}`.trim()}
          priority={priority}
          unoptimized={
            src.endsWith(".svg") || src.includes("/placeholders/")
          }
        />
        {showSlotLabel && (
          <figcaption className="site-image-slot-label">{slotLabel}</figcaption>
        )}
      </div>
    </figure>
  );
}
