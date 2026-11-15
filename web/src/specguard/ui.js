// SpecGuard view: can a model turn a natural-language spec into a validation
// harness that rejects a wrong implementation without rejecting right ones?
// Browser-sized re-creation of SpecGuardBench (arXiv:2610.16870).

import { TASKS, TYPES, PAPER } from './tasks.js'
import { evaluateTask, implsOf, aggregate } from './harness-core.js'
import { BASELINES, baselineHarness } from './baselines.js'
import { runInSandbox } from './sandbox.js'
import { writeHarness } from './generate.js'
import { WEBLLM_MODELS, loadModel, getModelStatus } from '../llm.js'

const root = document.getElementById('specguardScreen')
const $ = (s, el = root) => el.querySelector(s)
const $$ = (s, el = root) => [...el.querySelectorAll(s)]
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])

const APP_URL = 'https://vishalmysore.github.io/zeespec/app/#specguard'
const BOARD_KEY = 'zeespec.specguard.board.v1'
const typeLabel = id => TYPES.find(t => t.id === id)?.label ?? id

const state = { rows: new Map(), running: false, stop: false, author: '', ref: 'gold' }
let hooks = { onModelStatus: () => {} }

export function initSpecGuard(h) { hooks = { ...hooks, ...h } }

// ───────────── controls
$('#sgPaperLink').href = PAPER.url
$('#sgSource').innerHTML =
  `<option value="model">Local model (WebLLM, on your GPU)</option>` +
  BASELINES.map(b => `<option value="${b.id}">${esc(b.label)}</option>`).join('')
$('#sgModel').innerHTML = WEBLLM_MODELS.map(m => `<option value="${m.id}">${esc(m.name)}</option>`).join('')
$('#sgType').innerHTML = `<option value="">All ${TASKS.length} tasks</option>` +
  TYPES.map(t => `<option value="${t.id}">${esc(t.label)} (${TASKS.filter(x => x.type === t.id).length})</option>`).join('')

function syncSourceNote() {
  const src = $('#sgSource').value
  $('#sgModelWrap').hidden = src !== 'model'
  $('#sgSourceNote').textContent = src === 'model'
    ? 'The model sees the spec, how to call the target, the reference implementation and the existing test — the same inputs as the paper. First load downloads the model (≈1–2 GB, cached afterwards).'
    : BASELINES.find(b => b.id === src).note
}
$('#sgSource').onchange = syncSourceNote
syncSourceNote()

function authorLabel() {
  const src = $('#sgSource').value
  if (src !== 'model') return BASELINES.find(b => b.id === src).label.replace(/^Baseline: /, '')
  return WEBLLM_MODELS.find(m => m.id === $('#sgModel').value)?.name.split('(')[0].trim() ?? $('#sgModel').value
}

function progress(frac, text) {
  const p = $('#sgProg')
  p.hidden = false
  $('div', p).style.width = `${Math.round(frac * 100)}%`
  $('span', p).textContent = text
}

async function ensureModel() {
  const id = $('#sgModel').value
  const st = getModelStatus()
  if (st.status === 'ready' && st.modelId === id) return
  hooks.onModelStatus('loading', 'Loading…')
  try {
    await loadModel(id, evt => {
      if (evt.type === 'downloading') progress((evt.progress ?? 0) / 100, `Downloading model… ${evt.progress ?? 0}%`)
      else if (evt.type === 'phase' && evt.phase === 'compile') progress(0.95, evt.note ?? 'Compiling WebGPU shaders…')
    })
    hooks.onModelStatus('ready', id.split('-').slice(0, 3).join(' '))
  } catch (err) {
    hooks.onModelStatus('error', 'Error')
    throw err
  }
}

// ───────────── running
async function harnessFor(task, source, refSrc) {
  if (source !== 'model') return { code: baselineHarness(source, task, refSrc) }
  return writeHarness(task, refSrc)
}

async function evaluate(task, code) {
  return evaluateTask(task, code, (h, impl) => runInSandbox(h, impl))
}

