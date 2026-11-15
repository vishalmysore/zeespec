import { DIMENSIONS } from './dimensions.js'
import { WEBLLM_MODELS, loadModel, getModelStatus, cancelLoad, generate } from './llm.js'
import { initEpic, refreshBuilderPane, scoreBuilderSpec } from './epic/ui.js'
import { initSpecGuard } from './specguard/ui.js'

// ── State ──────────────────────────────────────────────────────
const state = {
  aiEnabled:    false,
  currentDim:   0,
  answers:      {},   // { [dimId]: { [qIdx]: string } }
  synthesized:  {},   // { [dimId]: string }
  builtSpec:    '',   // last generated AGENTS.md, scored by the EPIC tab
}

// Initialize answers map
DIMENSIONS.forEach(d => {
  state.answers[d.id]    = {}
  state.synthesized[d.id] = ''
})

// ── DOM refs ───────────────────────────────────────────────────
const setupScreen   = document.getElementById('setupScreen')
const wizardScreen  = document.getElementById('wizardScreen')
const outputScreen  = document.getElementById('outputScreen')
const epicScreen    = document.getElementById('epicScreen')
const navBuilder    = document.getElementById('navBuilder')
const navEpic       = document.getElementById('navEpic')
const specguardScreen = document.getElementById('specguardScreen')
const navSpecGuard  = document.getElementById('navSpecGuard')
const TAB_SCREENS   = { '#epic': epicScreen, '#specguard': specguardScreen }
const isTabScreen   = el => Object.values(TAB_SCREENS).includes(el)
let builderScreen   = setupScreen   // screen to return to from the EPIC / SpecGuard tabs

const modelSelect   = document.getElementById('modelSelect')
const loadModelBtn  = document.getElementById('loadModelBtn')
const skipAiBtn     = document.getElementById('skipAiBtn')
const loadProgress  = document.getElementById('loadProgress')
const progressBar   = document.getElementById('progressBar')
const progressText  = document.getElementById('progressText')
const loadError     = document.getElementById('loadError')

const modelDot      = document.getElementById('modelDot')
const modelLabel    = document.getElementById('modelLabel')

const sidebarDims   = document.getElementById('sidebarDims')
const dimHeader     = document.getElementById('dimHeader')
const questionsList = document.getElementById('questionsList')
const synthesizeBtn = document.getElementById('synthesizeBtn')
const synthBtnLabel = document.getElementById('synthBtnLabel')
const synthStatus   = document.getElementById('synthStatus')
const synthPreview  = document.getElementById('synthPreview')
const synthPreviewContent = document.getElementById('synthPreviewContent')
const editSynthBtn  = document.getElementById('editSynthBtn')
const prevDimBtn    = document.getElementById('prevDimBtn')
const nextDimBtn    = document.getElementById('nextDimBtn')
const overallProgressLabel = document.getElementById('overallProgressLabel')
const overallProgressBar   = document.getElementById('overallProgressBar')

const copySpecBtn     = document.getElementById('copySpecBtn')
const downloadSpecBtn = document.getElementById('downloadSpecBtn')
const startOverBtn    = document.getElementById('startOverBtn')
const epicScoreBtn    = document.getElementById('epicScoreBtn')
const specOutput      = document.getElementById('specOutput')
const outputStats     = document.getElementById('outputStats')

// ── Setup screen ───────────────────────────────────────────────
WEBLLM_MODELS.forEach(m => {
  const opt = document.createElement('option')
  opt.value = m.id
  opt.textContent = m.name
  modelSelect.appendChild(opt)
})

loadModelBtn.addEventListener('click', async () => {
  const modelId = modelSelect.value
  loadModelBtn.disabled = true
  skipAiBtn.disabled    = true
  loadError.classList.add('hidden')
  loadProgress.classList.remove('hidden')
  setModelStatus('loading', 'Loading…')

  try {
    await loadModel(modelId, (evt) => {
      if (evt.type === 'device') {
        progressText.textContent = 'WebGPU detected. Starting download…'
      } else if (evt.type === 'downloading') {
        const pct = evt.progress ?? 0
        progressBar.style.width = `${pct}%`
        progressText.textContent = `Downloading… ${pct}%`
      } else if (evt.type === 'phase' && evt.phase === 'compile') {
        progressBar.style.width = '95%'
        progressText.textContent = evt.note ?? 'Compiling WebGPU shaders…'
      } else if (evt.type === 'ready') {
        progressBar.style.width = '100%'
        progressText.textContent = 'Model ready!'
      } else if (evt.type === 'error') {
        throw new Error(evt.error)
      }
    })
    state.aiEnabled = true
    setModelStatus('ready', modelId.split('-').slice(0, 3).join(' '))
    startWizard()
  } catch (err) {
    loadError.textContent = err.message
    loadError.classList.remove('hidden')
    loadModelBtn.disabled = false
    skipAiBtn.disabled    = false
    setModelStatus('error', 'Error')
  }
})

