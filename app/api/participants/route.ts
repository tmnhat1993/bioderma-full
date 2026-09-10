import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/server/firebase-admin';
import { hash, participantFromData, requestIp, resolveEventDate } from '@/lib/server/helpers';
import type { AgeRange, Gender } from '@/lib/types';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { deviceId?: string; eventDate?: string; consent?: boolean; fullName?: string; phone?: string; gender?: Gender; ageRange?: AgeRange };
    if (!body.deviceId || typeof body.consent !== 'boolean' || !['female','male'].includes(body.gender || '')) return NextResponse.json({ error: 'Thông tin đăng ký chưa hợp lệ.' }, { status: 400 });
    if (!['18-24','25-45','45+'].includes(body.ageRange || '')) return NextResponse.json({ error: 'Vui lòng chọn độ tuổi.' }, { status: 400 });
    const phone = body.phone?.replace(/[\s.-]/g, '') || '';
    if (body.consent && (!body.fullName?.trim() || !/^(0|\+84)\d{9,10}$/.test(phone))) return NextResponse.json({ error: 'Vui lòng điền đầy đủ họ tên và số điện thoại hợp lệ.' }, { status: 400 });
    const eventDate = await resolveEventDate(body.eventDate); const db = getAdminDb();
    const deviceHash = hash(body.deviceId); const lockRef = db.collection('deviceLocks').doc(deviceHash); const participantRef = db.collection('participants').doc();
    const ipHash = hash(`${requestIp(request)}:${eventDate}:${process.env.IP_HASH_SALT || 'bioderma-event'}`);
    const participant = await db.runTransaction(async (transaction) => {
      const lock = await transaction.get(lockRef);
      if (lock.exists) {
        const existingRef = db.collection('participants').doc(String(lock.data()?.participantId));
        const existing = await transaction.get(existingRef);
        if (existing.exists) return participantFromData(existing.id, existing.data()!);
      }
      const now = new Date().toISOString();
      const data = {
        publicCode: `BDM-${participantRef.id.slice(0,6).toUpperCase()}`, eventDate, consent: body.consent,
        gender: body.gender, ageRange: body.ageRange, ...(body.consent ? { fullName: body.fullName!.trim(), phone } : {}),
        createdAt: now, currentZone: 0, deviceHash, ipHash,
      };
      transaction.set(participantRef, data); transaction.set(lockRef, { participantId: participantRef.id, createdAt: now });
      return participantFromData(participantRef.id, data);
    });
    return NextResponse.json(participant);
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Không thể lưu thông tin.' }, { status: 500 }); }
}
