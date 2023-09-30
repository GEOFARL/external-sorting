import * as fs from 'fs';
import * as path from 'path';
import readline from 'node:readline/promises';

interface Run {
  numbers: number[];
}

async function naturalMerge(filePath: string) {
  const DIR_NAME_TEMP = 'temp';
  const src = fs.createReadStream(filePath, 'utf-8');

  if (!fs.existsSync(path.join(path.resolve(), 'data', DIR_NAME_TEMP))) {
    fs.mkdirSync(path.join(path.resolve(), 'data', DIR_NAME_TEMP));
  }

  const f1 = fs.createWriteStream(
    path.join(path.resolve(), 'data', DIR_NAME_TEMP, 'file1.txt')
  );
  const f2 = fs.createWriteStream(
    path.join(path.resolve(), 'data', DIR_NAME_TEMP, 'file2.txt')
  );

  const files = [f1, f2];

  let currentFile = 0;
  const nextFile = () => {
    currentFile = (currentFile + 1) % 2;
    return currentFile;
  };

  const SEPARATOR = ' ';

  const rl = readline.createInterface({
    input: src,
    crlfDelay: Infinity,
  });

  const buffer = [];
  const run: Run = {
    numbers: [],
  };

  for await (const line of rl) {
    const numbers = line.split(SEPARATOR).map((n) => +n);
    for (const number of numbers) {
      if (number < run.numbers[run.numbers.length - 1]) {
        files[currentFile].write(run.numbers.join(SEPARATOR) + '\n', 'utf-8');
        nextFile();
        run.numbers = [];
      }

      run.numbers.push(number);
    }
    files[currentFile].write(run.numbers.join(SEPARATOR) + '\n', 'utf-8');
  }
}

export default naturalMerge;
