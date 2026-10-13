import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EXPERIENCES } from '../../content/experiences';

/** Entry cards for the five experiences, shown on the atrium before any station is opened. */
@Component({
  selector: 'app-atrium-portals',
  imports: [RouterLink],
  templateUrl: './atrium-portals.component.html',
  styleUrl: './atrium-portals.component.scss',
})
export class AtriumPortalsComponent {
  readonly experiences = EXPERIENCES;
}
