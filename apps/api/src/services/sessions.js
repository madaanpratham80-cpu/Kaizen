import { createHash, randomBytes } from 'node:crypto';
/** @typedef {import('@kaizen/contracts').PublicUser} PublicUser */
/** @typedef {import('@prisma/client').PrismaClient} PrismaClient */
const SESSION_TOKEN_BYTES = 32;
const SESSION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;
/**
 * @param {Buffer} bytes
 */
function hashToken(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}
/**
 * @param {string} token
 */
function presentedTokenHash(token) {
  const bytes = Buffer.from(token, 'base64url');
  if (
    bytes.length !== SESSION_TOKEN_BYTES ||
    bytes.toString('base64url') !== token
  ) {
    return null;
  }
  return hashToken(bytes);
}
/**
 * @param {PrismaClient} prisma
 * @param {string} userId
 * @returns {Promise<string>}
 */
export async function createSession(prisma, userId) {
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
/**
 * @typedef {(
 *   { ok: true, user: PublicUser } |
 *   { ok: false, status: 401, code: 'SESSION_INVALID', message: string }
 * )} SessionLookup
 */
const invalidSession = {
  ok: false,
  status: 401,
  code: 'SESSION_INVALID',
  message: 'Invalid session.',
};
/**
 * @param {PrismaClient} prisma
 * @param {string} token
 * @returns {Promise<SessionLookup>}
 */
export async function lookupSession(prisma, token) {
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
/**
 * @param {PrismaClient} prisma
 * @param {string} authenticatedUserId
 * @param {string} token
 * @returns {Promise<{ok: true, code: 'SESSION_REVOKED'}>}
 */
export async function revokeSession(prisma, authenticatedUserId, token) {
  const tokenHash = presentedTokenHash(token);
  if (tokenHash) {
    await prisma.session.deleteMany({
      where: { userId: authenticatedUserId, tokenHash },
    });
  }
  return { ok: true, code: 'SESSION_REVOKED' };
}
