import { Buffer } from 'node:buffer';
import { describe, expect, it } from 'vitest';

import {
  authAccountResponseSchema,
  authSessionResponseSchema,
  loginRequestSchema,
  registerRequestSchema,
} from '../src/index.js';

const validRegistration = {
  email: '  Student@Example.COM  ',
  displayName: 'Student',
  password: 'long-enough-password',
  timezone: 'Asia/Kolkata',
};

describe('auth-contract-validation', () => {
  it('normalizes email and accepts IANA timezones', () => {
    expect(registerRequestSchema.parse(validRegistration).email).toBe(
      'student@example.com',
    );
    expect(
      registerRequestSchema.safeParse({ ...validRegistration, timezone: 'UTC' })
        .success,
    ).toBe(true);
    expect(
      registerRequestSchema.safeParse({
        ...validRegistration,
        timezone: 'America/New_York',
      }).success,
    ).toBe(true);
  });

  it('requires valid email, display name, password, and timezone', () => {
    expect(
      registerRequestSchema.safeParse({
        ...validRegistration,
        email: 'bad-email',
      }).success,
    ).toBe(false);
    expect(
      registerRequestSchema.safeParse({
        ...validRegistration,
        displayName: '   ',
      }).success,
    ).toBe(false);
    expect(
      registerRequestSchema.safeParse({
        ...validRegistration,
        password: 'too-short',
      }).success,
    ).toBe(false);
    expect(
      registerRequestSchema.safeParse({
        ...validRegistration,
        timezone: 'Mars/Olympus',
      }).success,
    ).toBe(false);
    expect(
      registerRequestSchema.safeParse({
        ...validRegistration,
        timezone: '+05:30',
      }).success,
    ).toBe(false);
    expect(
      registerRequestSchema.safeParse({ ...validRegistration, timezone: 'IST' })
        .success,
    ).toBe(false);
    expect(
      registerRequestSchema.safeParse({ email: validRegistration.email })
        .success,
    ).toBe(false);
    expect(
      registerRequestSchema.safeParse({
        ...validRegistration,
        userId: 'client-chosen',
      }).success,
    ).toBe(false);
  });

  it('accepts exactly 72 UTF-8 password bytes and rejects 73', () => {
    const seventyTwoBytes = '€'.repeat(24);
    const seventyThreeBytes = `${seventyTwoBytes}a`;
    const fiftyBytes = 'é'.repeat(25);
    const hundredElevenBytes = '€'.repeat(37);
    expect(seventyTwoBytes).toHaveLength(24);
    expect(Buffer.byteLength(seventyTwoBytes, 'utf8')).toBe(72);
    expect(Buffer.byteLength(seventyThreeBytes, 'utf8')).toBe(73);
    expect(Buffer.byteLength(fiftyBytes, 'utf8')).toBe(50);
    expect(Buffer.byteLength(hundredElevenBytes, 'utf8')).toBe(111);
    expect(
      registerRequestSchema.safeParse({
        ...validRegistration,
        password: seventyTwoBytes,
      }).success,
    ).toBe(true);
    expect(
      registerRequestSchema.safeParse({
        ...validRegistration,
        password: seventyThreeBytes,
      }).success,
    ).toBe(false);
    expect(
      registerRequestSchema.safeParse({
        ...validRegistration,
        password: fiftyBytes,
      }).success,
    ).toBe(true);
    expect(
      registerRequestSchema.safeParse({
        ...validRegistration,
        password: hundredElevenBytes,
      }).success,
    ).toBe(false);
  });

  it('preserves registration and login passwords exactly', () => {
    const password = '  exact-password  ';
    expect(
      registerRequestSchema.parse({ ...validRegistration, password }).password,
    ).toBe(password);
    expect(
      loginRequestSchema.parse({
        email: validRegistration.email,
        password,
      }),
    ).toEqual({
      email: 'student@example.com',
      password,
    });
  });

  it('rejects secret fields from public responses', () => {
    const user = {
      id: '09d5a188-cc9f-47d4-8e1e-848c51b51e86',
      email: 'student@example.com',
      displayName: 'Student',
      timezone: 'UTC',
    };
    const response = { data: { user }, requestId: 'request-1' };
    expect(authAccountResponseSchema.safeParse(response).success).toBe(true);
    expect(
      authAccountResponseSchema.safeParse({
        data: { user: { ...user, passwordHash: 'secret' } },
        requestId: 'request-1',
      }).success,
    ).toBe(false);
    expect(
      authSessionResponseSchema.safeParse({
        data: { user, csrfToken: 'csrf' },
        requestId: 'request-1',
      }).success,
    ).toBe(true);
    expect(
      authSessionResponseSchema.safeParse({
        data: { user, csrfToken: 'csrf', tokenHash: 'secret' },
        requestId: 'request-1',
      }).success,
    ).toBe(false);
  });
});
