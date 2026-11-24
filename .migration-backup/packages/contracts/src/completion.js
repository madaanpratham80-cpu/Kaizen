import { z } from 'zod';

export const occurrenceIdSchema = z
  .uuid()
  .transform((value) => value.toLowerCase());

export const completionRequestSchema = z.strictObject({
  operationId: z.uuid().transform((value) => value.toLowerCase()),
});
