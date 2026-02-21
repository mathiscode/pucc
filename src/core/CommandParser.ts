import type { ParsedArgs } from '../types';

/**
 * Parses command strings into structured arguments
 * Supports both positional arguments and key=value pairs
 *
 * Examples:
 * - `$new customer` → `{ _: ['customer'] }`
 * - `name="John Smith" balance=5400` → `{ name: "John Smith", balance: 5400 }`
 * - `$new customer name="John"` → `{ _: ['customer'], name: "John" }`
 */
export class CommandParser {
  /**
   * Parse a command string into structured arguments
   */
  static parse(input: string): ParsedArgs {
    const args: ParsedArgs = { _: [] };
    const trimmed = input.trim();

    if (!trimmed) {
      return args;
    }

    let i = 0;
    const length = trimmed.length;

    while (i < length) {
      // Skip whitespace
      while (i < length && /\s/.test(trimmed[i])) {
        i++;
      }

      if (i >= length) break;

      // Check if this looks like a key=value pair (starts with identifier followed by =)
      const keyMatch = trimmed.slice(i).match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*=/);
      
      if (keyMatch) {
        const key = keyMatch[1];
        i += keyMatch[0].length; // Move past "key="
        
        // Skip whitespace after =
        while (i < length && /\s/.test(trimmed[i])) {
          i++;
        }

        // Parse the value (may be quoted or unquoted)
        let value = '';
        let inQuotes = false;
        let quoteChar = '';
        
        if (i < length && (trimmed[i] === '"' || trimmed[i] === "'")) {
          inQuotes = true;
          quoteChar = trimmed[i];
          i++; // Skip opening quote
        }

        while (i < length) {
          const char = trimmed[i];
          
          if (inQuotes) {
            if (char === quoteChar) {
              i++; // Skip closing quote
              break;
            }
            value += char;
          } else {
            // Unquoted value - stop at whitespace or end
            if (/\s/.test(char)) {
              break;
            }
            value += char;
          }
          i++;
        }

        // Try to parse as number or boolean
        if (value === 'true') {
          args[key] = true;
        } else if (value === 'false') {
          args[key] = false;
        } else if (/^-?\d+$/.test(value)) {
          args[key] = parseInt(value, 10);
        } else if (/^-?\d*\.\d+$/.test(value)) {
          args[key] = parseFloat(value);
        } else {
          args[key] = value;
        }
      } else {
        // Positional argument
        let arg = '';
        let inQuotes = false;
        let quoteChar = '';
        
        while (i < length) {
          const char = trimmed[i];
          
          if (!inQuotes && (char === '"' || char === "'")) {
            inQuotes = true;
            quoteChar = char;
            i++;
            continue;
          }
          
          if (inQuotes && char === quoteChar) {
            i++;
            break;
          }
          
          if (!inQuotes && /\s/.test(char)) {
            break;
          }
          
          arg += char;
          i++;
        }
        
        if (arg) {
          args._.push(arg);
        }
      }
    }

    return args;
  }
}
