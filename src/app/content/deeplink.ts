/** What a shareable address of the bench carries besides the station: the piece and the camera. */
export interface DeepLink {
  piece?: string;
  azimuth?: number;
  distance?: number;
}

const PIECE = /^[a-z0-9][a-z0-9-]{0,40}$/;

/** Query parameters for a selection and a view; `vista` is azimuth in degrees and distance, comma separated. */
export function toQuery(piece: string | undefined, view?: { azimuth: number; distance: number }): Record<string, string | null> {
  return {
    pieza: piece && PIECE.test(piece) ? piece : null,
    vista: view ? `${Math.round((view.azimuth * 180) / Math.PI)},${view.distance.toFixed(1)}` : null,
  };
}

/** Parses the parameters back, ignoring anything malformed so a bad link opens the station as usual. */
export function fromQuery(params: Record<string, string | string[] | undefined>): DeepLink {
  const out: DeepLink = {};
  const piece = typeof params['pieza'] === 'string' ? params['pieza'] : undefined;
  if (piece && PIECE.test(piece)) out.piece = piece;
  const view = typeof params['vista'] === 'string' ? params['vista'].split(',') : [];
  if (view.length === 2) {
    const az = Number(view[0]),
      distance = Number(view[1]);
    if (Number.isFinite(az) && Number.isFinite(distance) && distance >= 1.6 && distance <= 32) {
      out.azimuth = (az * Math.PI) / 180;
      out.distance = distance;
    }
  }
  return out;
}

/** `?shot=8086-alu`: a fixed view for reference captures: reduced motion (frozen clock), piece framed. */
export interface Shot {
  station: string;
  piece?: string;
}

export function readShot(params: Record<string, string | string[] | undefined>): Shot | undefined {
  const raw = params['shot'];
  if (typeof raw !== 'string') return undefined;
  const m = /^([a-z0-9]+)(?:-([a-z0-9-]{1,40}))?$/.exec(raw);
  if (!m) return undefined;
  return { station: m[1], piece: m[2] };
}
