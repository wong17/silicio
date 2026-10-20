import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LabSession } from '../../../laboratory/lab-session.service';
import type { Registers } from '../../../simulation/cpu8086';
import { bitWeight, halves, hasHalves, REGISTER_GROUP_ORDER, REGISTER_INFO, type RegisterInfo } from '../../../content/registers';

/** Sixteen-bit register as a row of switchable LEDs; changed bits flash when a step moves them. */
@Component({
  selector: 'app-register-panel',
  imports: [FormsModule],
  templateUrl: './register-panel.component.html',
  styleUrl: './register-panel.component.scss',
})
export class RegisterPanelComponent {
  readonly groups = REGISTER_GROUP_ORDER.map((label) => ({
    label,
    registers: REGISTER_INFO.filter((r) => r.group === label),
  }));
  readonly session = inject(LabSession);
  readonly selected = signal<keyof Registers>('AX');
  readonly selectedBit = signal(0);
  readonly names = this.session.registerNames;
  readonly view = computed(() => {
    this.session.revision();
    return this.session.laboratory().registers.find((r) => r.name === this.selected())!;
  });
  /** Bit positions from most significant (15) to least significant (0), grouped by nibble. */
  readonly positions = Array.from({ length: 16 }, (_, i) => 15 - i);
  readonly delta = computed(() => {
    const view = this.view();
    const cursor = this.session.cursor();
    const before = cursor >= 0 ? this.session.trace()[cursor]?.before.registers[view.name] : undefined;
    if (before === undefined) return undefined;
    return view.value - before;
  });

  readonly info = computed<RegisterInfo>(() => REGISTER_INFO.find((r) => r.name === this.selected())!);
  readonly bytes = computed(() => (hasHalves(this.selected()) ? halves(this.view().value) : undefined));
  /** Weight and contribution of the focused bit, as spoken and shown in the detail row. */
  readonly bitDetail = computed(() => bitWeight(this.selectedBit(), this.bitOn(this.selectedBit())));

  /** Live value of any register for its cell in the bank. */
  valueOf(name: keyof Registers): string {
    this.session.revision();
    return this.session.laboratory().registers.find((r) => r.name === name)?.hex ?? '0000';
  }

  /** AH|AL, BH|BL, CH|CL and DH|DL for the cells of the data group. */
  halvesOf(name: keyof Registers): { high: string; low: string } | undefined {
    if (!hasHalves(name)) return undefined;
    this.session.revision();
    const value = this.session.laboratory().registers.find((r) => r.name === name)?.value ?? 0;
    const parts = halves(value);
    return { high: this.hex2(parts.high), low: this.hex2(parts.low) };
  }

  hex2(value: number): string {
    return value.toString(16).toUpperCase().padStart(2, '0');
  }

  changedRegister(name: keyof Registers): boolean {
    this.session.revision();
    return (this.session.laboratory().registers.find((r) => r.name === name)?.changedMask ?? 0) !== 0;
  }

  bitOn(position: number): boolean {
    return ((this.view().value >>> position) & 1) === 1;
  }

  changed(position: number): boolean {
    return ((this.view().changedMask >>> position) & 1) === 1;
  }

  selectBit(position: number): void {
    this.selectedBit.set(position);
  }

  /** Clicking a LED flips that bit in the 8086 state, like setting a switch on the bench. */
  toggleBit(position: number): void {
    this.selectedBit.set(position);
    const next = (this.view().value ^ (1 << position)) & 0xffff;
    this.session.editRegister(this.selected(), next.toString(16).padStart(4, '0'));
  }

  signed(value: number): string {
    return (value > 0 ? '+' : '') + value;
  }
}
