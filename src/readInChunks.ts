import * as fs from 'fs';

class Reader {
  private readonly CHUNK_SIZE = 500;
  private eof: boolean = false;
  private fd: number;
  private fileSize: number;
  private pos: number = 0;
  private sharedBuffer: Buffer;
  private leftOvers: string = '';

  private numbers: number[] = [];

  constructor(private filePath: string) {
    this.fd = fs.openSync(filePath, 'r');
    this.fileSize = fs.statSync(filePath).size;
    this.sharedBuffer = Buffer.alloc(this.CHUNK_SIZE);
  }

  private isEOF(): boolean {
    return this.eof;
  }

  public hasNumbers(): boolean {
    return !this.isEOF() || this.numbers.length > 0;
  }

  public async getNumber(): Promise<number> {
    if (this.numbers.length === 0) {
      await this.readData();
    }

    const number = this.numbers.shift();
    return number!;
  }

  public async peakNext(): Promise<number> {
    if (this.numbers.length === 0) {
      await this.readData();
    }
    return this.numbers[0];
  }

  public async readData() {
    let values: string[] = [];
    while (values.length < 1 && !this.isEOF()) {
      const chunk = await this.getChunk();

      let data: string = '';
      if (this.leftOvers) {
        data += this.leftOvers;
        this.leftOvers = '';
      }
      data += chunk;
      values = data.split(' ');

      if (!this.isEOF()) {
        this.leftOvers += values.pop();
      }
    }
    values.forEach((v) => this.numbers.push(+v));
  }

  private async *generateChunk() {
    let end = this.CHUNK_SIZE;

    for (let i = 0; i < Math.ceil(this.fileSize / this.CHUNK_SIZE); i++) {
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
    let value = data.value!.toString();
    value = value.replace(/\n/g, ' ').replace(/\x00/g, '');
    return value;
  }
}

export default async function readInChunks(filePath: string) {
  const reader = new Reader(filePath);

  while (reader.hasNumbers()) {
    const number = await reader.getNumber();
    console.log(`Current number: ${number}`);
    console.log(`Next number: ${await reader.peakNext()}`);
  }
}
