export { z } from 'zod';
export { completionRequestSchema, occurrenceIdSchema } from './completion.js';
export {
  authAccountResponseSchema,
  authLogoutResponseSchema,
  authSessionResponseSchema,
  ianaTimezoneSchema,
  loginRequestSchema,
  publicUserSchema,
  registerRequestSchema,
} from './auth.js';
export {
  archiveQuestSchema,
  createQuestSchema,
  editQuestSchema,
  listQuestsSchema,
  prioritySchema,
  questCategorySchema,
  questDifficultySchema,
  questIdSchema,
  questListQuerySchema,
  questUpdateSchema,
  quickQuestSchema,
} from './quests.js';

/** @typedef {import('./auth.js').LoginRequest} LoginRequest */
/** @typedef {import('./auth.js').PublicUser} PublicUser */
/** @typedef {import('./auth.js').RegisterRequest} RegisterRequest */

export {
  deleteAccountSchema,
  habitsQuerySchema,
  HISTORY_DAYS,
  progressQuerySchema,
  settingsSchema,
  settingsValidationErrorResponseSchema,
} from './profile.js';

export {
  calendarSyncResponseSchema,
  completionResponseSchema,
  habitsResponseSchema,
  profileResponseSchema,
  progressResponseSchema,
  questMutationResponseSchema,
  questsResponseSchema,
  settingsSaveResponseSchema,
  todayResponseSchema,
} from './screen-responses.js';
