/**
 * Shared plan of the inspection bench in scene units (one unit is the presentation scale of the
 * DIMM model, roughly 2 cm). Models, the lamp and the camera read these positions so nothing is
 * placed twice.
 */
export const BENCH = {
  /** Top surface of the worktop. */
  top: -0.295,
  /** Top surface of the 6 cm anti-static mat, which rests on the worktop and carries the boards. */
  matTop: -0.235,
  /** Base of a station's board: its PCB starts 0.14 above the station origin. */
  boardBase: 0.14,
  /** Floor of the room, under the base cabinet, and the ceiling above the ceiling tubes. */
  floor: -8.2,
  ceiling: 18,
  mat: { x: 0, z: 0.2, width: 15.5, depth: 9.6 },
  /** Front edge of the worktop, toward the camera. */
  frontZ: 11,
  backZ: -9.5,
  leftX: -14.8,
  rightX: 15,
  /** Foot of the lamp column: beside the work mat, which spans x ±7.75, so the arm reaches over its edge. */
  lamp: { x: -8.9, z: 3.4 },
  scope: { x: -7, z: -4.8 },
  supply: { x: 6.3, z: -5 },
  tray: { x: 6.1, z: 1.4 },
  probe: { x: -3.4, z: 4.2 },
  multimeter: { x: 3.7, z: 6.4 },
  solderStation: { x: -3.2, z: 6.5 },
  solderSpool: { x: -6.1, z: 5.9 },
  notebook: { x: 0.2, z: 7.5 },
  mug: { x: 8.2, z: 6.6 },
  partsBin: { x: -10.5, z: -0.4 },
  chipTray: { x: 9.4, z: 1.7 },
  tape: { x: -1.6, z: -7.3 },
} as const;
