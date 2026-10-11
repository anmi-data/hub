import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const source = readFileSync(new URL("../src/components/charts/capitalFlows.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } });
const { alignCapitalFlows, parseCapitalFlows } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);

test("events align to the next AUM snapshot, preserve simultaneous flows and exclude events outside history", () => {
  const flow = { id: 1, timestamp: "2026-10-10T01:00:00Z", flowType: "deposit", fromAccountId: null,
    toAccountId: "a", amount: 50, assetSymbol: "USDC", valueUsd: 50, externalFlowUsd: 50 };
  const flows = [flow, { ...flow, id: 2, timestamp: "2026-10-10T02:00:00Z" },
    { ...flow, id: 3, timestamp: "2026-10-10T03:00:00Z" },
    { ...flow, id: 4, timestamp: "2026-10-09T23:00:00Z" },
    { ...flow, id: 5, timestamp: "2026-10-10T07:00:00Z" }];
  const times = [0, 2, 4, 6].map(hour => Date.parse(`2026-10-10T0${hour}:00:00Z`) / 1000);
  const aligned = alignCapitalFlows(parseCapitalFlows(flows), times);
  assert.deepEqual(aligned.get(times[1]).map(flow => flow.id), [1, 2]);
  assert.deepEqual(aligned.get(times[2]).map(flow => flow.id), [3]);
  assert.equal(aligned.size, 2);
  assert.equal(alignCapitalFlows(flows, []).size, 0);
  assert.deepEqual(parseCapitalFlows([{ ...flow, valueUsd: null }]), []);
  assert.deepEqual(parseCapitalFlows([{ ...flow, timestamp: "invalid" }]), []);
  assert.deepEqual(parseCapitalFlows(undefined), []);
});
