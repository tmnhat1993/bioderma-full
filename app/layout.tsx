import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PreviewNavigator } from '@/components/PreviewNavigator';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: 'Sébium Rebalance Lab | Bioderma',
  description: 'Trải nghiệm chăm sóc làn da cùng Bioderma Sébium Rebalance Lab.',
  openGraph: {
    title: 'SÉBIUM REBALANCE LAB',
    description: 'Trải nghiệm chăm sóc làn da cùng Bioderma.',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Sébium Rebalance Lab' }],
  },
  twitter: { card: 'summary_large_image', title: 'SÉBIUM REBALANCE LAB', description: 'Trải nghiệm chăm sóc làn da cùng Bioderma.', images: ['/og.png'] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi"><body>{children}<Suspense fallback={null}><PreviewNavigator /></Suspense></body></html>;
}
