import { createHash, randomBytes } from 'node:crypto';
import { registerRequestSchema, type PublicUser } from '@kaizen/contracts';
import { Prisma, type PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { z } from 'zod';

const bcryptCostSchema = z.coerce.number().int().min(4).max(31).default(12);
const SESSION_TOKEN_BYTES = 32;
const SESSION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;
const TRANSACTION_WAIT_MS = 2_000;
const TRANSACTION_TIMEOUT_MS = 5_000;

type RegistrationResult =
  | { ok: true; user: PublicUser; sessionToken: string }
  | {
      ok: false;
      status: 400;
      code: 'INVALID_REGISTRATION';
      message: string;
    }
  | {
      ok: false;
      status: 409;
      code: 'REGISTRATION_CONFLICT';
      message: string;
    };

export async function registerAccount(
  prisma: PrismaClient,
  input: unknown,
): Promise<RegistrationResult> {
  const registration = registerRequestSchema.safeParse(input);
  if (!registration.success) {
    return {
      ok: false,
      status: 400,
      code: 'INVALID_REGISTRATION',
      message: 'Invalid registration details.',
    };
  }

  const { email, displayName, password, timezone } = registration.data;
  const cost = bcryptCostSchema.parse(process.env.AUTH_BCRYPT_COST);
  const passwordHash = await bcrypt.hash(password, cost);
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
            sessions: {
              create: {
                tokenHash,
                expiresAt: new Date(Date.now() + SESSION_LIFETIME_MS),
              },
            },
          },
          select: { id: true, displayName: true, timezone: true },
        }),
      { maxWait: TRANSACTION_WAIT_MS, timeout: TRANSACTION_TIMEOUT_MS },
    );

    return {
      ok: true,
      user: { ...user, email },
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
