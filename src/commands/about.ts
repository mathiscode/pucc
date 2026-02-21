import type { CommandHandler } from '../types';
import chalk from 'chalk';

/**
 * Built-in about command handler
 */
export const aboutCommand: CommandHandler = (_args, shell) => {
  const logger = shell?.getLogger();
  const separator = '─'.repeat(50);
  const prefix = shell?.getCommandPrefix() ?? '$';
  
  const title = chalk.bold.blue('Pucc');
  const separatorLine = chalk.gray(separator);
  const version = chalk.cyan('Version: 1.0.0');
  const description = 'Power User Console Component - A browser console command system library';
  const helpText = `Use ${chalk.green.bold(`${prefix}help`)} to see available commands`;
  
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
