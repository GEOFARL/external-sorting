import { Command } from 'commander';
import { validateFilePath } from './fileValidation';
import Sorter from './Sorter';
import { SortingTechnique } from './types';
import FileGenerator from './fileGeneration';

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

  const start = performance.now();
  const sorter = new Sorter(filePath, SortingTechnique.NATURAL_MERGE);
  await sorter.sort();
  const end = performance.now();
  console.log(filePath);
  console.log(`Elapsed: ${(end - start) / 1000}s`);
})();

// const generator = new FileGenerator();
// (async () => {
//   for (let i = 1024 * 1024 * 20; i < 1024 * 1024 * 100; i *= 2) {
//     await generator.generateFile(i);
//   }
// })();
