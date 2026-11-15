// Asks the loaded WebLLM model to write a validation harness for one task.
import { generate } from '../llm.js'

export const SYSTEM = `You write validation harnesses in JavaScript.
A harness decides whether ANY implementation satisfies a natural-language specification.
The specification is the only source of truth:
- the reference implementation you are shown may be wrong;
- other correct implementations may behave differently wherever the specification is silent, so check ONLY what the specification requires — never compare against the reference's exact output.

Reply with ONE \`\`\`js code block that defines exactly:
  function buildCases()          // returns an array of { args: [...] } using plain JSON data; include edge cases
  function checkCase(target, c)  // calls target using c.args and throws if the specification is violated
These helpers already exist: assert(cond, msg), assertEqual(actual, expected, msg), assertThrows(fn, ErrorType), deepEqual(a, b).
No imports, no exports, no console output, no network.`

export function buildPrompt(task, referenceSrc) {
  return `SPECIFICATION
${task.spec}

HOW TO CALL THE TARGET
${task.context}
Inside checkCase, the implementation under test is the \`target\` parameter (it plays the role of \`${task.name}\`).

REFERENCE IMPLEMENTATION (may or may not satisfy the specification)
\`\`\`js
${referenceSrc}
\`\`\`

EXISTING TEST (already passes)
\`\`\`js
${task.example}
\`\`\`

Write the harness.`
}

/** Pull the code out of a model reply. */
export function extractCode(reply) {
  const blocks = [...String(reply).matchAll(/```(?:js|javascript|ts)?\s*\n([\s\S]*?)```/gi)].map(m => m[1])
  const withApi = blocks.find(b => /checkCase/.test(b)) ?? blocks[0]
  if (withApi) return withApi.trim()
  const i = String(reply).search(/function\s+buildCases|const\s+buildCases/)
  return i >= 0 ? String(reply).slice(i).trim() : String(reply).trim()
}

export async function writeHarness(task, referenceSrc) {
  const { text, latencyMs } = await generate(SYSTEM, buildPrompt(task, referenceSrc), 900)
  return { code: extractCode(text), raw: text, latencyMs }
}
