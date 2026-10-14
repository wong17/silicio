// Verifies that nothing the page loads points outside its own origin, so the package works without a network.
// Source check always runs; with --dist it also scans the production bundle in dist/.
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const roots = [join(process.cwd(), 'src'), join(process.cwd(), 'public')];
if (process.argv.includes('--dist')) {
  const dist = join(process.cwd(), 'dist');
  if (existsSync(dist)) roots.push(dist);
}

const PATTERNS = [
  [/\bfetch\(\s*['"`]https?:/, 'fetch a otro origen'],
  [/<(?:script|link|img|iframe|source)[^>]+(?:src|href)=["']https?:\/\/(?!localhost|127\.0\.0\.1)/, 'etiqueta que carga un recurso externo'],
  [/url\(\s*['"]?https?:/, 'url() externa'],
  [/@import\s+(?:url\()?['"]https?:/, '@import externo'],
  [/\bimport\(\s*['"]https?:/, 'import dinámico externo'],
  [/new\s+(?:Worker|EventSource|WebSocket)\(\s*['"]https?:/, 'worker o socket externo'],
  [/navigator\.sendBeacon/, 'sendBeacon'],
];

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (/\.(ts|html|scss|css|js|mjs)$/.test(name) && !name.endsWith('.spec.ts') && !name.endsWith('.map')) out.push(path);
  }
  return out;
}

const offenders = [];
for (const root of roots)
  for (const file of walk(root)) {
    // Bundled libraries may mention URLs in comments or documentation strings; only test our own sources.
    if (file.includes('node_modules') || /chunk-|rapier|main-/.test(file)) continue;
    const text = readFileSync(file, 'utf8');
    for (const [pattern, why] of PATTERNS) if (pattern.test(text)) offenders.push(`${file}: ${why}`);
    // Plain external anchors are fine (they are followed only by the user) but must not leak the opener.
    if (file.endsWith('.html'))
      for (const m of text.matchAll(/<a\b[^>]*href="https?:[^"]+"[^>]*>/g))
        if (!m[0].includes('noopener')) offenders.push(`${file}: enlace externo sin rel="noopener"`);
  }

if (offenders.length) {
  console.error('Referencias externas encontradas:\n' + offenders.join('\n'));
  process.exit(1);
}
console.log('Sin referencias externas cargadas por la página (' + roots.length + ' carpetas revisadas).');
