import { z } from 'zod';
import { ianaTimezoneSchema } from './auth.js';

export const HISTORY_DAYS = 365;
export const habitsQuerySchema = z.strictObject({ week: z.iso.date() });
export const progressQuerySchema = z
  .strictObject({
    from: z.iso.date().optional(),
    to: z.iso.date().optional(),
    limit: z
      .string()
      .regex(/^[1-9][0-9]{0,2}$/)
      .transform(Number)
      .pipe(z.number().int().max(100))
      .optional(),
    cursor: z
      .string()
      .max(400)
      .regex(/^[A-Za-z0-9_-]+$/)
      .optional(),
  })
  .refine(({ from, to }) => Boolean(from) === Boolean(to));

export const settingsSchema = z
  .strictObject({
    displayName: z.string().trim().min(1).max(80).optional(),
    timezone: ianaTimezoneSchema.optional(),
    goals: z
      .array(z.string().trim().min(1).max(80))
      .max(8)
      .refine((goals) => new Set(goals).size === goals.length)
      .optional(),
  })
  .refine((settings) => Object.keys(settings).length > 0);

const settingsValidationDetail = z.strictObject({
  path: z.union([
    z.tuple([]),
    z.tuple([z.enum(['displayName', 'timezone', 'goals'])]),
    z.tuple([z.literal('goals'), z.int().nonnegative()]),
  ]),
  code: z.enum([
    'INVALID_TYPE',
    'TOO_SMALL',
    'TOO_BIG',
    'UNKNOWN_FIELD',
    'INVALID_VALUE',
  ]),
});

export const settingsValidationErrorResponseSchema = z.strictObject({
  error: z.strictObject({
    code: z.literal('INVALID_INPUT'),
    message: z.string(),
    details: z.array(settingsValidationDetail).min(1),
  }),
  requestId: z.uuid(),
});

export const deleteAccountSchema = z.strictObject({
  password: z
    .string()
    .min(1)
    .refine((value) => new TextEncoder().encode(value).length <= 72),
});
