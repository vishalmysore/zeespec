// SpecGuard-lite task set: a browser-sized, JavaScript re-creation of the
// SpecGuardBench setup (arXiv:2610.16870).
//
// Each task gives the harness author one atomic natural-language spec, a
// reference implementation and the existing (visible) test. Hidden from the
// author are:
//   gold       — satisfies the spec
//   violating  — breaks the spec in a way the existing test never exercises
//   alts       — other implementations that satisfy the spec but behave
//                differently wherever the spec is silent
// A harness is FAITHFUL when it rejects `violating` and accepts `gold` and every alt.
//
// `cases` + `check` form the hand-written oracle harness (faithful by construction,
// verified by scripts/specguard-selftest.mjs). `invoke` turns one case into an
// observable trace; the "mirror" baseline compares traces with the reference.
//
// All implementation sources define `const target = …`.

export const TYPES = [
  { id: 'functional-postcondition', label: 'Functional postcondition', blurb: 'The return value satisfies a predicate over the inputs.' },
  { id: 'input-validation',         label: 'Input validation',         blurb: 'For qualifying inputs the call raises or returns a specified outcome.' },
  { id: 'state-postcondition',      label: 'State postcondition',      blurb: 'State after the call stands in a required relation to state before it.' },
  { id: 'frame-condition',          label: 'Frame condition',          blurb: 'The call leaves specified state unchanged.' },
  { id: 'interaction-protocol',     label: 'Interaction protocol',     blurb: 'Collaborators are called with specified arguments and counts.' },
  { id: 'call-order',               label: 'Call order',               blurb: 'Events in one execution happen in a specified sequence.' },
  { id: 'interface-signature',      label: 'Interface signature',      blurb: 'The declared interface has specified names, arity or members.' },
  { id: 'relational-property',      label: 'Relational property',      blurb: 'Two or more executions stand in a specified relation.' },
]

