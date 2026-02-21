import type { Command, CommandHandler } from '../types';
import { CommandParser } from './CommandParser';
import { helpCommand } from '../commands/help';
import { aboutCommand } from '../commands/about';
import { echoCommand } from '../commands/echo';
import type { TerminalLogger } from '../components/TerminalLogger';
import chalk from 'chalk';

/**
 * Core Pucc class managing command registry and execution
 */
export class Pucc {
  private commands: Map<string, Command> = new Map();
  private initialized = false;
  private logger: TerminalLogger | null = null;
  private customHelpHandler: CommandHandler | null = null;
  private enableGlobalRegistrations: boolean;
  private commandPrefix: string;

  constructor(options?: { customHelpHandler?: CommandHandler; initialCommands?: Command[]; enableGlobalRegistrations?: boolean; commandPrefix?: string }) {
    this.enableGlobalRegistrations = options?.enableGlobalRegistrations !== false;
    const prefix = options?.commandPrefix ?? '$';
    this.validateCommandPrefix(prefix);
    this.commandPrefix = prefix;
    this.registerBuiltInCommands();
    if (options?.customHelpHandler) this.customHelpHandler = options.customHelpHandler;
    if (options?.initialCommands) this.registerInitialCommands(options.initialCommands);
  }

  /**
   * Validate that the command prefix contains only characters valid for JavaScript function names
   * Valid characters: letters (a-z, A-Z), digits (0-9), underscore (_), dollar sign ($)
   * Must start with a letter, underscore, or dollar sign
   */
  private validateCommandPrefix(prefix: string): void {
    if (!prefix || typeof prefix !== 'string') {
      throw new Error('Command prefix must be a non-empty string');
    }

    const validIdentifierPattern = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;
    if (!validIdentifierPattern.test(prefix)) {
      throw new Error(
        `Invalid command prefix "${prefix}". Prefix must be a valid JavaScript identifier ` +
        `(must start with a letter, underscore, or dollar sign, and can only contain ` +
        `letters, digits, underscores, and dollar signs)`
      );
    }
  }

  /**
   * Register a custom command
   */
  addCommand(name: string, handler: CommandHandler, description: string): void {
    if (!name || typeof name !== 'string') throw new Error('Command name must be a non-empty string');
    if (name.startsWith(this.commandPrefix)) throw new Error(`Command name should not include the ${this.commandPrefix} prefix`);
    if (typeof handler !== 'function') throw new Error('Command handler must be a function');
    if (this.commands.has(name)) console.warn(`Command "${name}" already exists. Overwriting...`);

    this.commands.set(name, {
      name,
      description: description || 'No description provided',
      handler,
    });

    // Attach to window for console access (if global registrations are enabled)
    if (this.enableGlobalRegistrations) this.attachCommandToWindow(name);
  }

  /**
   * Execute a command by name with arguments
   */
  execute(commandName: string, input: string = '', logger?: TerminalLogger | null): void {
    const previousLogger = this.logger
    if (logger !== undefined) {
      this.logger = logger
    }

    try {
      const command = this.commands.get(commandName);
      
      if (!command) {
        const errorMsg = `Command "${commandName}" not found. Use help or ${this.commandPrefix}help to see available commands.`;
        console.error(errorMsg);
        this.logger?.error('\r\n' + chalk.red(errorMsg));
        return;
      }

      try {
        const args = CommandParser.parse(input);
        // Pass the shell instance to the handler so it can access shell methods
        const result = command.handler(args, this);
        
        // Handle async handlers
        if (result instanceof Promise) {
          result.catch((error) => {
            const errorMsg = `Error executing command "${commandName}": ${error}`;
            console.error(errorMsg);
            this.logger?.error('\r\n' + chalk.red(errorMsg));
          });
        }
      } catch (error) {
        const errorMsg = `Error executing command "${commandName}": ${error}`;
        console.error(errorMsg);
        this.logger?.error('\r\n' + chalk.red(errorMsg));
      }
    } finally {
      if (logger !== undefined) {
        this.logger = previousLogger
      }
    }
  }

  /**
   * Execute a command from raw input string (handles command prefix automatically)
   */
  executeFromInput(input: string, logger?: TerminalLogger | null): void {
    const trimmed = input.trim();
    if (!trimmed) return;

    let commandName = trimmed;
    let args = '';

    const spaceIndex = trimmed.indexOf(' ');
    if (spaceIndex > 0) {
      commandName = trimmed.slice(0, spaceIndex);
      args = trimmed.slice(spaceIndex + 1);
    }

    // Strip command prefix if present
    if (commandName.startsWith(this.commandPrefix)) commandName = commandName.slice(this.commandPrefix.length);
    this.execute(commandName, args, logger);
  }

  /**
   * Get all registered commands
   */
  getCommands(): Command[] {
    return Array.from(this.commands.values());
  }

  /**
   * Get a specific command by name
   */
  getCommand(name: string): Command | undefined {
    return this.commands.get(name);
  }

  /**
   * Initialize the shell and attach to window
   */
  initialize(): void {
    if (this.initialized) return;

    // Attach all existing commands to window (if global registrations are enabled)
    if (this.enableGlobalRegistrations) {
      this.commands.forEach((_, name) => {
        this.attachCommandToWindow(name);
      });
    }

    this.initialized = true;
  }

  /**
   * Register built-in commands
   */
  private registerBuiltInCommands(): void {
    const helpHandler = this.customHelpHandler || helpCommand;
    this.addCommand('help', helpHandler, 'Display all available commands');
    this.addCommand('about', aboutCommand, 'Show library information');
    this.addCommand('echo', echoCommand, 'Echo text');
  }

  /**
   * Register initial commands provided in constructor
   */
  private registerInitialCommands(commands: Command[]): void {
    commands.forEach((cmd) => {
      this.addCommand(cmd.name, cmd.handler, cmd.description);
    });
  }

  /**
   * Get the terminal logger if available
   */
  getLogger(): TerminalLogger | null {
    return this.logger;
  }

  /**
   * Set the terminal logger
   */
  setLogger(logger: TerminalLogger | null): void {
    this.logger = logger;
  }

  /**
   * Get the command prefix
   */
  getCommandPrefix(): string {
    return this.commandPrefix;
  }

  /**
   * Attach a command to window as both prefix+commandName and commandName
   */
  private attachCommandToWindow(name: string): void {
    const prefixedName = `${this.commandPrefix}${name}`;
    type CommandFunction = (...args: string[]) => void;
    
    // Create prefixed version (prefix+commandName) for backward compatibility
    (window as Window & Record<string, CommandFunction>)[prefixedName] = (...args: string[]) => {
      const input = args.length > 0 ? args.join(' ') : '';
      this.execute(name, input);
    };

    // Create non-prefixed version (commandName) for new usage
    if (!window[name as keyof Window]) {
      (window as Window & Record<string, CommandFunction>)[name] = (...args: string[]) => {
        const input = args.length > 0 ? args.join(' ') : '';
        this.execute(name, input);
      };
    }
  }
}
