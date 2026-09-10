import Image from 'next/image';
import { BrandHeader } from '@/components/BrandHeader';
import { ArtLink } from '@/components/ArtButton';

export default function Home() {
  return (
    <main className="app-shell">
      <section className="mobile-stage welcome-stage" aria-labelledby="welcome-title">
        <BrandHeader />
        <div className="welcome-copy">
          <p>CHÀO MỪNG BẠN ĐẾN VỚI</p>
          <h1 id="welcome-title"><span>SÉBIUM</span>REBALANCE LAB</h1>
        </div>
        <div className="welcome-art" aria-hidden="true">
          <Image src="/assets/event/home-bg.webp" alt="" fill sizes="(max-width: 480px) 112vw, 540px" priority />
        </div>
        <ArtLink asset="start" label="Bắt đầu ngay" className="welcome-button" href="/register" />
      </section>
    </main>
  );
}
