import { expect, it } from 'vitest';
import { settingsSaveResponseSchema } from '../src/index.js';

const saved = {
  data: {
    user: {
      id: '09d5a188-cc9f-47d4-8e1e-848c51b51e86',
      email: 'settings@example.test',
      displayName: 'Saved name',
      timezone: 'UTC',
      goals: ['Read'],
    },
    pendingTimezone: null,
  },
  requestId: 'f4b17d67-af00-4463-9b6e-65d93094cad7',
};
const pending = {
  ...saved,
  data: {
    ...saved.data,
    pendingTimezone: {
      timezone: 'Asia/Kolkata',
      effectiveDate: '2026-12-17',
      effectiveAt: '2026-12-16T18:30:00.000Z',
    },
  },
};

it('parses a saved settings response', () => {
  expect(settingsSaveResponseSchema.parse(saved)).toEqual(saved);
});

it('parses a pending timezone transition', () => {
  expect(settingsSaveResponseSchema.parse(pending)).toEqual(pending);
});

it('rejects unknown keys in a settings response', () => {
  const candidates = [
    { ...saved, extra: true },
    { ...saved, data: { ...saved.data, extra: true } },
    {
      ...saved,
      data: { ...saved.data, user: { ...saved.data.user, extra: true } },
    },
    {
      ...pending,
      data: {
        ...pending.data,
        pendingTimezone: { ...pending.data.pendingTimezone, extra: true },
      },
    },
  ];
  for (const candidate of candidates)
    expect(settingsSaveResponseSchema.safeParse(candidate).success).toBe(false);
});

it('rejects a missing required settings field', () => {
  const missingGoals = {
    ...saved,
    data: { ...saved.data, user: { ...saved.data.user } },
  };
  delete missingGoals.data.user.goals;
  expect(settingsSaveResponseSchema.safeParse(missingGoals).success).toBe(
    false,
  );

  const missingPending = { ...saved, data: { ...saved.data } };
  delete missingPending.data.pendingTimezone;
  expect(settingsSaveResponseSchema.safeParse(missingPending).success).toBe(
    false,
  );
});

it('rejects a null where a value is required', () => {
  const invalid = {
    ...pending,
    data: {
      ...pending.data,
      pendingTimezone: { ...pending.data.pendingTimezone, effectiveAt: null },
    },
  };
  expect(settingsSaveResponseSchema.safeParse(invalid).success).toBe(false);

  const nullUser = { ...saved, data: { ...saved.data, user: null } };
  expect(settingsSaveResponseSchema.safeParse(nullUser).success).toBe(false);
});
