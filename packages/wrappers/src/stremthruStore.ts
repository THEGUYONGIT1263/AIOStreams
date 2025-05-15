import { AddonDetail, ParseResult, StreamRequest } from '@aiostreams/types';
import { ParsedStream, Config } from '@aiostreams/types';
import { BaseWrapper } from './base';
import { addonDetails, createLogger } from '@aiostreams/utils';
import { Settings } from '@aiostreams/utils';
import { Stream } from 'stream';

const logger = createLogger('wrappers');

export class StremThruStore extends BaseWrapper {
  constructor(
    configString: string | null,
    overrideUrl: string | null,
    addonName: string = 'ST Store',
    addonId: string,
    userConfig: Config,
    indexerTimeout?: number
  ) {
    let url = overrideUrl
      ? overrideUrl
      : Settings.STREMTHRU_STORE_URL + (configString ? configString + '/' : '');

    super(
      addonName,
      url,
      addonId,
      userConfig,
      indexerTimeout || Settings.DEFAULT_STREMTHRU_STORE_TIMEOUT,
      Settings.DEFAULT_STREMTHRU_STORE_USER_AGENT
        ? { 'User-Agent': Settings.DEFAULT_STREMTHRU_STORE_USER_AGENT }
        : undefined
    );
  }

  protected parseStream(stream: { [key: string]: string }): ParseResult {
    const parsedResult = super.parseStream(stream);
    if (parsedResult.type === 'stream' && parsedResult.result.provider?.id) {
      parsedResult.result.provider = {
        ...parsedResult.result.provider,
        cached: true,
      };

      // all st store results are "personal" streams.
      parsedResult.result.personal = true;
      // ST store results use a cogwheel emoji (⚙️) for the release group, this is mistakenly identified as an indexer.
      // remove it (personal results don't have an indexer anyway)
      parsedResult.result.indexers = undefined;
    }
    return parsedResult;
  }
}
export async function getStremThruStoreStreams(
  config: Config,
  stremthruStoreOptions: {
    prioritiseDebrid?: string;
    overrideUrl?: string;
    indexerTimeout?: string;
    overrideName?: string;
  },
  streamRequest: StreamRequest,
  addonId: string
): Promise<{ addonStreams: ParsedStream[]; addonErrors: string[] }> {
  const supportedServices: string[] =
    addonDetails.find((addon: AddonDetail) => addon.id === 'stremthru-store')
      ?.supportedServices || [];
  const parsedStreams: ParsedStream[] = [];
  const indexerTimeout = stremthruStoreOptions.indexerTimeout
    ? parseInt(stremthruStoreOptions.indexerTimeout)
    : undefined;

  // If overrideUrl is provided, use it to get streams and skip all other steps
  if (stremthruStoreOptions.overrideUrl) {
    const stremthruStore = new StremThruStore(
      null,
      stremthruStoreOptions.overrideUrl as string,
      stremthruStoreOptions.overrideName,
      addonId,
      config,
      indexerTimeout
    );
    return await stremthruStore.getParsedStreams(streamRequest);
  }

  // find all usable and enabled services
  const usableServices = config.services.filter(
    (service) => supportedServices.includes(service.id) && service.enabled
  );

  // if no usable services found, raise error
  if (usableServices.length < 1) {
    throw new Error('No supported service(s) enabled');
  }

  // otherwise, depending on the configuration, create multiple instances of StremThru Store or use a single instance with the prioritised service

  if (
    stremthruStoreOptions.prioritiseDebrid &&
    !supportedServices.includes(stremthruStoreOptions.prioritiseDebrid)
  ) {
    throw new Error('Invalid debrid service');
  }

  const formServiceCredentialsString = (
    service: string,
    credentials: { [key: string]: string }
  ) => {
    if (service === 'pikpak' || service === 'offcloud') {
      if (!credentials.email || !credentials.password) {
        throw new Error(
          `Credentials for ${service} are not valid. Please check your configuration. Email and password are required.`
        );
      }
      return `${credentials.email}:${credentials.password}`;
    }
    if (!credentials.apiKey) {
      throw new Error(`API Key is missing for ${service}`);
    }
    return credentials.apiKey;
  };

  if (stremthruStoreOptions.prioritiseDebrid) {
    const debridService = usableServices.find(
      (service) => service.id === stremthruStoreOptions.prioritiseDebrid
    );
    if (!debridService) {
      throw new Error(
        'Debrid service not found for ' + stremthruStoreOptions.prioritiseDebrid
      );
    }
    const storeToken = formServiceCredentialsString(
      debridService.id,
      debridService.credentials
    );

    const stremthruStore = new StremThruStore(
      getConfigString(stremthruStoreOptions.prioritiseDebrid, storeToken),
      null,
      stremthruStoreOptions.overrideName,
      addonId,
      config,
      indexerTimeout
    );

    return await stremthruStore.getParsedStreams(streamRequest);
  }

  // if no prioritised service is provided, create a stremthru instance for each service
  const servicesToUse = usableServices.filter((service) => service.enabled);
  if (servicesToUse.length < 1) {
    throw new Error('No supported service(s) enabled');
  }
  const errorMessages: string[] = [];
  const streamPromises = servicesToUse.map(async (service) => {
    logger.info(`Getting StremThru Store streams for ${service.id}`, {
      func: 'stremthru-store',
    });
    const stremthruStore = new StremThruStore(
      getConfigString(
        service.id,
        formServiceCredentialsString(service.id, service.credentials)
      ),
      null,
      stremthruStoreOptions.overrideName,
      addonId,
      config,
      indexerTimeout
    );
    return stremthruStore.getParsedStreams(streamRequest);
  });

  const results = await Promise.allSettled(streamPromises);
  results.forEach((result) => {
    if (result.status === 'fulfilled') {
      const streams = result.value;
      parsedStreams.push(...streams.addonStreams);
      errorMessages.push(...streams.addonErrors);
    } else {
      errorMessages.push(result.reason.message);
    }
  });

  return { addonStreams: parsedStreams, addonErrors: errorMessages };
}

function getConfigString(storeName: string, storeToken: string) {
  return Buffer.from(
    JSON.stringify({
      store_name: storeName,
      store_token: storeToken,
    })
  ).toString('base64');
}
