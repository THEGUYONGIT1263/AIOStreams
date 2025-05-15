import { BaseWrapper } from './base';
import {
  Config,
  ParsedNameData,
  ParsedStream,
  ParseResult,
  Stream,
  StreamRequest,
} from '@aiostreams/types';
import { parseFilename } from '@aiostreams/parser';
import { createLogger, Settings } from '@aiostreams/utils';

const logger = createLogger('wrappers');

interface TorboxStream extends Stream {
  name: string;
  url: string;
  description: string;
  hash?: string;
  is_cached?: boolean;
  size?: number;
  magnet?: string;
  nzb?: string;
  seeders?: number;
  peers?: number;
  quality?: string;
  resolution?: string;
  language?: string;
  type?: string;
  adult?: boolean;
  user_search?: boolean;
}

export class Torbox extends BaseWrapper {
  constructor(
    apiKey: string,
    addonName: string = 'TorBox',
    addonId: string,
    userConfig: Config,
    indexerTimeout?: number
  ) {
    super(
      addonName,
      Settings.TORBOX_STREMIO_URL + apiKey + '/',
      addonId,
      userConfig,
      indexerTimeout || Settings.DEFAULT_TORBOX_TIMEOUT,
      Settings.DEFAULT_TORBOX_USER_AGENT
        ? { 'User-Agent': Settings.DEFAULT_TORBOX_USER_AGENT }
        : undefined
    );
  }

  protected parseStream(stream: TorboxStream): ParseResult {
    const filename =
      stream.behaviorHints?.filename ||
      stream.description.match(/Name:\s*([^\n]+)/)?.[1];
    let message = undefined;
    if (stream.description.includes('Click play to start streaming')) {
      message = stream.description;
    }
    const parsedFilename: ParsedNameData = parseFilename(
      filename || stream.description
    );

    const size = stream.behaviorHints?.videoSize || stream.size;
    const seeders =
      stream.seeders && stream.seeders !== -1 ? stream.seeders : undefined;
    const age =
      stream.description.match(/\|\sAge:\s([0-9]+[dmyh])/)?.[1] || undefined;
    const source =
      stream.description.match(/Source:\s*([^\n]+)/)?.[1] || undefined;
    const infoHash =
      stream.hash ||
      stream.magnet?.match(/btih:([0-9a-fA-F]{40,})/)?.[1] ||
      undefined;
    const personal = stream.name.includes('Your Media');
    const provider = {
      id: 'torbox',
      cached: stream.is_cached !== undefined ? stream.is_cached : true,
    };

    const parsedStream: ParseResult = this.createParsedResult({
      parsedInfo: parsedFilename,
      stream,
      filename,
      size,
      provider,
      seeders,
      usenetAge: age,
      indexer: source,
      personal,
      infoHash,
      message,
    });

    return parsedStream;
  }
}

export async function getTorboxStreams(
  config: Config,
  torboxOptions: {
    indexerTimeout?: string;
    overrideName?: string;
  },
  streamRequest: StreamRequest,
  addonId: string
): Promise<{ addonStreams: ParsedStream[]; addonErrors: string[] }> {
  const torboxService = config.services.find(
    (service) => service.id === 'torbox'
  );
  if (!torboxService) {
    throw new Error('Torbox service not found');
  }

  const torboxApiKey = torboxService.credentials.apiKey;
  if (!torboxApiKey) {
    throw new Error('Torbox API key not found');
  }

  const torbox = new Torbox(
    torboxApiKey,
    torboxOptions.overrideName,
    addonId,
    config,
    torboxOptions.indexerTimeout
      ? parseInt(torboxOptions.indexerTimeout)
      : undefined
  );
  return await torbox.getParsedStreams(streamRequest);
}
