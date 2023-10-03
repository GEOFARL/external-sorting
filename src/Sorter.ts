import * as path from 'path';
import Reader from './Reader';
import Writer from './Writer';
import { ISorter, SortingTechnique } from './types';
import FileHandler from './FileHandler';
import RunsHandler from './RunsHandler';

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

  private sortRawChunk(chunk: string): string {
    const data = chunk
      .trim()
      .replace(/\n/g, ' ')
      .replace(/\s{2,}/g, ' ');
    const values = data.split(' ');
    const numbers = values.map((n) => +n);
    numbers.sort((a, b) => a - b);
    return numbers.join(' ') + '\n';
  }

  private async preprocessFile() {
    const reader = new Reader(this.filePath, 1024 * 1024 * 10);

    const tempPath = path.resolve(
      this.filePath,
      '..',
      'temp_' + path.basename(this.filePath)
    );
    this.fileHandler!.setTempSrcFilePath(tempPath);

    const writer = new Writer(tempPath);
    await writer.resetFileContents();

    while (reader.hasNumbers()) {
      const chunk = await reader.getChunk();
      const sorted = this.sortRawChunk(chunk);
      await writer.write(sorted);
    }

    await writer.end();
  }

  private async naturalSort(): Promise<void> {
    await this.preprocessFile();

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

    setTimeout(() => this.fileHandler!.cleanUp(), 0);
  }
}
