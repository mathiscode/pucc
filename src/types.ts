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
 * Command handler function signature
 * @param args - Parsed command arguments
 * @param shell - The Pucc instance (for accessing shell methods)
 */
export type CommandHandler = (args: ParsedArgs, shell?: import('./core/Pucc').Pucc) => void | Promise<void>;

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
