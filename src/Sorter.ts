import * as path from 'path';
import * as fs from 'fs';
import Reader from './Reader';
import Writer from './Writer';
import { IFileHandler, IRunsHandler, ISorter, SortingTechnique } from './types';

export class RunsHandler implements IRunsHandler {
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
    return new Promise<void>((resolve) => {
      fs.writeFile(this.filePath, '', () => resolve());
    });
  }
}

class FileHandler implements IFileHandler {
  private numberOfSourceFiles: number;
  private numberOfDestFiles: number;

  private srcRunHandlers: RunsHandler[] = [];
  private destRunHandlers: RunsHandler[] = [];

  private readonly DIR_PATH: string = path.join(path.resolve(), 'data');
  private readonly TEMP_DIR_NAME: string = 'temp';
  private destFileNames: string[] = [];
  constructor(
    private srcFilePath: string,
    numOfSrc: number,
    numOfDest: number
  ) {
    this.numberOfSourceFiles = numOfSrc;
    this.numberOfDestFiles = numOfDest;

    this.initRuns();
  }

  private initRuns(): void {
    this.srcRunHandlers.push(new RunsHandler(this.srcFilePath));

    this.initTempDir();
    for (let i = 0; i < this.numberOfDestFiles; i += 1) {
      const fileName = `file${i}.txt`;
      const filePath = path.join(this.DIR_PATH, this.TEMP_DIR_NAME, fileName);
      fs.writeFileSync(filePath, '');
      this.destFileNames.push(fileName);
      this.destRunHandlers.push(new RunsHandler(filePath));
    }
  }

  private initTempDir(): void {
    const directoryPath = path.join(this.DIR_PATH, this.TEMP_DIR_NAME);
    if (!fs.existsSync(directoryPath)) {
      fs.mkdirSync(directoryPath);
    }
  }

  public getSrcRunHandlers(passes?: number): RunsHandler[] {
    if (passes === 0) {
      const runHandler = this.srcRunHandlers.pop()!;
      const filePath = path.join(this.DIR_PATH, 'sorted.txt');
      fs.writeFileSync(filePath, '');
      this.srcRunHandlers.push(new RunsHandler(filePath));
      return [runHandler];
    } else {
      return this.srcRunHandlers;
    }
  }

  public getDestRunHandlers(): RunsHandler[] {
    return this.destRunHandlers;
  }

  public async switchSrcAndDest(): Promise<void> {
    await Promise.all(this.destRunHandlers.map((handler) => handler.reset()));
    this.srcRunHandlers.forEach((handler) => handler.reset());

    const temp = this.srcRunHandlers;
    this.srcRunHandlers = this.destRunHandlers;
    this.destRunHandlers = temp;
  }

  public moveToNextRun(): void {
    this.srcRunHandlers.forEach((h) => h.updateRunNumber());
    this.destRunHandlers.forEach((h) => h.updateRunNumber());
  }

  public async resetFiles(dest?: boolean): Promise<void> {
    if (dest) {
      await Promise.all(this.destRunHandlers.map((h) => h.resetFileContents()));
    } else {
      await Promise.all(this.srcRunHandlers.map((h) => h.resetFileContents()));
    }
  }
}

export default class Sorter implements ISorter {
  private fileHandler: FileHandler | undefined;

  constructor(
    private filePath: string,
    private sortingTechnique: SortingTechnique
  ) {
    switch (sortingTechnique) {
      case SortingTechnique.NATURAL_MERGE: {
        this.initNaturalMerge();
        break;
      }
    }
  }

  private initNaturalMerge(): void {
    this.fileHandler = new FileHandler(path.resolve(this.filePath), 1, 2);
  }

  public async sort(): Promise<void> {
    switch (this.sortingTechnique) {
      case SortingTechnique.NATURAL_MERGE: {
        await this.naturalSort();
      }
    }
  }

  private async naturalSort(): Promise<void> {
    let L = 0;
    let passes = 0;

    do {
      L = 0;
      const [src] = this.fileHandler!.getSrcRunHandlers(passes);
      let [first, second] = this.fileHandler!.getDestRunHandlers();

      // Remove file contents of the destination
      // files after merging in src
      await this.fileHandler!.resetFiles(true);
      let currentDest = 0;

      // Split src file into temp files
      while (!src!.isEOF()) {
        if (currentDest === 0) {
          await first.copyRun(src!);
        } else {
          await second.copyRun(src!);
        }
        currentDest = (currentDest + 1) % 2;
        src?.updateRunNumber();
      }

      // Remove src file contents
      await this.fileHandler!.resetFiles();

      // Switch src and destination files
      await this.fileHandler!.switchSrcAndDest();

      [first, second] = this.fileHandler!.getSrcRunHandlers() as RunsHandler[];
      const [dest] = this.fileHandler!.getDestRunHandlers();

      first.updateRunNumber();
      second.updateRunNumber();
      // Merge temp files in src
      while (!first.isEOF() && !second.isEOF()) {
        do {
          const next1 = await first.peakNext();
          const next2 = await second.peakNext();

          if (
            ((!!next1 || next1 === 0) && next1! < next2!) ||
            (!next2 && next2 !== 0)
          ) {
            await dest.copyNumber(first);
            if ((await first.isEOR()) && (!!next2 || next2 === 0)) {
              await dest.copyNumber(second);
            }
          } else {
            await dest.copyNumber(second);
            if ((await second.isEOR()) && (!!next1 || next1 === 0)) {
              await dest.copyNumber(first);
            }
          }
        } while (!(await first.isEOR()) || !(await second.isEOR()));

        await dest.writeNL();
        this.fileHandler!.moveToNextRun();
        L += 1;
      }

      // Write out left contents
      while (!first.isEOF()) {
        await dest.copyRun(first);
        L += 1;
      }

      while (!second.isEOF()) {
        await dest.copyRun(second);
        L += 1;
      }

      passes += 1;
      await this.fileHandler!.switchSrcAndDest();
    } while (L > 1);
  }
}
