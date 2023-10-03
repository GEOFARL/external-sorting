import * as path from 'path';
import Writer from './Writer';

export default class FileGenerator {
  private readonly SEPARATOR: string = ' ';
  private readonly NUMBERS_IN_LINE: number = 10;

  public async generateFile(byteSize: number = 1024 * 1024) {
    const GENERATED_FILENAME = `generated_file_${this.formatBytes(
      byteSize,
      2
    )}.txt`;

    const writer = new Writer(
      path.join(path.resolve(), 'data', GENERATED_FILENAME)
    );

    let bytesWritten = 0;

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

  private getRandInt(min: number = -1000, max: number = 1000) {
    return min + Math.floor(Math.random() * (max - min)) + 1;
  }

  private formatBytes(bytes: number, decimals = 2) {
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
