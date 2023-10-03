import * as fs from 'fs';
import { IWriter } from './types';

export default class Writer implements IWriter {
  private writeStream: fs.WriteStream;
  constructor(private filePath: string) {
    this.writeStream = fs.createWriteStream(filePath, {
      encoding: 'utf-8',
      flags: 'a',
    });
  }

  public async write(data: string | number): Promise<void> {
    if (!this.writeStream.write(data)) {
      return new Promise<void>((resolve) => {
        this.writeStream.once('drain', () => {
          resolve();
        });
      });
    } else {
      return Promise.resolve();
    }
  }

  public async writeNumber(number: number): Promise<void> {
    if (number === undefined) throw 'Undefined';
    await this.write(number + ' ');
  }

  public async reset(): Promise<void> {
    await this.end();

    this.writeStream = fs.createWriteStream(this.filePath, {
      encoding: 'utf-8',
      flags: 'a',
    });
  }

  public end(): Promise<void> {
    this.writeStream.end();
    return new Promise<void>((resolve) => {
      this.writeStream.once('finish', () => {
        resolve();
      });
    });
  }
}
