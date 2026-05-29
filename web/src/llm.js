export const WEBLLM_MODELS = [
  { id: 'Llama-3.2-1B-Instruct-q4f32_1-MLC',  name: 'Llama 3.2 1B  (~0.9 GB) — fastest' },
  { id: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC',  name: 'Qwen 2.5 1.5B (~1.1 GB) — fast' },
  { id: 'gemma-2-2b-it-q4f16_1-MLC',           name: 'Gemma 2 2B   (~1.5 GB) — balanced' },
  { id: 'Llama-3.2-3B-Instruct-q4f16_1-MLC',  name: 'Llama 3.2 3B  (~2.0 GB) — good' },
  { id: 'Phi-3.5-mini-instruct-q4f16_1-MLC',  name: 'Phi-3.5 Mini  (~2.2 GB) — best quality' },
]

let _worker      = null
let _status      = 'idle'
let _modelId     = null
let _genCounter  = 0

let _loadResolve = null
let _loadReject  = null
let _genResolve  = null
let _genReject   = null
let _onProgress  = null

function _ensureWorker() {
  if (_worker) return
  _worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' })
  _worker.onmessage = _handleWorkerMessage
  _worker.onerror   = (e) => {
    _status = 'error'
    const msg = e.message ?? 'Worker crashed'
    if (_loadReject) { _loadReject(new Error(msg)); _loadResolve = _loadReject = null }
    if (_genReject)  { _genReject(new Error(msg));  _genResolve  = _genReject  = null }
  }
}

function _handleWorkerMessage(e) {
  const msg = e.data
  switch (msg.status) {
    case 'device_detected':
      _onProgress?.({ type: 'device', device: msg.device })
      break
    case 'phase':
      _onProgress?.({ type: 'phase', phase: msg.phase, note: msg.note })
      break
    case 'downloading':
      _onProgress?.({ type: 'downloading', file: msg.file, progress: msg.progress })
      break
    case 'ready':
      _status  = 'ready'
      _modelId = msg.modelId
      _onProgress?.({ type: 'ready', modelId: msg.modelId })
      if (_loadResolve) { _loadResolve(msg.modelId); _loadResolve = _loadReject = null }
      break
    case 'success':
      if (_genResolve) {
        _genResolve({ text: msg.generatedText, latencyMs: Math.round(msg.elapsedMs) })
        _genResolve = _genReject = null
      }
      break
    case 'error': {
      const err = new Error(msg.error)
      _onProgress?.({ type: 'error', error: msg.error })
      if (_loadReject) { _status = 'error'; _loadReject(err);  _loadResolve = _loadReject = null }
      if (_genReject)  { _genReject(err);   _genResolve  = _genReject  = null }
      break
    }
    case 'cancelled':
    case 'disposed':
      _status  = 'idle'
      _modelId = null
      break
  }
}

export function getModelStatus() {
  return { status: _status, modelId: _modelId }
}

export function loadModel(modelId, onProgress) {
  _ensureWorker()
  _status     = 'loading'
  _onProgress = onProgress ?? null
  _genCounter++
  return new Promise((resolve, reject) => {
    _loadResolve = resolve
    _loadReject  = reject
    _worker.postMessage({ action: 'load', modelId, gen: _genCounter })
  })
}

export async function generate(systemPrompt, userContent) {
  if (_status !== 'ready' || !_worker) {
    throw new Error('No model loaded.')
  }
  _genCounter++
  return new Promise((resolve, reject) => {
    _genResolve = resolve
    _genReject  = reject
    _worker.postMessage({
      action: 'generate',
      systemPrompt,
      messages: [{ role: 'user', content: userContent }],
      gen: _genCounter,
    })
  })
}

export function cancelLoad() {
  _worker?.postMessage({ action: 'cancel' })
}
