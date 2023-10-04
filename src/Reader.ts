import * as fs from 'fs';
import { IReader } from './types';

export default class Reader implements IReader {
  private readonly CHUNK_SIZE: number;
  private eof: boolean = false;
  private fd: number;
  private fileSize: number;
  private pos: number = 0;
  private sharedBuffer: Buffer;
  private leftOvers: string = '';
  private mergeEnds: boolean = false;
  public lineCount: number = 0;

  private numbers: number[][] = [];

  constructor(private filePath: string, chunkSize: number = 25) {
    this.CHUNK_SIZE = chunkSize;

    this.fd = fs.openSync(filePath, 'r');
    this.fileSize = fs.statSync(filePath).size;
    this.sharedBuffer = Buffer.alloc(this.CHUNK_SIZE);
  }

  private isEOF(): boolean {
    return this.eof;
  }

  public hasNumbers(): boolean {
    return (
      !this.isEOF() ||
      (this.numbers.length > 0 &&
        this.numbers[0].length > 0 &&
        (this.numbers[0][0] !== 0 || this.numbers[0].length > 1))
    );
  }

  public async getNumber(): Promise<number> {
    if (this.numbers.length === 0) {
      await this.readData();
    }

    const number = this.numbers[0].shift();
    if (this.numbers[0].length === 0) {
      if (this.numbers.length === 1) {
        await this.readData();
      }
      this.numbers.shift();
      if (!this.mergeEnds) {
        this.lineCount += 1;
      } else {
        this.mergeEnds = false;
      }
    }
    return number!;
  }

  public async peakNext(): Promise<number> {
    if (this.numbers.length === 0) {
      await this.readData();
    }
    return this.numbers[0][0];
  }

  public async readData(): Promise<void> {
    let values: string = '';

    while (!values && !this.isEOF()) {
      const chunk = await this.getChunk();

      let data: string = '';
      if (
        this.pos > this.CHUNK_SIZE &&
        !this.leftOvers.includes('\n') &&
        !chunk.startsWith('\n')
      ) {
        this.mergeEnds = true;
      }
      if (this.leftOvers) {
        data += this.leftOvers;
        this.leftOvers = '';
      }
      data += chunk;
      values = data;

      if (!this.isEOF()) {
        const splittedOnLastSpace = Reader.splitOnLastSpace(values);
        if (splittedOnLastSpace.length > 1) {
          this.leftOvers += splittedOnLastSpace.pop();
          values = splittedOnLastSpace[0];
        }
      }
    }
    values
      .trim()
      .split('\n')
      .forEach((line) => {
        this.numbers.push([]);

        if (line.endsWith('-')) line = line.slice(0, line.length - 1);

        const numbers = line
          .replace(/\s+/g, ' ')
          .trim()
          .split(' ')
          .map((value) => {
            if (isNaN(+value)) {
              throw new Error('File contains data that is not a number');
            }
            return +value;
          });
        this.numbers[this.numbers.length - 1].push(...numbers);
      });
  }

  private async *generateChunk(): AsyncGenerator<Buffer, void, unknown> {
    let end = this.CHUNK_SIZE;

    await this.readBytes(this.fd, this.sharedBuffer);
    this.pos += this.CHUNK_SIZE;
    if (this.pos >= this.fileSize) {
      // When we reach the end of file,
      // we have to calculate how many bytes were actually read
      end = this.CHUNK_SIZE - (this.pos - this.fileSize);
      this.eof = true;
    }
    yield this.sharedBuffer.subarray(0, end);
  }

  private readBytes(fd: number, sharedBuffer: Buffer) {
    return new Promise<void>((resolve, reject) => {
      fs.read(fd, sharedBuffer, 0, sharedBuffer.length, this.pos, (err) => {
        if (err) {
          return reject(err);
        }
        resolve();
      });
    });
  }

  public async getChunk(): Promise<string> {
    const chunk = this.generateChunk();
    const data = await chunk.next();
    const value = data.value!.toString();
    return value;
  }

  public reset(): void {
    this.eof = false;
    fs.closeSync(this.fd);
    if (fs.existsSync(this.filePath)) {
      this.fd = fs.openSync(this.filePath, 'r');
      this.fileSize = fs.statSync(this.filePath).size;
    }
    this.pos = 0;
    this.sharedBuffer = Buffer.alloc(this.CHUNK_SIZE);
    this.leftOvers = '';
    this.numbers = [];
  }

  public static splitOnLastSpace(line: string): string[] {
    const lastSpaceIndex = line.lastIndexOf(' ');

    if (lastSpaceIndex !== -1) {
      const firstPart = line.substring(0, lastSpaceIndex);
      const secondPart = line.substring(lastSpaceIndex + 1);
      return [firstPart, secondPart];
    } else {
      // No space found, return the entire line as the first part
      return [line];
    }
  }

  public getFileSize() {
    return this.fileSize;
  }
}
