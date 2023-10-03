import path from 'path';
import fs from 'fs';
import RunsHandler from './RunsHandler';
import { IFileHandler } from './types';
import FileGenerator from './FileGenerator';

export default class FileHandler implements IFileHandler {
  private numberOfSourceFiles: number;
  private numberOfDestFiles: number;

  private srcRunHandlers: RunsHandler[] = [];
  private destRunHandlers: RunsHandler[] = [];

  private readonly DIR_PATH: string = path.join(path.resolve(), 'data');
  private readonly TEMP_DIR_NAME: string = 'temp';
  private destFileNames: string[] = [];

  private tempSrcFilePath: string = '';
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

      const fileSize = runHandler.getReader().getFileSize();
      const formatted = FileGenerator.formatBytes(fileSize);

      const filePath = path.join(this.DIR_PATH, `sorted_file_${formatted}.txt`);
      fs.writeFileSync(filePath, '');

      this.srcRunHandlers.push(new RunsHandler(filePath));
      return [new RunsHandler(this.tempSrcFilePath)];
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

  public cleanUp(): void {
    fs.rmSync(path.join(this.DIR_PATH, this.TEMP_DIR_NAME), {
      recursive: true,
      force: true,
    });

    fs.rmSync(this.tempSrcFilePath);
  }

  public setTempSrcFilePath(path: string): void {
    this.tempSrcFilePath = path;
  }
}
