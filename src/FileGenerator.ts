import * as path from 'path';
import Writer from './Writer';

export default class FileGenerator {
  private readonly SEPARATOR: string = ' ';
  private readonly NUMBERS_IN_LINE: number;

  private readonly MIN_NUMBER: number;
  private readonly MAX_NUMBER: number;

  constructor(N_IN_L: number, MIN: number, MAX: number) {
    this.NUMBERS_IN_LINE = +N_IN_L;
    this.MIN_NUMBER = +MIN;
    this.MAX_NUMBER = +MAX;
  }

  public async generateFile(byteSize: number = 1024 * 1024) {
    const GENERATED_FILENAME = `generated_file_${FileGenerator.formatBytes(
      byteSize,
      2
    )}.txt`;

    const writer = new Writer(
      path.join(path.resolve(), 'data', GENERATED_FILENAME)
    );

    let bytesWritten = 0;
    await writer.resetFileContents();
    do {
      const data = [...Array(this.NUMBERS_IN_LINE)].map(() => {
        return this.getRandInt();
      });
      let stringToWrite = data.join(this.SEPARATOR) + '\n';

      const bytes = Buffer.byteLength(stringToWrite, 'utf-8');
      if (bytes > byteSize - bytesWritten) {
        stringToWrite = Buffer.from(stringToWrite, 'utf-8')
          .subarray(0, byteSize - bytesWritten)
          .toString('utf-8');
        bytesWritten = byteSize;
      } else {
        bytesWritten += bytes;
      }

      await writer.write(stringToWrite);
    } while (bytesWritten < byteSize);

    await writer.end();
  }

  private getRandInt() {
    return (
      Math.floor(Math.random() * (this.MAX_NUMBER - this.MIN_NUMBER + 1)) +
      this.MIN_NUMBER
    );
  }

  public static formatBytes(bytes: number, decimals = 2) {
    if (!+bytes) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = [
      'Bytes',
      'KiB',
      'MiB',
      'GiB',
      'TiB',
      'PiB',
      'EiB',
      'ZiB',
      'YiB',
    ];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))}${sizes[i]}`;
  }
}
