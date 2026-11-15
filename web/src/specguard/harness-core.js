// Runs one validation harness against one implementation. Pure JS, no DOM:
// used inside the sandbox worker in the browser and directly by the Node self-test.
//
// Harness contract (same shape as SpecGuardBench's build_cases / check_case):
//   function buildCases()          → array of { args: [...] } (plain data)
//   function checkCase(target, c)  → throws if the implementation violates the spec
// Helpers available to harness code: assert, assertEqual, assertThrows, deepEqual.

export const PRELUDE = `
class SpecViolation extends Error { constructor(m) { super(m); this.name = 'SpecViolation' } }
function __fmt(v) { try { return typeof v === 'string' ? JSON.stringify(v) : JSON.stringify(v, (k, x) => typeof x === 'undefined' ? '<undefined>' : x) ?? String(v) } catch (_) { return String(v) } }
function deepEqual(a, b) {
  if (Object.is(a, b)) return true
  if (typeof a !== typeof b || a === null || b === null || typeof a !== 'object') return false
  if (Array.isArray(a) !== Array.isArray(b)) return false
  if (ArrayBuffer.isView(a) || ArrayBuffer.isView(b)) {
    if (!(ArrayBuffer.isView(a) && ArrayBuffer.isView(b)) || a.constructor !== b.constructor || a.length !== b.length) return false
    for (let i = 0; i < a.length; i++) if (!Object.is(a[i], b[i])) return false
    return true
  }
  const ka = Object.keys(a), kb = Object.keys(b)
  if (ka.length !== kb.length) return false
  for (const k of ka) if (!Object.prototype.hasOwnProperty.call(b, k) || !deepEqual(a[k], b[k])) return false
  return true
}
function assert(cond, msg) { if (!cond) throw new SpecViolation(msg || 'assertion failed') }
function assertEqual(actual, expected, msg) {
  if (!deepEqual(actual, expected)) throw new SpecViolation((msg ? msg + ': ' : '') + 'expected ' + __fmt(expected) + ', got ' + __fmt(actual))
}
function assertThrows(fn, ErrorType, msg) {
  try { fn() } catch (e) {
    if (ErrorType && !(e instanceof ErrorType)) throw new SpecViolation((msg ? msg + ': ' : '') + 'expected ' + ErrorType.name + ', got ' + (e && e.name))
    return e
  }
  throw new SpecViolation(msg || ('expected ' + (ErrorType ? ErrorType.name : 'an error') + ' to be thrown'))
}
`

const MAX_CASES = 200

function msg(e) {
  if (e && typeof e === 'object') return `${e.name || 'Error'}: ${e.message}`
  return String(e)
}

function show(v) {
  try { const s = JSON.stringify(v); return s.length > 160 ? s.slice(0, 157) + '…' : s } catch (_) { return String(v) }
}

/** Strip module syntax small models like to add. */
export function cleanHarness(src) {
  return String(src)
    .replace(/^\s*import\s.*$/gm, '')
    .replace(/^\s*export\s+default\s+/gm, '')
    .replace(/^\s*export\s+(?=(async\s+)?function|const|let|var|class)/gm, '')
    .replace(/^\s*module\.exports\s*=.*$/gm, '')
}

/**
 * @returns {{verdict:'accept'|'reject'|'broken', cases?:number, failures?:object[], failCount?:number, error?:string}}
 */
export function runHarness(harnessSrc, implSrc) {
  const harness = cleanHarness(harnessSrc)
  try { new Function(harness) } catch (e) { return { verdict: 'broken', error: 'harness does not parse — ' + msg(e) } }

  let api
  try {
    api = new Function(`"use strict";
${PRELUDE}
const __target = (function () {
${implSrc}
;return target })();
const __h = (function () {
${harness}
;return {
  buildCases: typeof buildCases === 'function' ? buildCases : undefined,
  checkCase: typeof checkCase === 'function' ? checkCase : undefined,
} })();
return { target: __target, SpecViolation, ...__h }`)()
  } catch (e) {
    return { verdict: 'broken', error: 'harness failed to load — ' + msg(e) }
  }
  if (!api.buildCases || !api.checkCase) return { verdict: 'broken', error: 'harness must define buildCases() and checkCase(target, c)' }

  let cases
  try { cases = api.buildCases() } catch (e) { return { verdict: 'broken', error: 'buildCases() threw — ' + msg(e) } }
  if (!Array.isArray(cases) || !cases.length) return { verdict: 'broken', error: 'buildCases() must return a non-empty array' }

  const failures = []
  let failCount = 0
  for (const c of cases.slice(0, MAX_CASES)) {
    let fresh = c
    try { fresh = structuredClone(c) } catch (_) { /* cases holding functions are passed as-is */ }
    try {
      api.checkCase(api.target, fresh)
    } catch (e) {
      failCount++
      if (failures.length < 3) failures.push({ case: show(c), error: msg(e), kind: e instanceof api.SpecViolation ? 'violation' : 'error' })
    }
  }
  return { verdict: failCount ? 'reject' : 'accept', cases: Math.min(cases.length, MAX_CASES), failures, failCount }
}

/** Implementations a harness is judged against. */
export function implsOf(task) {
  return [
    { role: 'gold', label: 'Correct (gold)', src: task.gold, shouldAccept: true },
    { role: 'violating', label: 'Spec-violating', src: task.violating, shouldAccept: false },
    ...task.alts.map((src, i) => ({ role: `alt${i + 1}`, label: `Valid alternative${task.alts.length > 1 ? ' ' + (i + 1) : ''}`, src, shouldAccept: true })),
  ]
}

/** Paper metrics for one task, given one verdict per implementation (same order as implsOf). */
export function summarize(task, results) {
  const impls = implsOf(task)
  const by = Object.fromEntries(impls.map((im, i) => [im.role, results[i]]))
  const broken = results.every(r => r.verdict === 'broken')
  const detected = by.violating.verdict !== 'accept'
  const falseAlarm = impls.some((im, i) => im.shouldAccept && results[i].verdict !== 'accept')
  return { detected, falseAlarm, faithful: detected && !falseAlarm, broken }
}

/** Evaluate a harness on a task with a pluggable executor (sync or async). */
export async function evaluateTask(task, harnessSrc, exec = runHarness) {
  const impls = implsOf(task)
  const results = await Promise.all(impls.map(im => exec(harnessSrc, im.src)))
  return { results, ...summarize(task, results) }
}

export function aggregate(rows) {
  const n = rows.length || 1
  const pct = k => Math.round((rows.filter(r => r[k]).length / n) * 1000) / 10
  return { n: rows.length, faithful: pct('faithful'), detection: pct('detected'), falseAlarm: pct('falseAlarm'), broken: rows.filter(r => r.broken).length }
}
