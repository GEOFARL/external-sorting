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
  addDestFile(filePath: string): number;
}

interface IFileReader {
  addReader(filePath: string): string;
  getReader(id: string): readline.Interface | undefined;
  removeReader(id: string): void;
  isOpened(id: string): boolean;
  getLine(id: string): Promise<string>;
}

interface INaturalMergeSort {
  sort(filePath: string): Promise<void>;
}

export { IRunBuilder, IFileWriter, IFileReader, INaturalMergeSort };
