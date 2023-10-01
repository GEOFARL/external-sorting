import * as fs from 'fs';
import * as path from 'path';

class Writer {
  private writeStream: fs.WriteStream;
  constructor(private filePath: string) {
    this.writeStream = fs.createWriteStream(filePath, {
      encoding: 'utf-8',
    });
  }

  public async write(data: string | number) {
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

  public async writeNumber(number: number) {
    await this.write(number + ' ');
  }
}

export default async function writeNumbers() {
  const generateRandomArray = (length: number, min: number, max: number) =>
    Array.from(
      { length },
      () => Math.floor(Math.random() * (max - min + 1)) + min
    );

  const arr: number[] = generateRandomArray(10000, -100, 100);

  const writer = new Writer(
    path.join(path.resolve(), 'data', 'temp', 'test.txt')
  );

  let numInLineCounter = 0;
  for (const number of arr) {
    if (numInLineCounter >= 10) {
      await writer.write('\n');
      numInLineCounter = 0;
    }
    await writer.writeNumber(number);
    numInLineCounter += 1;
  }
}
