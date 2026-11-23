import { createHash, randomBytes } from 'node:crypto';
import { registerRequestSchema } from '@kaizen/contracts';
import { Prisma } from '@prisma/client';
import bcrypt from 'bcrypt';
import { bcryptCost } from './bcrypt-config.js';
/** @typedef {import('@kaizen/contracts').PublicUser} PublicUser */
/** @typedef {import('@prisma/client').PrismaClient} PrismaClient */
const SESSION_TOKEN_BYTES = 32;
const SESSION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;
const TRANSACTION_WAIT_MS = 2_000;
const TRANSACTION_TIMEOUT_MS = 5_000;
/**
 * @typedef {(
 *   { ok: true, user: PublicUser, sessionToken: string } |
 *   { ok: false, status: 400, code: 'INVALID_REGISTRATION', message: string } |
 *   { ok: false, status: 409, code: 'REGISTRATION_CONFLICT', message: string }
 * )} RegistrationResult
 */
/**
 * @param {PrismaClient} prisma
 * @param {unknown} input
 * @returns {Promise<RegistrationResult>}
 */
export async function registerAccount(prisma, input) {
  const registration = registerRequestSchema.safeParse(input);
  if (!registration.success) {
    return {
      ok: false,
      status: 400,
      code: 'INVALID_REGISTRATION',
      message: 'Invalid registration details.',
    };
  }
  const { email, displayName, password, timezone, gender } = registration.data;
  const passwordHash = await bcrypt.hash(password, bcryptCost());
  const tokenBytes = randomBytes(SESSION_TOKEN_BYTES);
  const tokenHash = createHash('sha256').update(tokenBytes).digest('hex');
  try {
    const user = await prisma.$transaction(
      (tx) =>
        tx.user.create({
          data: {
            normalizedEmail: email,
            displayName,
            passwordHash,
            timezone,
            gender,
            playerState: { create: {} },
            sessions: {
              create: {
                tokenHash,
                expiresAt: new Date(Date.now() + SESSION_LIFETIME_MS),
              },
            },
          },
          select: { id: true, displayName: true, timezone: true, gender: true },
        }),
      { maxWait: TRANSACTION_WAIT_MS, timeout: TRANSACTION_TIMEOUT_MS },
    );
    const { gender: savedGender, ...publicFields } = user;
    return {
      ok: true,
      user: {
        ...publicFields,
        email,
        ...(savedGender && { gender: savedGender }),
      },
      sessionToken: tokenBytes.toString('base64url'),
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002' &&
      Array.isArray(error.meta?.target) &&
      error.meta.target.includes('normalizedEmail')
    ) {
      return {
        ok: false,
        status: 409,
        code: 'REGISTRATION_CONFLICT',
        message: 'Unable to complete registration.',
      };
    }
    throw error;
  }
}