export const TASKS = [
  // ───────────────────────── functional postcondition
  {
    id: 'slugify', type: 'functional-postcondition', name: 'slugify', title: 'URL slug characters',
    context: 'slugify(title: string) → string',
    spec: 'slugify(title) MUST return a string that contains only lowercase letters a–z, digits 0–9 and single hyphens, with no leading or trailing hyphen.',
    example: `assertEqual(slugify('Hello World'), 'hello-world')`,
    gold: `const target = function slugify(title) {
  return String(title).toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}`,
    violating: `const target = function slugify(title) {
  return String(title).toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+/, '')
}`,
    alts: [`const target = function slugify(title) {
  // transliterates accents instead of dropping them
  const plain = String(title).normalize('NFD').replace(/[\\u0300-\\u036f]/g, '')
  return plain.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean).join('-')
}`],
    cases: [{ args: ['Hello World'] }, { args: ['Hello!'] }, { args: ['  --Spaces & Symbols--  '] }, { args: ['Café au lait'] }, { args: ['ABC 123'] }, { args: ['a---b'] }, { args: ['!!!'] }],
    check: `const s = target(...c.args)
assert(typeof s === 'string', 'result must be a string')
assert(/^([a-z0-9]+(-[a-z0-9]+)*)?$/.test(s), 'bad slug: ' + JSON.stringify(s))`,
    invoke: `return target(...c.args)`,
  },
  {
    id: 'topk', type: 'functional-postcondition', name: 'topK', title: 'Top-k keeps duplicates',
    context: 'topK(nums: number[], k: number) → number[]',
    spec: 'topK(nums, k) MUST return the k largest values of nums in descending order, keeping duplicate values. If k is larger than nums.length it MUST return all values in descending order. (Behaviour for negative k is not specified.)',
    example: `assertEqual(topK([3, 1, 2], 2), [3, 2])`,
    gold: `const target = function topK(nums, k) {
  return [...nums].sort((a, b) => b - a).slice(0, Math.max(0, k))
}`,
    violating: `const target = function topK(nums, k) {
  return [...new Set(nums)].sort((a, b) => b - a).slice(0, k)
}`,
    alts: [`const target = function topK(nums, k) {
  if (k < 0) throw new RangeError('k must be >= 0')
  const pool = [...nums], out = []
  while (out.length < k && pool.length) {
    let best = 0
    for (let i = 1; i < pool.length; i++) if (pool[i] > pool[best]) best = i
    out.push(pool.splice(best, 1)[0])
  }
  return out
}`],
    cases: [{ args: [[5, 1, 5, 3], 2] }, { args: [[5, 1, 5, 3], 3] }, { args: [[2, 9], 5] }, { args: [[4, 4, 4], 2] }, { args: [[-1, -5, 0], 1] }, { args: [[1, 2, 3], -1] }, { args: [[], 2] }],
    check: `const [nums, k] = c.args
if (!Number.isInteger(k) || k < 0) return  // not specified
assertEqual(target(nums, k), [...nums].sort((a, b) => b - a).slice(0, k))`,
    invoke: `return target(...c.args)`,
  },

  // ───────────────────────── input validation
  {
    id: 'parse-port', type: 'input-validation', name: 'parsePort', title: 'Reject bad port numbers',
    context: 'parsePort(text: string) → number',
    spec: 'parsePort(text) MUST throw a RangeError when text is not the decimal representation of an integer between 1 and 65535 inclusive.',
    example: `assertEqual(parsePort('8080'), 8080)
assertThrows(() => parsePort('70000'), RangeError)`,
    gold: `const target = function parsePort(text) {
  if (!/^\\d+$/.test(String(text))) throw new RangeError('port must be an integer')
  const n = Number(text)
  if (n < 1 || n > 65535) throw new RangeError('port out of range')
  return n
}`,
    violating: `const target = function parsePort(text) {
  const n = parseInt(text, 10)
  if (Number.isNaN(n) || n < 1 || n > 65535) throw new RangeError('invalid port')
  return n
}`,
    alts: [`const target = function parsePort(text) {
  const s = String(text)
  const n = /^[0-9]+$/.test(s) ? Number(s) : NaN
  if (!(n >= 1 && n <= 65535)) throw new RangeError(\`Invalid port "\${s}" (expected 1-65535)\`)
  return n
}`],
    cases: ['8080', '1', '65535', '0', '65536', '8080abc', '80.5', '', 'abc', '-1', '0080'].map(t => ({ args: [t] })),
    check: `const t = c.args[0]
const valid = /^\\d+$/.test(t) && Number(t) >= 1 && Number(t) <= 65535
if (!valid) assertThrows(() => target(t), RangeError)`,
    invoke: `return target(...c.args)`,
  },
  {
    id: 'signup-email', type: 'input-validation', name: 'validateSignup', title: 'Invalid e-mail outcome',
    context: 'validateSignup(form: { email: string, age: number }) → { ok: boolean, error?: string, … }',
    spec: "validateSignup(form) MUST return an object with ok === false and error === 'invalid_email' whenever form.email does not contain exactly one '@' with at least one character on each side of it.",
    example: `const r = validateSignup({ email: 'nope', age: 30 })
assert(r.ok === false && r.error === 'invalid_email')`,
    gold: `const target = function validateSignup(form) {
  const parts = String(form.email ?? '').split('@')
  if (parts.length !== 2 || !parts[0] || !parts[1]) return { ok: false, error: 'invalid_email' }
  if (!(form.age >= 13)) return { ok: false, error: 'too_young' }
  return { ok: true }
}`,
    violating: `const target = function validateSignup(form) {
  if (!String(form.email ?? '').includes('@')) return { ok: false, error: 'invalid_email' }
  if (!(form.age >= 13)) return { ok: false, error: 'too_young' }
  return { ok: true }
}`,
    alts: [`const target = function validateSignup(form) {
  const email = String(form.email ?? '')
  const at = email.indexOf('@')
  if (at < 1 || at !== email.lastIndexOf('@') || at === email.length - 1)
    return { ok: false, error: 'invalid_email', field: 'email', message: 'Enter a valid e-mail address' }
  if (!(form.age >= 13)) return { ok: false, error: 'too_young', field: 'age' }
  return { ok: true, email: email.toLowerCase() }
}`],
    cases: [['a@b.com', 30], ['nope', 30], ['a@b@c', 30], ['@b.com', 30], ['a@', 30], ['', 30], ['x@y', 5], ['bad', 5]]
      .map(([email, age]) => ({ args: [{ email, age }] })),
    check: `const { email } = c.args[0]
const parts = email.split('@')
const invalid = parts.length !== 2 || !parts[0] || !parts[1]
if (!invalid) return
const r = target(c.args[0])
assert(r && r.ok === false && r.error === 'invalid_email', 'expected invalid_email for ' + JSON.stringify(email))`,
    invoke: `return target(...c.args)`,
  },

  // ───────────────────────── state postcondition
  {
    id: 'cart-add', type: 'state-postcondition', name: 'Cart', title: 'Cart add accumulates',
    context: 'target is a class: new Cart() is an empty cart with add(sku, qty) and count(sku) (0 when absent).',
    spec: 'After cart.add(sku, qty), cart.count(sku) MUST equal the value cart.count(sku) had before the call plus qty.',
    example: `const cart = new Cart()
cart.add('apple', 2)
assertEqual(cart.count('apple'), 2)`,
    gold: `const target = class Cart {
  constructor() { this.items = new Map() }
  add(sku, qty) { this.items.set(sku, this.count(sku) + qty) }
  count(sku) { return this.items.get(sku) ?? 0 }
}`,
    violating: `const target = class Cart {
  constructor() { this.items = new Map() }
  add(sku, qty) { this.items.set(sku, qty) }
  count(sku) { return this.items.get(sku) ?? 0 }
}`,
    alts: [`const target = class Cart {
  constructor() { this.lines = {} }
  add(sku, qty) { this.lines[sku] = (this.lines[sku] || 0) + qty; return this }  // chainable
  count(sku) { return this.lines[sku] || 0 }
}`],
    cases: [[['a', 2], ['a', 3]], [['a', 1], ['b', 4], ['a', 1]], [['x', 0], ['x', 5], ['x', 5]]].map(ops => ({ args: [ops] })),
    check: `const cart = new target()
for (const [sku, qty] of c.args[0]) {
  const before = cart.count(sku)
  cart.add(sku, qty)
  assertEqual(cart.count(sku), before + qty, 'count after add(' + sku + ', ' + qty + ')')
}`,
    invoke: `const cart = new target(), trace = []
for (const [sku, qty] of c.args[0]) {
  const ret = cart.add(sku, qty)
  trace.push(ret === cart ? 'this' : ret, cart.count(sku))
}
return trace`,
  },
  {
    id: 'lru-set', type: 'state-postcondition', name: 'LRUCache', title: 'Cache set overwrites',
    context: 'target is a class: new LRUCache(capacity) with set(key, value) and get(key) (undefined when missing). The eviction policy is not specified.',
    spec: 'After cache.set(key, value), an immediately following cache.get(key) MUST return value — including when key was already in the cache.',
    example: `const cache = new LRUCache(2)
cache.set('a', 1)
assertEqual(cache.get('a'), 1)`,
    gold: `const target = class LRUCache {
  constructor(capacity) { this.capacity = capacity; this.map = new Map() }
  get(key) {
    if (!this.map.has(key)) return undefined
    const v = this.map.get(key); this.map.delete(key); this.map.set(key, v); return v
  }
  set(key, value) {
    this.map.delete(key); this.map.set(key, value)
    if (this.map.size > this.capacity) this.map.delete(this.map.keys().next().value)
  }
}`,
    violating: `const target = class LRUCache {
  constructor(capacity) { this.capacity = capacity; this.map = new Map() }
  get(key) {
    if (!this.map.has(key)) return undefined
    const v = this.map.get(key); this.map.delete(key); this.map.set(key, v); return v
  }
  set(key, value) {
    if (this.map.has(key)) { this.get(key); return }  // only refreshes recency
    this.map.set(key, value)
    if (this.map.size > this.capacity) this.map.delete(this.map.keys().next().value)
  }
}`,
    alts: [`const target = class LRUCache {
  // FIFO eviction: reads do not refresh recency
  constructor(capacity) { this.capacity = capacity; this.keys = []; this.vals = {} }
  get(key) { return Object.prototype.hasOwnProperty.call(this.vals, key) ? this.vals[key] : undefined }
  set(key, value) {
    if (!(key in this.vals)) this.keys.push(key)
    this.vals[key] = value
    while (this.keys.length > this.capacity) delete this.vals[this.keys.shift()]
  }
}`],
    cases: [
      { args: [2, [['set', 'a', 1], ['set', 'a', 2], ['get', 'a']]] },
      { args: [2, [['set', 'a', 1], ['set', 'b', 2], ['get', 'a'], ['set', 'c', 3], ['get', 'b'], ['set', 'b', 9], ['get', 'b']]] },
      { args: [1, [['set', 'x', 1], ['set', 'y', 2], ['set', 'y', 3], ['get', 'y']]] },
    ],
    check: `const [capacity, ops] = c.args
const cache = new target(capacity)
for (const [op, key, value] of ops) {
  if (op === 'get') { cache.get(key); continue }
  cache.set(key, value)
  assertEqual(cache.get(key), value, 'get(' + key + ') right after set')
}`,
    invoke: `const [capacity, ops] = c.args
const cache = new target(capacity), trace = []
for (const [op, key, value] of ops) trace.push(op === 'get' ? cache.get(key) : cache.set(key, value))
return trace`,
  },

  // ───────────────────────── frame condition
  {
    id: 'with-defaults', type: 'frame-condition', name: 'withDefaults', title: 'Options left untouched',
    context: 'withDefaults(options: object) → object with defaults filled in',
    spec: 'withDefaults(options) MUST NOT modify the options object it receives, and MUST return a different object.',
    example: `const r = withDefaults({ verbose: true })
assert(r.retries === 3 && r.verbose === true)`,
    gold: `const target = function withDefaults(options) {
  return { retries: 3, verbose: false, ...options }
}`,
    violating: `const target = function withDefaults(options) {
  options.retries = options.retries ?? 3
  options.verbose = options.verbose ?? false
  return options
}`,
    alts: [`const target = function withDefaults(options) {
  return Object.freeze({ retries: 3, verbose: false, timeoutMs: 1000, ...options })
}`],
    cases: [{ args: [{}] }, { args: [{ verbose: true }] }, { args: [{ retries: 0, extra: 'x' }] }],
    check: `const input = c.args[0]
const before = JSON.stringify(input)
const out = target(input)
assert(out !== input, 'must return a different object')
assertEqual(JSON.stringify(input), before, 'options object was modified')`,
    invoke: `const input = c.args[0]
const out = target(input)
return { out, input }`,
  },
  {
    id: 'sorted-copy', type: 'frame-condition', name: 'sortedCopy', title: 'Input array preserved',
    context: 'sortedCopy(numbers: number[]) → sorted numbers',
    spec: 'sortedCopy(numbers) MUST NOT change the array it receives — neither the order nor the values of its elements.',
    example: `assertEqual([...sortedCopy([3, 1, 2])], [1, 2, 3])`,
    gold: `const target = function sortedCopy(numbers) {
  return [...numbers].sort((a, b) => a - b)
}`,
    violating: `const target = function sortedCopy(numbers) {
  return numbers.sort((a, b) => a - b)
}`,
    alts: [`const target = function sortedCopy(numbers) {
  return Float64Array.from(numbers).sort()  // typed-array result
}`],
    cases: [{ args: [[3, 1, 2]] }, { args: [[10, -1, 10, 0]] }, { args: [[]] }, { args: [[1, 2, 3]] }],
    check: `const input = c.args[0]
const before = [...input]
target(input)
assertEqual(input, before, 'input array changed')`,
    invoke: `const input = c.args[0]
const out = target(input)
return { out, input }`,
  },

  // ───────────────────────── interaction protocol
  {
    id: 'fetch-user', type: 'interaction-protocol', name: 'fetchUser', title: 'Exactly one GET',
    context: 'fetchUser(id, http) where http is an object with get(url) that returns a user object. Build your own fake http in checkCase.',
    spec: "fetchUser(id, http) MUST call http.get exactly once, with '/users/' + id as its first argument.",
    example: `const http = { get: url => ({ id: 7, url }) }
assertEqual(fetchUser(7, http).id, 7)`,
    gold: `const target = function fetchUser(id, http) {
  return http.get('/users/' + id)
}`,
    violating: `const target = function fetchUser(id, http) {
  http.get('/health')  // warm-up call
  return http.get('/users/' + id)
}`,
    alts: [`const target = function fetchUser(id, http) {
  const user = http.get('/users/' + id, { headers: { accept: 'application/json' } })
  return { ...user }
}`],
    cases: [{ args: [7] }, { args: ['abc'] }, { args: [0] }],
    check: `const id = c.args[0], calls = []
const http = { get: (...a) => { calls.push(a); return { id } } }
target(id, http)
assertEqual(calls.length, 1, 'http.get call count')
assertEqual(calls[0][0], '/users/' + id, 'URL')`,
    invoke: `const id = c.args[0], calls = []
const http = { get: (...a) => { calls.push(a); return { id } } }
const out = target(id, http)
return { out, calls }`,
  },
  {
    id: 'cached-square', type: 'interaction-protocol', name: 'cachedSquare', title: 'No write on cache hit',
    context: 'cachedSquare(n, store) where store has get(key) and set(key, value); the key is String(n). Build your own fake store in checkCase.',
    spec: 'cachedSquare(n, store) MUST NOT call store.set when store.get(String(n)) returns a number.',
    example: `const m = new Map()
const store = { get: k => m.get(k), set: (k, v) => m.set(k, v) }
assertEqual(cachedSquare(3, store), 9)`,
    gold: `const target = function cachedSquare(n, store) {
  const hit = store.get(String(n))
  if (typeof hit === 'number') return hit
  const v = n * n
  store.set(String(n), v)
  return v
}`,
    violating: `const target = function cachedSquare(n, store) {
  const v = store.get(String(n)) ?? n * n
  store.set(String(n), v)  // refresh entry
  return v
}`,
    alts: [`const target = function cachedSquare(n, store) {
  const key = String(n)
  if (typeof store.get(key) === 'number') return store.get(key)  // reads twice
  const v = n ** 2
  if (store.get(key) === undefined) store.set(key, v)
  return v
}`],
    cases: [{ args: [3, { '3': 9 }] }, { args: [4, {}] }, { args: [5, { '5': 'stale' }] }, { args: [0, { '0': 0 }] }],
    check: `const [n, seed] = c.args, sets = []
const store = { get: k => seed[k], set: (k, v) => sets.push([k, v]) }
target(n, store)
if (typeof seed[String(n)] === 'number') assertEqual(sets.length, 0, 'store.set called on a cache hit')`,
    invoke: `const [n, seed] = c.args, log = []
const store = { get: k => { log.push(['get', k]); return seed[k] }, set: (k, v) => log.push(['set', k, v]) }
const out = target(n, store)
return { out, log }`,
  },

  // ───────────────────────── call order
  {
    id: 'save-doc', type: 'call-order', name: 'saveDoc', title: 'Validate before write',
    context: 'saveDoc(doc, db) where db has validate(doc) and write(doc). Build your own fake db in checkCase.',
    spec: 'saveDoc(doc, db) MUST call db.validate(doc) before it calls db.write(doc).',
    example: `const seen = []
const db = { validate: () => seen.push('validate'), write: () => seen.push('write') }
saveDoc({ title: 'x' }, db)
assert(seen.includes('validate') && seen.includes('write'))`,
    gold: `const target = function saveDoc(doc, db) {
  db.validate(doc)
  db.write(doc)
  return true
}`,
    violating: `const target = function saveDoc(doc, db) {
  db.write(doc)
  db.validate(doc)  // post-write audit
  return true
}`,
    alts: [`const target = function saveDoc(doc, db) {
  if (db.validate(doc, { strict: true }) === false) return false
  db.write(doc)
}`],
    cases: [{ args: [{ title: 'a' }] }, { args: [{ title: '', body: 'b' }] }],
    check: `const events = []
const db = { validate: () => { events.push('validate') }, write: () => { events.push('write') } }
target(c.args[0], db)
const w = events.indexOf('write')
if (w >= 0) assert(events.indexOf('validate') >= 0 && events.indexOf('validate') < w, 'write happened before validate: ' + events.join(','))`,
    invoke: `const events = []
const db = { validate: (...a) => { events.push(['validate', a]) }, write: (...a) => { events.push(['write', a]) } }
const out = target(c.args[0], db)
return { out, events }`,
  },
  {
    id: 'with-lock', type: 'call-order', name: 'withLock', title: 'Release after run, even on error',
    context: 'withLock(fn, lock) where lock has acquire() and release(), and fn is a function to run while holding the lock. Build your own fn and lock in checkCase. Error propagation is not specified.',
    spec: 'withLock(fn, lock) MUST call lock.release() after fn has run — also when fn throws.',
    example: `const lock = { acquire() {}, release() { this.released = true } }
assertEqual(withLock(() => 42, lock), 42)
assert(lock.released)`,
    gold: `const target = function withLock(fn, lock) {
  lock.acquire()
  try { return fn() } finally { lock.release() }
}`,
    violating: `const target = function withLock(fn, lock) {
  lock.acquire()
  const result = fn()
  lock.release()
  return result
}`,
    alts: [`const target = function withLock(fn, lock) {
  lock.acquire()
  try { return fn() }
  catch (e) { throw new Error('withLock: ' + e.message) }  // wraps errors
  finally { lock.release() }
}`],
    cases: [{ args: ['ok'] }, { args: ['throw'] }],
    check: `const events = []
const lock = { acquire: () => events.push('acquire'), release: () => events.push('release') }
const fn = () => { events.push('fn'); if (c.args[0] === 'throw') throw new Error('boom'); return 1 }
try { target(fn, lock) } catch (e) { /* propagation not specified */ }
const f = events.indexOf('fn'), r = events.lastIndexOf('release')
assert(f >= 0 && r > f, 'release must come after fn: ' + events.join(','))`,
    invoke: `const events = []
const lock = { acquire: () => events.push('acquire'), release: () => events.push('release') }
const fn = () => { events.push('fn'); if (c.args[0] === 'throw') throw new Error('boom'); return 1 }
let out
try { out = target(fn, lock) } catch (e) { out = 'threw ' + e.message }
return { out, events }`,
  },

  // ───────────────────────── interface signature
  {
    id: 'format-duration', type: 'interface-signature', name: 'formatDuration', title: 'One required parameter',
    context: 'formatDuration(ms, …) → human-readable string. The output format is not specified.',
    spec: "formatDuration MUST be a function whose name is 'formatDuration' and that declares exactly one required parameter (formatDuration.length === 1).",
    example: `assert(typeof formatDuration(1500) === 'string')`,
    gold: `const target = function formatDuration(ms, options = {}) {
  return (ms / 1000).toFixed(options.digits ?? 1) + 's'
}`,
    violating: `const target = function formatDuration(ms, unit) {
  unit = unit || 's'
  return (unit === 'ms' ? ms : (ms / 1000).toFixed(1)) + unit
}`,
    alts: [`const target = function formatDuration(ms, { compact = false } = {}) {
  const s = ms / 1000
  return compact ? s + 's' : s + ' seconds'
}`],
    cases: [{ args: [1500] }, { args: [0] }],
    check: `assertEqual(typeof target, 'function')
assertEqual(target.name, 'formatDuration', 'function name')
assertEqual(target.length, 1, 'required parameter count')`,
    invoke: `return { name: target.name, length: target.length, out: target(...c.args) }`,
  },
  {
    id: 'create-logger', type: 'interface-signature', name: 'createLogger', title: 'Logger has info/warn/error',
    context: 'createLogger(name: string) → logger object. What the methods do is not specified.',
    spec: "The object returned by createLogger(name) MUST have callable methods named info, warn and error.",
    example: `createLogger('app').info('started')`,
    gold: `const target = function createLogger(name) {
  const lines = []
  const at = level => msg => { lines.push(\`[\${level}] \${name}: \${msg}\`) }
  return { info: at('info'), warn: at('warn'), error: at('error'), lines }
}`,
    violating: `const target = function createLogger(name) {
  const lines = []
  const at = level => msg => { lines.push(\`[\${level}] \${name}: \${msg}\`) }
  return { info: at('info'), warn: at('warn'), err: at('error'), lines }
}`,
    alts: [`class Logger {
  constructor(name) { this.name = name; this.count = 0 }
  info(msg) { this.count++; return this }
  warn(msg) { this.count++; return this }
  error(msg) { this.count++; return this }
  debug(msg) { return this }
}
const target = function createLogger(name) { return new Logger(name) }`],
    cases: [{ args: ['app'] }, { args: [''] }],
    check: `const log = target(...c.args)
for (const m of ['info', 'warn', 'error']) assert(typeof log[m] === 'function', 'missing method ' + m)`,
    invoke: `const log = target(...c.args)
return { keys: Object.keys(log).sort(), info: typeof log.info === 'function' ? log.info('x') === log : null }`,
  },

  // ───────────────────────── relational property
  {
    id: 'codec-roundtrip', type: 'relational-property', name: 'codec', title: 'Encode/decode round-trip',
    context: 'target is an object codec with encode(text) → string and decode(encoded) → string. The encoded form is not specified.',
    spec: 'For every string s, codec.decode(codec.encode(s)) MUST equal s.',
    example: `assertEqual(codec.decode(codec.encode('hello world')), 'hello world')`,
    gold: `const target = {
  encode: s => encodeURIComponent(s),
  decode: e => decodeURIComponent(e),
}`,
    violating: `const target = {
  encode: s => s.replace(/ /g, '+'),
  decode: e => e.replace(/\\+/g, ' '),
}`,
    alts: [`const target = {
  encode: s => btoa(String.fromCharCode(...new TextEncoder().encode(s))),
  decode: e => new TextDecoder().decode(Uint8Array.from(atob(e), ch => ch.charCodeAt(0))),
}`],
    cases: ['hello world', 'a+b', '100%', '', 'naïve café', 'tab\tline\n', 'emoji 😀'].map(s => ({ args: [s] })),
    check: `const s = c.args[0]
assertEqual(target.decode(target.encode(s)), s, 'round-trip of ' + JSON.stringify(s))`,
    invoke: `const s = c.args[0]
return { encoded: target.encode(s), back: target.decode(target.encode(s)) }`,
  },
  {
    id: 'normalize-tags', type: 'relational-property', name: 'normalizeTags', title: 'Tag normalisation is idempotent',
    context: 'normalizeTags(tags: string[]) → string[]. Ordering of the result is not specified.',
    spec: 'normalizeTags MUST be idempotent: normalizeTags(normalizeTags(tags)) MUST deep-equal normalizeTags(tags).',
    example: `assertEqual(normalizeTags(['A', ' b']), ['#a', '#b'])`,
    gold: `const target = function normalizeTags(tags) {
  const norm = tags.map(t => t.trim().toLowerCase().replace(/^#?/, '#')).filter(t => t !== '#')
  return [...new Set(norm)].sort()
}`,
    violating: `const target = function normalizeTags(tags) {
  return tags.map(t => '#' + t.trim().toLowerCase())
}`,
    alts: [`const target = function normalizeTags(tags) {
  const out = []
  for (const raw of tags) {
    const t = '#' + raw.trim().toLowerCase().replace(/^#/, '')
    if (t !== '#' && !out.includes(t)) out.push(t)  // keeps first-seen order
  }
  return out
}`],
    cases: [['b', 'A', 'a'], ['#x', ' y '], [], ['z', '#z', ' Z ']].map(t => ({ args: [t] })),
    check: `const once = target(c.args[0])
assertEqual(target(once), once, 'not idempotent')`,
    invoke: `return target(c.args[0])`,
  },
]

