import { Injectable, computed, inject, signal } from '@angular/core';
import { SimulationCoordinator } from './controllers/simulation-coordinator';
import { DEFAULT_CONTROLLER, type ControllerId, type ExperienceId } from './controllers/simulation-controller';
import type { LessonPart } from '../simulation/lab-session-codec';
import { transfer, validate, type ArtifactKind, type LearningArtifact, type Payloads } from '../simulation/learning-artifact';

/**
 * What the student is working on: the exercise, who owns its simulation, the view being consulted and
 * the step. Opening another view of the same exercise changes `view` and nothing else.
 */
@Injectable({ providedIn: 'root' })
export class LessonContext {
  private readonly coordinator = inject(SimulationCoordinator);
  readonly lessonId = signal<string | undefined>(undefined);
  readonly artifactId = signal<string | undefined>(undefined);
  private readonly artifacts = new Map<string, LearningArtifact>();

  readonly controllerId = computed<ControllerId | undefined>(() => this.coordinator.activeId());
  readonly view = computed<ExperienceId | undefined>(() => this.coordinator.view());
  readonly currentStep = computed(() => this.coordinator.transport()?.step ?? 0);
  /** True while a view of another engine's exercise is open: the transport still belongs to the owner. */
  readonly consulting = computed(() => {
    const view = this.view();
    const owner = this.controllerId();
    return !!view && !!owner && DEFAULT_CONTROLLER[view] !== owner;
  });
  /** View that holds the exercise, for «Volver al paso». */
  readonly home = computed<ExperienceId | undefined>(() => {
    const owner = this.controllerId();
    return owner
      ? (Object.keys(DEFAULT_CONTROLLER) as ExperienceId[]).find((v) => DEFAULT_CONTROLLER[v] === owner)
      : undefined;
  });

  /** What the session file keeps of the lesson: who owns the clock, the view and the artifacts on offer. */
  toPart(): LessonPart {
    return {
      lessonId: this.lessonId(),
      controllerId: this.controllerId(),
      view: this.view(),
      artifacts: [...this.artifacts.values()],
      artifactId: this.artifactId(),
    };
  }

  /** Puts back a validated lesson. The clock stays paused: nothing resumes by itself. */
  fromPart(part: LessonPart): void {
    this.artifacts.clear();
    for (const a of part.artifacts) this.artifacts.set(a.id, a);
    this.artifactId.set(part.artifactId);
    this.lessonId.set(part.lessonId);
    if (part.controllerId) this.coordinator.activate(part.controllerId);
    if (part.view) this.coordinator.changeView(part.view);
  }

  begin(lessonId: string, controller: ControllerId): void {
    this.lessonId.set(lessonId);
    this.coordinator.activate(controller);
  }

  /** Keeps a validated artifact so another engine can take it with `receive`. */
  offer(artifact: LearningArtifact): void {
    validate(artifact);
    this.artifacts.set(artifact.id, artifact);
    this.artifactId.set(artifact.id);
  }

  /** Takes the current artifact for `target`; an incompatible one is refused and the exercise stays as it was. */
  receive<K extends ArtifactKind>(kind: K, target: ControllerId): Payloads[K] {
    const id = this.artifactId();
    const artifact = id ? this.artifacts.get(id) : undefined;
    if (!artifact || artifact.kind !== kind) throw Error('No hay un resultado de este tipo para comparar.');
    return transfer(artifact as LearningArtifact<K>, target);
  }
}
