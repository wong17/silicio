/** Conceptual 16-bit machine, independent of the 8086 session and electrical timings. */
export class MachineExperiment {
  stage = 0;
  accumulator = 0;
  address = 0;
  data = 0;
  output = 0;
  memory = [7, 0];
  advance(): void {
    if (this.stage === 8) {
      this.reset();
      return;
    }
    this.stage++;
    switch (this.stage) {
      case 1:
        this.address = 0;
        break;
      case 3:
        this.data = this.memory[this.address];
        this.accumulator = this.data;
        break;
      case 4:
        this.accumulator = (this.accumulator + 5) & 65535;
        break;
      case 5:
        this.address = 1;
        break;
      case 7:
        this.data = this.accumulator;
        this.memory[this.address] = this.data;
        break;
      case 8:
        this.output = this.memory[1];
        break;
    }
  }
  reset(): void {
    this.stage = 0;
    this.accumulator = 0;
    this.address = 0;
    this.data = 0;
    this.output = 0;
    this.memory = [7, 0];
  }
}