export const PAPER = {
  title: 'SpecGuardBench: Can Coding Agents Construct Reliable Validation Harnesses from Natural Language Specifications?',
  arxiv: '2610.16870',
  url: 'https://arxiv.org/abs/2610.16870',
  code: 'https://github.com/coxhin/SpecGuardBench',
  // Full Set (291 Python tasks), gold reference shown. Table from the paper.
  results: [
    { agent: 'Codex / GPT-5.6-sol',          detection: 81.8, falseAlarm: 23.0, faithful: 61.9 },
    { agent: 'Claude Code / Claude Opus 5',  detection: 65.3, falseAlarm: 20.6, faithful: 50.2 },
    { agent: 'OpenCode / DeepSeek-V4-Pro',   detection: 66.7, falseAlarm: 26.8, faithful: 45.0 },
    { agent: 'OpenCode / GLM-5.3',           detection: 74.2, falseAlarm: 15.1, faithful: 62.9 },
  ],
  // Lite Set (100 tasks): faithfulness with the gold vs the violating implementation shown as reference.
  mirror: [
    { agent: 'Codex', gold: 65, violating: 46 },
    { agent: 'Claude Code', gold: 52, violating: 21 },
    { agent: 'OpenCode / DeepSeek', gold: 52, violating: 28 },
    { agent: 'OpenCode / GLM', gold: 68, violating: 39 },
  ],
}
