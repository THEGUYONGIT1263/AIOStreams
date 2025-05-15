import {
  AddonDetail,
  ParseResult,
  Stream,
  StreamRequest,
} from '@aiostreams/types';
import { ParsedStream, Config } from '@aiostreams/types';
import { BaseWrapper } from './base';
import { addonDetails, createLogger } from '@aiostreams/utils';
import { Settings } from '@aiostreams/utils';

const logger = createLogger('wrappers');

// name, title, url
export class StremioJackett extends BaseWrapper {
  constructor(
    configString: string | null,
    overrideUrl: string | null,
    addonName: string = 'Stremio-Jackett',
    addonId: string,
    userConfig: Config,
    indexerTimeout?: number
  ) {
    let url = overrideUrl
      ? overrideUrl
      : Settings.STREMIO_JACKETT_URL + (configString ? configString + '/' : '');

    super(
      addonName,
      url,
      addonId,
      userConfig,
      indexerTimeout || Settings.DEFAULT_STREMIO_JACKETT_TIMEOUT,
      Settings.DEFAULT_STREMIO_JACKETT_USER_AGENT
        ? { 'User-Agent': Settings.DEFAULT_STREMIO_JACKETT_USER_AGENT }
        : undefined
    );
  }

  protected parseStream(stream: Stream): ParseResult {
    const parseResult = super.parseStream(stream);
    if (
      stream.url &&
      parseResult.type === 'stream' &&
      stream.url.includes('/playback/')
    ) {
      try {
        const parsedStream = parseResult.result;
        const components = stream.url.split('/playback/')[1].split('/');
        const config = components[0];
        const decodedConfig = Buffer.from(config, 'base64').toString();
        const parsedConfig = JSON.parse(decodedConfig);
        if (parsedConfig.debrid === true) {
          parsedStream.provider = {
            id: parsedConfig.service,
            cached: stream.name?.includes('⬇️') ?? false,
          };
        }
        parseResult.result = parsedStream;
      } catch (e) {
        let url = new URL(stream.url);
        if (!Settings.LOG_SENSITIVE_INFO) {
          const components = url.pathname.split('/');
          if (components.length > 2) {
            components[2] = '<redacted>';
            url.pathname = components.join('/');
          }
        }
        logger.error(
          `Error parsing stream config for playback URL: ${this.getLoggableUrl(url.toString())}`,
          { func: 'stremio-jackett' }
        );
      }
    }
    return parseResult;
  }
}

const getStremioJackettConfigString = (
  debridService?: string,
  debridApiKey?: string,
  torrenting?: boolean,
  tmdbApiKey?: string
) => {
  const isCommunityInstance = !(
    Settings.DEFAULT_STREMIO_JACKETT_JACKETT_URL ||
    Settings.DEFAULT_STREMIO_JACKETT_JACKETT_API_KEY
  );
  return Buffer.from(
    JSON.stringify({
      addonHost: Settings.STREMIO_JACKETT_URL,
      jackettHost: Settings.DEFAULT_STREMIO_JACKETT_JACKETT_URL || undefined,
      jackettApiKey:
        Settings.DEFAULT_STREMIO_JACKETT_JACKETT_API_KEY || undefined,
      service: debridService ?? '',
      debridKey: debridApiKey ?? '',
      maxSize: 0,
      exclusionKeywords: [],
      languages: [],
      getAllLanguages: true,
      sort: 'quality',
      resultsPerQuality: 100,
      maxResults: 100,
      exclusion: [],
      tmdbApi: Settings.DEFAULT_STREMIO_JACKETT_TMDB_API_KEY ?? tmdbApiKey,
      torrenting: !debridService ? true : (torrenting ?? false),
      debrid: debridService ? true : false,
      jackett: isCommunityInstance ? undefined : true,
      cache: isCommunityInstance ? undefined : true,
      metadataProvider:
        (Settings.DEFAULT_STREMIO_JACKETT_TMDB_API_KEY ?? tmdbApiKey)
          ? 'tmdb'
          : 'cinemeta',
    })
  ).toString('base64');
};

