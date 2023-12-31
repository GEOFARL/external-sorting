import { Command } from 'commander';
import { errorColor, validateFilePath } from './utils/fileValidation';
import Sorter from './Sorter';
import { FileSize, SortingTechnique } from './types';
import FileGenerator from './FileGenerator';

const program = new Command();

program.name('Sorter').description('CLI to sort huge files').version('0.1.0');

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
    `-ps, --presort`,
    'whether to presort file before applying chosen algorithm'
  )
  .action(async (filePath, { type, presort }) => {
    await validateFilePath(program, filePath);

    if (!Object.values(SortingTechnique).includes(type)) {
      program.error(
        errorColor(
          `Incorrectly chosen type of sorting algorithm\nChoose one of these: ${Object.values(
            SortingTechnique
          ).join(', ')}`
        )
      );
    }

    console.log('Sorting a file...');
    console.log(filePath);
    const start = performance.now();
    const sorter = new Sorter(filePath, type, presort);
    try {
      await sorter.sort();
    } catch (err) {
      if (err instanceof Error) {
        program.error(errorColor(err.message));
      } else {
        throw err;
      }
    }
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
