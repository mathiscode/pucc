# Pucc

[![Live Demo](https://img.shields.io/badge/Live%20Demo-rebeccapurple)](https://mathiscode.github.io/pucc/)

[![npm](https://img.shields.io/npm/v/@mathiscode/pucc)](https://www.npmjs.com/package/@mathiscode/pucc)
[![Created](https://img.shields.io/github/created-at/mathiscode/pucc?style=flat&label=created&color=success)](https://github.com/mathiscode/pucc/pulse)
[![Star on GitHub](https://img.shields.io/github/stars/mathiscode/pucc?style=flat&logo=github&label=⭐️%20stars)](https://github.com/mathiscode/pucc/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/mathiscode/pucc?style=flat&logo=github&label=🔀%20forks)](https://github.com/mathiscode/pucc/forks)
[![GitHub watchers](https://img.shields.io/github/watchers/mathiscode/pucc?style=flat&logo=github&label=👀%20watchers)](https://github.com/mathiscode/pucc/watchers)
[![Sponsors](https://img.shields.io/github/sponsors/mathiscode?color=red&logo=github&label=💖%20sponsors)](https://github.com/sponsors/mathiscode)
[![Contributors](https://img.shields.io/github/contributors/mathiscode/pucc?color=yellow&logo=github&label=👥%20contributors)](https://github.com/mathiscode/pucc/graphs/contributors)

Power User Console Component - A browser library that provides a console command system.

Register custom commands and execute them via the browser console with a `$` prefix or via the dropdown or embedded terminal Custom Element.

This can be very useful for web apps that need to provide a console for users to interact with the app, bypassing the UI for power users.

## Features

- 🚀 Zero dependencies (runtime)
- 📦 Built with esbuild for fast builds
- 🔧 TypeScript for type safety
- 🎯 Flexible command parsing (positional args + key=value pairs)
- 📝 Built-in commands: `$help`, `$about`
- 🔌 Extensible command system

## Installation

### Via pnpm/yarn/npm

```bash
pnpm add @mathiscode/pucc
# or
yarn add @mathiscode/pucc
# or
npm install @mathiscode/pucc
```

### Via Script Tag

```html
<script src="https://unpkg.com/@mathiscode/pucc/dist/pucc.js"></script>
```

## Usage

### Basic Usage

After including the library, commands are automatically available in the browser console:

```javascript
// Built-in commands
$help()        // Lists all available commands
$about()       // Shows library information
```

### Adding Custom Commands

```javascript
// Register a new command
Pucc.addCommand('new', (args) => {
  console.log('Creating:', args._[0]);
  console.log('Arguments:', args);
}, 'Create a new entity');

// Now you can use it in the console or dropdown terminal:
// $new('customer', 'name="John Smith"', 'balance=5400')
// new customer name="John Smith" balance=5400
```

### Command Arguments

The command parser supports flexible argument formats:

**Positional arguments:**

```javascript
$new customer
// args = { _: ['customer'] }
```

**Key-value pairs:**

```javascript
$new name="John Smith" balance=5400
// args = { name: "John Smith", balance: 5400 }
```

**Mixed (positional + key-value):**

```javascript
$new customer name="John Smith" balance=5400
// args = { _: ['customer'], name: "John Smith", balance: 5400 }
```

**Type conversion:**

- Numbers are automatically parsed: `balance=5400` → `5400` (number)
- Booleans: `active=true` → `true` (boolean)
- Strings: `name="John"` → `"John"` (string)

### Module Import (ESM)

When using ESM, no global instance is created automatically. You have full control over how Pucc instances are created and used:

```javascript
import { Pucc } from 'pucc';

// Create a Pucc instance
// Commands are automatically registered on window (for console access)
const shell = new Pucc();

// Add commands - they're immediately available in console AND terminals
shell.addCommand('greet', (args) => {
  console.log(`Hello, ${args._[0] || 'World'}!`);
}, 'Greet someone');

// Commands are now available:
// - In browser console: $greet('Alice') or greet('Alice')
// - In terminal elements: greet Alice
```

### Understanding Global Registrations

By default, `enableGlobalRegistrations: true` registers commands on the `window` object, making them accessible from the browser console. This does NOT affect terminal access - terminals can use any Pucc instance regardless of this setting.

```javascript
import { Pucc } from 'pucc';

// Option 1: Commands available in console AND terminals (default)
const shell = new Pucc();
shell.addCommand('test', () => console.log('test'), 'Test command');
// Available as: $test() in console, or "test" in terminals

// Option 2: Commands available ONLY in terminals (not in console)
const shell = new Pucc({ enableGlobalRegistrations: false });
shell.addCommand('test', () => console.log('test'), 'Test command');
// Available as: "test" in terminals only (not on window)
```

**Key Points:**

- `enableGlobalRegistrations` only controls whether commands appear on `window` (for console access)
- Terminals can use ANY Pucc instance, regardless of this setting
- Set to `false` if you want to avoid polluting the global namespace

### Custom Command Prefix

By default, commands use the `$` prefix (e.g., `$help`, `$about`). You can customize this prefix when creating a Pucc instance:

```javascript
import { Pucc } from 'pucc';

// Use a custom prefix (must be a valid JavaScript identifier)
const shell = new Pucc({ commandPrefix: 'cmd' });

// Now commands can be called with the custom prefix
// cmdhelp() or cmdabout() in the console
// Or without prefix: help() or about()

// Commands are still accessible both ways
shell.addCommand('greet', (args) => {
  console.log(`Hello, ${args._[0] || 'World'}!`);
}, 'Greet someone');

// Can be called as: cmdgreet('Alice')
```

**Valid prefix examples:**

- `$` (default)
- `_`
- `cmd`
- `myPrefix`
- `prefix123`
- `_prefix`

**Invalid prefix examples:**

- `>` (special character not allowed)
- `123` (cannot start with a digit)
- `prefix-` (hyphen not allowed)
- `prefix.` (dot not allowed)

**Note:** The prefix must be a valid JavaScript identifier (starts with a letter, underscore, or dollar sign; can only contain letters, digits, underscores, and dollar signs). The prefix is used for console commands and is automatically stripped when parsing command input. Commands can always be called with or without the prefix in the terminal.

### Using Terminal Elements

The `<pucc-terminal>` custom element can use either:

1. A shared global instance (`window.Pucc`) - created automatically in IIFE builds
2. Its own isolated instance - configured via `puccOptions`

**Configuring a Terminal with Its Own Instance:**

**Via attribute (for simple options):**

```html
<pucc-terminal 
  embedded="true"
  pucc-options='{"enableGlobalRegistrations": false, "commandPrefix": "_"}'>
</pucc-terminal>
```

**Via property (for full functionality, including functions):**

```javascript
import { Pucc } from 'pucc';

const terminal = document.querySelector('pucc-terminal');

terminal.puccOptions = {
  enableGlobalRegistrations: false,
  commandPrefix: 'cmd',
  customHelpHandler: (args, shell) => {
    console.log('Custom help!');
  },
  initialCommands: [
    {
      name: 'greet',
      description: 'Greet someone',
      handler: (args) => {
        console.log(`Hello, ${args._[0] || 'World'}!`);
      }
    }
  ]
};
```

**Adding Commands to a Terminal Element:**

If a terminal uses its own instance (via `puccOptions`), you can add commands to it:

```javascript
const terminal = document.querySelector('pucc-terminal');

// Get the terminal's Pucc instance
const shell = terminal.shellInstance;

if (shell) {
  // Add commands directly to the terminal's instance
  shell.addCommand('mycommand', (args) => {
    console.log('Command executed in terminal');
  }, 'My custom command');
}
```

**Using the Global Instance:**

If a terminal doesn't have `puccOptions` set, it automatically uses `window.Pucc` (if available). In this case, commands added to the global instance are available in all terminals:

```javascript
// In IIFE builds, window.Pucc is created automatically
// In ESM builds, create it yourself:
window.Pucc = new Pucc();

// Add commands - they're available in all terminals using the global instance
shell.addCommand('shared', () => console.log('Shared command'), 'Shared command');
```

**Note:** The `pucc-options` attribute only supports JSON-serializable options (`enableGlobalRegistrations`, `commandPrefix`). For options that include functions (`customHelpHandler`, `initialCommands`), use the `puccOptions` property instead.

## API Reference

### `new Pucc(options?)`

Create a new Pucc instance.

**Parameters:**

- `options` (object, optional): Configuration options
  - `customHelpHandler` (function, optional): Custom handler for the `help` command
  - `initialCommands` (Command[], optional): Array of commands to register on initialization
  - `enableGlobalRegistrations` (boolean, optional): Whether to register commands globally on `window` for console access. Defaults to `true`. Set to `false` to avoid polluting the global namespace. **Note:** This only affects console access, not terminal access - terminals can use any instance regardless of this setting.
  - `commandPrefix` (string, optional): Custom prefix for console commands. Defaults to `$`. Must be a valid JavaScript identifier (starts with letter, underscore, or dollar sign; can contain letters, digits, underscores, and dollar signs). Commands can be called with or without the prefix in terminals.

**Example:**

```javascript
// Default behavior (global registrations enabled, $ prefix)
const shell = new Pucc();
// Commands immediately available in console and terminals

// Disable global registrations (console access only, terminals still work)
const shell = new Pucc({ enableGlobalRegistrations: false });
// Commands available in terminals, NOT in console

// Use custom command prefix
const shell = new Pucc({ commandPrefix: 'cmd_' });
// Console: cmd_help(), Terminal: help or cmd_help
```

### `shell.addCommand(name, handler, description)`

Register a new command on a Pucc instance. The command is immediately available in terminals and (if `enableGlobalRegistrations` is true) in the console.

**Parameters:**

- `name` (string): Command name (without prefix)
- `handler` (function): Command handler function `(args: ParsedArgs, shell?: Pucc) => void | Promise<void>`
- `description` (string): Command description (shown in `help`)

**Example:**

```javascript
const shell = new Pucc();

// Add a command - immediately available
shell.addCommand('greet', (args) => {
  const name = args.name || args._[0] || 'World';
  console.log(`Hello, ${name}!`);
}, 'Greet someone by name');

// In console: $greet('Alice') or greet('Alice')
// In terminal: greet Alice or greet name=Alice
```

**Note:** In IIFE builds, you can also use `Pucc.addCommand()` which adds to the global instance automatically created.

### `ParsedArgs`

The argument object passed to command handlers:

```typescript
interface ParsedArgs {
  _: string[];  // Positional arguments
  [key: string]: string | number | boolean | string[];
}
```

## Development

### Setup

```bash
# Install dependencies
pnpm install

# Build for production
pnpm build

# Build in watch mode (development)
pnpm build:dev

# Run linter
pnpm lint

# Format code
pnpm format

# Run server
pnpm server

# Type check
pnpm type-check
```

### Project Structure

```text
pucc/
├── src/
│   ├── index.ts              # Main entry point
│   ├── core/
│   │   ├── Pucc.ts           # Core class
│   │   └── CommandParser.ts  # Command parser
│   ├── commands/
│   │   ├── help.ts           # $help command
│   │   ├── about.ts          # $about command
│   │   └── echo.ts           # $echo command
│   ├── components/
│   │   ├── ShellTerminal.ts  # Terminal custom element
│   │   └── TerminalLogger.ts # Terminal logger component
│   ├── types.ts              # Type definitions
│   └── demo.css              # Demo styles
├── config/
│   └── build.js              # Build configuration
├── public/                   # Demo and development files
├── dist/                     # Build output
├── eslint.config.mts         # ESLint configuration
├── tsconfig.json             # TypeScript configuration
└── server.js                 # Development server
```

## License

MIT
