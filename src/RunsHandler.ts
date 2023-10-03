import Reader from './Reader';
import Writer from './Writer';
import { IRunsHandler } from './types';

export default class RunsHandler implements IRunsHandler {
  private reader: Reader;
  private writer: Writer;

  private runNumber: number = 0;
  private lastReadNumber: number | null = null;

  constructor(private filePath: string) {
    this.writer = new Writer(filePath);
    this.reader = new Reader(filePath);
  }

  public isEOF(): boolean {
    return !this.reader.hasNumbers();
  }

  public async copyRun(anotherHandler: RunsHandler): Promise<void> {
    do {
      const number = await anotherHandler.getNumber();
      anotherHandler.lastReadNumber = number;
      await this.writer.writeNumber(number);
    } while (!(await anotherHandler.isEOR()));
    await this.writer.write('\n');
  }

  public async getNumber(): Promise<number> {
    const number = await this.reader.getNumber();
    this.lastReadNumber = number;
    return number;
  }

  public async writeNL(): Promise<void> {
    await this.writer.write('\n');
  }

  public async copyNumber(anotherHandler: RunsHandler): Promise<void> {
    if (await anotherHandler.isEOR()) {
      return;
    }
    const number = await anotherHandler.getNumber();
    await this.writer.writeNumber(number);
  }

  public async peakNext(): Promise<number | null> {
    if (!(await this.isEOR())) return this.reader.peakNext();
    return null;
  }

  public async isEOR(): Promise<boolean> {
    const nextNumber = await this.reader.peakNext();
    return Boolean(
      !this.reader.hasNumbers() ||
        this.runNumber !== this.reader.lineCount ||
        ((!!this.lastReadNumber || this.lastReadNumber === 0) &&
          (nextNumber || nextNumber === 0) &&
          this.runNumber === this.reader.lineCount &&
          this.lastReadNumber > nextNumber)
    );
  }

  public async reset(): Promise<void> {
    this.lastReadNumber = null;
    await this.writer.reset();
    this.reader.reset();
  }

  public updateRunNumber(): void {
    this.runNumber = this.reader.lineCount;
    this.lastReadNumber = null;
  }

  public async resetFileContents(): Promise<void> {
    return this.writer.resetFileContents();
  }

  public getReader() {
    return this.reader;
  }

  public getWriter() {
    return this.writer;
  }

  public getFilePath(): string {
    return this.filePath;
  }
}
