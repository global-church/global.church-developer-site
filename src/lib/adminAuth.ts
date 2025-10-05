import { createHash } from 'node:crypto';

export const ADMIN_SESSION_COOKIE = 'gc_admin_session';
export const ADMIN_SESSION_MAX_AGE = 60 * 60 * 12; // 12 hours

function readAdminPassword(): string | null {
  const raw = process.env.ADMIN_PORTAL_PASSWORD;
  if (!raw || raw.trim().length === 0) {
    return null;
  }
  return raw;
}

export function isAdminPasswordConfigured(): boolean {
  return Boolean(readAdminPassword());
}

export function getAdminSessionSignature(): string | null {
  const password = readAdminPassword();
  if (!password) {
    return null;
  }
  return createHash('sha256').update(password).digest('hex');
}

export function matchesSessionSignature(value: string | undefined | null): boolean {
  if (!value) {
    return false;
  }
  const expected = getAdminSessionSignature();
  if (!expected) {
    return false;
  }
  return value === expected;
}
