// Runs a harness against an implementation in a throwaway worker with a time limit.
export function runInSandbox(harnessSrc, implSrc, timeoutMs = 4000) {
  return new Promise(resolve => {
    const w = new Worker(new URL('./sandbox-worker.js', import.meta.url), { type: 'module' })
    const done = r => { clearTimeout(timer); w.terminate(); resolve(r) }
    const timer = setTimeout(() => done({ verdict: 'reject', error: `timed out after ${timeoutMs / 1000}s (infinite loop?)`, failures: [] }), timeoutMs)
    w.onmessage = e => done(e.data)
    w.onerror = e => { e.preventDefault?.(); done({ verdict: 'broken', error: e.message || 'sandbox worker error' }) }
    w.postMessage({ harnessSrc, implSrc })
  })
}
