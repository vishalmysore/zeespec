// EPIC heuristic scoring engine. Pure JS: runs in the browser and in Node.
//
// Every one of the 40 practices has a detector that looks for textual evidence
// in the spec / plan / tasks artifacts. Each detector returns a level:
//   0   = no evidence, 0.5 = partial, 1 = strong
// plus the lines it used as evidence. Practice levels roll up into the paper's
// 0–3 per-dimension rubric and the 0–30 total.

import { DIMENSIONS, PRACTICES, tierFor } from './epic.js'

// ───────────────────────── document model ─────────────────────────

const ZEESPEC_SPEC = /^(what|who|when|where|why|upstream|downstream)\.md$/i

export function classify(name, text) {
  const base = name.split('/').pop().toLowerCase()
  if (base === 'how.md') return 'plan' // ZeeSpec: "How should it be built? What technology?"
  if (ZEESPEC_SPEC.test(base)) return 'spec'
  if (/task|todo|backlog|checklist/.test(base)) return 'tasks'
  if (/plan|design|architect|adr|technical|data-model|contract|research/.test(base)) return 'plan'
  if (/spec|requirement|prd|stor(y|ies)|feature|agents|claude|readme|brief/.test(base)) return 'spec'
  const checkboxes = (text.match(/^\s*[-*]\s+\[[ xX]\]/gm) || []).length
  if (checkboxes >= 4) return 'tasks'
  return 'spec'
}

export function parseDoc(name, text, kind) {
  const lines = text.replace(/\r\n?/g, '\n').split('\n')
  const headings = []
  let inFence = false
  lines.forEach((l, i) => {
    if (/^\s*```/.test(l)) inFence = !inFence
    const m = !inFence && /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(l)
    if (m) headings.push({ level: m[1].length, text: m[2].trim(), line: i })
  })
  return { name, kind: kind || classify(name, text), text, lines, headings }
}

// ───────────────────────── helpers ─────────────────────────

const ID_RE = /\b(?:FR|NFR|REQ|US|UC|AC|SC|BR|SR|EC|QR|T|TASK)-?\d{1,4}\b/g
const BULLET = /^\s*(?:[-*+]|\d+[.)])\s+/
const NORMATIVE = /\b(MUST(?: NOT)?|SHALL(?: NOT)?|SHOULD(?: NOT)?|REQUIRED|MAY)\b/
const NORMATIVE_ANY = /\b(must|shall|should|required to|must not|shall not)\b/i
const MEASURE = /\b\d+(?:[.,]\d+)?\s*(?:ms|milliseconds?|s|sec(?:onds?)?|min(?:utes?)?|h(?:ours?)?|days?|weeks?|%|percent|kb|mb|gb|tb|req(?:uests)?\/s|rps|qps|users?|items?|records?|rows?|characters?|chars?|attempts?|retries|times|px|fps|x)\b|\b(?:p9[059]|p50)\b|[<>≤≥]=?\s*\d/i

function allDocs(ctx, kinds) {
  return kinds ? ctx.docs.filter(d => kinds.includes(d.kind)) : ctx.docs
}

/** Lines matching a regex, as evidence records. */
function grep(ctx, re, kinds, limit = 50) {
  const out = []
  for (const d of allDocs(ctx, kinds)) {
    d.lines.forEach((l, i) => {
      if (out.length < limit && re.test(l)) out.push({ doc: d.name, line: i + 1, text: l.trim() })
    })
  }
  return out
}

/** Headings matching a regex. */
function headings(ctx, re, kinds) {
  const out = []
  for (const d of allDocs(ctx, kinds)) {
    for (const h of d.headings) if (re.test(h.text)) out.push({ doc: d.name, line: h.line + 1, text: h.text, h, d })
  }
  return out
}

/** Non-empty body lines under each matching heading (until the next heading of same or higher level). */
function sectionBodies(ctx, re, kinds) {
  return headings(ctx, re, kinds).map(({ d, h }) => {
    const idx = d.headings.indexOf(h)
    const next = d.headings.slice(idx + 1).find(n => n.level <= h.level)
    const end = next ? next.line : d.lines.length
    const body = d.lines.slice(h.line + 1, end).filter(l => l.trim() && !/^#{1,6}\s/.test(l))
    return { doc: d.name, line: h.line + 1, heading: h.text, body, items: body.filter(l => BULLET.test(l)).length }
  })
}

function sectionItemCount(ctx, re, kinds) {
  return sectionBodies(ctx, re, kinds).reduce((n, s) => n + Math.max(s.items, s.body.length ? 1 : 0), 0)
}

function level(count, partial, strong) {
  return count >= strong ? 1 : count >= partial ? 0.5 : 0
}

function ev(list, n = 3) {
  return list.slice(0, n).map(e => ({ doc: e.doc, line: e.line, text: e.text ?? e.heading }))
}

function hEv(list) {
  return ev(list.map(x => ({ doc: x.doc, line: x.line, text: `§ ${x.text ?? x.heading}` })))
}

function result(lvl, evidence, hint) {
  return { level: lvl, evidence: evidence || [], hint }
}

/** Requirement-like lines: list items in spec artifacts that read like statements. */
function reqLines(ctx) {
  const out = []
  for (const d of allDocs(ctx, ['spec'])) {
    let inFence = false
    d.lines.forEach((l, i) => {
      if (/^\s*```/.test(l)) inFence = !inFence
      if (inFence) return
      const t = l.trim()
      if (BULLET.test(l) && t.length > 25 && !/^\s*[-*]\s+\[[ xX]\]/.test(l) && !/^[-*]\s*\*\*[^*]+\*\*\s*:?\s*$/.test(t))
        out.push({ doc: d.name, line: i + 1, text: t })
    })
  }
  return out
}

