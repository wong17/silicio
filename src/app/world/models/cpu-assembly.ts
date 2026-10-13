/** Authored presentation assembly. These are mating datums, not manufacturer dimensions. */ export const CPU_ASSEMBLY =
  {
    pcbTop: 0.36,
    socketBottom: 0.385,
    socketTop: 0.635,
    railTop: 0.652,
    ceramicBottom: 0.652,
    ceramicTop: 0.928,
    sealHeight: 0.008,
    capRestY: 1.031,
    pinPitch: 0.28,
    pinFirstX: -2.66,
    pinAxisZ: 1.45,
    pinChannelRadius: 0.078,
    shoulderInnerZ: 0.99,
    shoulderBottom: 0.924,
    shoulderTop: 0.984,
  } as const;
export const cpuPinX = (index: number) => CPU_ASSEMBLY.pinFirstX + index * CPU_ASSEMBLY.pinPitch;
