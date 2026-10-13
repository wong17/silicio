import * as T from 'three';
export { pieceDefinition } from './piece-definitions';
/** Every manufactured subject mesh belongs to an inspectable semantic assembly. */
export function classifySubject(root: T.Group, parts: Map<string, T.Object3D>): void {
  const meshes: T.Mesh[] = [];
  root.traverse((o) => {
    if (!(o instanceof T.Mesh)) return;
    for (let p: T.Object3D | null = o; p && p !== root; p = p.parent)
      if (p.userData['part']) return;
    meshes.push(o);
  });
  for (const mesh of meshes) {
    const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material,
      family = mat.name;
    const id =
      mesh.name === 'pcb' || family.includes('pcb') || family.includes('soldermask')
        ? 'board'
        : mesh.name === 'ceramic-body'
          ? 'encapsulation'
          : family === 'die-silicon'
            ? 'die'
            : family === 'board-traces' || family === 'ram-copper'
              ? 'traces'
              : family.includes('resistor') || family.includes('capacitor')
                ? 'passives'
                : family === 'soc-packages'
                  ? 'memory-packages'
                  : family === 'pin-alloy' ||
                      family.includes('contacts') ||
                      family.includes('tin-leads') ||
                      family.includes('dimm-solder')
                    ? 'interconnects'
                    : mat instanceof T.MeshBasicMaterial
                      ? 'markings'
                      : 'logic';
    let group = parts.get(id);
    if (!(group instanceof T.Group)) {
      group = new T.Group();
      group.userData['part'] = id;
      parts.set(id, group);
      root.add(group);
    }
    group.attach(mesh);
  }
}
