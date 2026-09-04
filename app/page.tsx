import Link from 'next/link';
import Image from 'next/image';
import { BrandHeader } from '@/components/BrandHeader';

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
        <Link className="primary-button welcome-button" href="/register">Bắt đầu ngay <span aria-hidden="true">›</span></Link>
      </section>
    </main>
  );
}
