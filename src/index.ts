import generateFile from './fileGeneration';
import { Command } from 'commander';
import { validateFilePath } from './fileValidation';
import NaturalMergeSort from './naturalMerge';

const program = new Command();

program
  .name('Polyphase merge sort')
  .description('CLI to sort huge files')
  .version('0.1.0');

program.requiredOption('-f, --file <filePath>');

program.parse(process.argv);

const { file: filePath } = program.opts();

(async () => {
  try {
    await validateFilePath(program, filePath);

    // await naturalMerge(filePath);
    const sorter = new NaturalMergeSort(filePath);
    await sorter.sort();
  } catch (e) {}
})();

// generateFile(1024 * 1024 * 500);
