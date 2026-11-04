import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const source = readFileSync(new URL("../src/lib/request-cache.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } });
const { createRequestCache } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);

test("account switching reuses requests until a new collection revision", async () => {
  const cache = createRequestCache(Infinity, 500);
  assert.equal(cache.setRevision(1), true);
  let loads = 0;
  const load = async () => ++loads;
  const first = cache.get("account-a", load);
  assert.equal(cache.get("account-a", load), first);
  assert.equal(await first, 1);
  await cache.get("account-b", load);
  assert.equal(cache.setRevision(1), false);
  assert.equal(await cache.get("account-a", load), 1);
  assert.equal(cache.setRevision(2), true);
  assert.equal(await cache.get("account-a", load), 3);
  assert.equal(cache.setRevision(1), false);
  assert.equal(await cache.get("account-a", load), 3);
  assert.throws(() => cache.setRevision(NaN), /Invalid data revision/);
});

test("a failed request from an older revision cannot evict its replacement", async () => {
  const cache = createRequestCache(Infinity);
  cache.setRevision(1);
  let rejectOld;
  const old = cache.get("account", () => new Promise((_, reject) => { rejectOld = reject; }));
  const rejection = assert.rejects(old, /old request/);
  await Promise.resolve();
  cache.setRevision(2);
  const current = cache.get("account", async () => "new data");
  rejectOld(new Error("old request"));
  await rejection;
  assert.equal(await current, "new data");
  assert.equal(cache.get("account", async () => "unexpected reload"), current);
});
