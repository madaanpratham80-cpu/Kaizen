import { cleanupExpiredSessions } from '../services/session-cleanup.js';
import { runJob } from './run-job.js';

await runJob('cleanup-sessions', (prisma) => cleanupExpiredSessions(prisma));
