import { clearTimeout, setTimeout } from 'node:timers';
const DRAIN_TIMEOUT_MS = 10_000;

/**
 * @param {import('node:http').Server} server
 * @param {{ $disconnect: () => Promise<void> }} database
 * @returns {Promise<void>}
 */
export async function drainServer(server, database) {
  const timer = setTimeout(
    () => server.closeAllConnections(),
    DRAIN_TIMEOUT_MS,
  );
  timer.unref();
  try {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  } finally {
    clearTimeout(timer);
    await database.$disconnect();
  }
}
