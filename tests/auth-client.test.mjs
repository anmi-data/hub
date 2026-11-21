import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const source = readFileSync(new URL('../src/lib/auth-client.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } });
const { authRequest } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);

test('authentication handles empty, truncated and proxy responses and bounds waiting', async t => {
  const events = [];
  let expire, cleared = 0;
  const originalWindow = globalThis.window;
  globalThis.window = {
    setTimeout(callback, ms) { assert.equal(ms, 15000); expire = callback; return 1; },
    clearTimeout() { cleared++; },
    dispatchEvent(event) { events.push(event.type); },
  };
  t.after(() => { if (originalWindow === undefined) delete globalThis.window; else globalThis.window = originalWindow; });
  const fetch = t.mock.method(globalThis, 'fetch');
  for (const [body, status] of [['', 502], ['{"user":', 200], ['<html>Gateway timeout</html>', 504], ['null', 200]]) {
    fetch.mock.mockImplementation(async () => new Response(body, { status }));
    await assert.rejects(authRequest('/api/auth/login', {}), new RegExp(`HTTP ${status}`));
  }
  assert.deepEqual(events, [], 'invalid responses must not announce a successful login');
  fetch.mock.mockImplementation(async () => new Response('', { status: 401 }));
  await assert.rejects(authRequest('/api/auth/login', {}), /HTTP 401/);
  assert.deepEqual(events, ['anmi-session-rejected']);
  fetch.mock.mockImplementation(async () => Response.json({ error: 'Invalid credentials' }, { status: 401 }));
  await assert.rejects(authRequest('/api/auth/login', {}), /Invalid credentials/);
  fetch.mock.mockImplementation((_path, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => reject(signal.reason), { once: true });
  }));
  const waiting = assert.rejects(authRequest('/api/auth/login', {}), /server took too long/);
  expire();
  await waiting;
  fetch.mock.mockImplementation(async () => Response.json({ user: { id: 1 }, csrfToken: 'test' }));
  assert.equal((await authRequest('/api/auth/login', {})).user.id, 1);
  assert.equal(events.at(-1), 'anmi-auth-changed');
  assert.equal(cleared, 8, 'all outcomes release the deadline timer');
});