export async function getStremioJackettStreams(
  config: Config,
  stremioJackettOptions: {
    prioritiseDebrid?: string;
    overrideUrl?: string;
    indexerTimeout?: string;
    overrideName?: string;
    torrenting?: string;
    tmdbApiKey?: string;
  },
  streamRequest: StreamRequest,
  addonId: string
): Promise<{
  addonStreams: ParsedStream[];
  addonErrors: string[];
}> {
  const supportedServices: string[] =
    addonDetails.find((addon: AddonDetail) => addon.id === 'stremio-jackett')
      ?.supportedServices || [];
  const addonStreams: ParsedStream[] = [];

  const indexerTimeout = stremioJackettOptions.indexerTimeout
    ? parseInt(stremioJackettOptions.indexerTimeout)
    : undefined;

  // If overrideUrl is provided, use it to get streams and skip all other steps
  if (stremioJackettOptions.overrideUrl) {
    const stremioJackett = new StremioJackett(
      null,
      stremioJackettOptions.overrideUrl as string,
      stremioJackettOptions.overrideName,
      addonId,
      config,
      indexerTimeout
    );
    return stremioJackett.getParsedStreams(streamRequest);
  }

  // find all usable and enabled services
  const usableServices = config.services.filter(
    (service) => supportedServices.includes(service.id) && service.enabled
  );

  // if no usable services found, throw an error
  if (usableServices.length < 1) {
    throw new Error('No supported service(s) enabled');
  }

  // otherwise, depending on the configuration, create multiple instances of stremioJackett or use a single instance with the prioritised service

  if (
    stremioJackettOptions.prioritiseDebrid &&
    !supportedServices.includes(stremioJackettOptions.prioritiseDebrid)
  ) {
    throw new Error('Invalid debrid service');
  }

  if (stremioJackettOptions.prioritiseDebrid) {
    const debridService = usableServices.find(
      (service) => service.id === stremioJackettOptions.prioritiseDebrid
    );
    if (!debridService) {
      throw new Error(
        'Debrid service not found for ' + stremioJackettOptions.prioritiseDebrid
      );
    }
    if (!debridService.credentials.apiKey) {
      throw new Error(
        'Debrid service API key not found for ' +
          stremioJackettOptions.prioritiseDebrid
      );
    }

    // get the stremioJackett config and b64 encode it

    const configString = getStremioJackettConfigString(
      debridService.id,
      debridService.credentials.apiKey,
      stremioJackettOptions.torrenting === 'true'
    );
    const stremioJackett = new StremioJackett(
      configString,
      null,
      stremioJackettOptions.overrideName,
      addonId,
      config,
      indexerTimeout
    );

    return stremioJackett.getParsedStreams(streamRequest);
  }

  // if no prioritised service is provided, create a stremioJackett instance for each service
  const addonErrors: string[] = [];
  const servicesToUse = usableServices.filter((service) => service.enabled);
  if (servicesToUse.length < 1) {
    throw new Error('No supported service(s) enabled');
  }

  const streamPromises = servicesToUse.map(async (service) => {
    logger.info(`Getting Stremio-Jackett streams for ${service.name}`, {
      func: 'stremio-jackett',
    });
    const configString = getStremioJackettConfigString(
      service.id,
      service.credentials.apiKey,
      stremioJackettOptions.torrenting === 'true'
    );
    const stremioJackett = new StremioJackett(
      configString,
      null,
      stremioJackettOptions.overrideName,
      addonId,
      config,
      indexerTimeout
    );
    return stremioJackett.getParsedStreams(streamRequest);
  });

  const streamsArray = await Promise.allSettled(streamPromises);
  streamsArray.forEach((result) => {
    if (result.status === 'fulfilled') {
      addonStreams.push(...result.value.addonStreams);
      addonErrors.push(...result.value.addonErrors);
    } else {
      addonErrors.push(result.reason.message);
    }
  });

  return {
    addonStreams,
    addonErrors,
  };
}
