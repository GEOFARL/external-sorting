import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuid } from 'uuid';
import readline from 'node:readline/promises';
import {
  IFileReader,
  IFileWriter,
  INaturalMergeSort,
  IRunBuilder,
} from './types';

class FileReader implements IFileReader {
  private lineReaders: {
    [key: string]: readline.Interface;
  } = {};
  private openReaderStatus: {
    [key: string]: boolean;
  } = {};

  public addReader(filePath: string) {
    const src = fs.createReadStream(filePath, 'utf-8');
    const rl = readline.createInterface({
      input: src,
      crlfDelay: Infinity,
    });
    const id = uuid();
    this.lineReaders[id] = rl;
    this.openReaderStatus[id] = true;

    this.lineReaders[id].on('close', () => {
      this.openReaderStatus[id] = false;
    });
    return id;
  }

  public getReader(id: string) {
    return this.lineReaders[id];
  }

  public removeReader(id: string) {
    this.lineReaders[id].close();
    delete this.openReaderStatus[id];
    delete this.lineReaders[id];
  }

  public isOpened(id: string) {
    return this.openReaderStatus[id];
  }

  public async getLine(id: string) {
    const res = await this.lineReaders[id][Symbol.asyncIterator]().next();
    return res.value as string;
  }
}

class FileWriter implements IFileWriter {
  private readonly NUM_OF_OUTPUT_FILES = 2;
  private currentTempFile = 0;
  private tempFiles: fs.WriteStream[] = [];
  private destFiles: fs.WriteStream[] = [];
  private tempDir: string = 'temp';
  private tempFilePaths: string[] = [];
  private destFilePaths: string[] = [];

  constructor() {
    this.createDirectory();
    this.createTempFiles();
  }

  private createDirectory() {
    const directoryPath = path.join(path.resolve(), 'data', this.tempDir);
    if (!fs.existsSync(directoryPath)) {
      fs.mkdirSync(directoryPath);
    }
  }

  private createTempFiles() {
    for (let i = 1; i <= this.NUM_OF_OUTPUT_FILES; i += 1) {
      const fileName = `file${i}.txt`;
      this.createTempFile(fileName);
    }
  }

  private createTempFile(fileName: string) {
    const filePath = path.join(path.resolve(), 'data', this.tempDir, fileName);
    this.tempFilePaths.push(filePath);
    this.tempFiles.push(fs.createWriteStream(filePath, 'utf-8'));
  }

  public moveToNextFile() {
    this.currentTempFile =
      (this.currentTempFile + 1) % this.NUM_OF_OUTPUT_FILES;
  }

  public writeLine(
    data: string,
    options?: { temp?: boolean; destIndex?: number }
  ) {
    const defaultOptions = { temp: true, destIndex: this.destFiles.length - 1 };
    Object.assign(defaultOptions, options);

    if (defaultOptions.temp) {
      this.tempFiles[this.currentTempFile].write(data, 'utf-8');
    } else {
      this.destFiles[defaultOptions.destIndex].write(data, 'utf-8');
    }
  }

  public closeAllFiles(dest: boolean = false) {
    if (!dest) {
      for (const file of this.tempFiles) {
        file.end();
      }
    } else {
      for (const file of this.destFiles) {
        file.end();
      }
    }
  }

  public openAllFiles(dest: boolean = false) {
    if (!dest) {
      this.tempFilePaths = [];
      this.tempFiles = [];
      this.createTempFiles();
    }
  }

  public getFilePaths(dest: boolean = false): string[] {
    if (!dest) {
      return this.tempFilePaths;
    } else {
      return this.destFilePaths;
    }
  }

  public addDestFile(filePath: string): number {
    this.destFiles.push(fs.createWriteStream(filePath, 'utf-8'));
    return this.destFiles.length - 1;
  }
}

class RunBuilder implements IRunBuilder {
  private currentRun: number[] = [];

  public addToRun(number: number) {
    this.currentRun.push(number);
  }

  public isRunEmpty() {
    return this.currentRun.length === 0;
  }

