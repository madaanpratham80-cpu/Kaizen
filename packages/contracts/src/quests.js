import { z } from 'zod';

export const questIdSchema = z.uuid();
export const questCategorySchema = z.enum([
  'Academic',
  'Physical',
  'Productivity',
  'Language',
]);
export const questDifficultySchema = z.enum(['EASY', 'MEDIUM', 'HARD']);
const localDateSchema = z.iso.date();
const occurrenceFields = {
  title: z.string().trim().min(1).max(120),
  category: questCategorySchema,
  difficulty: questDifficultySchema,
  target: z.number().int().min(0).max(2_147_483_647),
};
const version = z.number().int().min(1).max(2_147_483_647);

export const createQuestSchema = z.strictObject({
  ...occurrenceFields,
  effectiveFrom: localDateSchema,
  recurrence: z.discriminatedUnion('kind', [
    z.strictObject({ kind: z.literal('DAILY') }),
    z.strictObject({
      kind: z.literal('WEEKLY'),
      weekdays: z
        .array(z.number().int().min(1).max(7))
        .min(1)
        .max(7)
        .refine(
          (days) => new Set(days).size === days.length,
          'Weekdays must be unique',
        ),
    }),
  ]),
});

export const editQuestSchema = createQuestSchema.extend({
  expectedVersion: version,
});
export const archiveQuestSchema = z.strictObject({
  expectedVersion: version,
  effectiveFrom: localDateSchema,
});
export const listQuestsSchema = z.strictObject({
  after: questIdSchema.optional(),
  limit: z.number().int().min(1).max(100).default(25),
  category: questCategorySchema.optional(),
  archived: z.boolean().optional(),
});

export const questListQuerySchema = listQuestsSchema.extend({
  limit: z
    .string()
    .regex(/^[1-9][0-9]{0,2}$/)
    .transform(Number)
    .pipe(listQuestsSchema.shape.limit)
    .optional(),
  archived: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
});

export const questUpdateSchema = z.union([
  editQuestSchema,
  archiveQuestSchema.extend({ archive: z.literal(true) }),
]);

export const quickQuestSchema = z.strictObject({
  id: questIdSchema.transform((id) => id.toLowerCase()),
  ...occurrenceFields,
});

export const prioritySchema = z.strictObject({ occurrenceId: questIdSchema });
