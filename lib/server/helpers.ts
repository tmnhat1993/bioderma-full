import { createHash } from 'crypto';
import { NextRequest } from 'next/server';
import { getVietnamDate, isValidEventDate, type EventDate } from '@/lib/constants';
import type { Participant } from '@/lib/types';
import { getAdminAuth, getAdminDb } from './firebase-admin';

export function hash(value: string) { return createHash('sha256').update(value).digest('hex'); }

export async function resolveEventDate(requested?: string): Promise<EventDate> {
  const current = getVietnamDate();
  const previewAllowed = process.env.ALLOW_EVENT_PREVIEW === 'true' || process.env.NODE_ENV !== 'production';
  const candidate = previewAllowed && isValidEventDate(requested) ? requested : current;
  if (!isValidEventDate(candidate)) throw new Error('Ngày tham gia không hợp lệ.');
  const day = await getAdminDb().collection('eventDays').doc(candidate).get();
  if (!day.exists) throw new Error('Ngày hôm nay chưa được Admin khởi tạo chương trình.');
  return candidate;
}

export function participantFromData(id: string, data: Record<string, unknown>): Participant {
  return { id, ...(data as Omit<Participant, 'id'>) };
}

export function requestIp(request: NextRequest) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
}

export async function requireAdmin(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) throw new Error('Vui lòng đăng nhập CMS.');
  const decoded = await getAdminAuth().verifyIdToken(token);
  const emails = (process.env.ADMIN_EMAILS || '').split(',').map((item) => item.trim().toLowerCase()).filter(Boolean);
  const emailAllowed = decoded.email && emails.includes(decoded.email.toLowerCase());
  const adminDoc = await getAdminDb().collection('admins').doc(decoded.uid).get();
  if (!emailAllowed && adminDoc.data()?.active !== true) throw new Error('Tài khoản chưa được cấp quyền Admin.');
  return { uid: decoded.uid, email: decoded.email || decoded.uid };
}
