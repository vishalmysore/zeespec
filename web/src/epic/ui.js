// EPIC Score view: scores spec / plan / tasks files (or the spec the builder just
// produced) against the EPIC framework for spec-driven development (arXiv:2610.07534).

import { CATEGORIES, DIMENSIONS, PAPER, RUBRIC, tierFor } from './epic.js'
import { score, parseDoc } from './engine.js'
import { lint } from './lints.js'
import { SAMPLES } from './samples.js'
import { listCandidates, fetchFiles } from './github.js'
import { judgeDimension, rewriteLine } from './judge.js'
import { WEBLLM_MODELS, loadModel, getModelStatus } from '../llm.js'

const root = document.getElementById('epicScreen')
const $ = (s, el = root) => el.querySelector(s)
const $$ = (s, el = root) => [...el.querySelectorAll(s)]
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])

export const APP_URL = 'https://vishalmysore.github.io/zeespec/app/'
const state = { files: [], report: null, docs: [], judged: {}, source: '' }
let hooks = { getBuilderSpec: () => '', onModelStatus: () => {} }

export function initEpic(h) {
  hooks = { ...hooks, ...h }
  // Deep link: ?repo=owner/repo#epic auto-loads that repo (used by the README badge).
  const qp = new URLSearchParams(location.search).get('repo')
  if (qp) {
    if (location.hash !== '#epic') history.replaceState(null, '', `${location.search}#epic`)
    selectTab('github')
    $('#ghInput').value = qp
    autoScore = true
    $('#ghForm').requestSubmit()
  }
}

/** Called whenever the EPIC view is shown, so the "From builder" pane reflects the latest spec. */
export function refreshBuilderPane() {
  const spec = hooks.getBuilderSpec()
  $('#builderEmpty').hidden = !!spec
  $('#builderReady').hidden = !spec
  if (spec) $('#builderWords').textContent = `${spec.split(/\s+/).filter(Boolean).length.toLocaleString()} words`
}

/** Score the spec the builder produced (one AGENTS.md). */
export function scoreBuilderSpec() {
  const spec = hooks.getBuilderSpec()
  if (!spec) return
  selectTab('builder')
  run([{ name: 'AGENTS.md', text: spec, kind: 'spec' }], 'ZeeSpec builder')
}

$('#paperLink').href = PAPER.url

// ───────────── input tabs
function selectTab(name) {
  $$('.tab').forEach(x => x.classList.toggle('active', x.dataset.tab === name))
  $$('.tabpane').forEach(p => p.classList.toggle('active', p.dataset.pane === name))
}
$$('.tab').forEach(t => t.addEventListener('click', () => selectTab(t.dataset.tab)))

$('#builderGo').onclick = scoreBuilderSpec

// ───────────── samples
for (const s of Object.values(SAMPLES)) {
  const b = document.createElement('button')
  b.className = 'btn btn-ghost'
  b.textContent = s.label
  b.onclick = () => run(s.files, `sample: ${s.label}`)
  $('#sampleBtns').append(b)
}

// ───────────── paste
$('#pasteGo').onclick = () => {
  const files = [
    { name: 'spec.md', text: $('#pSpec').value, kind: 'spec' },
    { name: 'plan.md', text: $('#pPlan').value, kind: 'plan' },
    { name: 'tasks.md', text: $('#pTasks').value, kind: 'tasks' },
  ].filter(f => f.text.trim())
  if (!files.length) return toast('Paste at least a spec.')
  run(files, 'pasted text')
}

// ───────────── upload
async function readFiles(list) {
  const files = await Promise.all([...list].map(async f => ({ name: f.webkitRelativePath || f.name, text: await f.text() })))
  if (files.length) run(files, `${files.length} uploaded file(s)`)
}
$('#fileIn').onchange = e => readFiles(e.target.files)
const drop = $('#drop')
drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('over') })
drop.addEventListener('dragleave', () => drop.classList.remove('over'))
drop.addEventListener('drop', e => { e.preventDefault(); drop.classList.remove('over'); readFiles(e.dataTransfer.files) })

