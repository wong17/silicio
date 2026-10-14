import { Component, computed, inject } from '@angular/core';
import { LabSession } from '../../laboratory/lab-session.service';
import { missionFor } from '../../content/station-missions';

/** Mission of the current station: the goal, a hint on request, and a verdict read from the real state. */
@Component({
  selector: 'app-station-mission',
  templateUrl: './station-mission.component.html',
  styleUrl: './station-mission.component.scss',
})
export class StationMissionComponent {
  readonly session = inject(LabSession);
  readonly mission = computed(() => missionFor(this.session.section()));
  readonly done = computed(() => {
    const m = this.mission();
    return !!m && m.check(this.session.missionContext());
  });
}
