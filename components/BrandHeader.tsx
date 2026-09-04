import Image from 'next/image';

export function BrandHeader({ compact = false }: { compact?: boolean }) {
  return (
    <header className={`brand-row ${compact ? 'brand-row-compact' : ''}`}>
      <Image className="brand-logo" src="/assets/event/logo.webp" alt="Bioderma — Chuyên gia da liễu tin chọn tại Pháp" width={1000} height={236} priority />
    </header>
  );
}
