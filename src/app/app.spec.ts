import { TestBed } from '@angular/core/testing';
import { Component, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { SceneControlsComponent } from './world/scene-controls.component';
import { App } from './app';
import { AtriumSceneComponent } from './world/atrium-scene.component';
@Component({selector:'app-atrium-scene',template:'',inputs:['section','exploded','activePart','tick','reduced','quality'],outputs:['picked']})
class MockWorld { picked = new EventEmitter<string>(); }
describe('SILICIO / navegación y controles', () => {
  beforeEach(async()=>{
    vi.spyOn(App.prototype, 'ngAfterViewInit').mockImplementation(() => {});
    await TestBed.configureTestingModule({ imports:[App], providers:[provideRouter([])] })
      .overrideComponent(App,{ set:{styles:[],styleUrl:undefined,imports:[FormsModule,RouterLink,MockWorld,SceneControlsComponent]} }).compileComponents();
  });
  it('expone cinco experiencias con enlaces accesibles', () => {
    const fixture=TestBed.createComponent(App); fixture.detectChanges();
    const nav=(fixture.nativeElement as HTMLElement).querySelector('nav')!;
    expect(nav.querySelectorAll('a')).toHaveLength(5);
    expect(nav.textContent).toContain('Cronoscopio');
  });
  it('ejecuta una suma y recupera el estado anterior con el cronoscopio', () => {
    const fixture=TestBed.createComponent(App); const app=fixture.componentInstance;
    app.step(); expect(app.state().registers.AX).toBe(12);
    app.restore(-1); expect(app.state().registers.AX).toBe(7); expect(app.state().registers.IP).toBe(0x100);
  });
  it('impide ejecutar código editado que aún no se compiló', () => {
    const fixture=TestBed.createComponent(App); const app=fixture.componentInstance;
    app.source='MOV AX,42'; app.step();
    expect(app.error()).toContain('Compila'); expect(app.state().registers.AX).toBe(7);
  });
  it('branching_preserves_previous_future',()=>{const f=TestBed.createComponent(App),a=f.componentInstance;a.step();a.step();a.restore(-1);a.step();expect(a.branches()).toHaveLength(1);expect(a.branches()[0].trace).toHaveLength(2);a.restoreBranch(a.branches()[0].id);expect(a.trace()).toHaveLength(2);});
  it('console_expansion_preserves_selection_and_session',()=>{const a=TestBed.createComponent(App).componentInstance;a.part('alu');a.step();a.setLayout('instrument');expect(a.state().registers.AX).toBe(12);expect(a.layout()).toBe('instrument');});
  it('representation_control_dispatches_intent',()=>{const f=TestBed.createComponent(App);f.detectChanges();const el=f.nativeElement as HTMLElement;expect(el.querySelector('.camera-tools [data-action="representation"]')).not.toBeNull();expect(el.querySelector('.inspector [data-action="representation"]')).toBeNull();});
  it('empty_alu_waits_for_first_instruction',()=>{const f=TestBed.createComponent(App);f.componentInstance.sections.set('8086');expect(()=>f.detectChanges()).not.toThrow();expect((f.nativeElement as HTMLElement).textContent).toContain('Ejecuta un paso');});
 it('aliases_share_physical_address',()=>{const a=TestBed.createComponent(App).componentInstance;a.segmentText='2000';a.offsetText='000A';a.setAddress();const alias=a.aliasAddress();expect((alias.segment*16+alias.offset)%1048576).toBe(a.physical());});
 it('restoring_branch_archives_current_branch',()=>{const a=TestBed.createComponent(App).componentInstance;a.step();a.step();a.restore(-1);a.step();const branchA=a.branches()[0].id;a.restoreBranch(branchA);const branchB=a.branches().find(b=>b.id!==branchA);expect(branchB).toBeDefined();a.restoreBranch(branchB!.id);expect(a.trace()).toHaveLength(1);expect(a.state().halted).toBe(false);});
 it('recapturing_baseline_clears_previous_differences',()=>{const a=TestBed.createComponent(App).componentInstance;a.capture();a.step();expect(a.comparison().length).toBeGreaterThan(0);a.capture();expect(a.comparison()).toEqual([]);});
});
