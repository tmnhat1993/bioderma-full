import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/server/firebase-admin';
import { hash, participantFromData } from '@/lib/server/helpers';
import type { Participant, SampleStatus } from '@/lib/types';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { participantId?: string; deviceId?: string; zone?: number; code?: string };
    if (!body.participantId || !body.deviceId || ![1,2,3].includes(body.zone || 0) || !/^\d{4}$/.test(body.code || '')) return NextResponse.json({ error: 'Yêu cầu xác nhận chưa hợp lệ.' }, { status: 400 });
    const zone = body.zone as 1|2|3; const db=getAdminDb(); const participantRef=db.collection('participants').doc(body.participantId); const ledgerRef=db.collection('inventoryLedger').doc();
    const result=await db.runTransaction(async(transaction)=>{
      const participantSnap=await transaction.get(participantRef);
      if(!participantSnap.exists) throw new Error('Không tìm thấy hồ sơ tham gia.');
      const participant=participantSnap.data() as Omit<Participant,'id'> & {deviceHash:string};
      if(participant.deviceHash!==hash(body.deviceId!)) throw new Error('Thiết bị không khớp với hồ sơ tham gia.');
      const dayRef=db.collection('eventDays').doc(participant.eventDate); const daySnap=await transaction.get(dayRef);
      if(!daySnap.exists) throw new Error('Ngày sự kiện chưa được Admin cấu hình.');
      const day=daySnap.data()!; const expected=day.codes?.[`zone${zone}`];
      if(expected!==body.code) throw new Error('Mã xác nhận chưa chính xác. Vui lòng thử lại.');
      if(participant.currentZone<zone-1) throw new Error('Bạn cần hoàn thành zone trước đó.');
      const completedKey=`zone${zone}CompletedAt`; const sampleKey=`zone${zone}SampleStatus`;
      if(participant[completedKey as keyof typeof participant]) {
        const prior=participant[sampleKey as keyof typeof participant] as SampleStatus|undefined;
        return { participant: participantFromData(participantSnap.id,participant), rewardStatus: zone===1?'none':prior==='received'?'received':'out_of_stock', remainingStock:Number(day.remainingStock||0) };
      }
      const now=new Date().toISOString(); const updates:Record<string,unknown>={currentZone:zone,[completedKey]:now}; let rewardStatus:'none'|'received'|'out_of_stock'='none'; let remainingStock=Number(day.remainingStock||0);
      if(zone>=2){rewardStatus=remainingStock>0?'received':'out_of_stock';updates[sampleKey]=rewardStatus;if(rewardStatus==='received'){remainingStock-=1;transaction.update(dayRef,{remainingStock,[`distributedZone${zone}`]:Number(day[`distributedZone${zone}`]||0)+1,updatedAt:now});transaction.set(ledgerRef,{eventDate:participant.eventDate,type:'distribution',quantity:-1,zone,participantId:participantSnap.id,createdAt:now});}}
      transaction.update(participantRef,updates); return {participant:participantFromData(participantSnap.id,{...participant,...updates}),rewardStatus,remainingStock};
    });
    return NextResponse.json(result);
  }catch(error){const message=error instanceof Error?error.message:'Không thể xác nhận mã.';const status=message.includes('chính xác')?400:500;return NextResponse.json({error:message},{status});}
}
