import generateFile from './fileGeneration';
import { Command } from 'commander';

const program = new Command();

program
  .name('Polyphase merge sort')
  .description('CLI to sort huge files')
  .version('0.1.0');

program.requiredOption('-f, --file <filePath>');

program.parse(process.argv);

// generateFile(100);
