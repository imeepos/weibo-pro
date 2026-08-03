import { describe, it, expect, vi, afterEach } from 'vitest';
import { createOTP } from '../otp';

// RFC 4226 / RFC 6238 shared ASCII secret
const secret = '12345678901234567890';

afterEach(() => {
  vi.useRealTimers();
});

describe('createOTP', () => {
  it('HOTP matches RFC 4226 test vectors (SHA-1, 6 digits)', async () => {
    const otp = createOTP(secret);
    const expected = [
      '755224',
      '287082',
      '359152',
      '969429',
      '338314',
      '254676',
      '287922',
      '162583',
      '399871',
      '520489',
    ];
    for (let counter = 0; counter < expected.length; counter++) {
      expect(await otp.hotp(counter)).toBe(expected[counter]);
    }
  });

  it('TOTP matches RFC 6238 test vectors (SHA-1, 8 digits)', async () => {
    const otp = createOTP(secret, { digits: 8 });
    const cases = [
      { seconds: 59, expected: '94287082' },
      { seconds: 1111111109, expected: '07081804' },
      { seconds: 1111111111, expected: '14050471' },
      { seconds: 1234567890, expected: '89005924' },
      { seconds: 2000000000, expected: '69279037' },
    ];
    for (const c of cases) {
      vi.setSystemTime(new Date(c.seconds * 1000));
      expect(await otp.totp()).toBe(c.expected);
    }
  });

  it('totp uses default 6 digits and 30s period', async () => {
    const otp = createOTP(secret);
    vi.setSystemTime(new Date(59 * 1000));
    const code = await otp.totp();
    expect(code).toHaveLength(6);
  });

  it('verify accepts the current code', async () => {
    const otp = createOTP(secret);
    vi.setSystemTime(new Date(30 * 1000));
    const code = await otp.totp();
    expect(await otp.verify(code)).toBe(true);
  });

  it('verify rejects a wrong code', async () => {
    const otp = createOTP(secret);
    vi.setSystemTime(new Date(30 * 1000));
    expect(await otp.verify('000000')).toBe(false);
  });

  it('verify accepts a code from the previous period within the window', async () => {
    const otp = createOTP(secret);
    vi.setSystemTime(new Date(30 * 1000)); // counter 1
    const code = await otp.totp();
    vi.setSystemTime(new Date(60 * 1000)); // counter 2, window 1 covers counter 1
    expect(await otp.verify(code)).toBe(true);
  });

  it('verify rejects a code far outside the window', async () => {
    const otp = createOTP(secret);
    vi.setSystemTime(new Date(30 * 1000)); // counter 1
    const code = await otp.totp();
    vi.setSystemTime(new Date(30 * 1000 + 30 * 60 * 1000)); // counter 61
    expect(await otp.verify(code)).toBe(false);
  });

  it('verify respects a custom window of 0', async () => {
    const otp = createOTP(secret);
    vi.setSystemTime(new Date(30 * 1000)); // counter 1
    const code = await otp.totp();
    vi.setSystemTime(new Date(60 * 1000)); // counter 2
    expect(await otp.verify(code, { window: 0 })).toBe(false);
  });

  it('url generates a valid otpauth:// URI', () => {
    const otp = createOTP('secret');
    const uri = otp.url('Sker', 'user@example.com');
    expect(uri).toBe(
      'otpauth://totp/Sker:user%40example.com?secret=ONSWG4TFOQ&issuer=Sker&digits=6&period=30',
    );
  });

  it('url reflects custom digits and period', () => {
    const otp = createOTP('secret', { digits: 8, period: 60 });
    const uri = otp.url('Sker', 'alice');
    expect(uri).toContain('otpauth://totp/Sker:alice?');
    expect(uri).toContain('secret=ONSWG4TFOQ');
    expect(uri).toContain('digits=8');
    expect(uri).toContain('period=60');
  });

  it('url percent-encodes issuer and account', () => {
    const otp = createOTP('secret');
    const uri = otp.url('My App', 'a b');
    expect(uri).toContain('otpauth://totp/My%20App:a%20b?');
    expect(uri).toContain('issuer=My+App');
  });

  it('throws TypeError for invalid digit counts', async () => {
    const otp0 = createOTP(secret, { digits: 0 });
    await expect(otp0.hotp(0)).rejects.toThrow(TypeError);

    const otp9 = createOTP(secret, { digits: 9 });
    await expect(otp9.hotp(0)).rejects.toThrow(TypeError);

    const otpNeg = createOTP(secret, { digits: -1 });
    await expect(otpNeg.totp()).rejects.toThrow(TypeError);
  });
});
