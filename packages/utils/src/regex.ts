import { isMatch, firstMatch } from 'super-regex';
import { Cache } from './cache';
import { getTextHash } from './crypto';
import { createLogger } from './logger';
import { Settings } from './settings';

const DEFAULT_TIMEOUT = 1000; // 1 second timeout
const regexCache = Cache.getInstance<string, RegExp>('regexCache', 1_000);
const resultCache = Cache.getInstance<string, boolean>(
  'regexResultCache',
  1_000_000
);

const logger = createLogger('regex');

/**
 * Safely tests a regex pattern against a string with ReDoS protection
 * @param pattern The regex pattern to test
 * @param str The string to test against
 * @param timeoutMs Optional timeout in milliseconds (default: 1000ms)
 * @returns boolean indicating if the pattern matches the string
 */
export function safeRegexTest(
  pattern: string | RegExp,
  str: string,
  timeoutMs: number = DEFAULT_TIMEOUT
): boolean {
  const compiledPattern =
    typeof pattern === 'string' ? compileRegex(pattern) : pattern;
  try {
    return resultCache.wrap(
      (p: RegExp, s: string) => isMatch(p, s, { timeout: timeoutMs }),
      getTextHash(`${compiledPattern.source}|${str}`),
      100,
      compiledPattern,
      str
    );
  } catch (error) {
    logger.error(`Regex test timed out after ${timeoutMs}ms:`, error);
    return false;
  }
}

export function compileRegex(
  pattern: string,
  flags: string = '',
  bypassCache: boolean = false
): RegExp {
  if (bypassCache) {
    return new RegExp(pattern, flags);
  }
  return regexCache.wrap(
    (p: string, f: string) => new RegExp(p, f),
    getTextHash(`${pattern}|${flags}`),
    60,
    pattern,
    flags
  );
}

export function formRegexFromKeywords(
  keywords: string[],
  flags: string = 'i'
): RegExp {
  const pattern = `(?<![^ [(_\\-.])(${keywords
    .map((filter) => filter.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'))
    .map((filter) => filter.replace(/\s/g, '[ .\\-_]?'))
    .join('|')})(?=[ \\)\\]_.-]|$)`;

  return compileRegex(pattern, flags);
}
