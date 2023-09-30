import { Command } from 'commander';
import * as fs from 'fs';

function errorColor(str: string) {
  // Add ANSI escape codes to display text in red.
  return `\x1b[31m${str}\x1b[0m`;
}

export async function validateFilePath(program: Command, filePath: string) {
  if (!fs.existsSync(filePath)) {
    program.error(errorColor(`Invalid path: ${filePath}`), { exitCode: 1 });
  } else {
    const stats = await fs.promises.stat(filePath);

    if (!stats.isFile()) {
      program.error(errorColor(`Provided path '${filePath}' is not a file`), {
        exitCode: 1,
      });
    }

    const fileExtension = filePath.split('.').pop();

    if (fileExtension !== 'txt') {
      program.error(errorColor("File should have '.txt' extension"), {
        exitCode: 1,
      });
    }
  }
}
