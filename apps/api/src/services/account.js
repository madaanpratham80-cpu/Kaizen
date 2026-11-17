import bcrypt from 'bcrypt';
import { levelProgress } from '../domain/progression.js';
import { rankForXp } from '../domain/ranks.js';
import { scheduleTimezoneInTransaction } from './calendar.js';
import { readServerClock } from './player-lock.js';
import { ProgressionError, withProgressionLock } from './progression-store.js';

const publicFields = {
  id: true,
  normalizedEmail: true,
  displayName: true,
  timezone: true,
  goals: true,
};
const stateFields = {
  totalXp: true,
  health: true,
  currentStreak: true,
  bestStreak: true,
  stateVersion: true,
};
const invalidSession = () =>
  new ProgressionError(401, 'SESSION_INVALID', 'Invalid session.');
const reauthRequired = () =>
  new ProgressionError(401, 'REAUTH_REQUIRED', 'Password confirmation failed.');

function publicAccount({ normalizedEmail, ...account }) {
  return { ...account, email: normalizedEmail };
}

async function assertSession(tx, { userId, tokenHash }, now) {
  if (
    !(await tx.session.findUnique({
      where: { tokenHash, userId, expiresAt: { gt: now } },
      select: { id: true },
    }))
  ) {
    throw invalidSession();
  }
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {{userId: string}} owner
 * @returns {Promise<object>}
 */
export function readProfile(prisma, { userId }) {
  return prisma.$transaction(
    async (tx) => {
      const account = await tx.user.findUnique({
        where: { id: userId },
        select: { ...publicFields, playerState: { select: stateFields } },
      });
      if (!account) throw invalidSession();
      const { playerState, ...user } = account;
      if (!playerState)
        throw new ProgressionError(
          503,
          'PLAYER_STATE_UNAVAILABLE',
          'Player state is temporarily unavailable.',
        );
      const seals = await tx.userAchievement.findMany({
        where: { userId },
        orderBy: [{ unlockedAt: 'desc' }, { achievementCode: 'asc' }],
        omit: { userId: true },
      });
      return {
        user: publicAccount(user),
        ...playerState,
        ...levelProgress(playerState.totalXp),
        rank: rankForXp(playerState.totalXp),
        seals,
      };
    },
    { isolationLevel: 'RepeatableRead' },
  );
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {{userId: string, tokenHash: string}} actor
 * @param {{displayName?: string, goals?: string[], timezone?: string}} input
 * @returns {Promise<object>}
 */
export function updateSettings(prisma, actor, { timezone, ...changes }) {
  const { userId } = actor;
  return withProgressionLock(prisma, userId, async (tx) => {
    const now = await readServerClock(tx);
    await assertSession(tx, actor, now);
    if (timezone)
      await scheduleTimezoneInTransaction(tx, userId, timezone, now);
    const pending = await tx.calendarTimezoneTransition.findFirst({
      where: { userId, appliedAt: null },
      select: { toTimezone: true, firstNewDate: true, effectiveAt: true },
    });
    const user = Object.keys(changes).length
      ? await tx.user.update({
          where: { id: userId },
          data: changes,
          select: publicFields,
        })
      : await tx.user.findUniqueOrThrow({
          where: { id: userId },
          select: publicFields,
        });
    return {
      user: publicAccount(user),
      pendingTimezone: pending && {
        timezone: pending.toTimezone,
        effectiveDate: pending.firstNewDate.toISOString().slice(0, 10),
        effectiveAt: pending.effectiveAt,
      },
    };
  });
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {{userId: string, tokenHash: string}} actor
 * @param {string} password Fresh password confirmation for this request.
 * @returns {Promise<{deleted: true}>}
 */
export async function deleteAccount(prisma, actor, password) {
  const { userId } = actor;
  const original = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });
  if (!original || !(await bcrypt.compare(password, original.passwordHash)))
    throw reauthRequired();
  return withProgressionLock(prisma, userId, async (tx) => {
    await assertSession(tx, actor, await readServerClock(tx));
    const sameCredentials = await tx.user.findUnique({
      where: { id: userId, passwordHash: original.passwordHash },
      select: { id: true },
    });
    if (!sameCredentials) throw reauthRequired();
    const where = { userId };
    await tx.session.deleteMany({ where });
    await tx.completionReceipt.deleteMany({ where });
    await tx.userAchievement.deleteMany({ where });
    await tx.progressEvent.deleteMany({ where });
    await tx.dayPlan.updateMany({ where, data: { priorityId: null } });
    await tx.questOccurrence.deleteMany({ where });
    await tx.dayPlan.deleteMany({ where });
    await tx.dayPreferenceVersion.deleteMany({ where });
    await tx.calendarTimezoneTransition.deleteMany({ where });
    await tx.scheduleVersion.deleteMany({ where });
    await tx.quest.deleteMany({ where });
    await tx.playerState.delete({ where });
    await tx.user.delete({ where: { id: userId } });
    return { deleted: true };
  });
}
