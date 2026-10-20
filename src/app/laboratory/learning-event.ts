import type { ControllerId, ExperienceId } from './controllers/simulation-controller';

/**
 * What one step looked like to the student, separate from the engine's state: where the data came from and
 * went, what changed (before → after) and the key of its explanation. IDs in source and target are piece
 * ids of the scene and of the 2D instruments.
 */
export interface LearningEvent {
  id: string;
  sessionId: string;
  revision: number;
  experience: ExperienceId;
  controllerId: ControllerId;
  kind: 'instruction' | 'transfer' | 'memory-access' | 'input' | 'output' | 'interrupt';
  role?: 'processing' | 'storage' | 'transfer' | 'control';
  source?: string;
  target?: string;
  address?: number;
  bytes: readonly number[];
  explanationKey: string;
  changes: readonly { label: string; before: string; after: string }[];
}
