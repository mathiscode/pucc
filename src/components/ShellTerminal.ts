import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import type { Pucc } from '../core/Pucc'
import { Pucc as PuccClass } from '../core/Pucc'
import { TerminalLogger } from './TerminalLogger'
import chalk from 'chalk'
import type { Command, CommandHandler } from '../types'

interface HotkeyConfig {
  key: string
  altKey?: boolean
  ctrlKey?: boolean
  shiftKey?: boolean
  metaKey?: boolean
}

export class ShellTerminal extends HTMLElement {
  private terminal: Terminal | null = null
  private fitAddon: FitAddon | null = null
  private container: HTMLElement | null = null
  private isVisible = false
  private currentLine = ''
  private cursorPos = 0
  private history: string[] = []
  private historyIndex = -1
  private savedLine = ''
  private shell: Pucc | null = null
  private hotkeyConfig: HotkeyConfig = { key: 's', altKey: true }
  private logger: TerminalLogger | null = null
  private promptText: string = '$ '
  private isEmbedded = false
  private initialContent: string | null = null
  private _puccOptions: { customHelpHandler?: CommandHandler; initialCommands?: Command[]; enableGlobalRegistrations?: boolean; commandPrefix?: string } | null = null

  static get observedAttributes() {
    return ['hotkey', 'height', 'theme', 'prompt', 'embedded', 'initial-content', 'pucc-options']
  }

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  connectedCallback() {
    this.isEmbedded = this.hasAttribute('embedded') && this.getAttribute('embedded') !== 'false'
    const puccOptionsAttr = this.getAttribute('pucc-options')
    if (puccOptionsAttr !== null) {
      this.parsePuccOptions(puccOptionsAttr)
    }
    this.render()
    this.initializeTerminal()
    if (!this.isEmbedded) {
      this.setupHotkeyListener()
    }
  }

  disconnectedCallback() {
    this.cleanup()
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    if (oldValue === newValue) return

    switch (name) {
      case 'embedded':
        this.isEmbedded = this.hasAttribute('embedded') && this.getAttribute('embedded') !== 'false'
        this.render()
        if (this.isEmbedded) {
          document.removeEventListener('keydown', this.handleHotkey as EventListener, true)
          if (this.container) {
            this.container.classList.add('visible')
            this.isVisible = true
          }
        } else {
          this.setupHotkeyListener()
          if (this.container && !this.isVisible) {
            this.container.classList.remove('visible')
          }
        }
        if (this.fitAddon) {
          setTimeout(() => this.fitAddon?.fit(), 0)
        }
        break
      case 'hotkey':
        this.parseHotkey(newValue)
        if (!this.isEmbedded) {
          this.setupHotkeyListener()
        }
        break
      case 'height':
        this.updateHeight()
        break
      case 'theme':
        this.updateTheme()
        break
      case 'prompt':
        this.promptText = newValue || '$ '
        this.updatePrompt()
        break
      case 'initial-content':
        this.initialContent = newValue || null
        break
      case 'pucc-options':
        this.parsePuccOptions(newValue)
        this.initializeShell()
        break
    }
  }

