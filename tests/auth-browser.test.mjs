import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { chromium } from '@playwright/test';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
let browser, server, origin;
before(async () => {
  server = await createServer({ configFile: false, cacheDir: 'node_modules/.vite-auth-tests', plugins: [react()], server: { host: '127.0.0.1', port: 0 } });
  await server.listen(); origin = `http://127.0.0.1:${server.httpServer.address().port}`;
  browser = await chromium.launch({ channel: process.env.ANMI_TEST_BROWSER_CHANNEL || 'chrome', headless: true });
});
after(async () => { await browser?.close(); await server?.close(); });
async function fixture(mobile = false) {
  const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1400, height: 1000 }, isMobile: mobile });
  const state = { user: null, admin: false, temporary: false, protectedRequests: 0, privateCharts: 0, deleted: false };
  const user = mustChangePassword => ({ id: 1, username: 'alice', mustChangePassword });
  const requests = [];
  await context.route('**/api/**', async route => {
    const request = route.request(), url = new URL(request.url()), path = url.pathname;
    requests.push(path);
    let payload = {}, status = 200;
    if (path === '/api/auth/me') payload = { user: state.user, admin: state.admin, csrfToken: state.user ? 'csrf-user' : null, adminCsrfToken: state.admin ? 'csrf-admin' : null };
    else if (path === '/api/auth/login') {
      const body = request.postDataJSON();
      if (body.password === 'invalid') { status = 401; payload = { error: 'Invalid credentials' }; }
      else { state.user = user(state.temporary); payload = { user: state.user, csrfToken: 'csrf-user' }; }
    } else if (path === '/api/auth/logout') { state.user = null; payload = { ok: true }; }
    else if (path === '/api/auth/change-password') { state.user = user(false); payload = { user: state.user, csrfToken: 'rotated-user' }; }
    else if (path === '/api/admin/auth/login') { state.admin = true; payload = { admin: true, adminCsrfToken: 'csrf-admin' }; }
    else if (path === '/api/admin/auth/logout') { state.admin = false; payload = { ok: true }; }
    else if (path === '/api/admin/users' && request.method() === 'GET') payload = { users: state.deleted ? [] : [{ id: 1, username: 'alice', isActive: true, mustChangePassword: false, lastLoginAt: null }] };
    else if (path === '/api/admin/users' && request.method() === 'POST') payload = { temporaryPassword: 'once-only-temporary-password' };
    else if (path === '/api/admin/users/1/reset-password' && request.method() === 'POST') payload = { temporaryPassword: 'abc234xy' };
    else if (path === '/api/admin/users/1' && request.method() === 'DELETE') { state.deleted = true; payload = { ok: true }; }
    else if (path === '/api/admin/security-audit') payload = { events: [] };
    else if (path.endsWith('/health')) payload = { status: 'ok', database: { canOpen: true } };
    else if (path.endsWith('/data-revision')) payload = { dataRevision: 1 };
    else if (path.endsWith('/display/strategies')) payload = { strategies: [{ id: 'alpha', groupId: 'alpha', name: 'Alpha', status: 'complete', unitPrice: 105, ...(state.user && !state.user.mustChangePassword ? { navUsd: 987654 } : {}) }], collectionErrors: [] };
    else if (path.endsWith('/benchmarks')) payload = { benchmarks: [{ symbol: 'BTC', label: 'Bitcoin', status: 'available' }] };
    else if (path.endsWith('/header')) payload = { group: { id: 'alpha', name: 'Alpha', unitPrice: 105, ...(state.user && !state.user.mustChangePassword ? { navUsd: 987654 } : {}) }, metrics: { apy: 0.12, maxDrawdown: -0.02 } };
    else if (path.endsWith('/chart')) {
      if (url.searchParams.get('metric') === 'nav_usd') state.privateCharts++;
      payload = { series: [{ id: 'alpha', kind: 'strategy_group', label: 'Alpha', points: [{ timestamp: '2026-01-01T00:00:00Z', rawValue: 100, normalizedValue: 100 }, { timestamp: '2026-01-02T00:00:00Z', rawValue: 105, normalizedValue: 105 }] }] };
    } else if (path.endsWith('/tree')) payload = { root: { id: 'group:alpha', entityId: 'alpha', type: 'strategy_group', label: 'Alpha', children: [] } };
    else if (path.endsWith('/details')) payload = { node: { type: 'strategy_group', id: 'alpha' }, availableHistory: [{ dataset: 'snapshots', label: 'Snapshots' }], summary: {}, latest: { data: {} } };
    else if (path.endsWith('/explorer/history') || path.endsWith('/asset-deltas')) {
      state.protectedRequests++;
      if (!state.user || state.user.mustChangePassword) { status = 401; payload = { error: 'User authentication required' }; }
      else if (path.endsWith('/explorer/history')) payload = { columns: [{ key: 'nav_usd', label: 'NAV', format: 'currency', type: 'number' }], rows: [{ nav_usd: 987654 }], pagination: { page: 1, pageSize: 50, totalRows: 1, totalPages: 1 } };
      else payload = { deltas: [] };
    }
    await route.fulfill({ status, json: payload });
  });
  const page = await context.newPage(); page.setDefaultTimeout(10000);
  await page.addInitScript(() => localStorage.setItem('anmi-hub:chart-mode:v1', 'nav_usd'));
  return { context, page, state, requests };
}
async function signIn(page, password = 'personal-test-passphrase') {
  await page.getByRole('button', { name: 'Guest account', exact: true }).click();
  await page.getByRole('button', { name: 'Log in', exact: true }).first().click();
  await page.getByLabel('Username', { exact: true }).fill('alice');
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('dialog').getByRole('button', { name: 'Log in', exact: true }).click();
}
async function accountAction(page, name) {
  await page.getByRole('button', { name: 'User account', exact: true }).click();
  await page.getByRole('button', { name, exact: true }).click();
}
test('Guest keeps public charts, locks AUM and History, and never requests private records on desktop or mobile', async () => {
  for (const mobile of [false, true]) {
    const { context, page, state } = await fixture(mobile);
    try {
      await page.goto(origin + '/en/strategies/alpha');
      await page.getByText('Historical records are available to registered users.').waitFor();
      await page.getByRole('button', { name: 'UNIT PRICE', exact: true }).waitFor();
      const account = page.getByRole('button', { name: 'Guest account', exact: true });
      await account.click();
      await page.getByText('Guest', { exact: true }).waitFor();
      assert.equal(await account.getAttribute('aria-expanded'), 'true');
      await page.keyboard.press('Escape');
      assert.equal(await account.getAttribute('aria-expanded'), 'false');
      await account.click();
      await page.getByText('Track records and analytics', { exact: true }).click();
      assert.equal(await account.getAttribute('aria-expanded'), 'false');
      assert.equal(state.protectedRequests, 0); assert.equal(state.privateCharts, 0);
      assert.equal(await page.getByPlaceholder('Search history...').count(), 0);
      assert.doesNotMatch(await page.locator('body').innerText(), /987,654|987654/);
      await page.getByRole('button', { name: 'AUM locked. Log in to view' }).click();
      await page.getByRole('dialog').waitFor();
      await page.keyboard.press('Escape'); assert.equal(await page.getByRole('dialog').count(), 0);
      assert.equal(new URL(page.url()).pathname, '/en/strategies/alpha');
      if (mobile) assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    } finally { await context.close(); }
  }
});
test('login preserves strategy, unlocks history and AUM, logout purges data, expiry returns to Guest', async () => {
  const { context, page, state } = await fixture();
  try {
    await page.goto(origin + '/en/strategies/alpha');
    await signIn(page, 'invalid'); await page.getByRole('alert').filter({ hasText: 'Invalid credentials' }).waitFor();
    await page.getByLabel('Password', { exact: true }).fill('personal-test-passphrase');
    await page.getByRole('dialog').getByRole('button', { name: 'Log in', exact: true }).click();
    await page.getByRole('button', { name: 'User account', exact: true }).waitFor();
    await page.getByPlaceholder('Search history...').waitFor();
    assert.equal(new URL(page.url()).pathname, '/en/strategies/alpha');
    await page.getByRole('button', { name: 'UNIT PRICE', exact: true }).click();
    const aumResponse = page.waitForResponse(response => response.url().includes('metric=nav_usd'));
    await page.getByRole('button', { name: 'AUM', exact: true }).click();
    if (!state.privateCharts) await aumResponse; else void aumResponse.catch(() => {});
    assert.ok(state.protectedRequests > 0); assert.ok(state.privateCharts > 0);
    await accountAction(page, 'Log out');
    await page.getByText('Historical records are available to registered users.').waitFor();
    assert.doesNotMatch(await page.locator('body').innerText(), /987,654|987654/);
    await signIn(page); await page.getByPlaceholder('Search history...').waitFor();
    state.user = null;
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await page.getByText('Historical records are available to registered users.').waitFor();
    assert.doesNotMatch(await page.locator('body').innerText(), /987,654|987654/);
    await signIn(page); await page.getByPlaceholder('Search history...').waitFor();
    state.user = null;
    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
    await page.getByText('Historical records are available to registered users.').waitFor();
  } finally { await context.close(); }
});
test('temporary session forces password change and rejects mismatch before unlocking', async () => {
  const { context, page, state } = await fixture(); state.temporary = true;
  try {
    await page.goto(origin + '/en/strategies/alpha'); await signIn(page);
    await page.getByRole('heading', { name: 'Change your password' }).waitFor();
    assert.equal(state.protectedRequests, 0);
    await page.getByLabel('New password', { exact: true }).fill('1234567');
    await page.getByLabel('Confirm new password', { exact: true }).fill('different passphrase!');
    await page.getByRole('button', { name: 'Save new password' }).click();
    await page.getByRole('alert').filter({ hasText: 'Passwords do not match' }).waitFor();
    await page.getByLabel('Confirm new password', { exact: true }).fill('1234567');
    const historyResponse = page.waitForResponse(response => response.url().includes('/explorer/history'));
    await page.getByRole('button', { name: 'Save new password' }).click();
    await historyResponse; await page.getByPlaceholder('Search history...').waitFor(); assert.ok(state.protectedRequests > 0);
    await accountAction(page, 'Change password');
    await page.getByLabel('Current password', { exact: true }).waitFor();
  } finally { await context.close(); }
});
test('Admin login is separate and temporary user passwords disappear after dismissal', async () => {
  const { context, page, state } = await fixture();
  try {
    await page.goto(origin + '/admin');
    await page.getByLabel('Administrator password', { exact: true }).fill('admin-test-passphrase');
    await page.getByRole('button', { name: 'Log in as administrator' }).click();
    await page.getByText('Administrator access is separate from financial user access.').waitFor();
    assert.equal(state.user, null);
    await page.getByLabel('Username', { exact: true }).fill('bob');
    await page.getByRole('button', { name: 'Create User' }).click();
    await page.getByRole('dialog', { name: 'Temporary password' }).waitFor();
    await page.getByRole('button', { name: 'Done', exact: true }).click();
    assert.equal(await page.getByText('once-only-temporary-password').count(), 0);
    await page.getByRole('button', { name: 'Disable', exact: true }).click();
    await page.getByRole('dialog', { name: 'Confirm user action' }).waitFor();
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await page.getByRole('button', { name: 'Reset password', exact: true }).click();
    await page.getByRole('button', { name: 'Confirm', exact: true }).click();
    await page.getByRole('dialog', { name: 'Temporary password' }).getByText('abc234xy', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Done', exact: true }).click();
    await page.getByRole('button', { name: 'Delete user', exact: true }).click();
    await page.getByText('Permanently delete user alice? All their sessions will be deleted. This cannot be undone.', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    assert.equal(state.deleted, false);
    await page.getByRole('button', { name: 'Delete user', exact: true }).click();
    await page.getByRole('button', { name: 'Confirm', exact: true }).click();
    await page.getByRole('button', { name: 'Delete user', exact: true }).waitFor({ state: 'detached' });
    assert.equal(state.deleted, true);
    await page.getByRole('button', { name: 'Log out of Admin' }).click();
    await page.getByLabel('Administrator password', { exact: true }).waitFor();
  } finally { await context.close(); }
});

test('logout clears financial views in another tab without waiting for polling', async () => {
  const { context, page } = await fixture();
  try {
    await page.goto(origin + '/en/strategies/alpha'); await signIn(page);
    await page.getByPlaceholder('Search history...').waitFor();
    const second = await context.newPage();
    await second.goto(origin + '/en/strategies/alpha'); await second.getByPlaceholder('Search history...').waitFor();
    await accountAction(page, 'Log out');
    await second.getByText('Historical records are available to registered users.').waitFor({ timeout: 5000 });
    assert.doesNotMatch(await second.locator('body').innerText(), /987,654|987654/);
  } finally { await context.close(); }
});
