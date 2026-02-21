import type { CommandHandler } from '../types'

export const echoCommand: CommandHandler = (args, shell) => {
  const text = args._.length > 0 ? args._.join(' ') : 'No text provided'
  
  console.log(text)
  
  const logger = shell?.getLogger()
  if (logger) {
    logger.write('\r\n')
    logger.writeln(text)
  }
}
