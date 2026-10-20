import { Component, inject, input, output } from '@angular/core';
import { LabSession } from '../../laboratory/lab-session.service';
import { BenchMapComponent } from './bench-map/bench-map.component';
import { PieceTrayComponent, type Thumbnailer } from './piece-tray/piece-tray.component';
import { OccludesDirective } from '../../shell/workspace/occludes.directive';

/**
 * Layer over the 3D view, shared by every station: the bench map, the piece tray and the floating
 * legends. The buttons that open the drawers live in the scene bar (Vistas). Open drawers carry
 * `appOccludes`, so the camera frames pieces in what they leave free.
 */
@Component({
  selector: 'app-scene-hud',
  imports: [BenchMapComponent, PieceTrayComponent, OccludesDirective],
  templateUrl: './scene-hud.component.html',
  styleUrl: './scene-hud.component.scss',
})
export class SceneHudComponent {
  readonly session = inject(LabSession);
  readonly thumbnailer = input<Thumbnailer | null>(null);
  readonly picked = output<string>();
  readonly focused = output<string>();
  readonly orbit = output<number>();
  readonly aimSelected = output<void>();

  readonly hud = this.session.hud;
}
