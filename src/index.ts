import { Command } from 'commander';
import { validateFilePath } from './utils/fileValidation';
import Sorter from './Sorter';
import { SortingTechnique } from './types';
import FileGenerator from './FileGenerator';

const program = new Command();

program
  .name('Polyphase merge sort')
  .description('CLI to sort huge files')
  .version('0.1.0');

program
  .command('sort')
  .description('Sort a given file externally')
  .argument('<filePath>', 'path to a file that is need to be sorted')
  .option(
    `-t, --type <${Object.values(SortingTechnique).join(', ')}>`,
    'type of the sorting algorithm',
    `${SortingTechnique.NATURAL_MERGE}`
  )
  .action(async (filePath, { type }) => {
    await validateFilePath(program, filePath);

    const start = performance.now();
    const sorter = new Sorter(filePath, type);
    await sorter.sort();
    const end = performance.now();
    console.log(filePath);
    console.log(`Elapsed: ${(end - start) / 1000}s`);
  });

program
  .command('generateFile')
  .description('Generate a file of dummy numbers')
  .argument('<fileSize>', 'Size of the file to be generated in bytes')
  .option(
    '-min, --minimumNumber <number>',
    'minimal number that will be generated inside of the file',
    '-1000'
  )
  .option(
    '-max, --maximumNumber <number>',
    'maximum number that will be generated inside of the file',
    '1000'
  )
  .option(
    '-nInL, --numbersInLine <number>',
    'number of numbers that a single line will contain',
    '10'
  )
  .action(async (fileSize, { minimumNumber, maximumNumber, numbersInLine }) => {
    console.log(fileSize, minimumNumber, maximumNumber, numbersInLine);
    const generator = new FileGenerator(
      numbersInLine,
      minimumNumber,
      maximumNumber
    );
    await generator.generateFile(fileSize);
  });

program.parse(process.argv);
