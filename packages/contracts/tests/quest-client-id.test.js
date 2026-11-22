import { expect, it } from 'vitest';
import { createQuestSchema, editQuestSchema } from '../src/index.js';

const input = {
  title: 'Read',
  category: 'Academic',
  difficulty: 'EASY',
  target: 1,
  effectiveFrom: '2030-01-02',
  recurrence: { kind: 'DAILY' },
};
const clientId = '8369EB1A-0540-4BD7-AA93-581287F84169';

it('accepts an optional client UUID on create while preserving strict edit requests', () => {
  expect(createQuestSchema.parse(input)).toEqual(input);
  expect(createQuestSchema.parse({ ...input, clientId }).clientId).toBe(
    clientId.toLowerCase(),
  );
  expect(
    createQuestSchema.safeParse({ ...input, clientId: 'bad' }).success,
  ).toBe(false);
  expect(
    editQuestSchema.safeParse({ ...input, expectedVersion: 1 }).success,
  ).toBe(true);
  expect(
    editQuestSchema.safeParse({ ...input, clientId, expectedVersion: 1 })
      .success,
  ).toBe(false);
});
