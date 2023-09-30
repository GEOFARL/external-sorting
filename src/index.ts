import generateFile from './fileGeneration';
import { Command } from 'commander';
import { validateFilePath } from './fileValidation';

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
  } catch (e) {}
})();

// generateFile(100);