// ───────────── GitHub
let ghRepo = null
let autoScore = false
$('#ghForm').onsubmit = async e => {
  e.preventDefault()
  const list = $('#ghList')
  list.innerHTML = '<p class="hint">Looking for spec files…</p>'
  try {
    ghRepo = await listCandidates($('#ghInput').value)
    const groups = Object.entries(ghRepo.groups)
    if (!groups.length) { list.innerHTML = '<p class="warn">No spec-like Markdown files found. Try a sub-folder URL, or paste the files.</p>'; return }
    list.innerHTML = `<p class="hint">${esc(ghRepo.owner)}/${esc(ghRepo.repo)} @ ${esc(ghRepo.branch)} — pick the files that belong to one feature or one spec set.</p><div class="ghgroups">` +
      groups.map(([dir, files]) => `
        <fieldset class="group"><legend><label><input type="checkbox" class="grp" data-dir="${esc(dir)}" ${dir === ghRepo.defaultGroup ? 'checked' : ''}/> ${esc(dir)}</label></legend>
        ${files.map(f => `<label class="file"><input type="checkbox" class="gf" data-dir="${esc(dir)}" value="${esc(f.path)}" ${dir === ghRepo.defaultGroup ? 'checked' : ''}/> ${esc(f.path.split('/').pop())}</label>`).join('')}
        </fieldset>`).join('') +
      '</div><button class="btn btn-primary" id="ghGo">Score selected</button>'
    $$('.grp', list).forEach(g => g.onchange = () => $$(`.gf[data-dir="${CSS.escape(g.dataset.dir)}"]`, list).forEach(c => (c.checked = g.checked)))
    $('#ghGo').onclick = async () => {
      const paths = $$('.gf:checked', list).map(c => c.value)
      if (!paths.length) return toast('Select at least one file.')
      $('#ghGo').disabled = true
      try {
        const files = await fetchFiles(ghRepo, paths)
        run(files, `${ghRepo.owner}/${ghRepo.repo}`)
        history.replaceState(null, '', `?repo=${encodeURIComponent(`${ghRepo.owner}/${ghRepo.repo}`)}#epic`)
      } catch (err) { toast(err.message) } finally { $('#ghGo').disabled = false }
    }
    if (autoScore) { autoScore = false; $('#ghGo').click() }
  } catch (err) {
    list.innerHTML = `<p class="warn">${esc(err.message)}</p>`
  }
}

