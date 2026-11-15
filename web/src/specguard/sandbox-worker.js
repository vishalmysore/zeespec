// One-shot sandbox: runs a (possibly model-written) harness against one implementation.
// A fresh worker per run gives every implementation clean global state, and the
// parent can terminate it on an infinite loop.
import { runHarness } from './harness-core.js'

const post = self.postMessage.bind(self)
// Harness code is untrusted: no network, no storage, no way to post a fake verdict.
for (const k of ['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'importScripts', 'indexedDB', 'caches', 'BroadcastChannel', 'postMessage', 'close']) {
  try { Object.defineProperty(self, k, { value: undefined, configurable: false, writable: false }) } catch (_) {}
}

self.onmessage = (e) => {
  const { harnessSrc, implSrc } = e.data
  let r
  try { r = runHarness(harnessSrc, implSrc) } catch (err) { r = { verdict: 'broken', error: String(err?.message ?? err) } }
  post(r)
}
