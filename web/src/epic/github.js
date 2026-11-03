// Load spec artifacts from a public GitHub repo, straight from the browser.
// Uses the unauthenticated REST API (60 requests/hour per IP) + raw.githubusercontent.com.

const SPECISH = /(^|\/)(spec|specs|specification|requirements?|prd|plan|design|tasks?|todo|agents|claude|architecture|data-model|contracts?|research|user-stories|stories|what|who|when|where|why|how|upstream|downstream)[^/]*\.md$/i
const SPEC_DIRS = /(^|\/)(specs?|\.specify|\.kiro\/specs|\.spec|docs\/specs?|requirements|rfcs?|adr)\//i

export function parseRepo(input) {
  const s = input.trim().replace(/\.git$/, '')
  const m = /github\.com\/([^/]+)\/([^/#?]+)(?:\/tree\/([^/]+)(?:\/(.*))?)?/.exec(s) || /^([\w.-]+)\/([\w.-]+)$/.exec(s)
  if (!m) throw new Error('Enter owner/repo or a github.com URL')
  return { owner: m[1], repo: m[2], branch: m[3], path: m[4] || '' }
}

async function gh(url) {
  const r = await fetch(url, { headers: { Accept: 'application/vnd.github+json' } })
  if (r.status === 403 || r.status === 429) throw new Error('GitHub API rate limit hit (60/hour without login). Try again later or paste files instead.')
  if (r.status === 404) throw new Error('Repository not found (it must be public).')
  if (!r.ok) throw new Error(`GitHub API error ${r.status}`)
  return r.json()
}

/** List candidate spec files, grouped by folder, with a sensible default selection. */
export async function listCandidates(input) {
  const { owner, repo, branch: b, path } = parseRepo(input)
  const branch = b || (await gh(`https://api.github.com/repos/${owner}/${repo}`)).default_branch
  const tree = await gh(`https://api.github.com/repos/${owner}/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`)
  const files = tree.tree
    .filter(t => t.type === 'blob' && /\.md$/i.test(t.path) && t.path.startsWith(path))
    .filter(t => !/node_modules|CHANGELOG|LICENSE|CODE_OF_CONDUCT|CONTRIBUTING|\.github\/|templates?\//i.test(t.path))
    .filter(t => SPECISH.test(t.path) || SPEC_DIRS.test(t.path))
    .filter(t => (t.size ?? 0) < 200_000)

  const groups = {}
  for (const f of files) {
    const dir = f.path.includes('/') ? f.path.slice(0, f.path.lastIndexOf('/')) : '(root)'
    ;(groups[dir] ||= []).push({ path: f.path, size: f.size })
  }

  // Default: the most recent spec-kit / kiro feature folder, else root spec-ish files.
  // Default: the group that looks most like one complete spec set (spec + plan + tasks),
  // preferring spec-kit / Kiro feature folders and avoiding test fixtures, examples and templates.
  const rank = dir => {
    const names = groups[dir].map(f => f.path.split('/').pop().toLowerCase())
    let s = 0
    if (names.some(n => /^(spec|requirements?|prd)\b/.test(n))) s += 3
    if (names.some(n => /^(plan|design)\b/.test(n))) s += 2
    if (names.some(n => /^tasks?\b/.test(n))) s += 2
    if (/(^|\/)(specs|\.kiro\/specs)\/[^/]+$/.test(dir)) s += 2
    if (/test|fixture|example|sample|demo|template|tmp|mock/i.test(dir)) s -= 10
    return s
  }
  const dirs = Object.keys(groups).sort()
  const def = dirs.length ? dirs.reduce((best, d) => (rank(d) >= rank(best) ? d : best), dirs[0]) : null
  return { owner, repo, branch, groups, defaultGroup: def, truncated: !!tree.truncated }
}

export async function fetchFiles({ owner, repo, branch }, paths) {
  return Promise.all(paths.slice(0, 25).map(async p => {
    const r = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/${encodeURIComponent(branch)}/${p.split('/').map(encodeURIComponent).join('/')}`)
    if (!r.ok) throw new Error(`Could not fetch ${p} (${r.status})`)
    return { name: p, text: await r.text() }
  }))
}
