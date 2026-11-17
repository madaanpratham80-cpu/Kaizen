import { loginRequestSchema } from '@kaizen/contracts';
import bcrypt from 'bcrypt';
import { bcryptComparisonCosts } from './bcrypt-config.js';
import { createSession } from './sessions.js';
/** @typedef {import('@kaizen/contracts').PublicUser} PublicUser */
/** @typedef {import('@prisma/client').PrismaClient} PrismaClient */
const MAX_PASSWORD_BYTES = 72;
// Generated once from random input at the default bcrypt cost of 12.
const DUMMY_PASSWORD_HASH =
  '$2b$12$5Rk.LqQzUrFp2FdzXZezs.6aBm9aitjYDXJ7k5UsGHhMLEytSvFya';
/**
 * @param {number} cost
 */
function dummyHash(cost) {
  // bcrypt reads the work factor from the hash header. The comparison
  // always fails at the account check, so the checksum can stay fixed.
  const rounds = String(cost).padStart(2, '0');
  return (
    DUMMY_PASSWORD_HASH.slice(0, 4) + rounds + DUMMY_PASSWORD_HASH.slice(6)
  );
}
const loginFailed = {
  ok: false,
  status: 401,
  code: 'LOGIN_FAILED',
  message: 'Invalid email or password.',
};
/** @typedef {{ ok: true; user: PublicUser; sessionToken: string } | typeof loginFailed} LoginResult */
/**
 * @param {PrismaClient} prisma
 * @param {unknown} input
 * @returns {Promise<LoginResult>}
 */
export async function loginAccount(prisma, input) {
  const credentials = loginRequestSchema.safeParse(input);
  if (!credentials.success) return loginFailed;
  const { email, password } = credentials.data;
  if (Buffer.byteLength(password, 'utf8') > MAX_PASSWORD_BYTES) {
    return loginFailed;
  }
  const account = await prisma.user.findUnique({
    where: { normalizedEmail: email },
    select: { id: true, displayName: true, timezone: true, passwordHash: true },
  });
  const storedCost = account
    ? bcrypt.getRounds(account.passwordHash)
    : undefined;
  let passwordMatches = false;
  const costs = bcryptComparisonCosts();
  for (const cost of costs) {
    const match = await bcrypt.compare(
      password,
      account && storedCost === cost ? account.passwordHash : dummyHash(cost),
    );
    if (storedCost === cost) passwordMatches = match;
  }
  if (!account || !passwordMatches) return loginFailed;
  const { id, displayName, timezone } = account;
  const sessionToken = await createSession(prisma, id, account.passwordHash);
  if (!sessionToken) return loginFailed;
  return { ok: true, user: { id, email, displayName, timezone }, sessionToken };
}
