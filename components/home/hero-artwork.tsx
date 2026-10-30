import Image from "next/image";
export function HeroArtwork() {
  return <div className="festival-artwork" aria-hidden="true">
    <Image className="festival-scene" src="/images/hero/trophy-background.webp" alt="" width={1086} height={1448} sizes="(max-width: 767px) 310px, 700px" preload />
    <Image className="festival-botanical" src="/images/hero/botanical-accent-optimized.webp" alt="" width={800} height={1067} sizes="(max-width: 767px) 150px, 300px" />
    <Image className="festival-brush" src="/images/hero/brush-stroke-optimized.webp" alt="" width={800} height={600} sizes="(max-width: 767px) 180px, 420px" />
    <Image className="festival-trophy" src="/images/hero/trophy.webp" alt="" width={1086} height={1448} sizes="(max-width: 767px) 190px, 440px" preload />
  </div>;
}