  private getThemeColors() {
    const theme = (this.getAttribute('theme') || 'dark').toLowerCase()
    const isLight = theme === 'light'
    
    return {
      bg: isLight ? '#ffffff' : '#1e1e1e',
      fg: isLight ? '#333333' : '#d4d4d4',
      accent: isLight ? '#0066cc' : '#007acc',
      border: isLight ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)',
      shadow: isLight ? '0 8px 32px rgba(0, 0, 0, 0.15)' : '0 8px 32px rgba(0, 0, 0, 0.4)',
    }
  }

  private render() {
    if (!this.shadowRoot) return

    const height = this.getAttribute('height') || '400px'
    const heightValue = this.parseHeightValue(height)
    const isEmbedded = this.isEmbedded
    const themeColors = this.getThemeColors()

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          --shell-bg: ${themeColors.bg};
          --shell-fg: ${themeColors.fg};
          --shell-accent: ${themeColors.accent};
          --shell-border: ${themeColors.border};
          --shell-font-family: 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace;
          --shell-font-size: 14px;
          --shell-padding: 16px;
          --shell-height: ${heightValue};
          --shell-animation-duration: 0.2s;
          --shell-border-radius: 8px;
          --shell-shadow: ${themeColors.shadow};
          --shell-backdrop-blur: 10px;
          --terminal-mode: ${isEmbedded ? 'embedded' : 'dropdown'};
        }

        .terminal-wrapper {
          ${isEmbedded 
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
               pointer-events: none;`}
        }

        .terminal-wrapper.visible {
          ${isEmbedded 
            ? '' 
            : `transform: translateY(0);
               opacity: 1;
               pointer-events: auto;`}
        }

        .terminal-container {
          width: 100%;
          height: 100%;
          background: var(--shell-bg);
          ${isEmbedded 
            ? `border: 1px solid var(--shell-border);
               border-radius: var(--shell-border-radius);`
            : `border-bottom: 1px solid var(--shell-border);`}
          box-shadow: var(--shell-shadow);
          ${isEmbedded ? '' : `backdrop-filter: blur(var(--shell-backdrop-blur));
          -webkit-backdrop-filter: blur(var(--shell-backdrop-blur));`}
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
    `

    this.container = this.shadowRoot.querySelector('.terminal-wrapper') as HTMLElement
    if (isEmbedded) {
      this.isVisible = true
    }
  }

  private initializeTerminal() {
    if (!this.shadowRoot) return

    const terminalElement = this.shadowRoot.querySelector('.terminal-element') as HTMLElement
    if (!terminalElement) return

    const promptAttr = this.getAttribute('prompt')
    if (promptAttr !== null) {
      this.promptText = promptAttr
    }

    const initialContentAttr = this.getAttribute('initial-content')
    if (initialContentAttr !== null) {
      this.initialContent = initialContentAttr
    }

    const theme = this.getThemeFromCSS()
    const style = getComputedStyle(this)
    const fontFamily = style.getPropertyValue('--shell-font-family').trim() || "'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace"
    
    this.terminal = new Terminal({
      theme,
      fontFamily: fontFamily.replace(/['"]/g, ''),
      fontSize: 14,
      cursorBlink: true,
      cursorStyle: 'block',
      allowTransparency: true,
      allowProposedApi: true,
    })

    this.fitAddon = new FitAddon()
    this.terminal.loadAddon(this.fitAddon)
    this.terminal.open(terminalElement)

    this.logger = new TerminalLogger(this.terminal)

    this.terminal.onData((data) => {
      this.handleInput(data)
    })

    this.terminal.onKey(({ domEvent }) => {
      if (domEvent.key === 'Escape' && !this.isEmbedded) {
        this.hide()
      }
    })

    this.terminal.clear()
    this.fitAddon.fit()

    this.initializeShell()

    setTimeout(() => {
      if (!this.terminal) return
      
      this.terminal.clear()
      this.fitAddon?.fit()
      
      if (this.initialContent !== null) {
        const lines = this.initialContent.split('\n')
        lines.forEach(line => this.terminal?.writeln(line))
      } else {
        this.terminal.writeln(chalk.bold.cyan('Pucc Terminal'))
        this.terminal.writeln(chalk.gray('Press Escape to close; type `help` for available commands'))
        
        if (!this.shell) {
          this.terminal.writeln(chalk.yellow('\r\nWarning: Pucc not found on window'))
        }
      }
      
      this.writePrompt()
    }, 0)
    
    if (this.isEmbedded && this.terminal) {
      setTimeout(() => {
        if (this.terminal) this.terminal.focus()
        if (this.fitAddon) this.fitAddon.fit()
      }, 0)
    }
  }

  private getThemeFromCSS(): Record<string, string> {
    const style = getComputedStyle(this)
    const theme = (this.getAttribute('theme') || 'dark').toLowerCase()
    const isLight = theme === 'light'
    
    const bg = style.getPropertyValue('--shell-bg').trim() || (isLight ? '#ffffff' : '#1e1e1e')
    const fg = style.getPropertyValue('--shell-fg').trim() || (isLight ? '#333333' : '#d4d4d4')
    const accent = style.getPropertyValue('--shell-accent').trim() || (isLight ? '#0066cc' : '#007acc')
    
    return {
      background: bg,
      foreground: fg,
      cursor: accent,
      cursorAccent: bg,
      selection: accent,
      black: isLight ? '#000000' : '#000000',
      red: isLight ? '#cd0000' : '#cd3131',
      green: isLight ? '#00cd00' : '#0dbc79',
      yellow: isLight ? '#cdcd00' : '#e5e510',
      blue: isLight ? '#0000ee' : '#2472c8',
      magenta: isLight ? '#cd00cd' : '#bc3fbc',
      cyan: isLight ? '#00cdcd' : '#11a8cd',
      white: isLight ? '#e5e5e5' : '#e5e5e5',
      brightBlack: isLight ? '#7f7f7f' : '#666666',
      brightRed: isLight ? '#ff0000' : '#f14c4c',
      brightGreen: isLight ? '#00ff00' : '#23d18b',
      brightYellow: isLight ? '#ffff00' : '#f5f543',
      brightBlue: isLight ? '#5c5cff' : '#3b8eea',
      brightMagenta: isLight ? '#ff00ff' : '#d670d6',
      brightCyan: isLight ? '#00ffff' : '#29b8db',
      brightWhite: isLight ? '#ffffff' : '#e5e5e5',
    }
  }

  private handleInput(data: string) {
    if (!this.terminal) return

    if (data === '\r' || data === '\n') {
      const trimmed = this.currentLine.trim()
      if (trimmed) {
        this.history.push(trimmed)
        if (this.history.length > 100) this.history.shift()
      }
      
      this.historyIndex = -1
      this.savedLine = ''
      this.executeCommand(trimmed)
      this.currentLine = ''
      this.cursorPos = 0
      this.terminal.write('\r\n')
      this.writePrompt()
      return
    }

    if (data === '\x1b[D') { // left
      if (this.cursorPos > 0) {
        this.cursorPos--
        this.terminal.write('\x1b[D')
      }
      return
    }

    if (data === '\x1b[C') { // right
      if (this.cursorPos < this.currentLine.length) {
        this.cursorPos++
        this.terminal.write('\x1b[C')
      }
      return
    }

    if (data === '\x1b[A') { // up — history
      if (this.history.length === 0) return
      if (this.historyIndex === -1) {
        this.savedLine = this.currentLine
        this.historyIndex = this.history.length - 1
      } else if (this.historyIndex > 0) {
        this.historyIndex--
      } else {
        return
      }
      this.replaceLine(this.history[this.historyIndex])
      return
    }

    if (data === '\x1b[B') { // down — history
      if (this.historyIndex === -1) return
      if (this.historyIndex < this.history.length - 1) {
        this.historyIndex++
        this.replaceLine(this.history[this.historyIndex])
      } else {
        this.historyIndex = -1
        this.replaceLine(this.savedLine)
      }
      return
    }

    if (data === '\x1b[H' || data === '\x01') { // Home or Ctrl+A
      if (this.cursorPos > 0) {
        this.terminal.write(`\x1b[${this.cursorPos}D`)
        this.cursorPos = 0
      }
      return
    }

    if (data === '\x1b[F' || data === '\x05') { // End or Ctrl+E
      const remaining = this.currentLine.length - this.cursorPos
      if (remaining > 0) {
        this.terminal.write(`\x1b[${remaining}C`)
        this.cursorPos = this.currentLine.length
      }
      return
    }

    if (data === '\x1b[3~') { // Delete key
      if (this.cursorPos < this.currentLine.length) {
        this.currentLine = this.currentLine.slice(0, this.cursorPos) + this.currentLine.slice(this.cursorPos + 1)
        const tail = this.currentLine.slice(this.cursorPos)
        this.terminal.write(tail + ' ')
        if (tail.length + 1 > 0) this.terminal.write(`\x1b[${tail.length + 1}D`)
      }
      return
    }

    if (data === '\x7f' || data === '\b') { // Backspace
      if (this.cursorPos > 0) {
        this.currentLine = this.currentLine.slice(0, this.cursorPos - 1) + this.currentLine.slice(this.cursorPos)
        this.cursorPos--
        this.terminal.write('\b')
        const tail = this.currentLine.slice(this.cursorPos)
        this.terminal.write(tail + ' ')
        if (tail.length + 1 > 0) this.terminal.write(`\x1b[${tail.length + 1}D`)
      }
      return
    }

    if (data === '\x03') { // Ctrl+C
      this.currentLine = ''
      this.cursorPos = 0
      this.historyIndex = -1
      this.savedLine = ''
      this.terminal.write('^C\r\n')
      this.writePrompt()
      return
    }

    if (data === '\x15') { // Ctrl+U — kill to start of line
      if (this.cursorPos > 0) {
        this.currentLine = this.currentLine.slice(this.cursorPos)
        if (this.cursorPos > 0) this.terminal.write(`\x1b[${this.cursorPos}D`)
        this.terminal.write('\x1b[K')
        this.terminal.write(this.currentLine)
        if (this.currentLine.length > 0) this.terminal.write(`\x1b[${this.currentLine.length}D`)
        this.cursorPos = 0
      }
      return
    }

    if (data >= ' ' && !data.startsWith('\x1b')) {
      for (const ch of data) {
        this.currentLine = this.currentLine.slice(0, this.cursorPos) + ch + this.currentLine.slice(this.cursorPos)
        this.cursorPos++
        const tail = this.currentLine.slice(this.cursorPos - 1)
        this.terminal.write(tail)
        if (tail.length > 1) this.terminal.write(`\x1b[${tail.length - 1}D`)
      }
    }
  }

  private replaceLine(newLine: string) {
    if (!this.terminal) return
    if (this.cursorPos > 0) this.terminal.write(`\x1b[${this.cursorPos}D`)
    this.terminal.write('\x1b[K')
    this.terminal.write(newLine)
    this.currentLine = newLine
    this.cursorPos = newLine.length
  }

  private executeCommand(input: string) {
    if (!input) return

    if (!this.shell) {
      this.writeln(chalk.red('Error: Pucc not available'))
      return
    }

    const trimmed = input.trim()
    if (!trimmed) return

    this.dispatchEvent(
      new CustomEvent('pucc-command', {
        detail: { input: trimmed },
        bubbles: true,
      })
    )

    try {
      if (this.shell.executeFromInput) {
        this.shell.executeFromInput(trimmed, this.logger)
      } else {
        let commandName = trimmed
        let args = ''

        const spaceIndex = trimmed.indexOf(' ')
        if (spaceIndex > 0) {
          commandName = trimmed.slice(0, spaceIndex)
          args = trimmed.slice(spaceIndex + 1)
        }

        const prefix = this.shell?.getCommandPrefix() ?? '$'
        if (commandName.startsWith(prefix)) {
          commandName = commandName.slice(prefix.length)
        }

        this.shell.execute(commandName, args, this.logger)
      }
    } catch (error) {
      this.writeln(chalk.red(`Error: ${error instanceof Error ? error.message : String(error)}`))
    }
  }

  private setupHotkeyListener() {
    if (this.isEmbedded) return
    document.removeEventListener('keydown', this.handleHotkey as EventListener)
    document.addEventListener('keydown', this.handleHotkey as EventListener, true)
  }

  private handleHotkey = (event: KeyboardEvent) => {
    const keyMatch = event.key.toLowerCase() === this.hotkeyConfig.key.toLowerCase()
    const altMatch = !!event.altKey === !!this.hotkeyConfig.altKey
    const ctrlMatch = !!event.ctrlKey === !!this.hotkeyConfig.ctrlKey
    const shiftMatch = !!event.shiftKey === !!this.hotkeyConfig.shiftKey
    const metaMatch = !!event.metaKey === !!this.hotkeyConfig.metaKey

    if (keyMatch && altMatch && ctrlMatch && shiftMatch && metaMatch) {
      const target = event.target as HTMLElement
      if (!target || (!target.isContentEditable && target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA')) {
        event.preventDefault()
        event.stopPropagation()
        this.toggle()
      }
    }
  }

  private parseHotkey(hotkeyString: string) {
    const parts = hotkeyString.toLowerCase().split('-')
    const key = parts[parts.length - 1]

    this.hotkeyConfig = {
      key,
      altKey: parts.includes('alt'),
      ctrlKey: parts.includes('ctrl') || parts.includes('control'),
      shiftKey: parts.includes('shift'),
      metaKey: parts.includes('meta') || parts.includes('cmd'),
    }
  }

  private parseHeightValue(height: string): string {
    if (!height) return '400px'
    height = height.trim()
    if (height.match(/^\d+$/)) {
      return `${height}px`
    }
    if (height.match(/^\d+(\.\d+)?(px|%|em|rem|vh|vw)$/)) {
      return height
    }
    const numericValue = parseInt(height, 10)
    return isNaN(numericValue) ? '400px' : `${numericValue}px`
  }

  private updateHeight() {
    const height = this.getAttribute('height') || '400px'
    const heightValue = this.parseHeightValue(height)
    if (this.shadowRoot) {
      const style = this.shadowRoot.querySelector('style')
      if (style) {
        style.textContent = style.textContent?.replace(
          /--shell-height:\s*[^;]+/,
          `--shell-height: ${heightValue}`
        ) || style.textContent
      }
    }
    if (this.fitAddon) {
      setTimeout(() => this.fitAddon?.fit(), 0)
    }
  }

  private updateTheme() {
    if (this.shadowRoot) {
      const themeColors = this.getThemeColors()
      const style = this.shadowRoot.querySelector('style')
      if (style && style.textContent) {
        style.textContent = style.textContent.replace(
          /--shell-bg:\s*[^;]+/,
          `--shell-bg: ${themeColors.bg}`
        ).replace(
          /--shell-fg:\s*[^;]+/,
          `--shell-fg: ${themeColors.fg}`
        ).replace(
          /--shell-accent:\s*[^;]+/,
          `--shell-accent: ${themeColors.accent}`
        ).replace(
          /--shell-border:\s*[^;]+/,
          `--shell-border: ${themeColors.border}`
        ).replace(
          /--shell-shadow:\s*[^;]+/,
          `--shell-shadow: ${themeColors.shadow}`
        )
      }
    }
    if (this.terminal) {
      const theme = this.getThemeFromCSS()
      this.terminal.options.theme = theme
    }
  }

  private writePrompt() {
    if (this.terminal) {
      this.terminal.write(chalk.green(this.promptText))
    }
  }

  private updatePrompt() {
    if (this.terminal && this.isVisible) {
      this.writePrompt()
    }
  }

  private cleanup() {
    document.removeEventListener('keydown', this.handleHotkey as EventListener, true)
    if (this.terminal) {
      this.terminal.dispose()
      this.terminal = null
    }
    if (this.fitAddon) {
      this.fitAddon = null
    }
  }

  get visible(): boolean {
    return this.isVisible
  }

  set visible(value: boolean) {
    if (value) {
      this.show()
    } else {
      this.hide()
    }
  }

  private parsePuccOptions(optionsString: string | null) {
    if (!optionsString) {
      this._puccOptions = null
      return
    }

    try {
      const parsed = JSON.parse(optionsString)
      this._puccOptions = parsed
    } catch (error) {
      console.warn('Failed to parse pucc-options attribute:', error)
      this._puccOptions = null
    }
  }

  private initializeShell() {
    if (this._puccOptions !== null) {
      this.shell = new PuccClass(this._puccOptions)
      this.shell.initialize()
    } else {
      this.shell = (window as Window & { Pucc?: Pucc }).Pucc || null
    }
  }

  get terminalInstance(): Terminal | null {
    return this.terminal
  }

  get shellInstance(): Pucc | null {
    return this.shell
  }

  set shellInstance(shell: Pucc) {
    this.shell = shell
  }

  get puccOptions(): { customHelpHandler?: CommandHandler; initialCommands?: Command[]; enableGlobalRegistrations?: boolean; commandPrefix?: string } | null {
    return this._puccOptions
  }

  set puccOptions(options: { customHelpHandler?: CommandHandler; initialCommands?: Command[]; enableGlobalRegistrations?: boolean; commandPrefix?: string } | null) {
    this._puccOptions = options
    this.initializeShell()
  }

  getLogger(): TerminalLogger | null {
    return this.logger
  }

  get prompt(): string {
    return this.promptText
  }

  set prompt(value: string) {
    this.promptText = value || '$ '
    this.setAttribute('prompt', this.promptText)
    this.updatePrompt()
  }

  show() {
    if (this.isVisible) return
    this.isVisible = true
    if (this.container) {
      this.container.classList.add('visible')
      setTimeout(() => {
        if (this.terminal) {
          this.terminal.focus()
        }
        if (this.fitAddon) {
          this.fitAddon.fit()
        }
      }, 0)
    }
    this.dispatchEvent(new CustomEvent('pucc-show', { bubbles: true }))
  }

  hide() {
    if (!this.isVisible) return
    this.isVisible = false
    if (this.container) {
      this.container.classList.remove('visible')
    }
    this.dispatchEvent(new CustomEvent('pucc-hide', { bubbles: true }))
  }

  toggle() {
    if (this.isVisible) {
      this.hide()
    } else {
      this.show()
    }
  }

  write(text: string) {
    if (this.terminal) {
      this.terminal.write(text)
    }
  }

  writeln(text: string) {
    if (this.terminal) {
      this.terminal.writeln(text)
    }
  }

  clear() {
    if (this.terminal) {
      this.terminal.clear()
      this.writePrompt()
    }
    this.currentLine = ''
    this.cursorPos = 0
  }
}
