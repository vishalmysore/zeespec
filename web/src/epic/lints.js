// Line-level lints: concrete sentences that hurt EPIC dimensions.
// Each lint points to a line, says which dimension it hurts and why.

const VAGUE = [
  'fast', 'quick(?:ly)?', 'slow', 'easy', 'easily', 'simple', 'simply', 'user-?friendly', 'intuitive', 'seamless(?:ly)?',
  'robust', 'scalable', 'efficient(?:ly)?', 'flexible', 'modern', 'clean', 'nice', 'good', 'better', 'best',
  'appropriate(?:ly)?', 'adequate(?:ly)?', 'reasonable', 'sufficient', 'as needed', 'as appropriate', 'if possible',
  'where possible', 'etc\\.?', 'and so on', 'and/or', 'various', 'several', 'some', 'many', 'few', 'large', 'small',
  'real-?time', 'secure(?:ly)?', 'high(?:ly)? available', 'minimal', 'optimal', 'state[- ]of[- ]the[- ]art', 'world-?class',
  'should be able to', 'support for',
]
const VAGUE_RE = new RegExp(`\\b(${VAGUE.join('|')})\\b`, 'i')
const WEAK_MODAL = /\b(could|might|may want to|ideally|hopefully|try to|would be nice)\b/i
const BULLET = /^\s*(?:[-*+]|\d+[.)])\s+/
const MEASURE = /\d/

export function lint(docs) {
  const out = []
  for (const d of docs) {
    let inFence = false
    d.lines.forEach((raw, i) => {
      if (/^\s*```/.test(raw)) { inFence = !inFence; return }
      if (inFence || /^\s*#/.test(raw)) return
      const t = raw.trim()
      if (t.length < 12) return
      const isReq = BULLET.test(raw) || /\b(must|shall|should)\b/i.test(t)
      if (!isReq) return

      const v = VAGUE_RE.exec(t)
      if (v && !MEASURE.test(t)) {
        out.push({ doc: d.name, line: i + 1, text: t, dim: 'E1', rule: 'vague-term',
          msg: `“${v[1]}” is not measurable — give a bound or a concrete list.` })
      }
      const w = WEAK_MODAL.exec(t)
      if (w) {
        out.push({ doc: d.name, line: i + 1, text: t, dim: 'E1', rule: 'weak-modal',
          msg: `“${w[1]}” leaves the agent free to skip this — use MUST / SHOULD / MAY.` })
      }
      if (/\b(and|or)\b.*\b(and|or)\b.*\b(and|or)\b/i.test(t) && t.length > 140 && d.kind === 'spec') {
        out.push({ doc: d.name, line: i + 1, text: t, dim: 'E2', rule: 'compound',
          msg: 'Long compound requirement — split into one requirement per behaviour.' })
      }
      if (/\b(it|this|that|they|them)\b/i.test(t.split(/\s+/).slice(0, 3).join(' ')) && d.kind === 'spec') {
        out.push({ doc: d.name, line: i + 1, text: t, dim: 'I2', rule: 'dangling-pronoun',
          msg: 'Starts with a pronoun — name the thing so the line stands alone.' })
      }
    })
  }
  return out.slice(0, 200)
}
