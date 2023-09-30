import * as fs from 'fs';
import * as path from 'path';
import readline from 'node:readline/promises';

interface IRunBuilder {
  addToRun(number: number): void;
  isRunEmpty(): boolean;
  getRun(): number[];
  clearRun(): void;
}

interface IFileHandler {
  moveToNextFile(): void;
  writeLine(data: string): void;
  closeAllFiles(): void;
}

interface INaturalMergeSort {
  sort(filePath: string): Promise<void>;
}

class FileHandler implements IFileHandler {
  private currentFile = 0;
  private files: fs.WriteStream[] = [];
  private tempDir: string = 'temp';

  constructor() {
    this.createDirectory();
    this.createFiles();
  }

  private createDirectory() {
    const directoryPath = path.join(path.resolve(), 'data', this.tempDir);
    if (!fs.existsSync(directoryPath)) {
      fs.mkdirSync(directoryPath);
    }
  }

  private createFiles() {
    for (let i = 1; i <= 2; i += 1) {
      const fileName = `file${i}.txt`;
      const filePath = path.join(
        path.resolve(),
        'data',
        this.tempDir,
        fileName
      );
      this.files.push(fs.createWriteStream(filePath, 'utf-8'));
    }
  }

  public moveToNextFile() {
    this.currentFile = (this.currentFile + 1) % 2;
  }

  public writeLine(data: string) {
    this.files[this.currentFile].write(data, 'utf-8');
  }

  public closeAllFiles() {
    for (const file of this.files) {
      file.end();
    }
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
  private fileHandler: FileHandler;
  private runBuilder: RunBuilder;
  private readonly SEPARATOR = ' ';

  constructor(private filePath: string) {
    this.fileHandler = new FileHandler();
    this.runBuilder = new RunBuilder();
  }

  public async sort() {
    const src = fs.createReadStream(this.filePath, 'utf-8');
    const rl = readline.createInterface({
      input: src,
      crlfDelay: Infinity,
    });

    let prevNumber: number | undefined;

    for await (const line of rl) {
      const numbers = line.split(this.SEPARATOR).map((n) => +n);
      for (const number of numbers) {
        if (prevNumber !== undefined && number < prevNumber) {
          this.writeRunToFile();
        }
        this.runBuilder.addToRun(number);
        prevNumber = number;
      }
    }

    this.writeRunToFile();
    this.fileHandler.closeAllFiles();
  }

  private writeRunToFile() {
    const run = this.runBuilder.getRun();
    if (!this.runBuilder.isRunEmpty()) {
      this.fileHandler.writeLine(run.join(this.SEPARATOR) + '\n');
      this.runBuilder.clearRun();
      this.fileHandler.moveToNextFile();
    }
  }
}
