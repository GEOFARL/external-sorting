import * as fs from 'fs';
import * as path from 'path';

function getRandInt(min: number = -1000, max: number = 1000) {
  return min + Math.floor(Math.random() * (max - min)) + 1;
}

function formatBytes(bytes: number, decimals = 2) {
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

async function generateFile(byteSize: number = 1024 * 1024) {
  const GENERATED_FILENAME = `generated_file_${formatBytes(byteSize, 2)}.txt`;
  const SEPARATOR = ' ';
  // const NUMBER_OF_LINES = 1000;
  const NUMBERS_IN_LINE = 10;

  const writer = fs.createWriteStream(
    path.join(path.resolve(), 'data', GENERATED_FILENAME)
  );

  let bytesWritten = 0;

  do {
    const data = [...Array(NUMBERS_IN_LINE)].map(() => {
      return getRandInt();
    });
    let stringToWrite = data.join(SEPARATOR) + '\n';

    const bytes = Buffer.byteLength(stringToWrite, 'utf-8');
    if (bytes > byteSize - bytesWritten) {
      stringToWrite = Buffer.from(stringToWrite, 'utf-8')
        .subarray(0, byteSize - bytesWritten)
        .toString('utf-8');
      bytesWritten = byteSize;
    } else {
      bytesWritten += bytes;
    }
    const canWrite = writer.write(stringToWrite);

    if (!canWrite) {
      await new Promise<void>((resolve) => {
        writer.once('drain', () => {
          resolve();
        });
      });
      console.log(`Bytes Written: ${bytesWritten}`);
    }
  } while (bytesWritten < byteSize);

  writer.end();
}

generateFile(1024 * 1024);
