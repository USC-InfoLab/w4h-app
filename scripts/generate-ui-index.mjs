#!/usr/bin/env node
/**
 * Generate UI_INDEX.md — structural map of routes, views, and components.
 * Run explicitly: npm run index:ui
 * Not hooked into build; optional CI can diff for staleness later.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const SRC = path.join(ROOT, 'src')
const OUT = path.join(ROOT, 'UI_INDEX.md')
const ROUTER = path.join(SRC, 'router', 'index.js')

function walkVue(dir, base = dir) {
  if (!fs.existsSync(dir)) return []
  const out = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      out.push(...walkVue(full, base))
    } else if (entry.name.endsWith('.vue')) {
      out.push(path.relative(base, full).split(path.sep).join('/'))
    }
  }
  return out.sort((a, b) => a.localeCompare(b))
}

function listJs(dir, base = SRC) {
  if (!fs.existsSync(dir)) return []
  const out = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      out.push(...listJs(full, base))
    } else if (/\.(js|ts)$/.test(entry.name)) {
      out.push(path.relative(base, full).split(path.sep).join('/'))
    }
  }
  return out.sort((a, b) => a.localeCompare(b))
}

/** Parse route objects from router/index.js without executing Vue. */
function parseRoutes(source) {
  const routes = []
  // Match each top-level route object inside the `routes = [ ... ]` array
  const arrayMatch = source.match(/const routes = \[([\s\S]*?)\]\s*\n\s*const router/)
  if (!arrayMatch) {
    throw new Error('Could not locate `const routes = [...]` in router/index.js')
  }
  const body = arrayMatch[1]

  // Split on objects that start a route: `{ path:` (handles multi-line)
  const chunks = body.split(/(?=\{\s*path:)/)
  for (const chunk of chunks) {
    if (!chunk.includes('path:')) continue

    const pathM = chunk.match(/path:\s*['`]([^'`]*)['`]/)
    if (!pathM) continue
    const nameM = chunk.match(/name:\s*['"]([^'"]+)['"]/)
    const redirectM = chunk.match(/redirect:\s*['"]([^'"]+)['"]/)
    const importM = chunk.match(/import\(\s*['"]\.\.\/(views\/[^'"]+\.vue)['"]\s*\)/)
    const staticM = chunk.match(/component:\s*(\w+)/)
    const metaBits = []
    if (/requiresAuth:\s*true/.test(chunk)) metaBits.push('auth')
    if (/guest:\s*true/.test(chunk)) metaBits.push('guest')
    if (/adminPage:\s*true/.test(chunk)) metaBits.push('adminPage')
    if (/superAdminOnly:\s*true/.test(chunk)) metaBits.push('superAdmin')
    if (/teamAdminPage:\s*true/.test(chunk)) metaBits.push('teamAdmin')

    let component = '—'
    if (redirectM) {
      component = `→ ${redirectM[1]}`
    } else if (importM) {
      component = importM[1]
    } else if (staticM) {
      // Resolve static imports at top of file: `import X from '../views/...'`
      const from = source.match(
        new RegExp(`import\\s+${staticM[1]}\\s+from\\s+['"]\\.\\./(views/[^'"]+)['"]`)
      )
      component = from ? from[1] : staticM[1]
    }

    routes.push({
      path: pathM[1],
      name: nameM?.[1] || '—',
      component,
      meta: metaBits.length ? metaBits.join(', ') : '—',
    })
  }
  return routes
}

function groupByDir(relPaths, rootLabel) {
  /** @type {Map<string, string[]>} */
  const groups = new Map()
  for (const rel of relPaths) {
    const dir = path.posix.dirname(rel)
    const key = dir === '.' ? rootLabel : `${rootLabel}/${dir}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(path.posix.basename(rel))
  }
  return groups
}

function formatGroupList(groups) {
  const lines = []
  for (const [dir, files] of groups) {
    lines.push(`### \`${dir}/\``)
    for (const f of files) {
      lines.push(`- ${f}`)
    }
    lines.push('')
  }
  return lines.join('\n').trimEnd()
}

function main() {
  const routerSrc = fs.readFileSync(ROUTER, 'utf8')
  const routes = parseRoutes(routerSrc)
  const views = walkVue(path.join(SRC, 'views'), path.join(SRC, 'views'))
  const components = walkVue(path.join(SRC, 'components'), path.join(SRC, 'components'))
  const stores = listJs(path.join(SRC, 'stores'))
  const utils = listJs(path.join(SRC, 'utils'))
  const composables = listJs(path.join(SRC, 'composables'))

  const routedViews = new Set(
    routes
      .map((r) => r.component)
      .filter((c) => typeof c === 'string' && c.startsWith('views/'))
      .map((c) => c.replace(/^views\//, ''))
  )
  const orphanViews = views.filter((v) => !routedViews.has(v))

  const generatedAt = new Date().toISOString().slice(0, 10)

  const routeRows = routes
    .map((r) => `| \`${r.path}\` | ${r.name} | \`${r.component}\` | ${r.meta} |`)
    .join('\n')

  const md = `# UI Index

Structural map of \`w4h-app\` for agents and humans. **Index only** — not feature docs.

- Regenerate: \`npm run index:ui\`
- Generated: ${generatedAt}
- Do not hand-edit the lists below; change code, then re-run the script.

## Orientation

| Area | Path |
|------|------|
| Router | \`src/router/index.js\` |
| Views | \`src/views/\` |
| Components | \`src/components/\` |
| Stores | \`src/stores/\` |
| Utils | \`src/utils/\` |
| Composables | \`src/composables/\` |
| Roles | \`src/utils/roles.js\` |

Shells: app (\`NavBar\`) vs Platform Admin (\`AdminNavBar\`). Project workspace: \`ProjectWorkspaceView\` → \`ProjectAdminPanel\` / \`ProjectUserPanel\`.

## Routes

| Path | Name | View | Meta |
|------|------|------|------|
${routeRows}

## Views (${views.length})

${formatGroupList(groupByDir(views, 'src/views'))}
${
  orphanViews.length
    ? `\nUnrouted (not referenced in router):\n${orphanViews.map((v) => `- \`src/views/${v}\``).join('\n')}\n`
    : ''
}
## Components (${components.length})

${formatGroupList(groupByDir(components, 'src/components'))}

## Supporting modules

**Stores:** ${stores.map((s) => `\`${s}\``).join(', ') || '—'}

**Utils:** ${utils.map((s) => `\`${s}\``).join(', ') || '—'}

**Composables:** ${composables.map((s) => `\`${s}\``).join(', ') || '—'}
`

  fs.writeFileSync(OUT, md.trimEnd() + '\n', 'utf8')
  const lineCount = md.trimEnd().split('\n').length
  console.log(`Wrote ${path.relative(ROOT, OUT)} (${lineCount} lines, ${routes.length} routes, ${views.length} views, ${components.length} components)`)
  if (lineCount > 150) {
    console.warn(`Warning: UI_INDEX.md is ${lineCount} lines (target ~50–150). Consider tightening the generator.`)
  }
}

main()
