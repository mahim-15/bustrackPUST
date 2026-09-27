import {
  emailOtpMatches,
  generateEmailOtp,
  getEmailOtpDigest,
  normalizeInstitutionalEmail,
} from './emailVerification.js';

describe('institutional email verification helpers', () => {
  const originalDomain = process.env.INSTITUTIONAL_EMAIL_DOMAIN;
  const originalSecret = process.env.OTP_SECRET;
  const originalJwtSecret = process.env.JWT_SECRET;

  afterEach(() => {
    if (originalDomain === undefined) delete process.env.INSTITUTIONAL_EMAIL_DOMAIN;
    else process.env.INSTITUTIONAL_EMAIL_DOMAIN = originalDomain;
    if (originalSecret === undefined) delete process.env.OTP_SECRET;
    else process.env.OTP_SECRET = originalSecret;
    if (originalJwtSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalJwtSecret;
  });

  test('normalizes official addresses and accepts institutional subdomains', () => {
    process.env.INSTITUTIONAL_EMAIL_DOMAIN = 'pust.ac.bd';
    expect(normalizeInstitutionalEmail(' Student@PUST.AC.BD ')).toBe('student@pust.ac.bd');
    expect(normalizeInstitutionalEmail('student@student.pust.ac.bd')).toBe('student@student.pust.ac.bd');
  });

  test('rejects malformed and non-institutional addresses', () => {
    process.env.INSTITUTIONAL_EMAIL_DOMAIN = 'pust.ac.bd';
    expect(normalizeInstitutionalEmail('student@example.com')).toBeNull();
    expect(normalizeInstitutionalEmail('student@pust.ac.bd.example.com')).toBeNull();
    expect(normalizeInstitutionalEmail('not-an-email')).toBeNull();
  });

  test('creates six-digit codes and verifies only the matching code', () => {
    process.env.OTP_SECRET = 'test-secret';
    const email = 'student@pust.ac.bd';
    const otp = generateEmailOtp();
    const digest = getEmailOtpDigest(email, otp);

    expect(otp).toMatch(/^\d{6}$/);
    expect(emailOtpMatches(email, otp, digest)).toBe(true);
    expect(emailOtpMatches(email, `${(Number(otp) + 1) % 1_000_000}`.padStart(6, '0'), digest)).toBe(false);
  });
});
