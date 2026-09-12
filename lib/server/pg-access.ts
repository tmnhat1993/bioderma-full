import 'server-only';
import { timingSafeEqual } from 'node:crypto';

// This capability is intentionally server-only; rotate PG_ACCESS_KEY to revoke QR links.
export const pgAccessKey = () => process.env.PG_ACCESS_KEY || '7f2c8b41d6e940a59c13f085b72da6e3';
export function validPgAccess(value: string) {
  const actual = Buffer.from(value);
  const expected = Buffer.from(pgAccessKey());
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
