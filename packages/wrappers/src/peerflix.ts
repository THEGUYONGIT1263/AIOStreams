import { AddonDetail, StreamRequest } from '@aiostreams/types';
import { ParsedStream, Config } from '@aiostreams/types';
import { BaseWrapper } from './base';
import { addonDetails, createLogger } from '@aiostreams/utils';
import { Settings } from '@aiostreams/utils';

const logger = createLogger('wrappers');

export class Peerflix extends BaseWrapper {
  constructor(
    configString: string | null,
    overrideUrl: string | null,
    addonName: string = 'Peerflix',
    addonId: string,
    userConfig: Config,
    indexerTimeout?: number
  ) {
    let url = overrideUrl
      ? overrideUrl
      : Settings.PEERFLIX_URL + (configString ? configString + '/' : '');

    super(
      addonName,
      url,
      addonId,
      userConfig,
      indexerTimeout || Settings.DEFAULT_PEERFLIX_TIMEOUT,
      Settings.DEFAULT_PEERFLIX_USER_AGENT
        ? { 'User-Agent': Settings.DEFAULT_PEERFLIX_USER_AGENT }
        : undefined
    );
  }
}

export async function getPeerflixStreams(
  config: Config,
  peerflixOptions: {
    showP2PStreams?: string;
    useMultipleInstances?: string;
    overrideUrl?: string;
    indexerTimeout?: string;
    overrideName?: string;
  },
  streamRequest: StreamRequest,
  addonId: string
): Promise<{ addonStreams: ParsedStream[]; addonErrors: string[] }> {
  const supportedServices: string[] =
    addonDetails.find((addon: AddonDetail) => addon.id === 'peerflix')
      ?.supportedServices || [];
  const addonStreams: ParsedStream[] = [];
  const indexerTimeout = peerflixOptions.indexerTimeout
    ? parseInt(peerflixOptions.indexerTimeout)
    : undefined;
  // If overrideUrl is provided, use it to get streams and skip all other steps
  if (peerflixOptions.overrideUrl) {
    const peerflix = new Peerflix(
      null,
      peerflixOptions.overrideUrl as string,
      peerflixOptions.overrideName,
      addonId,
      config,
      indexerTimeout
    );
    return await peerflix.getParsedStreams(streamRequest);
  }

  // find all usable services
  const usableServices = config.services.filter(
    (service) => supportedServices.includes(service.id) && service.enabled
  );
  logger.debug(
    `Found ${usableServices.length} usable services: ${usableServices.map((service) => service.id).join(', ')}`,
    { func: 'peerflix' }
  );

  // if no usable services found, use peerflix without any configuration
  if (usableServices.length < 1) {
    const peerflix = new Peerflix(
      null,
      null,
      peerflixOptions.overrideName,
      addonId,
      config,
      indexerTimeout
    );
    return await peerflix.getParsedStreams(streamRequest);
  }

  // otherwise, depending on the configuration, create multiple instances of peerflix or use a single instance with all services
  const addonErrors: string[] = [];
  const getServicePair = (
    serviceId: string,
    credentials: { [key: string]: string }
  ): [string, string] => {
    return serviceId === 'putio'
      ? [serviceId, `${credentials.clientId}@${credentials.token}`]
      : [serviceId, credentials.apiKey];
  };

  if (peerflixOptions.useMultipleInstances === 'true') {
    let retrievedP2PStreams = false;
    const promises = usableServices.map(async (service) => {
      logger.info(`Getting Peerflix streams for ${service.name}`, {
        func: 'peerflix',
      });
      let configPairs = [getServicePair(service.id, service.credentials)];
      if (peerflixOptions.showP2PStreams === 'true' && !retrievedP2PStreams) {
        configPairs.push(['debridoptions', 'torrentlinks']);
        retrievedP2PStreams = true;
      }
      const configString = configPairs.map((pair) => pair.join('=')).join('|');
      const peerflix = new Peerflix(
        configString,
        null,
        peerflixOptions.overrideName,
        addonId,
        config,
        indexerTimeout
      );
      return await peerflix.getParsedStreams(streamRequest);
    });
    const results = await Promise.allSettled(promises);
    for (const result of results) {
      if (result.status === 'fulfilled') {
        addonStreams.push(...result.value.addonStreams);
        addonErrors.push(...result.value.addonErrors);
      } else {
        addonErrors.push(result.reason.message);
      }
    }
    return { addonStreams, addonErrors };
  } else {
    let configPairs = [];
    for (const service of usableServices) {
      if (!service.enabled) {
        continue;
      }
      configPairs.push(getServicePair(service.id, service.credentials));
    }
    if (peerflixOptions.showP2PStreams === 'true') {
      configPairs.push(['debridoptions', 'torrentlinks']);
    }
    const configString = configPairs.map((pair) => pair.join('=')).join('|');
    const peerflix = new Peerflix(
      configString,
      null,
      peerflixOptions.overrideName,
      addonId,
      config,
      indexerTimeout
    );
    return await peerflix.getParsedStreams(streamRequest);
  }
}
