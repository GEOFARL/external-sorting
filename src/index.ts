import * as fs from 'fs';
import * as path from 'path';

function generateRandomNumber(min: number = -1000, max: number = 1000) {
  return min + Math.floor(Math.random() * (max - min)) + 1;
}

function generateFile() {
  const GENERATED_FILENAME = 'generated_file.txt';
  const SEPARATOR = ' ';
  const NUMBER_OF_LINES = 1000;
  const NUMBERS_IN_LINE = 10;

  const writer = fs.createWriteStream(
    path.join(path.resolve(), 'data', GENERATED_FILENAME)
  );

  for (let i = 0; i < NUMBER_OF_LINES; i += 1) {
    const data = [...Array(NUMBERS_IN_LINE)].map(() => {
      return generateRandomNumber();
    });
    writer.write(data.join(SEPARATOR) + '\n');
  }

  writer.end();
}

generateFile();
