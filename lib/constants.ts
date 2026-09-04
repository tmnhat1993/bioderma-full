import type { EventDay } from './types';

export type EventDate = string;

export function isValidEventDate(value?: string | null): value is EventDate {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function formatEventDate(value: string): string {
  if (!isValidEventDate(value)) return value;
  const [year, month, day] = value.split('-');
  return `Ngày ${day}/${month}/${year}`;
}

export const DEFAULT_EVENT_DAYS: Record<string, EventDay> = {
  '2026-09-12': {
    date: '2026-09-12', label: formatEventDate('2026-09-12'), openingStock: 500,
    adjustments: 0, distributedZone2: 0, distributedZone3: 0, remainingStock: 500,
    codes: { zone1: '1111', zone2: '2222', zone3: '3333' },
  },
  '2026-09-13': {
    date: '2026-09-13', label: formatEventDate('2026-09-13'), openingStock: 500,
    adjustments: 0, distributedZone2: 0, distributedZone3: 0, remainingStock: 500,
    codes: { zone1: '1111', zone2: '2222', zone3: '3333' },
  },
};

export const STORAGE_KEYS = {
  device: 'bioderma:device-id', participant: 'bioderma:participant',
  demoParticipants: 'bioderma:demo-participants', demoDays: 'bioderma:demo-days',
  demoLedger: 'bioderma:demo-ledger', adminSession: 'bioderma:admin-session',
} as const;

export function getVietnamDate(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

export function getClientEventDate(): EventDate { return getVietnamDate(); }