skipAiBtn.addEventListener('click', () => {
  state.aiEnabled = false
  startWizard()
})

function setModelStatus(status, label) {
  modelDot.className = `model-dot ${status}`
  modelLabel.textContent = label
}

// ── Wizard ─────────────────────────────────────────────────────
function startWizard() {
  showScreen(wizardScreen)
  buildSidebar()
  renderDimension(0)
}

function showScreen(el) {
  for (const s of [setupScreen, wizardScreen, outputScreen, epicScreen, specguardScreen]) s.classList.remove('active')
  el.classList.add('active')
  if (!isTabScreen(el)) {
    builderScreen = el
    if (TAB_SCREENS[location.hash]) history.pushState(null, '', location.pathname + location.search)
  }
  navBuilder.classList.toggle('active', !isTabScreen(el))
  navEpic.classList.toggle('active', el === epicScreen)
  navSpecGuard.classList.toggle('active', el === specguardScreen)
}

// ── Routing: #epic → EPIC Score, #specguard → SpecGuard, anything else → the builder ──
function route() {
  if (location.hash === '#epic') refreshBuilderPane()
  showScreen(TAB_SCREENS[location.hash] ?? builderScreen)
}
window.addEventListener('hashchange', route)

function buildSidebar() {
  sidebarDims.innerHTML = ''
  DIMENSIONS.forEach((d, i) => {
    const el = document.createElement('div')
    el.className = 'sidebar-dim'
    el.style.setProperty('--dim-color', d.color)
    el.dataset.idx = i
    el.innerHTML = `
      <div class="dim-num">${i + 1}</div>
      <div class="dim-info">
        <span class="dim-info-label">${d.emoji} ${d.label}</span>
        <span class="dim-info-sub">${d.subtitle}</span>
      </div>
      <div class="dim-synth-badge"></div>
    `
    el.addEventListener('click', () => {
      saveCurrentAnswers()
      renderDimension(i)
    })
    sidebarDims.appendChild(el)
  })
}

function renderDimension(idx) {
  state.currentDim = idx
  const dim = DIMENSIONS[idx]

  // Sidebar active state
  document.querySelectorAll('.sidebar-dim').forEach((el, i) => {
    el.classList.toggle('active', i === idx)
    el.classList.toggle('done', isDimAnswered(DIMENSIONS[i].id))
    el.classList.toggle('synthesized', !!state.synthesized[DIMENSIONS[i].id])
  })

  // Header
  const answeredCount = Object.values(state.answers[dim.id]).filter(v => v.trim()).length
  dimHeader.innerHTML = `
    <div class="dim-header-top">
      <span class="dim-badge" style="--c:${dim.color}">${dim.emoji} ${dim.label}</span>
    </div>
    <div class="dim-title">${dim.subtitle}</div>
    <div class="dim-desc">${dim.desc}</div>
    <div class="dim-counter">${answeredCount} / ${dim.questions.length} answered</div>
  `

  // Questions
  questionsList.innerHTML = ''
  dim.questions.forEach((q, qi) => {
    const saved = state.answers[dim.id][qi] ?? ''
    const item = document.createElement('div')
    item.className = 'question-item'
    item.innerHTML = `
      <label class="question-label">
        <span class="q-num">Q${qi + 1}</span>
        ${q}
      </label>
      <textarea
        class="question-input${saved ? ' filled' : ''}"
        data-qi="${qi}"
        placeholder="Your answer…"
        rows="3"
      >${saved}</textarea>
    `
    questionsList.appendChild(item)
  })

  // Live answer tracking
  questionsList.querySelectorAll('.question-input').forEach(ta => {
    ta.addEventListener('input', () => {
      const qi = parseInt(ta.dataset.qi)
      state.answers[dim.id][qi] = ta.value
      ta.classList.toggle('filled', !!ta.value.trim())
      updateDimCounter()
      updateOverallProgress()
    })
  })

  // Synthesize button
  if (state.aiEnabled) {
    synthesizeBtn.classList.remove('hidden')
    synthBtnLabel.textContent = state.synthesized[dim.id] ? 'Re-synthesize with AI' : 'Synthesize with AI'
  } else {
    synthesizeBtn.classList.add('hidden')
  }
  synthStatus.classList.add('hidden')
  synthStatus.className = 'synth-status hidden'

  // Show existing synthesis if present
  if (state.synthesized[dim.id]) {
    showSynthPreview(state.synthesized[dim.id])
  } else {
    synthPreview.classList.add('hidden')
  }

  // Nav buttons
  prevDimBtn.disabled = idx === 0
  nextDimBtn.textContent = idx === DIMENSIONS.length - 1 ? 'Generate Spec →' : 'Next →'

  updateOverallProgress()
}

