import generateFile from './fileGeneration';
import { Command } from 'commander';
import { validateFilePath } from './fileValidation';
import NaturalMergeSort from './naturalMerge';
import readInChunks from './readInChunks';

const program = new Command();

program
  .name('Polyphase merge sort')
  .description('CLI to sort huge files')
  .version('0.1.0');

program.requiredOption('-f, --file <filePath>');

program.parse(process.argv);

const { file: filePath } = program.opts();

(async () => {
  await validateFilePath(program, filePath);

  // const sorter = new NaturalMergeSort(filePath);
  // await sorter.sort();
  const start = performance.now();
  await readInChunks(filePath);
  const end = performance.now();
  const elapsed = end - start;
  console.log(`Elapsed time: ${elapsed}`);
})();

// generateFile(1024 * 1024 * 500);
