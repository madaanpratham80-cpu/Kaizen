import { createHash, randomBytes } from 'node:crypto';
import type { PublicUser } from '@kaizen/contracts';
import type { PrismaClient } from '@prisma/client';

const SESSION_TOKEN_BYTES = 32;
const SESSION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

function hashToken(bytes: Buffer) {
  return createHash('sha256').update(bytes).digest('hex');
}

function presentedTokenHash(token: string) {
  const bytes = Buffer.from(token, 'base64url');
  if (
    bytes.length !== SESSION_TOKEN_BYTES ||
    bytes.toString('base64url') !== token
  ) {
    return null;
  }
  return hashToken(bytes);
}

export async function createSession(prisma: PrismaClient, userId: string) {
  const bytes = randomBytes(SESSION_TOKEN_BYTES);
  await prisma.session.create({
    data: {
      userId,
      tokenHash: hashToken(bytes),
      expiresAt: new Date(Date.now() + SESSION_LIFETIME_MS),
    },
    select: { id: true },
  });
  return bytes.toString('base64url');
}

type SessionLookup =
  | { ok: true; user: PublicUser }
  | { ok: false; status: 401; code: 'SESSION_INVALID'; message: string };

const invalidSession = {
  ok: false,
  status: 401,
  code: 'SESSION_INVALID',
  message: 'Invalid session.',
} as const;

export async function lookupSession(
  prisma: PrismaClient,
  token: string,
): Promise<SessionLookup> {
  const tokenHash = presentedTokenHash(token);
  if (!tokenHash) return invalidSession;

  const session = await prisma.session.findUnique({
    where: { tokenHash },
    select: {
      expiresAt: true,
      user: {
        select: {
          id: true,
          normalizedEmail: true,
          displayName: true,
          timezone: true,
        },
      },
    },
  });
  if (!session || session.expiresAt.getTime() <= Date.now()) {
    return invalidSession;
  }

  const { normalizedEmail, ...user } = session.user;
  return { ok: true, user: { ...user, email: normalizedEmail } };
}

export async function revokeSession(
  prisma: PrismaClient,
  authenticatedUserId: string,
  token: string,
) {
  const tokenHash = presentedTokenHash(token);
  if (tokenHash) {
    await prisma.session.deleteMany({
      where: { userId: authenticatedUserId, tokenHash },
    });
  }
  return { ok: true, code: 'SESSION_REVOKED' } as const;
}
