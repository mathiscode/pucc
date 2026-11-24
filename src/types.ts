/**
 * Parsed command arguments structure
 */
export interface ParsedArgs {
  /**
   * Positional arguments (array of strings)
   */
  _: string[];
  /**
   * Key-value pairs (all other properties)
   */
  [key: string]: string | number | boolean | string[];
}

/**
 * Per-invocation context passed to command handlers
 */
export interface CommandContext {
  /**
   * Logger of the terminal that ran the command. Unlike `shell.logger`, it stays correct after the
   * handler's first `await`, so long-running commands should write through it.
   */
  logger: import('./components/TerminalLogger').TerminalLogger | null;
  /**
   * Aborted when the user cancels the command (Ctrl+C). Pass it to `fetch` or check it in loops.
   */
  signal: AbortSignal;
}

/**
 * Command handler function signature
 * @param args - Parsed command arguments
 * @param shell - The Pucc instance (for accessing shell methods)
 * @param ctx - Logger and cancellation signal for this invocation
 */
export type CommandHandler = (
  args: ParsedArgs,
  shell?: import('./core/Pucc').Pucc,
  ctx?: CommandContext
) => void | Promise<void>;

/**
 * Command definition
 */
export interface Command {
  name: string;
  description: string;
  handler: CommandHandler;
}

/**
 * Window augmentation for Pucc
 */
declare global {
  interface Window {
    Pucc: import('./core/Pucc').Pucc;
    [key: `$${string}`]: (...args: string[]) => void;
    [key: string]: unknown; // Allow non-prefixed command names and other properties
  }
}
