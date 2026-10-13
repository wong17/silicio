import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EXPERIENCES } from '../../content/experiences';
import type { Section } from '../../world/scene-inputs';

/** Brand and experience links. Narrow screens scroll this row with no visible scrollbar. */
@Component({
  selector: 'app-experience-nav',
  imports: [RouterLink],
  templateUrl: './experience-nav.component.html',
  styleUrl: './experience-nav.component.scss',
})
export class ExperienceNavComponent {
  readonly active = input<Section>('atrium');
  readonly experiences = EXPERIENCES;
}
