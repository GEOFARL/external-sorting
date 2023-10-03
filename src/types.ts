import { RunsHandler } from './Sorter';

enum SortingTechnique {
  NATURAL_MERGE = 'natural-merge',
}

interface ISorter {
  sort(): Promise<void>;
}

interface IRunsHandler {
  getNumber(): Promise<number>;
  copyRun(anotherHandler: RunsHandler): Promise<void>;
  copyNumber(anotherHandler: RunsHandler): Promise<void>;
  peakNext(): Promise<number | null>;
  writeNL(): Promise<void>;
  isEOF(): boolean;
  isEOR(): Promise<boolean>;
  reset(): Promise<void>;
  resetFileContents(): Promise<void>;
  updateRunNumber(): void;
}

interface IFileHandler {
  getSrcRunHandlers(passes?: number): RunsHandler[];
  getDestRunHandlers(): RunsHandler[];
  switchSrcAndDest(): Promise<void>;
  moveToNextRun(): void;
  resetFiles(dest?: boolean): Promise<void>;
}

interface IReader {
  hasNumbers(): boolean;
  getNumber(): Promise<number>;
  peakNext(): Promise<number>;
  readData(): Promise<void>;
  reset(): void;
}

interface IWriter {
  write(data: string | number): Promise<void>;
  writeNumber(number: number): Promise<void>;
  reset(): Promise<void>;
  end(): Promise<void>;
}

enum FileSize {
  Bytes = 'Bytes',
  KB = 'KB',
  MB = 'MB',
  GB = 'GB',
}

export {
  IReader,
  IWriter,
  SortingTechnique,
  IRunsHandler,
  IFileHandler,
  ISorter,
  FileSize,
};
