import { z } from 'zod';

const bcryptCostSchema = z.coerce.number().int().min(4).max(31).default(12);

export function bcryptCost() {
  return bcryptCostSchema.parse(process.env.AUTH_BCRYPT_COST);
}
