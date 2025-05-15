import { parseFilename } from '@aiostreams/parser';
import {
  ParsedStream,
  Stream,
  Config,
  AddonDetail,
  ParsedNameData,
  StreamRequest,
  ParseResult,
} from '@aiostreams/types';
import { BaseWrapper } from './base';
import { addonDetails, Settings } from '@aiostreams/utils';
import { emojiToLanguage } from '@aiostreams/formatters';

export class DMMCast extends BaseWrapper {
  constructor(
    installationUrl: string,
    addonId: string,
    userConfig: Config,
    addonName: string = 'DMM Cast',
    indexerTimeout?: number
  ) {
    super(
      addonName,
      installationUrl,
      addonId,
      userConfig,
      indexerTimeout || Settings.DEFAULT_DMM_CAST_TIMEOUT,
      Settings.DEFAULT_DMM_CAST_USER_AGENT
        ? { 'User-Agent': Settings.DEFAULT_DMM_CAST_USER_AGENT }
        : undefined
    );
  }

  protected parseStream(stream: Stream): ParseResult {
    // the streams for DMM cast can be one of the following
    // 1:Cast - Cast a file inside a torrent
    // 2:Stream - Stream the latest link you casted
    // DMM Other - Filename can be split across multiple lines with 📦 {size} at last line
    // DMM Yours - Filename can be split across multiple lines with 📦 {size} at last line
    let message = '';
    let filename = stream.title
      ? stream.title
          .split('\n')
          .map((line) => line.replace(/-$/, ''))
          .filter((line) => !line.includes('📦'))
          .join('')
      : stream.behaviorHints?.filename?.trim();
    if (!stream.title?.includes('📦')) {
      filename = undefined;
      message = stream.title || '';
    }

    const parsedFilename: ParsedNameData = parseFilename(filename || '');
    const sizeInBytes = stream.title?.split('\n').pop()?.includes('📦')
      ? this.extractSizeInBytes(stream.title.split('\n').pop()!, 1024)
      : 0;

    const parseResult: ParseResult = this.createParsedResult({
      parsedInfo: parsedFilename,
      stream,
      filename,
      size: sizeInBytes,
    });
    if (parseResult.type === 'stream') {
      parseResult.result.message = message;
    }
    return parseResult;
  }
}

export async function getDMMCastStreams(
  config: Config,
  dmmCastOptions: {
    installationUrl?: string;
    indexerTimeout?: string;
    overrideName?: string;
  },
  streamRequest: StreamRequest,
  addonId: string
): Promise<{
  addonStreams: ParsedStream[];
  addonErrors: string[];
}> {
  if (!dmmCastOptions.installationUrl) {
    throw new Error('DMM Cast installation URL is missing');
  } else if (
    dmmCastOptions.installationUrl.match(
      /\/api\/stremio\/.*\/manifest\.json$/
    ) === null
  ) {
    throw new Error('Invalid DMM Cast installation URL');
  }
  const dmmCast = new DMMCast(
    dmmCastOptions.installationUrl,
    addonId,
    config,
    dmmCastOptions.overrideName,
    dmmCastOptions.indexerTimeout
      ? parseInt(dmmCastOptions.indexerTimeout)
      : undefined
  );
  return await dmmCast.getParsedStreams(streamRequest);
}