function idsIn(text) {
  return [...new Set(text.match(ID_RE) || [])]
}

// ───────────────────────── the 40 detectors ─────────────────────────

const TECH = /\b(react|vue|angular|svelte|next\.?js|node(?:\.js)?|express|spring|django|flask|fastapi|rails|postgres(?:ql)?|mysql|mongo(?:db)?|redis|kafka|docker|kubernetes|k8s|aws|gcp|azure|typescript|javascript|python|java|kotlin|golang|rust|graphql|rest(?:ful)? api|grpc|orm|npm|pip|maven|gradle|terraform|lambda|s3|dynamodb|sqlite|tailwind|vite|webpack)\b/i

const DETECTORS = {
  // ── E1 Unambiguity
  'E1.1': ctx => {
    const m = grep(ctx, /\[?NEEDS CLARIFICATION|\bTBD\b|\bTBC\b|open question|\bto be (?:decided|confirmed|clarified)\b|\[clarify|\bOQ-?\d+/i)
    return result(level(m.length, 1, 2), ev(m),
      'Mark undecided points with an explicit marker such as [NEEDS CLARIFICATION: …] instead of silently picking an answer.')
  },
  'E1.2': ctx => {
    const reqs = reqLines(ctx)
    const measured = reqs.filter(r => MEASURE.test(r.text))
    const ratio = reqs.length ? measured.length / reqs.length : 0
    return result(measured.length >= 4 && ratio >= 0.15 ? 1 : measured.length >= 2 ? 0.5 : 0, ev(measured),
      'Replace adjectives like “fast” or “large” with bounds: “p95 < 300 ms”, “≤ 20 items per page”.')
  },
  'E1.3': ctx => {
    // A line ending in ':' (or naming "supported/following/one of") followed by ≥3 list items.
    const hits = []
    for (const d of allDocs(ctx, ['spec', 'plan'])) {
      d.lines.forEach((l, i) => {
        const intro = /:\s*$/.test(l.trim()) && !/^#/.test(l.trim()) || /\b(supported|following|one of|any of|includes?)\b/i.test(l)
        if (!intro) return
        let n = 0
        for (let j = i + 1; j < d.lines.length && BULLET.test(d.lines[j]); j++) n++
        if (n >= 3) hits.push({ doc: d.name, line: i + 1, text: `${l.trim()} (+${n} items)` })
      })
    }
    return result(level(hits.length, 1, 3), ev(hits),
      'When a requirement covers several things (“supported file types”), list every one of them explicitly.')
  },
  'E1.4': ctx => {
    const reqs = reqLines(ctx)
    const norm = reqs.filter(r => NORMATIVE.test(r.text) || NORMATIVE_ANY.test(r.text))
    const upper = grep(ctx, NORMATIVE, ['spec'])
    const ratio = reqs.length ? norm.length / reqs.length : 0
    const lvl = upper.length >= 5 && ratio >= 0.3 ? 1 : norm.length >= 3 ? 0.5 : 0
    return result(lvl, ev(upper.length ? upper : norm),
      'Write requirements with MUST / MUST NOT / SHOULD (RFC 2119 style) and use them the same way everywhere.')
  },
  'E1.5': ctx => {
    const h = headings(ctx, /out of scope|non-?goals?|exclusions?|not in scope|won'?t (?:do|have)/i)
    const m = grep(ctx, /\bout of scope\b|\bnon-?goals?\b|\bnot (?:supported|included|in scope)\b|\bexcluded\b|\bwill not\b|\bMUST NOT\b/i)
    return result(h.length ? 1 : level(m.length, 1, 3), h.length ? hEv(h) : ev(m),
      'Add an “Out of scope / Non-goals” section so the agent knows what not to build.')
  },

  // ── E2 Singularity
  'E2.1': ctx => {
    const h = headings(ctx, /user stor|feature|capabilit|use case|epic|scenario|journey|\bUS-?\d/i, ['spec'])
    return result(level(h.length, 1, 3), hEv(h),
      'Give each capability or user story its own section that holds all of its rules and acceptance criteria.')
  },
  'E2.2': ctx => {
    const h = headings(ctx, /decision|adr|rationale|trade-?offs?|alternatives/i)
    const m = grep(ctx, /^\s*(?:[-*]\s*)?\*{0,2}(decision|rationale|alternatives? considered|chosen|consequences?)\*{0,2}\s*:/i)
    return result(h.length && m.length ? 1 : (h.length || m.length >= 2) ? 0.5 : 0, h.length ? hEv(h) : ev(m),
      'Record each design decision as its own entry (Decision / Rationale / Alternatives) so it can be reviewed in isolation.')
  },
  'E2.3': ctx => {
    const n = sectionItemCount(ctx, /edge cases?|corner cases?|risks?|failure modes?|error (?:cases|handling)|exceptions?/i)
    const h = headings(ctx, /edge cases?|corner cases?|risks?|failure modes?|error (?:cases|handling)|exceptions?/i)
    return result(level(n, 2, 4), hEv(h),
      'List edge cases and risks as separate bullet entries, one per case, not as a paragraph.')
  },
  'E2.4': ctx => {
    const h = headings(ctx, /glossary|definitions?|terminology|key entities|domain model|concepts/i)
    return result(h.length ? 1 : 0, hEv(h),
      'Put term definitions in a Glossary / Key Entities section, separate from scenarios.')
  },
  'E2.5': ctx => {
    const n = sectionItemCount(ctx, /security|privacy|auth(?:entication|orization)?|permissions?|compliance|data protection/i)
    const m = grep(ctx, /\b(encrypt|authenticat|authoriz|PII|personal data|GDPR|least privilege|access control|secret|token|audit log)/i)
    return result(n >= 2 ? 1 : (n >= 1 || m.length >= 2) ? 0.5 : 0, ev(m),
      'Add a Security & Privacy section with one entry per property (who can see what, what is encrypted, what is logged).')
  },

  // ── E3 Verifiability
  'E3.1': ctx => {
    const bodies = sectionBodies(ctx, /success criteria|metrics|kpis?|measurable outcomes?|objectives|goals/i)
    const measured = bodies.flatMap(s => s.body.filter(l => MEASURE.test(l)).map(t => ({ doc: s.doc, line: s.line, text: t.trim() })))
    return result(level(measured.length, 1, 3), ev(measured),
      'Add Success Criteria with numbers: “95% of searches return in < 1 s”, “a new user can reserve a book in < 2 min”.')
  },
  'E3.2': ctx => {
    const h = headings(ctx, /acceptance|verification|test(?:ing)? (?:plan|strategy)|validation/i)
    const m = grep(ctx, /\b(verified by|tested by|acceptance criteria|test:|check:|assert|unit test|integration test|e2e|contract test)\b/i)
    return result(h.length && m.length >= 2 ? 1 : (h.length || m.length >= 2) ? 0.5 : 0, h.length ? hEv(h) : ev(m),
      'For each requirement say how it is checked (acceptance criteria, which test level, which assertion).')
  },
  'E3.3': ctx => {
    const gwt = grep(ctx, /^\s*(?:[-*]\s*|\d+\.\s*)?\*{0,2}(given|when|then)\*{0,2}\b/i)
    const sc = grep(ctx, /\bscenario\b/i)
    const n = Math.floor(gwt.length / 2) + sc.length
    return result(level(n, 2, 5), ev(gwt.length ? gwt : sc),
      'Write the scenarios a test must cover as Given / When / Then, including failure scenarios.')
  },
  'E3.4': ctx => {
    const h = headings(ctx, /definition of done|done criteria|exit criteria|completion criteria|review (?:&|and) acceptance checklist|checklist/i)
    const m = grep(ctx, /\b(definition of done|done when|is complete when|exit criteria|all (?:tests|checks) pass)\b/i)
    return result(h.length ? 1 : level(m.length, 1, 2), h.length ? hEv(h) : ev(m),
      'State when verification is finished: a Definition of Done or exit-criteria checklist.')
  },

  // ── P1 Dependency Control
  'P1.1': ctx => {
    const ha = headings(ctx, /assumptions?/i)
    const hd = headings(ctx, /dependenc(?:y|ies)|prerequisites?|integrations?|external systems?|upstream|downstream/i)
    const m = grep(ctx, /\b(assum(?:e|es|ption)|depends on|requires? (?:an? )?(?:existing|external))\b/i)
    const lvl = ha.length && hd.length ? 1 : (ha.length || hd.length || m.length >= 2) ? 0.5 : 0
    return result(lvl, [...hEv(ha), ...hEv(hd)].slice(0, 3).concat(ha.length || hd.length ? [] : ev(m)),
      'Add Assumptions and Dependencies sections — everything you are taking for granted, and every external system.')
  },
  'P1.2': ctx => {
    const h = headings(ctx, /constraints?|scope|limitations?|boundar/i)
    const m = grep(ctx, /\b(constraint|limited to|within scope|in scope|scope:|boundary)\b/i)
    return result(h.length ? 1 : level(m.length, 1, 3), h.length ? hEv(h) : ev(m),
      'Add a Constraints / Scope section (platforms, limits, regulatory or budget constraints, scope edges).')
  },
  'P1.3': ctx => {
    const m = grep(ctx, /\b(depends on|blocked by|requires|after|prerequisite)\b.*\b(?:FR|NFR|REQ|US|T|TASK|AC)-?\d+|\b(?:FR|NFR|REQ|US|T|TASK)-?\d+\b.*\b(depends on|blocked by|requires)\b|\bdepends? on:\s*\S/i)
    return result(level(m.length, 1, 3), ev(m),
      'Link each dependency to the requirement or task IDs it affects (“T012 depends on T004”, “FR-3 requires the catalog API”).')
  },
  'P1.4': ctx => {
    const m = grep(ctx, /\b(fallback|fall back|retr(?:y|ies)|timeout|time out|circuit breaker|degrad|unavailable|if .{0,40}(?:fails?|is down|unreachable)|health ?check|mock(?:ed)? (?:in|for) tests?|contract test)\b/i)
    return result(level(m.length, 1, 3), ev(m),
      'Say what happens when a dependency fails (timeout, retry, fallback) and how the dependency itself is verified.')
  },

  // ── P2 Completeness
  'P2.1': ctx => {
    const h = headings(ctx, /functional requirements|requirements|user stor|use cases?|features?|what/i, ['spec'])
    const reqs = reqLines(ctx)
    const ids = idsIn(allDocs(ctx, ['spec']).map(d => d.text).join('\n')).filter(x => /^(FR|REQ|US|UC|BR)/.test(x))
    const lvl = h.length && (reqs.length >= 8 || ids.length >= 5) ? 1 : (h.length || reqs.length >= 4) ? 0.5 : 0
    return result(lvl, hEv(h), 'Cover every in-scope behaviour as a functional requirement or user story.')
  },
  'P2.2': ctx => {
    const m = grep(ctx, /\b(error|invalid|fail(?:s|ure|ed)?|reject|exception|timeout|conflict|not found|unauthori[sz]ed|forbidden|duplicate|empty|missing|exceed|overflow|edge case)\b/i, ['spec', 'plan'])
    return result(level(m.length, 3, 8), ev(m),
      'Specify behaviour for invalid input, failures, conflicts, empty states and limits — not just the happy path.')
  },
  'P2.3': ctx => {
    const cats = [
      /performance|latency|throughput|response time/i, /scalab|concurren|load/i, /availability|uptime|reliab|recovery|backup/i,
      /accessib|wcag|a11y/i, /observab|logging|monitoring|metrics|tracing|alert/i, /security|privacy/i, /usability|locali[sz]|i18n/i,
      /maintainab|portab|compatib|browser support/i,
    ]
    const all = ctx.docs.map(d => d.text).join('\n')
    const hit = cats.filter(re => re.test(all)).length
    const h = headings(ctx, /non-?functional|quality attributes|nfr|operational|constraints/i)
    return result(hit >= 4 || (h.length && hit >= 3) ? 1 : hit >= 2 ? 0.5 : 0, hEv(h),
      'Cover non-functional constraints: performance, availability, accessibility, observability, security.')
  },
  'P2.4': ctx => {
    const h = headings(ctx, /phase|milestone|roadmap|release|delivery|mvp|iteration|sprint|rollout|timeline/i)
    const tasks = allDocs(ctx, ['tasks'])
    const lvl = (h.length && tasks.length) ? 1 : (h.length || tasks.length) ? 0.5 : 0
    return result(lvl, hEv(h), 'Add delivery planning: phases / milestones and an ordered task list.')
  },
  'P2.5': ctx => {
    const h = headings(ctx, /open (?:questions|issues)|unresolved|clarifications?|todo|parking lot|questions/i)
    const m = grep(ctx, /\[?NEEDS CLARIFICATION|\bTBD\b|open question|\bOQ-?\d+/i)
    return result(h.length ? 1 : m.length >= 2 ? 0.5 : 0, h.length ? hEv(h) : ev(m),
      'Keep an Open Questions list so unresolved items are tracked rather than forgotten.')
  },

  // ── I1 Conformance
  'I1.1': ctx => {
    const std = /overview|summary|purpose|background|context|goals?|requirements|user stor|scope|assumptions|dependencies|constraints|acceptance|success criteria|design|architecture|data model|api|testing|risks|glossary|open questions|tasks|phase/i
    const hs = ctx.docs.flatMap(d => d.headings)
    const known = hs.filter(h => std.test(h.text))
    return result(known.length >= 8 ? 1 : known.length >= 4 ? 0.5 : 0,
      ev(known.map(h => ({ doc: '', line: h.line + 1, text: `§ ${h.text}` }))),
      'Use a standard template (overview, requirements, constraints, acceptance, …) so readers know where things live.')
  },
  'I1.2': ctx => {
    const all = ctx.docs.map(d => d.text).join('\n')
    const ids = idsIn(all)
    const m = grep(ctx, ID_RE)
    return result(level(ids.length, 3, 8), ev(m),
      'Give every requirement and task a stable ID (FR-001, NFR-002, T014) and never renumber.')
  },
  'I1.3': ctx => {
    const fm = ctx.docs.filter(d => /^---\n[\s\S]*?\n---/.test(d.text.replace(/\r/g, '')))
    const m = grep(ctx, /\btemplate\b|\bschema\b|spec-?kit|\bspecify\b|\bkiro\b|zeespec|\bversion:\s|\bstatus:\s*(draft|approved|review)|feature branch:|\*\*status\*\*/i)
    const lvl = (fm.length || m.length >= 2) && m.length >= 1 ? 1 : (fm.length || m.length) ? 0.5 : 0
    return result(lvl, ev(m.length ? m : fm.map(d => ({ doc: d.name, line: 1, text: 'YAML front-matter' }))),
      'Declare which template or schema the spec follows (front-matter, template name, status/version) and stick to it.')
  },

  // ── I2 Consistency
  'I2.1': ctx => {
    const defs = grep(ctx, /^\s*(?:[-*]\s+)?\*\*[A-Z][^*]{1,40}\*\*\s*[:—–-]\s+\S/)
    const h = headings(ctx, /glossary|definitions?|terminology|key entities/i)
    return result(h.length && defs.length >= 3 ? 1 : (h.length || defs.length >= 3) ? 0.5 : 0, ev(defs),
      'Define each domain term once (bold term + definition) and reuse exactly that word everywhere.')
  },
  'I2.2': ctx => {
    const all = ctx.docs.map(d => d.text).join('\n')
    const ids = all.match(ID_RE) || []
    if (ids.length < 3) return result(0, [], 'Adopt one ID notation (e.g. FR-001) and one list style throughout.')
    // Same prefix written both with and without a dash = inconsistent notation.
    const styles = {}
    for (const id of ids) {
      const p = id.match(/^[A-Z]+/)[0]
      ;(styles[p] ||= new Set()).add(/-/.test(id) ? 'dash' : 'nodash')
    }
    const mixed = Object.entries(styles).filter(([, s]) => s.size > 1).map(([p]) => p)
    const normWords = new Set((all.match(/\b(must|shall)\b/gi) || []).map(w => w.toLowerCase()))
    const issues = mixed.length + (normWords.size > 1 ? 1 : 0)
    return result(issues === 0 ? 1 : issues === 1 ? 0.5 : 0,
      mixed.map(p => ({ doc: '', line: 0, text: `${p} IDs written both with and without “-”` }))
        .concat(normWords.size > 1 ? [{ doc: '', line: 0, text: 'Both “must” and “shall” used as normative verbs' }] : []),
      'Use one ID notation and one normative verb (MUST or SHALL, not both).')
  },
  'I2.3': ctx => {
    const spec = allDocs(ctx, ['spec']).map(d => d.text).join('\n')
    const other = allDocs(ctx, ['plan', 'tasks']).map(d => d.text).join('\n')
    const specIds = idsIn(spec).filter(x => !/^T(ASK)?-?\d/.test(x))
    if (!other || !specIds.length) return result(0, [], 'Reference spec requirement IDs from the plan and tasks so the three artifacts stay aligned.')
    const traced = specIds.filter(id => other.includes(id))
    const ratio = traced.length / specIds.length
    return result(ratio >= 0.6 ? 1 : ratio >= 0.2 ? 0.5 : 0,
      [{ doc: '', line: 0, text: `${traced.length}/${specIds.length} spec IDs referenced in plan/tasks` }],
      'Reference spec requirement IDs from the plan and tasks so the three artifacts stay aligned.')
  },
  'I2.4': ctx => {
    if (ctx.docs.length < 2) return result(0, [], 'Use the same section skeleton across related artifacts (e.g. same feature names in spec, plan and tasks).')
    const norm = s => s.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\b(phase|step|section|part)\s*\d+\b/g, '').trim()
    const sets = ctx.docs.map(d => new Set(d.headings.map(h => norm(h.text)).filter(Boolean)))
    const shared = new Set()
    for (let i = 0; i < sets.length; i++) for (let j = i + 1; j < sets.length; j++)
      for (const h of sets[i]) if (sets[j].has(h)) shared.add(h)
    return result(level(shared.size, 1, 3), [...shared].slice(0, 3).map(t => ({ doc: '', line: 0, text: `§ ${t} (in several artifacts)` })),
      'Use the same section skeleton across related artifacts (e.g. same feature names in spec, plan and tasks).')
  },

  // ── I3 Comprehensibility
  'I3.1': ctx => {
    const hs = ctx.docs.flatMap(d => d.headings)
    if (!hs.length) return result(0, [], 'Break the document into sections whose titles say what they are for.')
    const generic = hs.filter(h => /^(notes?|misc(ellaneous)?|other|stuff|details|info|more|section \d+|untitled)$/i.test(h.text))
    const lvl = hs.length >= 6 && generic.length / hs.length < 0.15 ? 1 : hs.length >= 3 ? 0.5 : 0
    return result(lvl, [{ doc: '', line: 0, text: `${hs.length} sections${generic.length ? `, ${generic.length} with generic titles` : ''}` }],
      'Break the document into sections whose titles say what they are for.')
  },
  'I3.2': ctx => {
    const m = grep(ctx, /\b(spec|plan|tasks|requirements|design|data-model|research)\.md\b|\]\([^)]*\.md\)|\bsee (?:the )?(?:spec|plan|tasks)\b/i)
    return result(level(m.length, 1, 3), ev(m),
      'Link the spec, plan and tasks to each other and say how they relate (“tasks.md implements plan.md, which realises spec.md”).')
  },
  'I3.3': ctx => {
    const what = headings(ctx, /overview|summary|purpose|background|context|problem|introduction|vision|what/i)
    const not = headings(ctx, /out of scope|non-?goals?|not in scope|what (?:this|it) is not/i)
    const notLine = grep(ctx, /\b(is not|isn'?t|does not aim|non-?goals?)\b/i)
    const lvl = what.length && (not.length || notLine.length) ? 1 : (what.length || not.length) ? 0.5 : 0
    return result(lvl, hEv([...what, ...not]), 'Open with what the product is — and explicitly what it is not.')
  },

  // ── C1 Scope Discipline
  'C1.1': ctx => {
    const m = grep(ctx, /\bas an? [a-z][\w -]{1,30},? I (?:want|need|can)|\b(?:the |a )?(?:user|customer|admin(?:istrator)?|member|visitor|librarian|actor) (?:can|must be able to|should be able to|sees?|is able to)\b/i, ['spec'])
    return result(level(m.length, 2, 5), ev(m),
      'Phrase required behaviour from the user’s side: “As a member, I can …”, “The user sees …”.')
  },
  'C1.2': ctx => {
    const spec = allDocs(ctx, ['spec'])
    const plans = allDocs(ctx, ['plan', 'tasks'])
    const techInSpec = grep(ctx, TECH, ['spec'], 100)
    const specLines = spec.reduce((n, d) => n + d.lines.length, 0) || 1
    const density = techInSpec.length / specLines
    if (!plans.length) return result(techInSpec.length <= 2 ? 0.5 : 0, ev(techInSpec),
      'Move tech-stack, design and task lists out of the spec into separate plan.md / tasks.md files.')
    return result(density < 0.03 ? 1 : density < 0.08 ? 0.5 : 0, ev(techInSpec),
      'Keep the spec technology-free; frameworks, databases and task lists belong in plan.md / tasks.md.')
  },
  'C1.3': ctx => {
    const tasks = allDocs(ctx, ['tasks', 'plan'])
    const m = grep(ctx, /\b(implements?|covers?|satisf(?:y|ies)|traces? to|realis(?:e|es)|for)\b[^.]{0,30}\b(?:FR|NFR|REQ|US|UC|AC)-?\d+|\[(?:FR|US|REQ)-?\d+\]|\((?:FR|US|REQ)-?\d+(?:,\s*(?:FR|US|REQ)-?\d+)*\)/i, ['tasks', 'plan'])
    return result(tasks.length ? level(m.length, 1, 4) : 0, ev(m),
      'In plan/tasks, say which requirement each piece of work implements (“T012 [US2] …”).')
  },

  // ── C2 Implementation-Planning Information
  'C2.1': ctx => {
    const h = headings(ctx, /technical context|tech(?:nology)? stack|architecture|technical approach|implementation (?:notes|approach)|project structure|how/i)
    const tech = grep(ctx, TECH, ['plan'])
    return result(h.length && tech.length >= 2 ? 1 : (h.length || tech.length >= 2) ? 0.5 : 0, h.length ? hEv(h) : ev(tech),
      'Give the implementer technical context: stack, architecture, project structure, key libraries.')
  },
  'C2.2': ctx => {
    const tasks = grep(ctx, /^\s*(?:[-*]\s+(?:\[[ xX]\]\s+)?|\d+[.)]\s+)(?:\*\*)?T(?:ASK)?-?\d+/i, ['tasks', 'plan'], 500)
    const withOutput = tasks.filter(t => /[\w-]+\/[\w./-]+\.\w+|`[^`]+\.\w{1,5}`|\b(produces?|outputs?|creates?|returns?|deliverable|→|->)\b/i.test(t.text))
    const ratio = tasks.length ? withOutput.length / tasks.length : 0
    return result(tasks.length >= 3 && ratio >= 0.5 ? 1 : withOutput.length >= 1 ? 0.5 : 0, ev(withOutput),
      'For each task, name what it produces (file path, endpoint, artifact): “T007 Create src/models/book.ts”.')
  },
  'C2.3': ctx => {
    const tasks = grep(ctx, /^\s*(?:[-*]\s+(?:\[[ xX]\]\s+)?|\d+[.)]\s+)(?:\*\*)?T(?:ASK)?-?\d+/i, ['tasks', 'plan'], 500)
    const traced = tasks.filter(t => /\b(?:FR|NFR|REQ|US|UC|AC)-?\d+\b|\[US\d+\]/i.test(t.text))
    const ratio = tasks.length ? traced.length / tasks.length : 0
    return result(tasks.length >= 3 && ratio >= 0.5 ? 1 : traced.length >= 1 ? 0.5 : 0,
      [{ doc: '', line: 0, text: `${traced.length}/${tasks.length} tasks cite a requirement / story ID` }, ...ev(traced, 2)],
      'Tag every task with the requirement or story it serves so coverage can be checked.')
  },
  'C2.4': ctx => {
    const h = headings(ctx, /data model|schema|entities|contracts?|api|interfaces?|endpoints?|events?|messages?|migrations?/i)
    const code = grep(ctx, /^\s*```(?:json|ya?ml|ts|typescript|sql|graphql|proto|openapi)/i)
    const evo = grep(ctx, /\b(version(?:ed|ing)?|migration|backward[s]? compat|deprecat|breaking change)\b/i)
    const lvl = (h.length && (code.length || evo.length)) ? 1 : (h.length || code.length) ? 0.5 : 0
    return result(lvl, [...hEv(h), ...ev(code, 1), ...ev(evo, 1)].slice(0, 3),
      'Specify data structures and interface contracts (schemas, endpoints, events) and how they may evolve.')
  },
}

// ───────────────────────── scoring ─────────────────────────

/** Map mean practice level (0–1) to the paper's 0–3 rubric. */
export function rubricScore(mean) {
  if (mean >= 0.8) return 3
  if (mean >= 0.5) return 2
  if (mean >= 0.2) return 1
  return 0
}

/**
 * @param {{name:string,text:string,kind?:string}[]} files
 * @returns full report
 */
export function score(files) {
  const docs = files.filter(f => f.text && f.text.trim()).map(f => parseDoc(f.name, f.text, f.kind))
  const ctx = { docs }
  const practices = PRACTICES.map(p => {
    let r
    try { r = DETECTORS[p.id](ctx) } catch (e) { r = result(0, [], `detector error: ${e.message}`) }
    return { ...p, ...r }
  })
  const dimensions = DIMENSIONS.map(d => {
    const ps = practices.filter(p => p.dim === d.id)
    const mean = ps.reduce((s, p) => s + p.level, 0) / ps.length
    return { ...d, mean, score: rubricScore(mean), practices: ps }
  })
  const total = dimensions.reduce((s, d) => s + d.score, 0)
  return {
    docs: docs.map(d => ({ name: d.name, kind: d.kind, lines: d.lines.length })),
    practices, dimensions, total, tier: tierFor(total),
    satisfied: practices.filter(p => p.level === 1).length,
  }
}

/** Recompute totals after a judge overrides some dimension scores. */
export function withOverrides(report, overrides) {
  const dimensions = report.dimensions.map(d =>
    overrides[d.id] != null ? { ...d, heuristic: d.score, score: overrides[d.id] } : d)
  const total = dimensions.reduce((s, d) => s + d.score, 0)
  return { ...report, dimensions, total, tier: tierFor(total) }
}