  public getRun() {
    return this.currentRun.slice();
  }

  public clearRun() {
    this.currentRun = [];
  }
}

export default class NaturalMergeSort implements INaturalMergeSort {
  private fileWriter: FileWriter;
  private fileReader: FileReader;
  private runBuilder: RunBuilder;
  private readonly SEPARATOR = ' ';

  constructor(private filePath: string) {
    this.fileWriter = new FileWriter();
    this.fileReader = new FileReader();
    this.runBuilder = new RunBuilder();
  }

  mergeArrays(arrays: number[][]) {
    const pointers = new Array(arrays.length).fill(0);

    while (true) {
      let smallest = Number.POSITIVE_INFINITY;
      let smallestIndex = -1;

      for (let i = 0; i < arrays.length; i++) {
        if (
          pointers[i] < arrays[i].length &&
          arrays[i][pointers[i]] < smallest
        ) {
          smallest = arrays[i][pointers[i]];
          smallestIndex = i;
        }
      }

      if (smallestIndex === -1) {
        break;
      }

      this.runBuilder.addToRun(smallest);
      pointers[smallestIndex]++;
    }

    for (let i = 0; i < arrays.length; i++) {
      while (pointers[i] < arrays[i].length) {
        this.runBuilder.addToRun(arrays[i][pointers[i]]);
        pointers[i]++;
      }
    }
  }

  public async sort() {
    const DEST_FILE_PATH = path.join(path.resolve(), 'data', 'sorted.txt');
    let passes = 0;
    let L;

    do {
      L = 0;
      let src: string;
      if (passes === 0) {
        src = this.fileReader.addReader(this.filePath);
      } else {
        src = this.fileReader.addReader(DEST_FILE_PATH);
        this.fileWriter.openAllFiles();
      }

      let prevNumber: number | undefined;

      while (this.fileReader.isOpened(src)) {
        const line = await this.fileReader.getLine(src);

        if (line) {
          console.log(line);
          const numbers = line.split(this.SEPARATOR).map((n) => +n);
          for (const number of numbers) {
            if (prevNumber !== undefined && number < prevNumber) {
              this.writeRunToFile();
            }
            this.runBuilder.addToRun(number);
            prevNumber = number;
          }
        }
      }

      this.writeRunToFile();
      this.fileWriter.closeAllFiles();
      this.fileReader.removeReader(src);

      const outputFilePaths = this.fileWriter.getFilePaths();
      const fileReaderIds: string[] = [];
      outputFilePaths.forEach((path) => {
        fileReaderIds.push(this.fileReader.addReader(path));
      });
      this.fileWriter.addDestFile(DEST_FILE_PATH);

      while (fileReaderIds.every((id) => this.fileReader.isOpened(id))) {
        const runPromises = fileReaderIds.map((id) =>
          this.fileReader.getLine(id)
        );
        const runs = await Promise.all(runPromises);
        if (!runs.every((run) => run)) {
          continue;
        }
        const arrays = runs.map((run) =>
          run.split(this.SEPARATOR).map((n) => +n)
        );

        this.mergeArrays(arrays);
        this.writeRunToFile(true);
        L += 1;
      }

      if (this.fileReader.isOpened(fileReaderIds[0])) {
        const line = await this.fileReader.getLine(fileReaderIds[0]);
        if (line) {
          const array = line.split(this.SEPARATOR);
          array.forEach((n) => {
            this.runBuilder.addToRun(+n);
          });
          this.writeRunToFile(true);
          L += 1;
        }
      }
      this.fileWriter.closeAllFiles(true);
      passes += 1;
      console.log(`L: ${L}`);
    } while (L > 1);
  }

  private writeRunToFile(dest?: boolean) {
    const run = this.runBuilder.getRun();

    if (!this.runBuilder.isRunEmpty()) {
      this.fileWriter.writeLine(run.join(this.SEPARATOR) + '\n', {
        temp: !dest,
      });
      this.runBuilder.clearRun();
      this.fileWriter.moveToNextFile();
    }
  }
}
