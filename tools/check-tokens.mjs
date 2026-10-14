// Token audit: lists hex colours used in component styles that are neither a console-kit token nor in DESIGN.md.
// It is not the Impeccable detector; it gives the same kind of before/after count for the palette.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const src = join(process.cwd(), 'src');
const known = new Set();
for (const file of ['DESIGN.md', 'src/app/shared/console-kit.scss'])
  for (const m of readFileSync(join(process.cwd(), file), 'utf8').matchAll(/#[0-9a-fA-F]{3,8}\b/g)) known.add(m[0].toLowerCase());

const found = new Map();
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else if (name.endsWith('.scss') && !path.endsWith('console-kit.scss'))
      for (const m of readFileSync(path, 'utf8').matchAll(/#[0-9a-fA-F]{3,8}\b/g)) {
        const c = m[0].toLowerCase();
        if (!known.has(c)) found.set(c, (found.get(c) ?? 0) + 1);
      }
  }
})(src);

const total = [...found.values()].reduce((n, v) => n + v, 0);
console.log(`Colores fuera de los tokens: ${found.size} distintos, ${total} usos.`);
for (const [c, n] of [...found].sort((a, b) => b[1] - a[1]).slice(0, 15)) console.log(`  ${c}  ×${n}`);
