import Image from "next/image";

const mascots = [
  { src: "/images/mascot-orange.png", alt: "Splat mascot", delay: "0ms" },
  { src: "/images/mascot-green.png",  alt: "Sunny mascot", delay: "120ms" },
  { src: "/images/mascot-teal.png",   alt: "Swirly mascot", delay: "240ms" },
];

export function MascotRow() {
  return (
    <section className="mascot-row">
      {mascots.map((m) => (
        <div key={m.src} className="mascot-row-item" style={{ animationDelay: m.delay }}>
          <Image src={m.src} alt={m.alt} width={180} height={180} />
        </div>
      ))}
    </section>
  );
}
