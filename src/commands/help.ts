import * as ansi from '../ansi';
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

  const title = ansi.bold(ansi.cyan('\r\n\r\nAvailable Commands:'));
  const separatorLine = ansi.gray(separator);

  console.log(title);
  console.log(separatorLine);
  logger?.writeln(title);
  logger?.writeln(separatorLine);

  commands.forEach((cmd: Command) => {
    const consoleText = `${ansi.bold(ansi.green(`${prefix}${cmd.name}(...args)`))} - ${ansi.gray(cmd.description)}`;
    const terminalText = `${ansi.bold(ansi.green(cmd.name))} - ${ansi.gray(cmd.description)}`;

    console.log(consoleText);
    logger?.writeln(terminalText);
  });

  const footer = ansi.gray(separator);
  const total = ansi.dim(`Total: ${commands.length} command(s)`);

  console.log(footer);
  console.log(total);
  logger?.writeln(footer);
  logger?.writeln(total);
};
