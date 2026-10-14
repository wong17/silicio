/** Renderer strings of GPUs that cannot hold 60 fps with shadows and dust: the first visit starts light on them. */
const WEAK = [/\bGT\s?[0-9]{3}\b/i, /\bGeForce\s+(?:GT\s?)?[0-9]{3}\b/i, /Intel.*(?:HD|UHD)\s+Graphics\s+[0-9]{3,4}\b/i, /Mali-[0-9T]+/i, /Adreno.*\b[2-4][0-9]{2}\b/i, /SwiftShader|llvmpipe/i];

export function isWeakGpu(renderer: string | undefined): boolean {
  return !!renderer && WEAK.some((p) => p.test(renderer));
}