function updateDimCounter() {
  const dim = DIMENSIONS[state.currentDim]
  const count = Object.values(state.answers[dim.id]).filter(v => v.trim()).length
  const counter = dimHeader.querySelector('.dim-counter')
  if (counter) counter.textContent = `${count} / ${dim.questions.length} answered`
}

function saveCurrentAnswers() {
  const dim = DIMENSIONS[state.currentDim]
  document.querySelectorAll('.question-input').forEach(ta => {
    state.answers[dim.id][parseInt(ta.dataset.qi)] = ta.value
  })
}

function isDimAnswered(dimId) {
  return Object.values(state.answers[dimId]).some(v => v.trim())
}

function updateOverallProgress() {
  let total = 0, answered = 0
  DIMENSIONS.forEach(d => {
    total += d.questions.length
    answered += Object.values(state.answers[d.id]).filter(v => v.trim()).length
  })
  overallProgressLabel.textContent = `${answered} / ${total} answered`
  overallProgressBar.style.width = `${Math.round((answered / total) * 100)}%`
}

// ── Synthesize ─────────────────────────────────────────────────
synthesizeBtn.addEventListener('click', async () => {
  saveCurrentAnswers()
  const dim = DIMENSIONS[state.currentDim]
  const answers = dim.questions.map((q, i) => {
    const a = (state.answers[dim.id][i] ?? '').trim()
    return a ? `Q: ${q}\nA: ${a}` : null
  }).filter(Boolean)

  if (answers.length === 0) {
    synthStatus.textContent = 'Please answer at least one question first.'
    synthStatus.className = 'synth-status'
    synthStatus.classList.remove('hidden')
    return
  }

  synthesizeBtn.disabled = true
  synthStatus.textContent = 'Synthesizing…'
  synthStatus.className = 'synth-status working'
  synthStatus.classList.remove('hidden')
  synthPreview.classList.add('hidden')

  const systemPrompt = `You are a technical specification writer using the Zachman Framework.
The user has answered questions about the "${dim.label}" dimension (${dim.subtitle}) of their system.

Convert their raw answers into a polished, structured specification section in markdown.
Rules:
- Use clear headings and bullet points
- Be precise and technical — no fluff
- Preserve every constraint, rule, and boundary the user mentioned
- Do not invent or add information not present in the answers
- Keep it concise — one section, ready to include in AGENTS.md
- Start directly with the content, no preamble`

  const userContent = `Dimension: ${dim.label} — ${dim.subtitle}\n\n${answers.join('\n\n')}`

  try {
    const { text } = await generate(systemPrompt, userContent)
    state.synthesized[dim.id] = text.trim()
    synthBtnLabel.textContent = 'Re-synthesize with AI'
    showSynthPreview(text.trim())
    synthStatus.classList.add('hidden')
    // Update sidebar badge
    document.querySelectorAll('.sidebar-dim')[state.currentDim]?.classList.add('synthesized')
  } catch (err) {
    synthStatus.textContent = `Error: ${err.message}`
    synthStatus.className = 'synth-status'
    synthStatus.classList.remove('hidden')
  } finally {
    synthesizeBtn.disabled = false
  }
})

function showSynthPreview(text) {
  synthPreviewContent.textContent = text
  synthPreviewContent.contentEditable = 'false'
  synthPreviewContent.classList.remove('editing')
  editSynthBtn.textContent = 'Edit'
  synthPreview.classList.remove('hidden')
}

editSynthBtn.addEventListener('click', () => {
  const dim = DIMENSIONS[state.currentDim]
  if (synthPreviewContent.contentEditable === 'true') {
    // Save edit
    state.synthesized[dim.id] = synthPreviewContent.textContent.trim()
    synthPreviewContent.contentEditable = 'false'
    synthPreviewContent.classList.remove('editing')
    editSynthBtn.textContent = 'Edit'
  } else {
    synthPreviewContent.contentEditable = 'true'
    synthPreviewContent.classList.add('editing')
    synthPreviewContent.focus()
    editSynthBtn.textContent = 'Save'
  }
})

// ── Navigation ─────────────────────────────────────────────────
prevDimBtn.addEventListener('click', () => {
  saveCurrentAnswers()
  if (state.currentDim > 0) renderDimension(state.currentDim - 1)
})