$('#sgRun').onclick = async () => {
  if (state.running) return
  const source = $('#sgSource').value
  const ref = $('#sgRef').value
  const tasks = TASKS.filter(t => !$('#sgType').value || t.type === $('#sgType').value)
  state.running = true
  state.stop = false
  state.author = authorLabel()
  state.ref = ref
  state.rows.clear()
  $('#sgRun').disabled = true
  $('#sgStop').hidden = false
  $('#sgResults').hidden = false
  renderAll()
  try {
    if (source === 'model') await ensureModel()
    for (const [i, task] of tasks.entries()) {
      if (state.stop) break
      progress(i / tasks.length, `${source === 'model' ? 'Writing & running' : 'Running'} harness ${i + 1}/${tasks.length}: ${task.title}`)
      const refSrc = task[ref]
      let row
      try {
        const h = await harnessFor(task, source, refSrc)
        row = { task, refSrc, code: h.code, raw: h.raw, latencyMs: h.latencyMs, ...(await evaluate(task, h.code)) }
      } catch (err) {
        row = { task, refSrc, code: '', error: err.message, detected: false, falseAlarm: false, faithful: false, broken: true, results: [] }
      }
      state.rows.set(task.id, row)
      renderAll()
    }
    progress(1, state.stop ? 'Stopped.' : `Done — ${state.rows.size} task(s).`)
    if (state.rows.size) saveToBoard()
  } catch (err) {
    progress(0, err.message)
  } finally {
    state.running = false
    $('#sgRun').disabled = false
    $('#sgStop').hidden = true
  }
}
$('#sgStop').onclick = () => { state.stop = true }

// ───────────── rendering
function pctCell(v, good) {
  const cls = good == null ? '' : good ? 'ok' : 'bad'
  return `<span class="${cls}">${v}%</span>`
}

function renderAll() {
  const rows = [...state.rows.values()]
  const a = aggregate(rows)
  $('#sgMetrics').innerHTML = `
    <div class="sg-big"><div class="num">${rows.length ? a.faithful : '–'}<span class="of">%</span></div><div class="lbl">faithful harnesses</div></div>
    <div class="sg-small">
      <div><b>${rows.length ? a.detection : '–'}%</b><span>detection — buggy implementation rejected</span></div>
      <div><b>${rows.length ? a.falseAlarm : '–'}%</b><span>false alarm — a correct implementation rejected</span></div>
      <div><b>${a.broken}</b><span>harnesses that did not run</span></div>
      <div><b>${rows.length}/${TASKS.filter(t => !$('#sgType').value || t.type === $('#sgType').value).length}</b><span>tasks · ${esc(state.author)} · ${state.ref === 'gold' ? 'normal' : 'mirror trap'}</span></div>
    </div>
    <p class="hint sg-paper">Paper, 291 Python tasks: frontier coding agents reach 45–63% faithful; shown a buggy reference, they drop 19–31 points.</p>`

  $('#sgTypes').innerHTML = TYPES.map(t => {
    const rs = rows.filter(r => r.task.type === t.id)
    if (!rs.length) return ''
    const f = rs.filter(r => r.faithful).length
    return `<div class="sg-type" title="${esc(t.blurb)}"><span>${esc(t.label)}</span><div class="bar"><div style="width:${(f / rs.length) * 100}%"></div></div><b>${f}/${rs.length}</b></div>`
  }).join('')

  $('#sgTasks').innerHTML = rows.map(renderTask).join('')
  $$('[data-rerun]').forEach(b => b.onclick = () => rerun(b.dataset.rerun))
}

function verdictChip(im, r) {
  if (!r) return ''
  const okExpected = im.shouldAccept ? r.verdict === 'accept' : r.verdict !== 'accept'
  const word = r.verdict === 'accept' ? 'accepted' : r.verdict === 'broken' ? 'broken' : 'rejected'
  return `<span class="chip ${okExpected ? 'ok' : 'bad'}" title="${esc(im.label)}">${esc(im.role === 'violating' ? 'bug' : im.role === 'gold' ? 'gold' : 'alt')} ${word}</span>`
}

function renderTask(row) {
  const { task } = row
  const impls = implsOf(task)
  const status = row.faithful ? '<span class="pill ok">faithful</span>'
    : row.broken ? '<span class="pill bad">broken</span>'
    : !row.detected ? '<span class="pill bad">missed bug</span>'
    : '<span class="pill bad">false alarm</span>'
  return `
  <details class="sg-task panel">
    <summary>
      <span class="type">${esc(typeLabel(task.type))}</span>
      <b>${esc(task.title)}</b>
      <span class="chips">${impls.map((im, i) => verdictChip(im, row.results?.[i])).join('')}</span>
      ${status}
    </summary>
    <div class="sg-body">
      <p><b>Spec.</b> ${esc(task.spec)}</p>
      <p class="hint"><b>Target.</b> ${esc(task.context)}</p>
      ${row.error ? `<p class="warn">${esc(row.error)}</p>` : ''}
      <div class="sg-cols">
        <div>
          <h4>Harness ${row.latencyMs ? `<span class="muted">· written in ${(row.latencyMs / 1000).toFixed(1)}s</span>` : ''}</h4>
          <textarea id="sgh-${task.id}" spellcheck="false">${esc(row.code)}</textarea>
          <button class="btn btn-ghost" data-rerun="${task.id}">Re-run with my edits</button>
        </div>
        <div>
          <h4>Verdicts</h4>
          <ul class="sg-impls">
            ${impls.map((im, i) => {
              const r = row.results?.[i]
              if (!r) return ''
              const fail = r.error || r.failures?.[0]?.error
              return `<li>${verdictChip(im, r)} <b>${esc(im.label)}</b> — should be ${im.shouldAccept ? 'accepted' : 'rejected'}
                ${fail ? `<div class="fail">${r.failures?.[0] ? `case ${esc(r.failures[0].case)}: ` : ''}${esc(fail)}</div>` : ''}
                <details class="src"><summary>implementation</summary><pre>${esc(im.src)}</pre></details></li>`
            }).join('')}
          </ul>
          <details class="src"><summary>reference shown to the author (${state.ref === 'gold' ? 'correct' : 'buggy'})</summary><pre>${esc(row.refSrc)}</pre></details>
          <details class="src"><summary>existing test</summary><pre>${esc(task.example)}</pre></details>
        </div>
      </div>
    </div>
  </details>`
}

