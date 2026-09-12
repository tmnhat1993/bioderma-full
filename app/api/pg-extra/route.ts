import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/server/firebase-admin';
import { validPgAccess } from '@/lib/server/pg-access';
import { getVietnamDate } from '@/lib/constants';
import { isExtraGift, type GiftGuest } from '@/lib/extra-gifts';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const reply = (data: unknown, status = 200) => NextResponse.json(data, {status, headers:{'Cache-Control':'no-store'}});
const allowed = (request: NextRequest) => validPgAccess(request.headers.get('x-pg-key') || '');
export async function GET(request: NextRequest) {
  if (!allowed(request)) return reply({error:'Đường dẫn không hợp lệ.'},404);
  try {
    const date = getVietnamDate();
    const snapshot = await getAdminDb().collection('participants').where('eventDate','==',date).get();
    const guests: GiftGuest[] = snapshot.docs.filter(doc=>Number(doc.data().currentZone)>=3).map(doc=>{
      const p=doc.data();
      return {id:doc.id,publicCode:p.publicCode,createdAt:p.createdAt,...(p.consent && p.fullName ? {fullName:p.fullName}:{}),...(p.extraGift?{extraGift:p.extraGift}:{})};
    }).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
    return reply({date,guests});
  } catch { return reply({error:'Không thể tải danh sách. Vui lòng thử lại.'},500); }
}
export async function POST(request: NextRequest) {
  if (!allowed(request)) return reply({error:'Đường dẫn không hợp lệ.'},404);
  try {
    const body = await request.json();
    if (typeof body.participantId!=='string' || !/^[\w-]{1,128}$/.test(body.participantId) || !isExtraGift(body.gift) || !Number.isInteger(body.revision) || body.revision<0) return reply({error:'Thông tin quà chưa hợp lệ.'},400);
    const db=getAdminDb();
    const ref=db.collection('participants').doc(body.participantId);
    const result=await db.runTransaction(async tx=>{
      const doc=await tx.get(ref); const p=doc.data(); const date=getVietnamDate();
      if(!p || p.eventDate!==date || !(Number(p.currentZone)>=3)) return {status:409,error:'Khách không thuộc hôm nay hoặc chưa hoàn thành 3 Zone.'};
      if(body.date!==date) return {status:409,error:'Đã sang ngày mới. Vui lòng tải lại danh sách.'};
      const previous=p.extraGift;
      if((previous?.revision||0)!==body.revision) return {status:409,error:'Quà đã được cập nhật trên thiết bị khác. Vui lòng tải lại.'};
      if(previous?.gift===body.gift) return {extraGift:previous};
      const now=new Date().toISOString();
      const extraGift={gift:body.gift,awardedAt:previous?.awardedAt||now,updatedAt:now,revision:(previous?.revision||0)+1};
      tx.update(ref,{extraGift});
      tx.set(db.collection('extraGiftHistory').doc(),{participantId:doc.id,eventDate:date,previousGift:previous?.gift||null,...extraGift});
      return {extraGift};
    });
    return 'error' in result ? reply({error:result.error},result.status) : reply(result);
  } catch { return reply({error:'Không thể lưu quà. Vui lòng thử lại.'},500); }
}