// ───────────── scoring + render
function run(files, source) {
  state.files = files
  state.source = source
  state.docs = files.filter(f => f.text.trim()).map(f => parseDoc(f.name, f.text, f.kind))
  state.report = score(files)
  state.judged = {}
  render()
  $('#epicResults').hidden = false
  $('#epicResults').scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function finalDims() {
  return state.report.dimensions.map(d => {
    const j = state.judged[d.id]
    const final = j ? Math.round((d.score + j.score) / 2) : d.score
    return { ...d, judge: j, final }
  })
}

function render() {
  const dims = finalDims()
  const total = dims.reduce((s, d) => s + d.final, 0)
  const tier = tierFor(total)
  $('#totalNum').textContent = total
  $('#tier').textContent = tier.label
  $('#tier').dataset.tier = tier.id
  $('#tierNote').textContent = `${tier.note} (EPIC paper, 114 repos — correlation, not causation.)`
  $('#docList').innerHTML = `${esc(state.source)} · ` + state.report.docs.map(d => `<span class="kind k-${d.kind}">${d.kind}</span> ${esc(d.name.split('/').pop())}`).join(' · ')

  drawRadar(dims)
  $('#cats').innerHTML = CATEGORIES.map(c => {
    const ds = dims.filter(d => d.cat === c.id)
    const s = ds.reduce((a, d) => a + d.final, 0), max = ds.length * 3
    return `<div class="cat"><div class="cathead"><b>${c.id}</b> ${c.name}<span>${s}/${max}</span></div>
      <div class="bar"><div style="width:${(s / max) * 100}%"></div></div><p>${c.blurb}</p></div>`
  }).join('')

  $('#dims').innerHTML = dims.map(d => `
    <article class="dim panel" data-cat="${d.cat}">
      <header>
        <div><span class="dimid">${d.id}</span> <b>${d.name}</b></div>
        <div class="dots" title="${RUBRIC[d.final]}">${[0, 1, 2].map(i => `<i class="${i < d.final ? 'on' : ''}"></i>`).join('')}<span>${d.final}/3</span></div>
      </header>
      <p class="rubric">${RUBRIC[d.final]}${d.judge ? ` · rules ${d.score} · judge ${d.judge.score}` : ''}</p>
      ${d.judge ? `<div class="judgenote"><b>Judge:</b> ${esc(d.judge.reason)}${d.judge.fix ? `<br/><b>Fix:</b> ${esc(d.judge.fix)}` : ''}</div>` : ''}
      <ul class="practices">
        ${d.practices.map(p => `
          <li class="lv${String(p.level).replace('.', '')}">
            <span class="mark">${p.level === 1 ? '✓' : p.level ? '~' : '✗'}</span>
            <div><span class="pid">${p.id}</span> ${esc(p.text)}
              ${p.evidence.length ? `<div class="evid">${p.evidence.map(e => `<code>${e.line ? `${esc(e.doc.split('/').pop())}:${e.line} ` : ''}${esc(trunc(e.text, 110))}</code>`).join('')}</div>` : ''}
              ${p.level < 1 ? `<div class="fixhint">→ ${esc(p.hint)}</div>` : ''}
            </div>
          </li>`).join('')}
      </ul>
    </article>`).join('')

  const lints = lint(state.docs)
  $('#lintCount').textContent = lints.length ? `(${lints.length})` : '(none — nice)'
  $('#lints').innerHTML = lints.length ? lints.slice(0, 60).map((l, i) => `
    <div class="lint">
      <div class="lhead"><span class="dimid">${l.dim}</span> <code>${esc(l.doc.split('/').pop())}:${l.line}</code> <span class="rule">${l.rule}</span></div>
      <div class="ltext">${esc(trunc(l.text, 220))}</div>
      <div class="lmsg">${esc(l.msg)}</div>
      <div class="lrw"><button class="btn btn-ghost btn-sm" data-rw="${i}">Rewrite with local AI</button><span class="rwout"></span></div>
    </div>`).join('') : '<p class="hint">No vague or weak requirement lines found.</p>'
  $$('[data-rw]').forEach(b => b.onclick = () => doRewrite(b, lints[+b.dataset.rw]))

  renderShare(dims, total, tier)
}

function trunc(s, n) { return s.length > n ? s.slice(0, n - 1) + '…' : s }

function drawRadar(dims) {
  const svg = $('#radar'), cx = 180, cy = 180, R = 130, n = dims.length
  const pt = (i, r) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / n; return [cx + r * Math.cos(a), cy + r * Math.sin(a)] }
  let g = ''
  for (let k = 1; k <= 3; k++) g += `<polygon class="ring" points="${dims.map((_, i) => pt(i, (R * k) / 3).join(',')).join(' ')}"/>`
  dims.forEach((d, i) => {
    const [x, y] = pt(i, R), [lx, ly] = pt(i, R + 22)
    g += `<line class="axis" x1="${cx}" y1="${cy}" x2="${x}" y2="${y}"/>`
    g += `<text class="rlabel c${d.cat}" x="${lx}" y="${ly}" text-anchor="middle" dominant-baseline="middle">${d.id}</text>`
  })
  g += `<polygon class="shape" points="${dims.map((d, i) => pt(i, Math.max(4, (R * d.final) / 3)).join(',')).join(' ')}"/>`
  dims.forEach((d, i) => { const [x, y] = pt(i, Math.max(4, (R * d.final) / 3)); g += `<circle class="dot" cx="${x}" cy="${y}" r="3.5"><title>${d.id} ${d.name}: ${d.final}/3</title></circle>` })
  svg.innerHTML = g
}

function renderShare(dims, total, tier) {
  const color = { top: 'brightgreen', middle: 'yellow', bottom: 'red' }[tier.id]
  const img = `https://img.shields.io/badge/EPIC%20spec-${total}%2F30%20${tier.id}-${color}`
  const repo = state.source.includes('/') && !state.source.includes(' ') ? state.source : ''
  const link = repo ? `${APP_URL}?repo=${encodeURIComponent(repo)}#epic` : `${APP_URL}#epic`
  $('#badgeMd').textContent = `[![EPIC spec score](${img})](${link})`
  $('#badgePrev').innerHTML = `<img src="${img}" alt="EPIC spec ${total}/30" />`

  const weak = dims.flatMap(d => d.practices.filter(p => p.level < 1).map(p => ({ ...p, dimName: d.name })))
  weak.sort((a, b) => a.level - b.level)
  $('#fixPrompt').textContent =
`You are improving the spec-driven development artifacts in this repo (${state.report.docs.map(d => d.name).join(', ')}).
They scored ${total}/30 on the EPIC framework (arXiv:2610.07534). Raise the score by editing the Markdown only.

Rules:
- Do NOT invent product facts, numbers or decisions. Where information is missing, add a line
  "[NEEDS CLARIFICATION: <question>]" in the right section and list it under "Open Questions".
- Keep the spec free of technology choices; put stack/design in plan.md and work in tasks.md.
- Give every requirement a stable ID (FR-001, NFR-001, …) and every task an ID that cites the requirement it serves.

Gaps to fix, most severe first:
${weak.slice(0, 20).map(p => `- [${p.id} · ${p.dimName}] ${p.text}  →  ${p.hint}`).join('\n')}
`
}

