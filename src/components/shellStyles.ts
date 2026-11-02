export interface ThemeColors {
  bg: string;
  fg: string;
  accent: string;
  border: string;
  shadow: string;
}

const isLightTheme = (theme: string | null) => (theme || 'dark').toLowerCase() === 'light';

export function getThemeColors(theme: string | null): ThemeColors {
  const isLight = isLightTheme(theme);

  return {
    bg: isLight ? '#ffffff' : '#1e1e1e',
    fg: isLight ? '#333333' : '#d4d4d4',
    accent: isLight ? '#0066cc' : '#007acc',
    border: isLight ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)',
    shadow: isLight ? '0 8px 32px rgba(0, 0, 0, 0.15)' : '0 8px 32px rgba(0, 0, 0, 0.4)',
  };
}

/** Build the xterm theme, preferring the host's `--shell-*` CSS custom properties */
export function getXtermTheme(theme: string | null, style: CSSStyleDeclaration) {
  const isLight = isLightTheme(theme);
  const defaults = getThemeColors(theme);

  const bg = style.getPropertyValue('--shell-bg').trim() || defaults.bg;
  const fg = style.getPropertyValue('--shell-fg').trim() || defaults.fg;
  const accent = style.getPropertyValue('--shell-accent').trim() || defaults.accent;

  return {
    background: bg,
    foreground: fg,
    cursor: accent,
    cursorAccent: bg,
    selection: accent,
    black: '#000000',
    red: isLight ? '#cd0000' : '#cd3131',
    green: isLight ? '#00cd00' : '#0dbc79',
    yellow: isLight ? '#cdcd00' : '#e5e510',
    blue: isLight ? '#0000ee' : '#2472c8',
    magenta: isLight ? '#cd00cd' : '#bc3fbc',
    cyan: isLight ? '#00cdcd' : '#11a8cd',
    white: '#e5e5e5',
    brightBlack: isLight ? '#7f7f7f' : '#666666',
    brightRed: isLight ? '#ff0000' : '#f14c4c',
    brightGreen: isLight ? '#00ff00' : '#23d18b',
    brightYellow: isLight ? '#ffff00' : '#f5f543',
    brightBlue: isLight ? '#5c5cff' : '#3b8eea',
    brightMagenta: isLight ? '#ff00ff' : '#d670d6',
    brightCyan: isLight ? '#00ffff' : '#29b8db',
    brightWhite: isLight ? '#ffffff' : '#e5e5e5',
  };
}

export function parseHeightValue(height: string): string {
  if (!height) return '400px';
  height = height.trim();
  if (/^\d+$/.test(height)) return `${height}px`;
  if (/^\d+(\.\d+)?(px|%|em|rem|vh|vw)$/.test(height)) return height;
  const numericValue = Number.parseInt(height, 10);
  return Number.isNaN(numericValue) ? '400px' : `${numericValue}px`;
}

export function decodeEscapeSequences(str: string): string {
  return str.replace(/\\([nrtbfv\\'"])/g, (match, char) => {
    switch (char) {
      case 'n':
        return '\n';
      case 'r':
        return '\r';
      case 't':
        return '\t';
      case 'b':
        return '\b';
      case 'f':
        return '\f';
      case 'v':
        return '\v';
      case '\\':
        return '\\';
      case "'":
        return "'";
      case '"':
        return '"';
      default:
        return match;
    }
  });
}

/** Shadow DOM contents: styles plus the wrapper/container/terminal element */
export function renderShellMarkup(options: {
  heightValue: string;
  isEmbedded: boolean;
  colors: ThemeColors;
}): string {
  const { heightValue, isEmbedded, colors } = options;

  return `
      <style>
        :host {
          --shell-bg: ${colors.bg};
          --shell-fg: ${colors.fg};
          --shell-accent: ${colors.accent};
          --shell-border: ${colors.border};
          --shell-font-family: 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace;
          --shell-font-size: 14px;
          --shell-padding: 16px;
          --shell-height: ${heightValue};
          --shell-animation-duration: 0.2s;
          --shell-border-radius: 8px;
          --shell-shadow: ${colors.shadow};
          --shell-backdrop-blur: 10px;
          --terminal-mode: ${isEmbedded ? 'embedded' : 'dropdown'};
        }

        .terminal-wrapper {
          ${
            isEmbedded
              ? `position: relative;
               width: 100%;
               height: var(--shell-height);
               opacity: 1;
               transform: none;
               pointer-events: auto;`
              : `position: fixed;
               top: 0;
               left: 0;
               right: 0;
               height: var(--shell-height);
               z-index: 9999;
               transform: translateY(-100%);
               opacity: 0;
               transition: transform var(--shell-animation-duration) cubic-bezier(0.4, 0, 0.2, 1),
                           opacity var(--shell-animation-duration) cubic-bezier(0.4, 0, 0.2, 1);
               will-change: transform, opacity;
               pointer-events: none;`
          }
        }

        .terminal-wrapper.visible {
          ${
            isEmbedded
              ? ''
              : `transform: translateY(0);
               opacity: 1;
               pointer-events: auto;`
          }
        }

        .terminal-container {
          width: 100%;
          height: 100%;
          background: var(--shell-bg);
          ${
            isEmbedded
              ? `border: 1px solid var(--shell-border);
               border-radius: var(--shell-border-radius);`
              : `border-bottom: 1px solid var(--shell-border);`
          }
          box-shadow: var(--shell-shadow);
          ${
            isEmbedded
              ? ''
              : `backdrop-filter: blur(var(--shell-backdrop-blur));
          -webkit-backdrop-filter: blur(var(--shell-backdrop-blur));`
          }
          padding: var(--shell-padding);
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          text-align: left;
        }

        .terminal-element {
          flex: 1;
          width: 100%;
          min-height: 0;
          text-align: left;
        }

        .xterm {
          font-family: var(--shell-font-family);
          font-size: var(--shell-font-size);
          text-align: left;
        }

        .xterm-viewport {
          background-color: transparent !important;
        }

        .xterm-screen {
          background-color: transparent !important;
        }

        .xterm textarea {
          position: absolute;
          left: -9999em;
          opacity: 0;
          pointer-events: none;
        }

        .xterm-char-measure-element {
          position: absolute !important;
          left: -9999em !important;
          visibility: hidden !important;
          pointer-events: none !important;
        }
      </style>
      <div class="terminal-wrapper${isEmbedded ? ' visible' : ''}">
        <div class="terminal-container">
          <div class="terminal-element"></div>
        </div>
      </div>
    `;
}
