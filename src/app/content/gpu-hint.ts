/** Renderer strings of GPUs that cannot hold 60 fps with shadows and dust: the first visit starts light on them. */
const WEAK = [/\bGT\s?[0-9]{3}\b/i, /\bGeForce\s+(?:GT\s?)?[0-9]{3}\b/i, /Intel.*(?:HD|UHD)\s+Graphics\s+[0-9]{3,4}\b/i, /Mali-[0-9T]+/i, /Adreno.*\b[2-4][0-9]{2}\b/i, /SwiftShader|llvmpipe/i];

export function isWeakGpu(renderer: string | undefined): boolean {
  return !!renderer && WEAK.some((p) => p.test(renderer));
}

export interface DeviceInfo {
  gpu?: string;
  cores?: number;
  /** navigator.deviceMemory in GB, when the browser reports it. */
  memory?: number;
  narrow: boolean;
}

/** First profile for a device: only the clearly weak start light; the runtime governor refines it. */
export function initialTier(d: DeviceInfo): 'high' | 'balanced' | 'low' {
  if (isWeakGpu(d.gpu)) return 'low';
  if ((d.memory !== undefined && d.memory <= 2) || (d.cores !== undefined && d.cores <= 2)) return 'low';
  return 'balanced';
}
