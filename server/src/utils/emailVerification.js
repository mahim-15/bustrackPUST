import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';

export function normalizeInstitutionalEmail(email) {
  if (typeof email !== 'string') return null;

  const normalized = email.trim().toLowerCase();
  const match = /^[^\s@]+@([^\s@]+)$/.exec(normalized);
  if (!match) return null;

  const domain = (process.env.INSTITUTIONAL_EMAIL_DOMAIN || 'pust.ac.bd').trim().toLowerCase();
  if (match[1] !== domain && !match[1].endsWith(`.${domain}`)) return null;
  return normalized;
}

export function generateEmailOtp() {
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}

export function getEmailOtpDigest(email, otp) {
  const secret = process.env.OTP_SECRET || process.env.JWT_SECRET;
  if (!secret) throw new Error('OTP_SECRET or JWT_SECRET must be configured');
  return createHmac('sha256', secret).update(`${email}:${otp}`).digest('hex');
}

export function emailOtpMatches(email, otp, digest) {
  const expected = Buffer.from(getEmailOtpDigest(email, otp), 'hex');
  const actual = Buffer.from(digest, 'hex');
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
