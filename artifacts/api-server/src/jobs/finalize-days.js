import { runDayFinalizationPass } from '../services/day-worker.js';
import { runJob } from './run-job.js';

await runJob('finalize-days', runDayFinalizationPass);
