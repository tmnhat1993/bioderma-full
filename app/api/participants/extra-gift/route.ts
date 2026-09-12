import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/server/firebase-admin';
import { hash } from '@/lib/server/helpers';
export async function POST(request:NextRequest) {
  try {
    const {participantId,deviceId}=await request.json();
    if(typeof participantId!=='string'||!/^[\w-]{1,128}$/.test(participantId)||typeof deviceId!=='string'||deviceId.length>200) return NextResponse.json({received:false},{status:400});
    const doc=await getAdminDb().collection('participants').doc(participantId).get(); const p=doc.data();
    if(!p||p.deviceHash!==hash(deviceId)) return NextResponse.json({received:false},{status:403});
    return NextResponse.json({received:Number(p.currentZone)>=3&&Boolean(p.extraGift?.gift)},{headers:{'Cache-Control':'no-store'}});
  } catch { return NextResponse.json({received:false},{status:500}); }
}
