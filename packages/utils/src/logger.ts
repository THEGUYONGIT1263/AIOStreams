import winston from 'winston';
import { Settings } from './settings';

// Map log levels to short labels and emojis
const levelMap: { [key: string]: string } = {
  error: 'ERR',
  warn: 'WRN',
  info: 'INF',
  debug: 'DBG',
};

const moduleMap: { [key: string]: string } = {
  server: '🌐  SERVER',
  wrappers: '📦  WRAPPERS',
  crypto: '🔒  CRYPTO',
  addon: '🧩  ADDON',
  parser: '🔍  PARSER',
  mediaflow: '🌊  MEDIAFLOW',
  stremthru: '✨  STREMTHRU',
  cache: '🗄️  CACHE',
  regex: '🅰️  REGEX',
};

// Define colors for each log level
const levelColors: { [key: string]: string } = {
  ERR: 'red',
  WRN: 'yellow',
  INF: 'cyan',
  DBG: 'magenta',
};

const emojiLevelMap: { [key: string]: string } = {
  error: '❌',
  warn: '⚠️ ',
  info: '🔵',
  debug: '🐞',
};

// Apply colors to Winston
winston.addColors(levelColors);

export const createLogger = (module: string) => {
  // cloudflare workers do not play nice with winston
  // so we disable winston logs in cloudflare workers
  try {
    __dirname;
  } catch (e) {
    return console;
  }
  const isJsonFormat = Settings.LOG_FORMAT === 'json';
  return winston.createLogger({
    level: Settings.LOG_LEVEL || 'info', // Default to 'info' if not set
    format: isJsonFormat
      ? winston.format.combine(
          winston.format.timestamp(),
          winston.format.json() // Use JSON format when LOG_FORMAT=json
        )
      : winston.format.combine(
          winston.format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss.SSS',
          }),
          winston.format.printf(({ timestamp, level, message, func }) => {
            const emoji = emojiLevelMap[level] || '';
            const formattedModule = moduleMap[module] || module;
            level = levelMap[level] || level.toUpperCase();
            // Apply color to the level
            const coloredLevel = winston.format
              .colorize()
              .colorize(level, `${level}`);
            const formatLine = (line: unknown) => {
              return `${emoji} | ${coloredLevel} | ${timestamp} | ${formattedModule} ${
                func ? ' (' + func + ')' : ''
              } > ${line}`;
            };
            if (typeof message === 'string') {
              return message.split('\n').map(formatLine).join('\n');
            }
            return formatLine(message);
          })
        ),
    transports: [new winston.transports.Console()],
  });
};

export function maskSensitiveInfo(message: string) {
  if (Settings.LOG_SENSITIVE_INFO) {
    return message;
  }
  return '<redacted>';
}
