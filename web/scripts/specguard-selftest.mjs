#!/usr/bin/env node
// Validates the SpecGuard-lite task set the way SpecGuardBench validates its tasks:
//  1. the existing (visible) test passes on every implementation,
//  2. the oracle harness is faithful (rejects violating, accepts gold + alternatives),
//  3. the violating implementation diverges from gold on some case (differential witness),
//  4. the mirror baseline shows the documented failure (false alarm on a valid alternative).
// Usage: node scripts/specguard-selftest.mjs
import { TASKS, TYPES } from '../src/specguard/tasks.js'
import { runHarness, evaluateTask, implsOf, aggregate } from '../src/specguard/harness-core.js'
import { baselineHarness } from '../src/specguard/baselines.js'

let failed = 0
const fail = (t, m) => { failed++; console.log(`  ✗ ${t.id}: ${m}`) }

for (const t of TASKS) {
  if (!TYPES.some(x => x.id === t.type)) fail(t, `unknown type ${t.type}`)
  for (const im of implsOf(t)) {
    const r = runHarness(baselineHarness('example', t), im.src)
    if (r.verdict !== 'accept') fail(t, `existing test fails on ${im.role}: ${r.error || r.failures?.[0]?.error}`)
  }
  const o = await evaluateTask(t, baselineHarness('oracle', t))
  if (!o.faithful) fail(t, `oracle not faithful: ${o.results.map(r => r.verdict + (r.failures?.[0] ? ` (${r.failures[0].error})` : r.error ? ` (${r.error})` : '')).join(' | ')}`)
  const witness = runHarness(baselineHarness('mirror', t, t.gold), t.violating)
  if (witness.verdict !== 'reject') fail(t, 'violating implementation never diverges from gold')
  const m = await evaluateTask(t, baselineHarness('mirror', t, t.gold))
  if (!m.falseAlarm) fail(t, 'mirror baseline raises no false alarm — the valid alternative is indistinguishable from gold')
}

console.log(`\n${TASKS.length} tasks, ${TYPES.length} verification-logic types`)
for (const [id, ref] of [['oracle'], ['mirror', 'gold'], ['mirror', 'violating'], ['example']]) {
  const rows = []
  for (const t of TASKS) rows.push(await evaluateTask(t, baselineHarness(id, t, ref && t[ref])))
  const a = aggregate(rows)
  console.log(`  ${(id + (ref ? ` (${ref} ref)` : '')).padEnd(22)} faithful ${String(a.faithful).padStart(5)}%  detection ${String(a.detection).padStart(5)}%  false alarm ${String(a.falseAlarm).padStart(5)}%`)
}
console.log(failed ? `\n${failed} problem(s)` : '\nall task checks passed')
process.exit(failed ? 1 : 0)