nextDimBtn.addEventListener('click', () => {
  saveCurrentAnswers()
  if (state.currentDim < DIMENSIONS.length - 1) {
    renderDimension(state.currentDim + 1)
  } else {
    showOutput()
  }
})

// ── Output ─────────────────────────────────────────────────────
function buildSpec() {
  const lines = []
  lines.push('# SYSTEM SPECIFICATION')
  lines.push('')
  lines.push('> Generated by ZeeSpec — Zachman Framework specification builder')
  lines.push('')
  lines.push('---')
  lines.push('')

  DIMENSIONS.forEach(dim => {
    const synth = state.synthesized[dim.id]
    lines.push(`## ${dim.emoji} ${dim.label} — ${dim.subtitle}`)
    lines.push('')

    if (synth) {
      lines.push(synth)
    } else {
      // Fallback: format raw answers
      const qas = dim.questions.map((q, i) => {
        const a = (state.answers[dim.id][i] ?? '').trim()
        return a ? `**${q}**\n${a}` : null
      }).filter(Boolean)

      if (qas.length > 0) {
        lines.push(...qas.flatMap(qa => [qa, '']))
      } else {
        lines.push('_Not answered._')
      }
    }

    lines.push('')
    lines.push('---')
    lines.push('')
  })

  lines.push('# INSTRUCTIONS FOR AI AGENT')
  lines.push('')
  lines.push('1. Read all dimensions above carefully before generating anything.')
  lines.push('2. Identify any ambiguities or missing information and ask clarifying questions.')
  lines.push('3. Generate a complete technical specification including:')
  lines.push('   - Data models / database schema')
  lines.push('   - API contracts and endpoints')
  lines.push('   - Core business logic and rules')
  lines.push('   - Authentication and authorization flows')
  lines.push('4. Respect every constraint, rule, and boundary defined in the spec.')
  lines.push('5. If a rule conflicts with a common pattern, follow the rule — it is intentional.')
  lines.push('')

  return lines.join('\n')
}

function showOutput() {
  const spec = buildSpec()
  state.builtSpec = spec
  specOutput.textContent = spec

  // Stats
  const answeredTotal = DIMENSIONS.reduce((sum, d) =>
    sum + Object.values(state.answers[d.id]).filter(v => v.trim()).length, 0)
  const synthCount = Object.values(state.synthesized).filter(Boolean).length
  const wordCount = spec.split(/\s+/).filter(Boolean).length

  outputStats.innerHTML = `
    <div class="stat"><span class="stat-value">${answeredTotal}</span><span class="stat-label">Questions answered</span></div>
    <div class="stat"><span class="stat-value">${synthCount} / ${DIMENSIONS.length}</span><span class="stat-label">AI-synthesized sections</span></div>
    <div class="stat"><span class="stat-value">${wordCount.toLocaleString()}</span><span class="stat-label">Words in spec</span></div>
    <div class="stat"><span class="stat-value">${DIMENSIONS.length}</span><span class="stat-label">Dimensions covered</span></div>
  `

  showScreen(outputScreen)
}

copySpecBtn.addEventListener('click', async () => {
  const spec = specOutput.textContent
  await navigator.clipboard.writeText(spec)
  copySpecBtn.textContent = 'Copied!'
  setTimeout(() => { copySpecBtn.textContent = 'Copy to Clipboard' }, 2000)
})

downloadSpecBtn.addEventListener('click', () => {
  const spec = specOutput.textContent
  const blob = new Blob([spec], { type: 'text/markdown' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = 'AGENTS.md'
  a.click()
  URL.revokeObjectURL(url)
})

epicScoreBtn.addEventListener('click', () => {
  history.pushState(null, '', '#epic')
  route()
  scoreBuilderSpec()
})

startOverBtn.addEventListener('click', () => {
  if (!confirm('Start over? All answers will be cleared.')) return
  DIMENSIONS.forEach(d => {
    state.answers[d.id]    = {}
    state.synthesized[d.id] = ''
  })
  state.currentDim = 0
  state.builtSpec  = ''
  state.aiEnabled  = getModelStatus().status === 'ready'
  showScreen(setupScreen)
  setupScreen.classList.add('active')
})

// ── EPIC Score tab ─────────────────────────────────────────────
initEpic({
  getBuilderSpec: () => state.builtSpec,
  onModelStatus: (status, label) => {
    setModelStatus(status, label)
    if (status === 'ready') state.aiEnabled = true
  },
})
// ── SpecGuard tab ──────────────────────────────────────────────
initSpecGuard({
  onModelStatus: (status, label) => {
    setModelStatus(status, label)
    if (status === 'ready') state.aiEnabled = true
  },
})
route()