function reportMd() {
  const dims = finalDims()
  const total = dims.reduce((s, d) => s + d.final, 0)
  return `# EPIC spec score report\n\nSource: ${state.source}\nScore: **${total}/30** — ${tierFor(total).label}\n\n` +
    dims.map(d => `## ${d.id} ${d.name} — ${d.final}/3\n\n` + d.practices.map(p => `- ${p.level === 1 ? '✅' : p.level ? '🟡' : '❌'} **${p.id}** ${p.text}${p.level < 1 ? `\n  - Fix: ${p.hint}` : ''}`).join('\n')).join('\n\n') +
    `\n\n---\nGenerated by ZeeSpec EPIC Score (${APP_URL}#epic). Framework: ${PAPER.url}\n`
}

$('#dlReport').onclick = () => {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([reportMd()], { type: 'text/markdown' }))
  a.download = 'epic-report.md'
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

root.addEventListener('click', e => {
  const id = e.target.dataset?.copy
  if (!id) return
  navigator.clipboard.writeText($('#' + id).textContent).then(() => toast('Copied'), () => toast('Copy failed — select the text manually.'))
})

// ───────────── AI judge (shares the builder's WebLLM worker)
$('#epicModel').innerHTML = WEBLLM_MODELS.map(m => `<option value="${m.id}">${m.name}</option>`).join('')

async function ensureModel() {
  if (getModelStatus().status === 'ready') return
  const id = $('#epicModel').value
  const prog = $('#judgeProg')
  prog.hidden = false
  hooks.onModelStatus('loading', 'Loading…')
  try {
    await loadModel(id, evt => {
      if (evt.type === 'downloading') {
        $('div', prog).style.width = `${evt.progress ?? 0}%`
        $('span', prog).textContent = `Downloading… ${evt.progress ?? 0}%`
      } else if (evt.type === 'phase' && evt.phase === 'compile') {
        $('span', prog).textContent = evt.note ?? 'Compiling WebGPU shaders…'
      }
    })
    hooks.onModelStatus('ready', id.split('-').slice(0, 3).join(' '))
  } catch (err) {
    hooks.onModelStatus('error', 'Error')
    throw err
  }
}

$('#judgeBtn').onclick = async () => {
  const btn = $('#judgeBtn')
  btn.disabled = true
  const prog = $('#judgeProg')
  try {
    await ensureModel()
    prog.hidden = false
    for (const [i, d] of state.report.dimensions.entries()) {
      $('div', prog).style.width = `${(i / DIMENSIONS.length) * 100}%`
      $('span', prog).textContent = `Judging ${d.id} ${d.name}…`
      try { state.judged[d.id] = await judgeDimension(state.docs, d) } catch (err) { console.warn(d.id, err) }
      render()
    }
    $('div', prog).style.width = '100%'
    $('span', prog).textContent = `Judged ${Object.keys(state.judged).length}/10 dimensions.`
  } catch (err) {
    toast(err.message)
    prog.hidden = true
  } finally { btn.disabled = false }
}

async function doRewrite(btn, l) {
  const out = btn.nextElementSibling
  btn.disabled = true
  try {
    out.textContent = getModelStatus().status === 'ready' ? 'Rewriting…' : 'Loading model (first time downloads ≈1–2 GB)…'
    await ensureModel()
    out.textContent = 'Rewriting…'
    out.textContent = await rewriteLine(l.text, l.msg)
    out.classList.add('done')
  } catch (err) { out.textContent = err.message } finally { btn.disabled = false }
}

function toast(msg) {
  const t = document.createElement('div')
  t.className = 'epic-toast'
  t.textContent = msg
  document.body.append(t)
  setTimeout(() => t.remove(), 2600)
}
