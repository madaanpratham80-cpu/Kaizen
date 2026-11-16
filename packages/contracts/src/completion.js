import { z } from 'zod';

export const completionRequestSchema = z.strictObject({
  operationId: z.uuid().transform((value) => value.toLowerCase()),
});
