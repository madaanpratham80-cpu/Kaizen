import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright-core';

const appUrl = new URL(
  process.env.KAIZEN_TEST_URL || `https://${process.env.REPLIT_DEV_DOMAIN ?? ''}`,
);
assert(
  appUrl.hostname.endsWith('.replit.dev') || appUrl.hostname === 'localhost',
  'Use a development preview, not your published app.',
);
const output = process.env.KAIZEN_TEST_SCREENSHOTS;
if (output) await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || execFileSync('which', ['chromium'], { encoding: 'utf8' }).trim(),
  args: ['--no-sandbox'],
});
const suffix = randomUUID().slice(0, 8);
const email = `kaizen-smoke-${suffix}@example.test`;
const password = `Browser check ${randomUUID()}`;
const quest = `Migration test ${suffix}`;
const page = await browser.newPage({ baseURL: appUrl.origin, viewport: { width: 1440, height: 900 } });
const pageErrors = [];
const apiEvents = [];
page.setDefaultTimeout(12_000);
page.on('pageerror', (error) => pageErrors.push(error.message));
page.on('response', (response) => {
  const { pathname } = new URL(response.url());
  if (pathname.startsWith('/api/')) apiEvents.push(`${response.request().method()} ${pathname} ${response.status()}`);
});
page.on('requestfailed', (request) => {
  const { pathname } = new URL(request.url());
  if (pathname.startsWith('/api/')) apiEvents.push(`${request.method()} ${pathname} ${request.failure()?.errorText}`);
});
const nav = () => page.getByRole('navigation', { name: 'Kaizen' });
const waitForApi = (method, path) => page.waitForResponse(
  (res) => new URL(res.url()).pathname === `/api/v1/${path}` && res.request().method() === method,
);
const capture = (name, tab = page) =>
  output ? tab.screenshot({ path: resolve(output, `${name}.png`) }) : Promise.resolve();
const session = () => page.evaluate(async () => {
  const response = await fetch('/api/v1/auth/session', { cache: 'no-store' });
  return { status: response.status, ...await response.json() };
});

try {
  await page.goto('/today');
  await page.waitForURL('**/login');
  await page.goto('/register');
  await page.getByLabel('Display name').fill(`Migration test ${suffix}`);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByLabel('Gender').selectOption('female');
  const registered = waitForApi('POST', 'auth/register');
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  assert.equal((await registered).status(), 201);
  await page.waitForURL('**/today');
  await page.getByText('Cadence summary').waitFor();
  assert.equal((await session()).data.user.email, email);
  await capture('account-today');

  await nav().getByRole('link', { name: /quests/i }).click();
  await page.getByRole('button', { name: 'New quest' }).click();
  await page.getByLabel('Title', { exact: true }).fill(quest);
  const [created] = await Promise.all([
    waitForApi('POST', 'quests'),
    page.getByRole('button', { name: 'Create quest' }).click(),
  ]);
  assert.equal(created.status(), 201);
  await page.getByRole('heading', { name: quest, exact: true }).waitFor();
  await page.reload();
  await page.getByRole('heading', { name: quest, exact: true }).waitFor();
  await capture('saved-quest');

  for (const path of ['habits', 'progress', 'profile', 'settings', 'onboarding']) {
    await nav().getByRole('link', { name: new RegExp(path, 'i') }).click();
    await page.waitForURL(`**/${path}`);
    await page.getByRole('main').getByRole('heading', { level: 1 }).waitFor();
  }
  await page.getByRole('button', { name: 'Sign out' }).click();
  await page.waitForURL('**/login');
  assert.equal((await session()).status, 401);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  const loggedIn = waitForApi('POST', 'auth/login');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  assert.equal((await loggedIn).status(), 200);
  await page.waitForURL('**/today');
  await nav().getByRole('link', { name: /quests/i }).click();
  await page.getByRole('heading', { name: quest, exact: true }).waitFor();
  console.log('Account: protected route, registration, saved quest, navigation, sign-out, sign-in verified.');

  const guest = await browser.newPage({ baseURL: appUrl.origin, viewport: { width: 402, height: 874 } });
  guest.on('pageerror', (error) => pageErrors.push(error.message));
  await guest.goto('/');
  await guest.getByRole('button', { name: /guest operator/i }).click();
  await guest.waitForURL('**/today');
  const complete = guest.getByRole('button', { name: /complete discrete math induction proofs/i });
  await complete.click();
  await guest.getByText(/Completed:.*Discrete Math Induction Proofs/).waitFor();
  await guest.reload();
  await guest.getByText(/Completed:.*Discrete Math Induction Proofs/).waitFor();
  await capture('guest-today-mobile', guest);
  await guest.getByRole('button', { name: 'Sign out' }).click();
  await guest.waitForURL('**/login');
  console.log('Guest: mobile dashboard, quest completion, reload persistence, and sign-out verified.');
  assert.deepEqual(pageErrors, []);
} catch (error) {
  await capture('browser-check-failure');
  console.error('Browser errors:', pageErrors, '\nAPI statuses:', apiEvents);
  throw error;
} finally {
  try {
    const current = await session();
    if (current.data?.user?.email === email) {
      const status = await page.evaluate(async ({ csrf, password }) => {
        const response = await fetch('/api/v1/account', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
          body: JSON.stringify({ password }),
        });
        return response.status;
      }, { csrf: current.data.csrfToken, password });
      assert.equal(status, 200, 'The disposable browser test account could not be cleaned up.');
    }
  } finally {
    await browser.close();
  }
}
