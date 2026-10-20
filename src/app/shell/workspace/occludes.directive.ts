import { Directive, ElementRef, inject, input, OnDestroy, OnInit } from '@angular/core';
import { SceneViewportService } from './scene-viewport.service';

/**
 * Marks an element drawn over the 3D view. While it exists the camera frames pieces in what it leaves free.
 * `appOccludes="bottom"` ties it to an edge; empty lets the measurement pick the cheapest side.
 */
@Directive({
  selector: '[appOccludes]',
  host: { '(transitionend)': 'viewport.refresh()' },
})
export class OccludesDirective implements OnInit, OnDestroy {
  readonly appOccludes = input<'' | 'top' | 'bottom' | 'left' | 'right'>('');
  readonly viewport = inject(SceneViewportService);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  ngOnInit(): void {
    this.viewport.register(this.element, this.appOccludes() || undefined);
  }

  ngOnDestroy(): void {
    this.viewport.unregister(this.element);
  }
}
