import { build } from 'esbuild';
import * as T from 'three';
import { auditGeometry } from './geometry-quality-kit/geometry-audit.js';
import { rm, writeFile } from 'node:fs/promises';
await build({entryPoints:['src/app/world/electronics-workshop.ts'],outfile:'tools/.workshop-check.mjs',platform:'node',format:'esm',bundle:true,external:['three','three/*']});
try {
  const {ElectronicsWorkshop}=await import('./.workshop-check.mjs');
  const materials=new Map();const resources=new Set();
  const workshop=new ElectronicsWorkshop({track:r=>(resources.add(r),r),material:(id,color,roughness,metalness)=>{if(!materials.has(id))materials.set(id,new T.MeshStandardMaterial({color,roughness,metalness}));return materials.get(id);},label:()=>{}});
  const root=new T.Group(),parts=new Map();workshop.cpu(root,parts);
  let serial=0;root.traverse(o=>{if(o instanceof T.Mesh && !o.name)o.name='part-'+serial++;});root.updateMatrixWorld(true);
  const report=auditGeometry(root,{clash:false,planeDistance:.00015,planeCellDistance:.001,overlapArea:.0001,maxTriangles:Infinity,top:12});
  const bottom=new T.Box3().setFromObject(root.getObjectByName('pcb')).min.y;
  const pins=[...parts.keys()].filter(k=>k.startsWith('pin-'));
  const valid=pins.length===40 && Math.abs(bottom-.14)<.005 && !report.truncated && !report.defects.length && !report.noMaterial.length && report.zfight.length===0;
  await writeFile('docs/geometry-report.json',JSON.stringify({scope:'CPU hard surfaces; text planes and intended solid contacts excluded from this coplanar check',pins:pins.length,pcbBottom:bottom,pass:valid,...report},null,2));
  console.log(JSON.stringify({pass:valid,pins:pins.length,meshes:report.meshes,triangles:report.triangles,zfight:report.zfight,defects:report.defects},null,2));
  if(!valid)process.exitCode=1;
  for(const r of resources)r.dispose();for(const m of materials.values())m.dispose();
} finally {await rm('tools/.workshop-check.mjs',{force:true});}
