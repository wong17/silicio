import * as T from 'three';
export interface PieceDefinition {
  id: string;
  name: string;
  role: 'academic' | 'operable' | 'environment';
  actions: string[];
  description?: string;
  /** Where the piece lives: the station's own model or the shared workbench. */
  scope?: 'model' | 'bench';
  sourceRefs?: string[];
  modelFidelity?: string;
}
export class InteractionRegistry {
  constructor(private action?: (id: string, action: string) => void) {}
  activate(id: string, action = 'inspect'): void {
    const definition = this.definitions.get(id);
    if (!definition || !definition.actions.includes(action))
      throw Error('Acción no disponible para la pieza');
    this.action?.(id, action);
  }

  private definitions = new Map<string, PieceDefinition>();
  private owners = new WeakMap<T.Object3D, string>();
  private instances = new WeakMap<T.Object3D, string[]>();
  register(d: PieceDefinition, objects: T.Object3D[]): void {
    if (d.role !== 'environment' && !d.actions.length)
      throw Error('Una pieza operable requiere acción: ' + d.id);
    this.definitions.set(d.id, d);
    for (const o of objects) this.owners.set(o, d.id);
  }
  registerInstanceMap(mesh: T.InstancedMesh, ids: string[]): void {
    if (ids.length !== mesh.count) throw Error('Faltan IDs de instancias');
    this.instances.set(mesh, ids);
  }
  resolveHit(h: T.Intersection): string | null {
    const ids = this.instances.get(h.object);
    if (ids && h.instanceId !== undefined) return ids[h.instanceId] ?? null;
    for (let o: T.Object3D | null = h.object; o; o = o.parent) {
      const id = this.owners.get(o);
      if (id) return id;
    }
    return null;
  }
  listSelectable(): PieceDefinition[] {
    return [...this.definitions.values()].filter((d) => d.role !== 'environment');
  }
  clear(): void {
    this.definitions.clear();
    this.owners = new WeakMap();
    this.instances = new WeakMap();
  }
  auditCoverage(root: T.Object3D) {
    let classified = 0;
    const missing: string[] = [];
    root.traverse((o) => {
      if (!(o instanceof T.Mesh) || !o.visible) return;
      for (let p = o.parent; p && p !== root; p = p.parent) if (!p.visible) return;
      const ids = this.instances.get(o);
      if (ids && ids.every((id) => this.definitions.has(id))) {
        classified += ids.length;
        return;
      }
      if (this.resolveHit({ object: o, distance: 0, point: new T.Vector3() } as T.Intersection))
        classified++;
      else if (o.userData['role'] !== 'environment') missing.push(o.name || o.uuid);
    });
    return { missing, classified };
  }
}
