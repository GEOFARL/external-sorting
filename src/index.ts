import { Command } from 'commander';
import { validateFilePath } from './utils/fileValidation';
import Sorter from './Sorter';
import { FileSize, SortingTechnique } from './types';
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
  .option(
    `-ps, --presort <boolean>`,
    'whether to presort file before applying chosen algorithm',
    'true'
  )
  .action(async (filePath, { type, presort }) => {
    await validateFilePath(program, filePath);

    console.log('Sorting a file...');
    console.log(filePath);
    const start = performance.now();
    const sorter = new Sorter(filePath, type, presort === 'true');
    await sorter.sort();
    const end = performance.now();
    console.log('Finished!');
    console.log(`Elapsed: ${(end - start) / 1000}s`);
  });

program
  .command('generateFile')
  .description('Generate a file of dummy numbers')
  .argument('<fileSize>', 'Size of the file to be generated')
  .option(
    `-u, --units <${Object.values(FileSize).join(', ')}>`,
    'units of measurement of the generated file size',
    `${FileSize.Bytes}`
  )
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
  .action(
    async (
      fileSize,
      { minimumNumber, maximumNumber, numbersInLine, units }
    ) => {
      const multipliers = {
        [FileSize.Bytes]: 1,
        [FileSize.KB]: 1024,
        [FileSize.MB]: 1024 * 1024,
        [FileSize.GB]: 1024 * 1024 * 1024,
      };

      const generator = new FileGenerator(
        numbersInLine,
        minimumNumber,
        maximumNumber
      );
      console.log('Generating a file...');
      await generator.generateFile(fileSize * multipliers[units as FileSize]);
      console.log('Done!');
    }
  );

program.parse(process.argv);
