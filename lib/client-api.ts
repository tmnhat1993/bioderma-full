'use client';

import { DEFAULT_EVENT_DAYS, STORAGE_KEYS, formatEventDate, getClientEventDate, type EventDate } from './constants';
import type { AdminData, AgeRange, EventDay, Gender, InventoryEntry, Participant } from './types';
import { firebaseAuth, hasFirebaseConfig } from './firebase-client';

type RegistrationInput = { consent: boolean; fullName: string; phone: string; gender: Gender; ageRange: AgeRange };

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try { return JSON.parse(localStorage.getItem(key) || '') as T; } catch { return fallback; }
}

function writeJson(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function getDeviceId(): string {
  let id = localStorage.getItem(STORAGE_KEYS.device);
  if (!id) id = document.cookie.split('; ').find((item) => item.startsWith('bioderma_device='))?.split('=')[1] || null;
  if (!id) id = crypto.randomUUID();
  localStorage.setItem(STORAGE_KEYS.device, id);
  document.cookie = `bioderma_device=${id}; path=/; max-age=31536000; SameSite=Lax`;
  return id;
}

export function getLocalParticipant(): Participant | null {
  return readJson<Participant | null>(STORAGE_KEYS.participant, null);
}

function setLocalParticipant(participant: Participant) {
  writeJson(STORAGE_KEYS.participant, participant);
}

function getDemoDays(): Record<string, EventDay> {
  return readJson(STORAGE_KEYS.demoDays, structuredClone(DEFAULT_EVENT_DAYS));
}

function getDemoParticipants(): Participant[] {
  return readJson(STORAGE_KEYS.demoParticipants, []);
}

function saveDemoParticipants(items: Participant[]) { writeJson(STORAGE_KEYS.demoParticipants, items); }

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set('Content-Type', 'application/json');
  if (firebaseAuth?.currentUser) headers.set('Authorization', `Bearer ${await firebaseAuth.currentUser.getIdToken()}`);
  const response = await fetch(url, { ...init, headers });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || 'Đã có lỗi xảy ra.');
  return body as T;
}

