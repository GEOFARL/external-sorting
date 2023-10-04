import * as path from 'path';
import Reader from './Reader';
import Writer from './Writer';
import { ISorter, SortingTechnique } from './types';
import FileHandler from './FileHandler';
import RunsHandler from './RunsHandler';

export default class Sorter implements ISorter {
  private fileHandler: FileHandler | undefined;
  private N: number = 1;

  constructor(
    private filePath: string,
    private sortingTechnique: SortingTechnique,
    private isPresorted: boolean
  ) {
    switch (sortingTechnique) {
      case SortingTechnique.NATURAL_MERGE: {
        this.initNaturalMerge();
        break;
      }

      case SortingTechnique.MULTI_WAY_MERGE: {
        this.initMultiWayMerge();
        break;
      }
    }
  }

  private initNaturalMerge(): void {
    this.fileHandler = new FileHandler(path.resolve(this.filePath), 1, 2);
  }

  private initMultiWayMerge(): void {
    this.N = 10;
    this.fileHandler = new FileHandler(
      path.resolve(this.filePath),
      this.N,
      this.N,
      {
        addSrcRunHandler: false,
        initSrcRunHandlers: true,
      }
    );
  }

  public async sort(): Promise<void> {
    switch (this.sortingTechnique) {
      case SortingTechnique.NATURAL_MERGE: {
        try {
          await this.naturalSort();
        } catch (err) {
          this.fileHandler?.cleanUp();
          throw err;
        }
        break;
      }

      case SortingTechnique.MULTI_WAY_MERGE: {
        try {
          await this.multiWayMergeSort();
        } catch (err) {
          this.fileHandler?.cleanUp();
          throw err;
        }
        break;
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
    const reader = new Reader(this.filePath, 1024 * 1024 * 150);

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
    if (this.isPresorted) {
      await this.preprocessFile();
    }

    let L = 0;
    let passes = 0;

    do {
      L = 0;
      const [src] = this.fileHandler!.getSrcRunHandlers(
        passes,
        this.isPresorted
      );
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

  private async multiWayMergeSort(): Promise<void> {
    if (this.isPresorted) {
      await this.preprocessFile();
    }

    let j = 0;
    let L = 0;
    let srcReader: RunsHandler;
    if (this.isPresorted) {
      srcReader = new RunsHandler(this.fileHandler!.getTempSrcFilePath());
    } else {
      srcReader = new RunsHandler(this.filePath);
    }
    const destRunHandlers = this.fileHandler!.getDestRunHandlers();

    // Distribute initial runs
    do {
      await destRunHandlers[j].copyRun(srcReader);
      srcReader.updateRunNumber();
      j += 1;
      L += 1;
      if (j === this.N) {
        j = 0;
      }
    } while (!srcReader.isEOF());

    await this.fileHandler!.switchSrcAndDest();

    do {
      let k1 = L < this.N ? L : this.N;
      const K1 = k1;
      const t = new Array(k1).fill(0).map((_, i) => i);

      const srcRunHandlers = this.fileHandler!.getSrcRunHandlers().slice(0, k1);
      srcRunHandlers.forEach((h) => h.updateRunNumber());
      const destRunHandlers = this.fileHandler!.getDestRunHandlers().slice(
        0,
        k1
      );

      L = 0;
      j = 0;

      do {
        let k2 = k1;
        L += 1;

        do {
          let m = 0;
          const next = (await srcRunHandlers[t[0]].peakNext())!;
          let min = next;
          let i = 1;

          while (i < k2) {
            const next = (await srcRunHandlers[t[i]].peakNext())!;
            const x = next;
            if (x < min) {
              min = x;
              m = i;
            }
            i += 1;
          }

          await destRunHandlers[j].copyNumber(srcRunHandlers[t[m]]);

          if (srcRunHandlers[t[m]].isEOF()) {
            k1 -= 1;
            k2 -= 1;
            t[m] = t[k2];
            t[k2] = t[k1];
          } else if (await srcRunHandlers[t[m]].isEOR()) {
            k2 -= 1;
            [t[m], t[k2]] = [t[k2], t[m]];
          }

          this.fileHandler!.moveToNextRun();
        } while (k2 !== 0);

        await destRunHandlers[j].writeNL();
        this.fileHandler!.moveToNextRun();

        j += 1;

        if (j === K1) {
          j = 0;
        }
      } while (k1 !== 0);

      if (L <= 1) {
        await this.fileHandler!.moveResultFile(
          destRunHandlers.slice()[0].getFilePath()
        );
      }
      // Remove src file contents
      await this.fileHandler!.resetFiles();
      await this.fileHandler!.switchSrcAndDest();
    } while (L > 1);

    setTimeout(() => this.fileHandler!.cleanUp(), 0);
  }
}
