# Pucc

[![Live Demo](https://img.shields.io/badge/Live%20Demo-22272e&labelColor=0d1117&color=4caf50)](https://mathiscode.github.io/pucc/)

[![npm](https://img.shields.io/npm/v/@mathiscode/pucc)](https://www.npmjs.com/package/@mathiscode/pucc)
[![GitHub](https://img.shields.io/github/stars/mathiscode/pucc)](https://github.com/mathiscode/pucc)

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

```javascript
import { Pucc } from 'pucc';

// When using ESM, no global instance is created automatically
// You have full control over whether to create a global instance
// or use terminal-only commands

// Option 1: Create a global instance (like IIFE build)
const shell = new Pucc();
shell.initialize();
// Now commands are available: $help(), $about()

// Option 2: Create a terminal-only instance
const shell = new Pucc({ enableGlobalRegistrations: false });
// Commands only available in terminal elements, not globally
```

### Disabling Global Command Registrations

By default, commands are registered globally on the `window` object, making them accessible from the browser console. If you want to limit command execution to only the terminal element (avoiding global namespace pollution), you can disable global registrations:

```javascript
import { Pucc } from 'pucc';

// Create a Pucc instance with global registrations disabled
const shell = new Pucc({ enableGlobalRegistrations: false });

// Commands will only be available through the terminal
// They will NOT be accessible via window.$commandName
shell.addCommand('mycommand', (args) => {
  console.log('This command is only available in the terminal');
}, 'A terminal-only command');
```

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

### Passing Pucc Options to Terminal Element

When using the `pucc-terminal` custom element, you can pass Pucc constructor options in two ways:

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

**Note:** The `pucc-options` attribute only supports JSON-serializable options (`enableGlobalRegistrations`, `commandPrefix`). For options that include functions (`customHelpHandler`, `initialCommands`), use the `puccOptions` property instead.

## API Reference

### `new Pucc(options?)`

Create a new Pucc instance.

**Parameters:**

- `options` (object, optional): Configuration options
  - `customHelpHandler` (function, optional): Custom handler for the `help` command
  - `initialCommands` (Command[], optional): Array of commands to register on initialization
  - `enableGlobalRegistrations` (boolean, optional): Whether to register commands globally on `window`. Defaults to `true`. Set to `false` to limit commands to the dropdown/embedded terminal only.
  - `commandPrefix` (string, optional): Custom prefix for console commands. Defaults to `$`. Must be a valid JavaScript identifier (starts with letter, underscore, or dollar sign; can contain letters, digits, underscores, and dollar signs). Commands can be called with or without the prefix.

**Example:**

```javascript
// Default behavior (global registrations enabled, $ prefix)
const shell = new Pucc();

// Disable global registrations
const shell = new Pucc({ enableGlobalRegistrations: false });

// Use custom command prefix (must be a valid JavaScript identifier)
const shell = new Pucc({ commandPrefix: 'cmd_' });
// Now commands can be called as cmd_help, cmd_about, etc.
```

### `Pucc.addCommand(name, handler, description)`

Register a new command.

**Parameters:**

- `name` (string): Command name (without prefix)
- `handler` (function): Command handler function `(args: ParsedArgs) => void | Promise<void>`
- `description` (string): Command description (shown in `$help`)

**Example:**

```javascript
Pucc.addCommand('greet', (args) => {
  const name = args.name || args._[0] || 'World';
  console.log(`Hello, ${name}!`);
}, 'Greet someone by name');
```

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

```
pucc/
├── src/
│   ├── index.ts              # Main entry point
│   ├── core/
│   │   ├── Pucc.ts           # Core class
│   │   └── CommandParser.ts  # Command parser
│   ├── commands/
│   │   ├── help.ts           # $help command
│   │   └── about.ts          # $about command
│   └── types.ts              # Type definitions
├── config/
│   └── build.js              # Build configuration
└── dist/                     # Build output
```

## License

MIT