export async function registerParticipant(input: RegistrationInput): Promise<Participant> {
  const deviceId = getDeviceId();
  if (hasFirebaseConfig) {
    const participant = await api<Participant>('/api/participants', { method: 'POST', body: JSON.stringify({ ...input, deviceId, eventDate: getClientEventDate() }) });
    setLocalParticipant(participant); return participant;
  }
  const existing = getLocalParticipant();
  if (existing) return existing;
  const participant: Participant = {
    id: crypto.randomUUID(), publicCode: `BDM-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    eventDate: getClientEventDate(), consent: input.consent, gender: input.gender, ageRange: input.ageRange,
    ...(input.consent ? { fullName: input.fullName.trim(), phone: input.phone.replace(/[\s.-]/g, '') } : {}),
    createdAt: new Date().toISOString(), currentZone: 0,
  };
  const items = getDemoParticipants(); items.unshift(participant); saveDemoParticipants(items); setLocalParticipant(participant);
  return participant;
}

export async function verifyZone(zone: 1 | 2 | 3, code: string): Promise<{ participant: Participant; rewardStatus: 'none' | 'received' | 'out_of_stock'; remainingStock: number }> {
  const participant = getLocalParticipant();
  if (!participant) throw new Error('Không tìm thấy hồ sơ tham gia.');
  if (hasFirebaseConfig) {
    const result = await api<{ participant: Participant; rewardStatus: 'none' | 'received' | 'out_of_stock'; remainingStock: number }>('/api/zones/verify', { method: 'POST', body: JSON.stringify({ participantId: participant.id, deviceId: getDeviceId(), zone, code }) });
    setLocalParticipant(result.participant); return result;
  }
  const days = getDemoDays(); const day = days[participant.eventDate as EventDate];
  if (!day || day.codes[`zone${zone}` as keyof typeof day.codes] !== code) throw new Error('Mã xác nhận chưa chính xác. Vui lòng thử lại.');
  if (participant.currentZone < zone - 1) throw new Error('Bạn cần hoàn thành zone trước đó.');
  let rewardStatus: 'none' | 'received' | 'out_of_stock' = 'none';
  const completedKey = `zone${zone}CompletedAt` as keyof Participant;
  if (!participant[completedKey]) {
    (participant as unknown as Record<string, unknown>)[completedKey] = new Date().toISOString();
    participant.currentZone = Math.max(participant.currentZone, zone);
    if (zone >= 2) {
      rewardStatus = day.remainingStock > 0 ? 'received' : 'out_of_stock';
      (participant as unknown as Record<string, unknown>)[`zone${zone}SampleStatus`] = rewardStatus;
      if (rewardStatus === 'received') {
        day.remainingStock -= 1;
        if (zone === 2) day.distributedZone2 += 1; else day.distributedZone3 += 1;
        const ledger = readJson<InventoryEntry[]>(STORAGE_KEYS.demoLedger, []);
        ledger.unshift({ id: crypto.randomUUID(), eventDate: participant.eventDate, type: 'distribution', quantity: -1, zone: zone as 2 | 3, participantId: participant.id, createdAt: new Date().toISOString() });
        writeJson(STORAGE_KEYS.demoLedger, ledger);
      }
    }
    const items = getDemoParticipants().map((item) => item.id === participant.id ? participant : item);
    saveDemoParticipants(items); writeJson(STORAGE_KEYS.demoDays, days); setLocalParticipant(participant);
  } else if (zone >= 2) {
    rewardStatus = participant[`zone${zone}SampleStatus` as 'zone2SampleStatus'] === 'received' ? 'received' : 'out_of_stock';
  }
  return { participant, rewardStatus, remainingStock: day.remainingStock };
}

export function isDemoAdmin(): boolean { return !hasFirebaseConfig && localStorage.getItem(STORAGE_KEYS.adminSession) === 'true'; }
export function setDemoAdmin(value: boolean) { if (value) localStorage.setItem(STORAGE_KEYS.adminSession, 'true'); else localStorage.removeItem(STORAGE_KEYS.adminSession); }

export async function getAdminData(eventDate: EventDate): Promise<AdminData> {
  if (hasFirebaseConfig) return api<AdminData>(`/api/admin/data?eventDate=${eventDate}`);
  return { eventDay: getDemoDays()[eventDate], participants: getDemoParticipants().filter((p) => p.eventDate === eventDate), ledger: readJson<InventoryEntry[]>(STORAGE_KEYS.demoLedger, []).filter((e) => e.eventDate === eventDate) };
}

export async function getEventDays(): Promise<EventDay[]> {
  if (hasFirebaseConfig) return api<EventDay[]>('/api/admin/days');
  return Object.values(getDemoDays()).sort((a, b) => a.date.localeCompare(b.date));
}

export async function createEventDay(eventDate: EventDate, openingStock: number, codes: EventDay['codes']): Promise<EventDay> {
  if (hasFirebaseConfig) return api<EventDay>('/api/admin/data', { method: 'PATCH', body: JSON.stringify({ action: 'createDay', eventDate, openingStock, codes }) });
  const days = getDemoDays();
  if (days[eventDate]) throw new Error('Ngày này đã được khởi tạo.');
  const day: EventDay = { date: eventDate, label: formatEventDate(eventDate), openingStock, adjustments: 0, distributedZone2: 0, distributedZone3: 0, remainingStock: openingStock, codes, updatedAt: new Date().toISOString() };
  days[eventDate] = day; writeJson(STORAGE_KEYS.demoDays, days); return day;
}

export async function saveEventDay(eventDate: EventDate, openingStock: number, codes: EventDay['codes']): Promise<EventDay> {
  if (hasFirebaseConfig) return api<EventDay>('/api/admin/data', { method: 'PATCH', body: JSON.stringify({ action: 'saveDay', eventDate, openingStock, codes }) });
  const days = getDemoDays(); const day = days[eventDate];
  day.openingStock = openingStock; day.codes = codes; day.remainingStock = Math.max(0, openingStock + day.adjustments - day.distributedZone2 - day.distributedZone3); day.updatedAt = new Date().toISOString();
  writeJson(STORAGE_KEYS.demoDays, days); return day;
}

export async function adjustInventory(eventDate: EventDate, quantity: number, reason: string): Promise<EventDay> {
  if (hasFirebaseConfig) return api<EventDay>('/api/admin/data', { method: 'PATCH', body: JSON.stringify({ action: 'adjustStock', eventDate, quantity, reason }) });
  const days = getDemoDays(); const day = days[eventDate];
  if (day.remainingStock + quantity < 0) throw new Error('Điều chỉnh này làm tồn kho nhỏ hơn 0.');
  day.adjustments += quantity; day.remainingStock += quantity; day.updatedAt = new Date().toISOString();
  const ledger = readJson<InventoryEntry[]>(STORAGE_KEYS.demoLedger, []);
  ledger.unshift({ id: crypto.randomUUID(), eventDate, type: 'adjustment', quantity, reason, createdAt: new Date().toISOString(), createdBy: 'Demo Admin' });
  writeJson(STORAGE_KEYS.demoDays, days); writeJson(STORAGE_KEYS.demoLedger, ledger); return day;
}

export function exportParticipantsCsv(items: Participant[]) {
  const headers = ['Mã người dùng','Ngày','Consent','Họ tên','Số điện thoại','Giới tính','Độ tuổi','Thời gian','Zone 1','Zone 2','Quà Zone 2','Zone 3','Quà Zone 3','Quà Extra','Thời gian nhận Extra'];
  const rows = items.map((p) => [p.publicCode,p.eventDate,p.consent?'Đồng ý':'Không đồng ý',p.fullName || '',p.phone || '',p.gender === 'female'?'Nữ':'Nam',p.ageRange || '',p.createdAt,p.zone1CompletedAt || '',p.zone2CompletedAt || '',p.zone2SampleStatus || '',p.zone3CompletedAt || '',p.zone3SampleStatus || '',p.extraGift?.gift || '',p.extraGift?.awardedAt || '']);
  const csv = '\uFEFF' + [headers,...rows].map((row) => row.map((cell) => `"${String(cell).replaceAll('"','""')}"`).join(',')).join('\n');
  const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); link.download = `bioderma-participants-${new Date().toISOString().slice(0,10)}.csv`; link.click(); URL.revokeObjectURL(link.href);
}
