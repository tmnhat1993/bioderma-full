import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { ZoneFlow } from '@/components/Experience';

export default async function ZonePage({ params }: { params: Promise<{ zone: string }> }) {
  const { zone } = await params; const number = Number(zone);
  if (![1,2,3].includes(number)) notFound();
  return <Suspense fallback={null}><ZoneFlow zone={number as 1|2|3} /></Suspense>;
}
