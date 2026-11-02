import chalk from 'chalk';
import type { Command, CommandHandler } from '../types';

/**
 * Built-in help command handler
 */
export const helpCommand: CommandHandler = (_args, shell) => {
  if (!shell) {
    console.error('Pucc instance not available');
    return;
  }

  const commands = shell.getCommands();
  const logger = shell.getLogger();

  if (commands.length === 0) {
    const msg = 'No commands registered.';
    console.log(msg);
    logger?.info(msg);
    return;
  }

  const separator = '─'.repeat(50);
  const prefix = shell.getCommandPrefix();

  const title = chalk.bold.cyan('\r\n\r\nAvailable Commands:');
  const separatorLine = chalk.gray(separator);

  console.log(title);
  console.log(separatorLine);
  logger?.writeln(title);
  logger?.writeln(separatorLine);

  commands.forEach((cmd: Command) => {
    const consoleText = `${chalk.green.bold(`${prefix}${cmd.name}(...args)`)} - ${chalk.gray(cmd.description)}`;
    const terminalText = `${chalk.green.bold(cmd.name)} - ${chalk.gray(cmd.description)}`;

    console.log(consoleText);
    logger?.writeln(terminalText);
  });

  const footer = chalk.gray(separator);
  const total = chalk.dim(`Total: ${commands.length} command(s)`);

  console.log(footer);
  console.log(total);
  logger?.writeln(footer);
  logger?.writeln(total);
};
