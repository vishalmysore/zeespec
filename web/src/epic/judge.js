// Optional on-device LLM judge. It re-scores each EPIC dimension 0–3 against the
// paper's rubric and suggests one fix; it can also rewrite a weak line.
// Uses the same WebLLM worker as the spec builder (../llm.js).

import { PRACTICES, RUBRIC } from './epic.js'
import { generate } from '../llm.js'

const chat = async (system, user, maxTokens) => (await generate(system, user, maxTokens)).text

/** Compact view of the artifacts that fits a small model's context window. */
function digest(docs, dim, budget = 6000) {
  const outline = docs.map(d => `## ${d.name} (${d.kind})\n` + d.headings.slice(0, 40).map(h => `${'  '.repeat(h.level - 1)}- ${h.text}`).join('\n')).join('\n')
  const evidence = dim.practices.flatMap(p => p.evidence.map(e => `[${p.id}] ${e.text}`)).slice(0, 25).join('\n')
  let body = docs.map(d => `----- ${d.name} -----\n${d.text}`).join('\n')
  const room = Math.max(1500, budget - outline.length - evidence.length)
  if (body.length > room) body = body.slice(0, room) + '\n…(truncated)'
  return `OUTLINE\n${outline}\n\nEVIDENCE FOUND BY RULES\n${evidence || '(none)'}\n\nTEXT\n${body}`
}

const SYSTEM = `You are a strict reviewer applying the EPIC framework for spec-driven development (arXiv:2610.07534), based on ISO/IEC/IEEE 29148.
Score ONE quality dimension of the given specification artifacts on 0–3:
${RUBRIC.map((r, i) => `${i} = ${r}`).join('\n')}
Answer ONLY with JSON: {"score": <0-3>, "reason": "<one sentence citing the text>", "fix": "<the single most valuable concrete edit>"}`

export async function judgeDimension(docs, dim) {
  const practices = PRACTICES.filter(p => p.dim === dim.id).map(p => `- ${p.id}: ${p.text}`).join('\n')
  const user = `DIMENSION ${dim.id} ${dim.name}. Practices:\n${practices}\n\n${digest(docs, dim)}`
  const raw = await chat(SYSTEM, user, 220)
  const m = raw.match(/\{[\s\S]*\}/)
  let obj = null
  try { obj = m && JSON.parse(m[0]) } catch (_) {}
  const s = Number(obj?.score ?? (raw.match(/\b[0-3]\b/) || [])[0])
  if (!Number.isFinite(s)) throw new Error(`Unparseable judge output: ${raw.slice(0, 120)}`)
  return { score: Math.max(0, Math.min(3, Math.round(s))), reason: obj?.reason ?? raw.slice(0, 200), fix: obj?.fix ?? '' }
}

export async function rewriteLine(line, msg) {
  const sys = 'You rewrite one software requirement so it is unambiguous and testable: use MUST/MUST NOT/SHOULD, give measurable bounds or explicit lists, one behaviour per line. If a number is unknown, insert [NEEDS CLARIFICATION: …] instead of inventing one. Reply with the rewritten line only.'
  return (await chat(sys, `Problem: ${msg}\nLine: ${line}`, 120)).trim().replace(/^["'`]|["'`]$/g, '')
}
