import assert from 'node:assert/strict';
import { once } from 'node:events';
import { performance } from 'node:perf_hooks';
import { PrismaClient } from '@prisma/client';
import pino from 'pino';
import { createApp } from '../app.js';
import { SESSION_COOKIE } from '../http/boundary.js';
import { heatmapQuery } from '../services/progress-read.js';
import { PILOT_DAYS, reconcilePilot, seedPilot } from './pilot-fixtures.js';

const CONCURRENT_SESSIONS = 20;
const SAMPLES_PER_SESSION = 20;
const LATENCY_TARGET_MS = 500;
const REQUEST_TIMEOUT_MS = 10_000;

function disposableDatabase(raw) {
  const url = new URL(raw);
  const name = url.pathname.slice(1);
  assert(
    url.protocol === 'postgresql:' &&
      url.hostname === '127.0.0.1' &&
      ['kaizen_load_test', 'kaizen_restore_test'].includes(name),
    'Pilot verification requires an isolated loopback database with the documented test name',
  );
  return url;
}

function summarizePlan(rows) {
  const [{ Plan, 'Execution Time': executionMs }] = rows[0]['QUERY PLAN'];
  function nodes(node) {
    const type = node['Node Type'];
    return [
      node['Index Name'] ? `${type} on ${node['Index Name']}` : type,
      ...(node.Plans ?? []).flatMap(nodes),
    ];
  }
  return { executionMs, nodes: [...new Set(nodes(Plan))] };
}

async function explain(prisma, { accounts, from, to }) {
  const { id: userId } = accounts[0];
  const today = await prisma.$queryRaw`
    EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
    SELECT * FROM "DayPlan"
    WHERE "userId" = ${userId}::uuid AND "closedAt" IS NULL
      AND "startsAtUtc" <= (clock_timestamp() AT TIME ZONE 'UTC')
      AND "deadlineUtc" > (clock_timestamp() AT TIME ZONE 'UTC')
    ORDER BY "localDate" DESC LIMIT 1
  `;
  const heatmap = await prisma.$queryRaw`
    EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${heatmapQuery(userId, from, to)}
  `;
  return {
    todayPlanLookup: summarizePlan(today),
    annualHeatmap: summarizePlan(heatmap),
  };
}

async function sample(base, endpoint, accounts, validate) {
  async function request({ token }) {
    const start = performance.now();
    const response = await globalThis.fetch(base + endpoint, {
      headers: { Cookie: `${SESSION_COOKIE}=${token}` },
      signal: globalThis.AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    assert.equal(response.status, 200, endpoint);
    validate((await response.json()).data);
    return performance.now() - start;
  }
  await Promise.all(accounts.map(request));
  const samples = (
    await Promise.all(
      accounts.map(async (account) => {
        const timings = [];
        for (let index = 0; index < SAMPLES_PER_SESSION; index += 1) {
          timings.push(await request(account));
        }
        return timings;
      }),
    )
  )
    .flat()
    .sort((left, right) => left - right);
  const p95Ms =
    Math.round(samples[Math.ceil(samples.length * 0.95) - 1] * 100) / 100;
  return {
    endpoint,
    requests: samples.length,
    p95Ms,
    targetMs: LATENCY_TARGET_MS,
  };
}

async function measure(prisma, pilot) {
  const app = createApp({
    database: prisma,
    nodeEnv: 'production',
    csrfSecret: 'disposable-pilot-only',
    logger: pino({ level: 'silent' }),
  });
  const server = app.listen(0, '127.0.0.1');
  try {
    await once(server, 'listening');
    const base = `http://127.0.0.1:${server.address().port}`;
    const actors = pilot.accounts.slice(0, CONCURRENT_SESSIONS);
    const today = await sample(base, '/api/v1/today', actors, (data) =>
      assert.equal(data.status, 'ready'),
    );
    const progress = await sample(base, '/api/v1/progress', actors, (data) =>
      assert.equal(data.heatmap.length, PILOT_DAYS),
    );
    return { sessions: actors.length, today, progress };
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
}

const mode = process.argv[2];
const runtime = disposableDatabase(process.env.DATABASE_URL);
assert(
  ['--reconcile', '--measure'].includes(mode),
  'Expected --measure or --reconcile',
);
const prisma = new PrismaClient({ datasourceUrl: runtime.href });
try {
  if (mode === '--reconcile') {
    process.stdout.write(JSON.stringify(await reconcilePilot(prisma)) + '\n');
  } else {
    const migration = disposableDatabase(process.env.MIGRATION_DATABASE_URL);
    assert(
      runtime.pathname === '/kaizen_load_test' &&
        migration.pathname === runtime.pathname &&
        migration.port === runtime.port,
      'Seed and runtime connections must target the same isolated pilot database',
    );
    const owner = new PrismaClient({ datasourceUrl: migration.href });
    const pilot = await seedPilot(owner).finally(() => owner.$disconnect());
    const plans = await explain(prisma, pilot);
    const latency = await measure(prisma, pilot);
    process.stdout.write(
      JSON.stringify(
        { plans, latency, ledger: await reconcilePilot(prisma) },
        null,
        2,
      ) + '\n',
    );
    assert(
      latency.today.p95Ms < LATENCY_TARGET_MS &&
        latency.progress.p95Ms < LATENCY_TARGET_MS,
      'Warm pilot p95 exceeds target',
    );
  }
} finally {
  await prisma.$disconnect();
}