async function rerun(id) {
  const row = state.rows.get(id)
  const code = $(`#sgh-${id}`).value
  const ev = await evaluate(row.task, code)
  state.rows.set(id, { ...row, code, error: '', ...ev })
  const open = $$('.sg-task').filter(d => d.open).map(d => d.querySelector('[data-rerun]')?.dataset.rerun)
  renderAll()
  $$('.sg-task').forEach(d => { if (open.includes(d.querySelector('[data-rerun]')?.dataset.rerun)) d.open = true })
}

// ───────────── leaderboard (this browser only)
function loadBoard() { try { return JSON.parse(localStorage.getItem(BOARD_KEY)) || [] } catch (_) { return [] } }
function saveBoard(b) { try { localStorage.setItem(BOARD_KEY, JSON.stringify(b)) } catch (_) {} }

function saveToBoard() {
  const a = aggregate([...state.rows.values()])
  const entry = { author: state.author, ref: state.ref, n: a.n, faithful: a.faithful, detection: a.detection, falseAlarm: a.falseAlarm, when: new Date().toISOString().slice(0, 10) }
  const board = loadBoard().filter(e => !(e.author === entry.author && e.ref === entry.ref && e.n === entry.n))
  board.push(entry)
  saveBoard(board)
  renderBoard(entry)
}

function renderBoard(latest) {
  const board = loadBoard().sort((x, y) => y.faithful - x.faithful)
  $('#sgBoard').innerHTML = `<thead><tr><th>Harness author</th><th>Reference</th><th>Tasks</th><th>Faithful</th><th>Detection</th><th>False alarm</th></tr></thead><tbody>` +
    (board.length ? board.map(e => `<tr><td>${esc(e.author)}</td><td>${e.ref === 'gold' ? 'normal' : 'mirror trap'}</td><td>${e.n}</td><td><b>${e.faithful}%</b></td><td>${e.detection}%</td><td>${e.falseAlarm}%</td></tr>`).join('')
      : '<tr><td colspan="6" class="muted">Run the benchmark to add a row.</td></tr>') +
    `</tbody>` +
    `<tbody class="paper"><tr><th colspan="6">From the paper — 291 Python tasks, agents with tools, gold reference (not directly comparable)</th></tr>` +
    PAPER.results.map(r => `<tr><td>${esc(r.agent)}</td><td>normal</td><td>291</td><td><b>${r.faithful}%</b></td><td>${r.detection}%</td><td>${r.falseAlarm}%</td></tr>`).join('') + '</tbody>'
  const e = latest ?? board[0]
  $('#sgShare').textContent = e
    ? `${e.author} wrote faithful validation harnesses for ${e.faithful}% of SpecGuard tasks (${e.n} tasks, ${e.ref === 'gold' ? 'correct' : 'buggy'} reference shown): caught the bug ${e.detection}% of the time, rejected correct code ${e.falseAlarm}% of the time. Frontier coding agents top out at 63% in SpecGuardBench (arXiv:2610.16870). Try your model in the browser: ${APP_URL}`
    : ''
}

$('#sgClear').onclick = () => { saveBoard([]); renderBoard() }
$('#sgCopy').onclick = () => {
  const t = $('#sgShare').textContent
  if (!t) return
  navigator.clipboard.writeText(t).then(() => { $('#sgCopy').textContent = 'Copied' ; setTimeout(() => ($('#sgCopy').textContent = 'Copy share text'), 1500) })
}

$('#sgMirrorTable').innerHTML = `<thead><tr><th>Agent (paper, Lite set)</th><th>Correct reference shown</th><th>Buggy reference shown</th></tr></thead><tbody>` +
  PAPER.mirror.map(m => `<tr><td>${esc(m.agent)}</td><td>${m.gold}% faithful</td><td><b>${m.violating}%</b> faithful</td></tr>`).join('') + '</tbody>'

renderBoard()
