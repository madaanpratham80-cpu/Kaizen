import { z } from 'zod';

const passwordSchema = z
  .string()
  .min(12)
  .refine((password) => new TextEncoder().encode(password).length <= 72, {
    message: 'Password must be at most 72 UTF-8 bytes',
  });

const runtimeIanaTimezones = new Set(Intl.supportedValuesOf('timeZone'));

export const ianaTimezoneSchema = z.string().refine((timezone) => {
  // UTC and some IANA aliases are absent from the runtime's canonical list.
  if (timezone === 'UTC' || runtimeIanaTimezones.has(timezone)) {
    return true;
  }
  if (!timezone.includes('/')) {
    return false;
  }
  try {
    const canonical = new Intl.DateTimeFormat('en', {
      timeZone: timezone,
    }).resolvedOptions().timeZone;
    return canonical === 'UTC' || runtimeIanaTimezones.has(canonical);
  } catch {
    return false;
  }
}, 'Invalid IANA timezone');

const normalizedEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email().max(254));

export const registerRequestSchema = z.strictObject({
  email: normalizedEmailSchema,
  displayName: z.string().trim().min(1).max(80),
  password: passwordSchema,
  timezone: ianaTimezoneSchema,
});

export const loginRequestSchema = z.strictObject({
  email: normalizedEmailSchema,
  password: z.string(),
});

export const publicUserSchema = z.strictObject({
  id: z.uuid(),
  email: z.email(),
  displayName: z.string(),
  timezone: ianaTimezoneSchema,
});

export const authAccountResponseSchema = z.strictObject({
  data: z.strictObject({ user: publicUserSchema }),
  requestId: z.string().min(1),
});

export const authSessionResponseSchema = z.strictObject({
  data: z.strictObject({
    user: publicUserSchema,
    csrfToken: z.string().min(1),
  }),
  requestId: z.string().min(1),
});

export const authLogoutResponseSchema = z.strictObject({
  data: z.strictObject({ success: z.literal(true) }),
  requestId: z.string().min(1),
});

/** @typedef {import('zod').infer<typeof registerRequestSchema>} RegisterRequest */
/** @typedef {import('zod').infer<typeof loginRequestSchema>} LoginRequest */
/** @typedef {import('zod').infer<typeof publicUserSchema>} PublicUser */
