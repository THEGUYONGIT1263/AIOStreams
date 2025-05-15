import { ParsedNameData } from '@aiostreams/types';
import { PARSE_REGEX } from './regex';
import * as PTT from 'parse-torrent-title';

function matchPattern(
  filename: string,
  patterns: Record<string, RegExp>
): string {
  return (
    Object.entries(patterns).find(([_, pattern]) =>
      pattern.test(filename)
    )?.[0] ?? 'Unknown'
  );
}

function matchMultiplePatterns(
  filename: string,
  patterns: Record<string, RegExp>
): string[] {
  return Object.entries(patterns)
    .filter(([_, pattern]) => pattern.test(filename))
    .map(([tag]) => tag);
}

function getMatchingPattern(filename: string, pattern: RegExp): string {
  const match = filename.match(pattern);
  return match ? match[1] : 'Unknown';
}

export function parseFilename(filename: string): ParsedNameData {
  const resolution = matchPattern(filename, PARSE_REGEX.resolutions);
  const quality = matchPattern(filename, PARSE_REGEX.qualities);
  const encode = matchPattern(filename, PARSE_REGEX.encodes);
  const visualTags = matchMultiplePatterns(filename, PARSE_REGEX.visualTags);
  const audioTags = matchMultiplePatterns(filename, PARSE_REGEX.audioTags);
  const languages = matchMultiplePatterns(filename, PARSE_REGEX.languages);
  // const releaseGroup = getMatchingPattern(filename, PARSE_REGEX.releaseGroup);

  const parsed = PTT.parse(filename);
  const releaseGroup = parsed.group || 'Unknown';
  const title = parsed.title;
  const year = parsed.year ? parsed.year.toString() : undefined;
  const season = parsed.season;
  const seasons = parsed.seasons;
  const episode = parsed.episode;

  return {
    resolution,
    quality,
    languages,
    encode,
    audioTags,
    visualTags,
    releaseGroup,
    title,
    year,
    season,
    seasons,
    episode,
  };
}
