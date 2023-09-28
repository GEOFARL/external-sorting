import * as fs from 'fs';
import * as path from 'path';
import * as events from 'events';

function getRandInt(min: number = -1000, max: number = 1000) {
  return min + Math.floor(Math.random() * (max - min)) + 1;
}

async function generateFile(byteSize: number = 1024 * 1024) {
  const GENERATED_FILENAME = `generated_file_${
    Math.round((byteSize / (1024 * 1024)) * 1000) / 1000
  }.txt`;
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
      console.log('Full');
      await new Promise<void>((resolve) => {
        writer.once('drain', () => {
          console.log('Drain');
          resolve();
        });
      });
      console.log(`Out, bytesWritten: ${bytesWritten}`);
    }
  } while (bytesWritten < byteSize);

  writer.end();
}

// generateFile(1024 * 1024 * 1000 * 16);
