import { Router } from 'express';
import {
  completionRequestSchema,
  createQuestSchema,
  occurrenceIdSchema,
  prioritySchema,
  questIdSchema,
  questListQuerySchema,
  questUpdateSchema,
  quickQuestSchema,
  z,
} from '@kaizen/contracts';
import { CalendarError } from '../services/calendar.js';
import { syncProgressCalendar } from '../services/calendar-sync.js';
import { completeOccurrence } from '../services/completion.js';
import { ProgressionError } from '../services/progression-store.js';
import { changePriority, createQuickQuest } from '../services/day-actions.js';
import {
  archiveQuest,
  createQuest,
  editQuest,
  listQuests,
  QuestCatalogError,
} from '../services/quest-catalog.js';
import { readToday } from '../services/today.js';
import { HttpError, sendData } from './boundary.js';

const empty = z.strictObject({});

/**
 * @param {import('@prisma/client').PrismaClient} database
 * @returns {import('express').Router}
 */
export function createCalendarRoutes(database) {
  const router = Router();
  function route(method, path, handler) {
    router[method](path, async (req, res) => {
      res.set('Cache-Control', 'private, no-store');
      if (!req.auth)
        throw new HttpError(401, 'SESSION_INVALID', 'Invalid session.');
      if (method !== 'get') empty.parse(req.query);
      await handler(req, res, { userId: req.auth.user.id });
    });
  }
  route('post', '/calendar/sync', async (req, res, owner) => {
    empty.parse(req.body === undefined ? {} : req.body);
    const result = await syncProgressCalendar(database, owner);
    if (result.status === 'catching-up')
      res.set('Retry-After', String(result.retryAfterSeconds));
    sendData(res, result, result.status === 'ready' ? 200 : 202);
  });
  route('get', '/today', async (req, res, owner) => {
    empty.parse(req.query);
    sendData(res, await readToday(database, owner));
  });
  route('get', '/quests', async (req, res, owner) => {
    const filters = questListQuerySchema.parse(req.query);
    sendData(res, await listQuests(database, owner, filters));
  });
  route('post', '/quests', async (req, res, owner) => {
    sendData(
      res,
      await createQuest(database, owner, createQuestSchema.parse(req.body)),
      201,
    );
  });
  route('patch', '/quests/:id', async (req, res, owner) => {
    const id = questIdSchema.parse(req.params.id);
    const input = questUpdateSchema.parse(req.body);
    if ('archive' in input) {
      const { expectedVersion, effectiveFrom } = input;
      sendData(
        res,
        await archiveQuest(database, owner, id, {
          expectedVersion,
          effectiveFrom,
        }),
      );
    } else {
      sendData(res, await editQuest(database, owner, id, input));
    }
  });
  route('post', '/quick-quests', async (req, res, owner) => {
    const { created, occurrence } = await createQuickQuest(
      database,
      owner,
      quickQuestSchema.parse(req.body),
    );
    sendData(res, occurrence, created ? 201 : 200);
  });
  route('patch', '/day-plans/:id/priority', async (req, res, owner) => {
    const id = questIdSchema.parse(req.params.id);
    const { occurrenceId } = prioritySchema.parse(req.body);
    sendData(res, await changePriority(database, owner, id, occurrenceId));
  });
  route('post', '/occurrences/:id/complete', async (req, res, owner) => {
    const id = occurrenceIdSchema.parse(req.params.id);
    const input = completionRequestSchema.parse(req.body);
    const result = await completeOccurrence(
      database,
      {
        ...owner,
        tokenHash: req.auth.session.tokenHash,
      },
      id,
      input,
    );
    if (result.status === 'catching-up') {
      res.set('Retry-After', String(result.retryAfterSeconds));
      return sendData(res, result, 202);
    }
    sendData(res, result);
  });
  router.use((error, _req, _res, next) => {
    if (error instanceof z.ZodError)
      return next(
        new HttpError(400, 'INVALID_INPUT', 'Invalid request input.'),
      );
    if (
      error instanceof CalendarError ||
      error instanceof QuestCatalogError ||
      error instanceof ProgressionError
    ) {
      return next(new HttpError(error.status, error.code, error.message));
    }
    next(error);
  });
  return router;
}
