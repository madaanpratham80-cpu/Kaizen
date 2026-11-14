import { loginRequestSchema, type PublicUser } from '@kaizen/contracts';
import type { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { createSession } from './sessions.js';

const MAX_PASSWORD_BYTES = 72;
// Generated once from random input at the default bcrypt cost of 12.
const DUMMY_PASSWORD_HASH =
  '$2b$12$5Rk.LqQzUrFp2FdzXZezs.6aBm9aitjYDXJ7k5UsGHhMLEytSvFya';

const loginFailed = {
  ok: false,
  status: 401,
  code: 'LOGIN_FAILED',
  message: 'Invalid email or password.',
} as const;

type LoginResult =
  { ok: true; user: PublicUser; sessionToken: string } | typeof loginFailed;

export async function loginAccount(
  prisma: PrismaClient,
  input: unknown,
): Promise<LoginResult> {
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
  const passwordMatches = await bcrypt.compare(
    password,
    account?.passwordHash ?? DUMMY_PASSWORD_HASH,
  );
  if (!account || !passwordMatches) return loginFailed;

  const { id, displayName, timezone } = account;
  const sessionToken = await createSession(prisma, id);
  return { ok: true, user: { id, email, displayName, timezone }, sessionToken };
}
