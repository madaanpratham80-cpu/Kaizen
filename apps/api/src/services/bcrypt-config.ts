import { z } from 'zod';
import type { PrismaClient } from '@prisma/client';

const bcryptCostSchema = z.coerce.number().int().min(4).max(31).default(12);

export function bcryptCost() {
  return bcryptCostSchema.parse(process.env.AUTH_BCRYPT_COST);
}

export function bcryptComparisonCosts() {
  const configured = process.env.AUTH_BCRYPT_LEGACY_COSTS?.trim();
  const legacy = configured
    ? configured.split(',').map((cost) => bcryptCostSchema.parse(cost.trim()))
    : [];
  return [...new Set([bcryptCost(), ...legacy])].sort((a, b) => a - b);
}

export async function verifyStoredBcryptCosts(prisma: PrismaClient) {
  const costs = bcryptComparisonCosts();
  const stored = await prisma.$queryRaw<{ cost: string | null }[]>`
    SELECT DISTINCT substring("passwordHash" FROM '^[$]2[aby][$]([0-9]{2})[$]') AS cost
    FROM "User"
  `;
  if (
    stored.some(({ cost }) => cost === null || !costs.includes(Number(cost)))
  ) {
    throw new Error(
      'Stored bcrypt costs do not match authentication configuration',
    );
  }
}
