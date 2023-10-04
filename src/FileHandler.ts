import path from 'path';
import fs from 'fs';
import RunsHandler from './RunsHandler';
import { IFileHandler } from './types';
import FileGenerator from './FileGenerator';

type ConstructorOptions = {
  addSrcRunHandler?: boolean;
  initSrcRunHandlers?: boolean;
};

export default class FileHandler implements IFileHandler {
  private numberOfSourceFiles: number;
  private numberOfDestFiles: number;

  private srcRunHandlers: RunsHandler[] = [];
  private destRunHandlers: RunsHandler[] = [];

  private readonly DIR_PATH: string = path.join(path.resolve(), 'data');
  private readonly TEMP_DIR_NAME: string = 'temp';
  private destFileNames: string[] = [];
  private srcFileNames: string[] = [];

  private options: ConstructorOptions;

  private tempSrcFilePath: string = '';
  constructor(
    private srcFilePath: string,
    numOfSrc: number,
    numOfDest: number,
    options?: ConstructorOptions
  ) {
    this.numberOfSourceFiles = numOfSrc;
    this.numberOfDestFiles = numOfDest;

    this.options = Object.assign(
      { addSrcRunHandler: true, initSrcRunHandlers: false },
      options
    );

    this.initRuns();
  }

  private initRuns(): void {
    if (this.options.addSrcRunHandler) {
      this.srcRunHandlers.push(new RunsHandler(this.srcFilePath));
    }

    this.initTempDir();
    const numberOfFiles =
      this.numberOfDestFiles +
      (this.options.initSrcRunHandlers ? this.numberOfSourceFiles : 0);

    for (let i = 0; i < numberOfFiles; i++) {
      const fileName = `file${i}.txt`;
      const filePath = path.join(this.DIR_PATH, this.TEMP_DIR_NAME, fileName);
      fs.writeFileSync(filePath, '');

      if (i < this.numberOfDestFiles) {
        this.destFileNames.push(fileName);
        this.destRunHandlers.push(new RunsHandler(filePath));
      } else {
        this.srcFileNames.push(fileName);
        this.srcRunHandlers.push(new RunsHandler(filePath));
      }
    }
  }

  private initTempDir(): void {
    const directoryPath = path.join(this.DIR_PATH, this.TEMP_DIR_NAME);
    if (!fs.existsSync(directoryPath)) {
      fs.mkdirSync(directoryPath);
    }
  }

  public getSrcRunHandlers(
    passes?: number,
    presorted?: boolean
  ): RunsHandler[] {
    if (passes === 0) {
      const runHandler = this.srcRunHandlers.pop()!;

      const fileSize = runHandler.getReader().getFileSize();
      const formatted = FileGenerator.formatBytes(fileSize);

      const filePath = path.join(this.DIR_PATH, `sorted_file_${formatted}.txt`);
      fs.writeFileSync(filePath, '');

      this.srcRunHandlers.push(new RunsHandler(filePath));
      if (presorted) {
        return [new RunsHandler(this.tempSrcFilePath)];
      } else {
        return [runHandler];
      }
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

    if (fs.existsSync(this.tempSrcFilePath)) {
      fs.rmSync(this.tempSrcFilePath);
    }
  }

  public setTempSrcFilePath(path: string): void {
    this.tempSrcFilePath = path;
  }

  public getTempSrcFilePath(): string {
    return this.tempSrcFilePath;
  }

  async moveResultFile(filePath: string): Promise<void> {
    const runHandler = new RunsHandler(this.srcFilePath);
    const fileSize = runHandler.getReader().getFileSize();
    const formatted = FileGenerator.formatBytes(fileSize);

    // Extract the file name from the source file path
    const fileName = `sorted_file_${formatted}.txt`;

    // Create the destination file path by combining the destination directory and file name
    const destinationFilePath = path.join(this.DIR_PATH, fileName);
    fs.writeFileSync(destinationFilePath, ''); // Replace with the destination directory

    // Rename and move the file
    await fs.promises.rename(filePath, destinationFilePath);
  }
}
