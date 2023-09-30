import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuid } from 'uuid';
import readline from 'node:readline/promises';

interface IRunBuilder {
  addToRun(number: number): void;
  isRunEmpty(): boolean;
  getRun(): number[];
  clearRun(): void;
}

interface IFileWriter {
  moveToNextFile(): void;
  writeLine(data: string): void;
  closeAllFiles(): void;
  getFilePaths(): string[];
}

interface INaturalMergeSort {
  sort(filePath: string): Promise<void>;
}

class FileReader {
  private lineReaders: {
    [key: string]: readline.Interface;
  } = {};

  public addReader(filePath: string) {
    const src = fs.createReadStream(filePath, 'utf-8');
    const rl = readline.createInterface({
      input: src,
      crlfDelay: Infinity,
    });
    const id = uuid();
    this.lineReaders[id] = rl;
    return id;
  }

  public getReader(id: string) {
    return this.lineReaders[id];
  }

  public removeReader(id: string) {
    this.lineReaders[id].close();
    delete this.lineReaders[id];
  }
}

class FileWriter implements IFileWriter {
  private currentFile = 0;
  private files: fs.WriteStream[] = [];
  private tempDir: string = 'temp';
  private filePaths: string[] = [];

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
      this.filePaths.push(filePath);
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

  public getFilePaths(): string[] {
    return this.filePaths;
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

  public async sort() {
    const src = this.fileReader.addReader(this.filePath);
    const srcReader = this.fileReader.getReader(src);

    let prevNumber: number | undefined;

    for await (const line of srcReader) {
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
    this.fileWriter.closeAllFiles();
    this.fileReader.removeReader(src);

    const outputFilePaths = this.fileWriter.getFilePaths();
    const fileReaderIds: string[] = [];
    outputFilePaths.forEach((path) => {
      fileReaderIds.push(this.fileReader.addReader(path));
    });

    const fileReaders = fileReaderIds.map((id) =>
      this.fileReader.getReader(id)
    );
  }

  private writeRunToFile() {
    const run = this.runBuilder.getRun();
    if (!this.runBuilder.isRunEmpty()) {
      this.fileWriter.writeLine(run.join(this.SEPARATOR) + '\n');
      this.runBuilder.clearRun();
      this.fileWriter.moveToNextFile();
    }
  }
}
