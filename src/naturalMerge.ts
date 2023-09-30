import * as fs from 'fs';
import readline from 'node:readline/promises';

async function naturalMerge(filePath: string) {
  const src = fs.createReadStream(filePath, 'utf-8');

  const rl = readline.createInterface({
    input: src,
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    console.log(line);
  }
}

export default naturalMerge;
