export type Gender = 'female' | 'male';
export type AgeRange = '18-24' | '25-45' | '45+';
export type SampleStatus = 'not_applicable' | 'received' | 'out_of_stock';

export type Participant = {
  id: string;
  publicCode: string;
  eventDate: string;
  consent: boolean;
  fullName?: string;
  phone?: string;
  gender: Gender;
  ageRange?: AgeRange;
  createdAt: string;
  currentZone: number;
  zone1CompletedAt?: string;
  zone2CompletedAt?: string;
  zone2SampleStatus?: SampleStatus;
  zone3CompletedAt?: string;
  zone3SampleStatus?: SampleStatus;
};

export type EventDay = {
  date: string;
  label: string;
  openingStock: number;
  adjustments: number;
  distributedZone2: number;
  distributedZone3: number;
  remainingStock: number;
  codes: { zone1: string; zone2: string; zone3: string };
  updatedAt?: string;
};

export type InventoryEntry = {
  id: string;
  eventDate: string;
  type: 'distribution' | 'adjustment';
  quantity: number;
  zone?: 2 | 3;
  participantId?: string;
  reason?: string;
  createdAt: string;
  createdBy?: string;
};

export type AdminData = {
  eventDay: EventDay;
  participants: Participant[];
  ledger: InventoryEntry[];
};
