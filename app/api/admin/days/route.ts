import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/server/firebase-admin';
import { requireAdmin } from '@/lib/server/helpers';
import type { EventDay } from '@/lib/types';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const snapshot = await getAdminDb().collection('eventDays').orderBy('date', 'asc').get();
    return NextResponse.json(snapshot.docs.map((document) => document.data() as EventDay));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Không thể tải danh sách ngày.' }, { status: 401 });
  }
}
