// Undefined JSX tags (10/26): esbuild and the house eslint config let <Foo /> through
// when Foo is neither imported nor defined, and the HUD only finds out on render
// ("Can't find variable"). This walks every .jsx file and reports such tags.
// Usage: node scripts/check-jsx-undef.mjs   (exit 1 when any are found)
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
const files = []
const walk = (d) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (p.endsWith('.jsx')) files.push(p) } }
walk('src')
let bad = 0
for (const f of files) {
  const s = readFileSync(f, 'utf8')
  const defined = new Set()
  for (const m of s.matchAll(/import\s+(?:(\w+)\s*,?\s*)?(?:\{([^}]*)\})?\s*from/g)) { if (m[1]) defined.add(m[1]); if (m[2]) for (const x of m[2].split(',')) { const n = x.trim().split(/\s+as\s+/).pop(); if (n) defined.add(n) } }
  for (const m of s.matchAll(/^\s*(?:export\s+)?(?:default\s+)?(?:function|const|let|class)\s+([A-Z]\w*)/gm)) defined.add(m[1])
  for (const m of s.matchAll(/(?:const|let)\s+\{([^}]*)\}\s*=/g)) for (const x of m[1].split(',')) { const n = x.trim().split(':').pop().trim(); if (n) defined.add(n) }
  // local aliases: `const Icon = running ? Square : Play`, `({ icon: Icon })`, `Icon = `
  for (const m of s.matchAll(/\b([A-Z]\w*)\s*=[^=>]/g)) defined.add(m[1])
  for (const m of s.matchAll(/:\s*([A-Z]\w*)\s*[,}=]/g)) defined.add(m[1])
  const code = s.replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, '')
  const used = new Set([...code.matchAll(/<([A-Z]\w*)[\s/>]/g)].map(m => m[1]))
  for (const u of used) if (!defined.has(u)) { bad++; console.log(`${f}: <${u}> is not imported or defined`) }
}
console.log(bad ? `${bad} undefined JSX tag(s)` : 'jsx tags: all defined')
process.exit(bad ? 1 : 0)
