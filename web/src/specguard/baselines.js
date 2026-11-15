// Harnesses that need no model, so the tab works without a GPU and calibrates the metrics.

const casesFn = task => `function buildCases() {\n  return [\n    ${task.cases.map(c => JSON.stringify(c)).join(',\n    ')},\n  ]\n}`
const indent = s => s.split('\n').map(l => '  ' + l).join('\n')

/** Hand-written, faithful by construction (checked by the self-test). */
export function oracleHarness(task) {
  return `${casesFn(task)}\n\nfunction checkCase(target, c) {\n${indent(task.check)}\n}\n`
}

/**
 * The paper's main failure mode, written down: treat whatever the reference does as the spec.
 * Same cases as the oracle; every observable difference from the reference is a "violation".
 */
export function mirrorHarness(task, referenceSrc) {
  return `${casesFn(task)}

const __ref = (function () {
${referenceSrc}
;return target })()

function __observe(target, c) {
  try {
${indent(indent(task.invoke))}
  } catch (e) { return { threw: (e && e.name) + ': ' + (e && e.message) } }
}

function checkCase(target, c) {
  assertEqual(__observe(target, structuredClone(c)), __observe(__ref, structuredClone(c)), 'differs from the reference implementation')
}
`
}

/** Only re-runs the visible test that already exists — the bar every violating impl clears. */
export function exampleHarness(task) {
  return `function buildCases() {\n  return [{ args: [] }]\n}\n\nfunction checkCase(target, c) {\n  const ${task.name} = target\n${indent(task.example)}\n}\n`
}

export const BASELINES = [
  { id: 'oracle', label: 'Baseline: hand-written oracle', note: 'Checks only what the spec says. Should be 100% faithful.' },
  { id: 'mirror', label: 'Baseline: mirror the reference', note: 'Asserts “behaves exactly like the reference” — the failure the paper documents.' },
  { id: 'example', label: 'Baseline: replay the existing test', note: 'Every violating implementation already passes this.' },
]

export function baselineHarness(id, task, referenceSrc) {
  if (id === 'oracle') return oracleHarness(task)
  if (id === 'mirror') return mirrorHarness(task, referenceSrc)
  if (id === 'example') return exampleHarness(task)
  throw new Error('unknown baseline ' + id)
}
