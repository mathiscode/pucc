import * as ansi from '../ansi';
import type { CommandHandler } from '../types';
import { VERSION } from '../version';

/**
 * Built-in about command handler
 */
export const aboutCommand: CommandHandler = (_args, shell) => {
  const logger = shell?.getLogger();
  const separator = '─'.repeat(50);
  const prefix = shell?.getCommandPrefix() ?? '$';

  const title = ansi.bold(ansi.blue('Pucc'));
  const separatorLine = ansi.gray(separator);
  const version = ansi.cyan(`Version: ${VERSION}`);
  const description = 'Power User Console Component - A browser console command system library';
  const helpText = `Use ${ansi.bold(ansi.green(`${prefix}help`))} to see available commands`;

  console.log(title);
  console.log(separatorLine);
  console.log(version);
  console.log(description);
  console.log(separatorLine);
  console.log(helpText);

  if (logger) {
    logger.writeln('\r\n' + title);
    logger.writeln(separatorLine);
    logger.writeln(version);
    logger.writeln(description);
    logger.writeln(separatorLine);
    logger.writeln(helpText);
  }
};
