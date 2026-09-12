export const EXTRA_GIFTS = ['Kit sampling', 'Sébium sensitive', 'Túi thời trang', 'Bình thuỷ tinh'] as const;
export type ExtraGift = typeof EXTRA_GIFTS[number];
export type ExtraGiftRecord = { gift: ExtraGift; awardedAt: string; updatedAt: string; revision: number };
export type GiftGuest = { id: string; publicCode: string; fullName?: string; createdAt: string; extraGift?: ExtraGiftRecord };
export function isExtraGift(value: unknown): value is ExtraGift { return EXTRA_GIFTS.includes(value as ExtraGift); }
