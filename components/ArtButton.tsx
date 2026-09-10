import Image from 'next/image';
import Link from 'next/link';
import type { ButtonHTMLAttributes } from 'react';

const assets = {
  start: { src: '/assets/event/button-start.webp', width: 720, height: 156 },
  join: { src: '/assets/event/button-join.webp', width: 800, height: 109 },
  understood: { src: '/assets/event/button-understood.webp', width: 520, height: 119 },
  anonymous: { src: '/assets/event/button-anonymous.webp', width: 900, height: 99 },
  back: { src: '/assets/event/button-back.webp', width: 520, height: 113 },
  next: { src: '/assets/event/button-next.webp', width: 520, height: 113 },
} as const;

type AssetName = keyof typeof assets;
type SharedProps = { asset: AssetName; label: string; className?: string };

function Artwork({ asset }: { asset: AssetName }) {
  const image = assets[asset];
  return <Image src={image.src} alt="" width={image.width} height={image.height} sizes="(max-width: 480px) 70vw, 320px" />;
}

export function ArtButton({ asset, label, className = '', ...props }: SharedProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props} className={`art-button art-button-${asset} ${className}`.trim()} aria-label={label}><Artwork asset={asset} /><span className="visually-hidden">{label}</span></button>;
}

export function ArtLink({ asset, label, href, className = '' }: SharedProps & { href: string }) {
  return <Link href={href} className={`art-button art-button-${asset} ${className}`.trim()} aria-label={label}><Artwork asset={asset} /><span className="visually-hidden">{label}</span></Link>;
}
