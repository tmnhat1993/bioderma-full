import { notFound } from 'next/navigation';
import { validPgAccess } from '@/lib/server/pg-access';
import { PgExtraGifts } from '@/components/PgExtraGifts';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'PB / PG · Quà đặc biệt', robots: { index: false, follow: false }, referrer: 'no-referrer' as const };
export default async function Page({params}:{params:Promise<{accessKey:string}>}) {
  const {accessKey} = await params;
  if (!validPgAccess(accessKey)) notFound();
  return <PgExtraGifts accessKey={accessKey}/>;
}
