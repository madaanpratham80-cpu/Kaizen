import { expect, it } from 'vitest';
import { settingsValidationErrorResponseSchema } from '../src/index.js';

const timezoneIssue = { path: ['timezone'], code: 'INVALID_VALUE' };
const displayNameIssue = { path: ['displayName'], code: 'TOO_SMALL' };
const response = (details) => ({
  error: { code: 'INVALID_INPUT', message: 'Invalid request input.', details },
  requestId: 'f4b17d67-af00-4463-9b6e-65d93094cad7',
});

it('parses one path for a single-field Settings rejection', () => {
  const body = response([timezoneIssue]);
  expect(settingsValidationErrorResponseSchema.parse(body)).toEqual(body);
});

it('parses two paths for a multi-field Settings rejection', () => {
  const body = response([displayNameIssue, timezoneIssue]);
  expect(settingsValidationErrorResponseSchema.parse(body)).toEqual(body);
});

it('accepts indexed goal and form-level Settings validation paths', () => {
  const body = response([
    { path: ['goals', 0], code: 'INVALID_TYPE' },
    { path: [], code: 'UNKNOWN_FIELD' },
  ]);
  expect(settingsValidationErrorResponseSchema.parse(body)).toEqual(body);
});

it('rejects missing, empty, or malformed Settings validation details', () => {
  const missing = response(undefined);
  delete missing.error.details;
  const invalid = [
    missing,
    response([]),
    response([{ path: ['userId'], code: 'INVALID_TYPE' }]),
    response([{ path: ['goals', -1], code: 'INVALID_TYPE' }]),
    response([{ path: ['timezone', 0], code: 'INVALID_TYPE' }]),
    response([{ ...timezoneIssue, code: 'unrecognized_code' }]),
    response([{ ...timezoneIssue, input: 'Mars/Olympus' }]),
  ];
  for (const body of invalid)
    expect(settingsValidationErrorResponseSchema.safeParse(body).success).toBe(
      false,
    );
});
