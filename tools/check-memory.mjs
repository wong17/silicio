import { build } from 'esbuild';
import * as T from 'three';
import { auditGeometry } from './geometry-quality-kit/geometry-audit.js';
import { writeFile, rm } from 'node:fs/promises';
await build({
  entryPoints: ['src/app/world/models/memory-models.ts'],
  outfile: 'tools/.memory-check.mjs',
  platform: 'node',
  format: 'esm',
  bundle: true,
  external: ['three', 'three/*'],
});
try {
  const { MemoryModels } = await import('./.memory-check.mjs');
  const reports = [];
  for (const variant of ['classic', 'dimm']) {
    const resources = new Set(),
      materials = new Map(),
      tools = {
        track: (r) => (resources.add(r), r),
        material: (id, color, roughness, metalness) => {
          if (!materials.has(id))
            materials.set(id, new T.MeshStandardMaterial({ color, roughness, metalness }));
          return materials.get(id);
        },
        label: () => {},
      };
    const root = new T.Group(),
      parts = new Map();
    new MemoryModels(tools)[variant](root, parts);
    let serial = 0;
    root.traverse((o) => {
      if (o instanceof T.Mesh && !o.name) o.name = 'memory-' + serial++;
    });
    root.updateMatrixWorld(true);
    const audit = auditGeometry(root, {
      clash: false,
      planeDistance: 0.0001,
      planeCellDistance: 0.001,
      overlapArea: 0.0001,
      maxTriangles: Infinity,
      top: 12,
    });
    const pass =
      !audit.truncated && !audit.defects.length && !audit.noMaterial.length && !audit.zfight.length;
    reports.push({
      variant,
      pass,
      scope:
        'Hard surfaces only; text omitted; intended solid contacts excluded. Fit contracts are tested separately.',
      ...audit,
    });
    for (const r of resources) r.dispose();
    for (const m of materials.values()) m.dispose();
  }
  await writeFile('docs/qa/memory-geometry-report.json', JSON.stringify(reports, null, 2));
  console.log(
    JSON.stringify(
      reports.map(({ variant, pass, meshes, triangles, zfight, defects }) => ({
        variant,
        pass,
        meshes,
        triangles,
        zfight,
        defects,
      })),
      null,
      2,
    ),
  );
  if (reports.some((r) => !r.pass)) process.exitCode = 1;
} finally {
  await rm('tools/.memory-check.mjs', { force: true });
}
