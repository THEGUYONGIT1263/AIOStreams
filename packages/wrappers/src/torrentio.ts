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

export class Torrentio extends BaseWrapper {
  constructor(
    configString: string | null,
    overrideUrl: string | null,
    addonName: string = 'Torrentio',
    addonId: string,
    userConfig: Config,
    indexerTimeout?: number
  ) {
    let url = overrideUrl
      ? overrideUrl
      : Settings.TORRENTIO_URL + (configString ? configString + '/' : '');

    super(
      addonName,
      url,
      addonId,
      userConfig,
      indexerTimeout || Settings.DEFAULT_TORRENTIO_TIMEOUT,
      Settings.DEFAULT_TORRENTIO_USER_AGENT
        ? { 'User-Agent': Settings.DEFAULT_TORRENTIO_USER_AGENT }
        : undefined
    );
  }

  protected parseStream(stream: Stream): ParseResult {
    const parseResult = super.parseStream(stream);
    if (parseResult.type === 'stream' && parseResult.result) {
      const description = stream.description || stream.title;
      const folderName = description?.split('\n')?.[0];
      if (folderName !== parseResult.result.filename) {
        parseResult.result.folderName = folderName;
      }
    }
    return parseResult;
  }
}

export async function getTorrentioStreams(
  config: Config,
  torrentioOptions: {
    useMultipleInstances?: string;
    overrideUrl?: string;
    indexerTimeout?: string;
    overrideName?: string;
  },
  streamRequest: StreamRequest,
  addonId: string
): Promise<{ addonStreams: ParsedStream[]; addonErrors: string[] }> {
  const supportedServices: string[] =
    addonDetails.find((addon: AddonDetail) => addon.id === 'torrentio')
      ?.supportedServices || [];
  const addonStreams: ParsedStream[] = [];
  const indexerTimeout = torrentioOptions.indexerTimeout
    ? parseInt(torrentioOptions.indexerTimeout)
    : undefined;

  // If overrideUrl is provided, use it to get streams and skip all other steps
  if (torrentioOptions.overrideUrl) {
    const torrentio = new Torrentio(
      null,
      torrentioOptions.overrideUrl,
      torrentioOptions.overrideName,
      addonId,
      config,
      indexerTimeout
    );
    return await torrentio.getParsedStreams(streamRequest);
  }

  // find all usable services
  const usableServices = config.services.filter(
    (service) => supportedServices.includes(service.id) && service.enabled
  );

  // if no usable services found, use torrentio without any configuration
  if (usableServices.length < 1) {
    const torrentio = new Torrentio(
      null,
      null,
      torrentioOptions.overrideName,
      addonId,
      config,
      indexerTimeout
    );
    return await torrentio.getParsedStreams(streamRequest);
  }

  // otherwise, depending on the configuration, create multiple instances of torrentio or use a single instance with all services
  const addonErrors: string[] = [];
  const getServicePair = (
    serviceId: string,
    credentials: { [key: string]: string }
  ) => {
    return serviceId === 'putio'
      ? `${serviceId}=${credentials.clientId}@${credentials.token}`
      : `${serviceId}=${credentials.apiKey}`;
  };

  if (torrentioOptions.useMultipleInstances === 'true') {
    const promises = usableServices.map(async (service) => {
      logger.info(`Getting Torrentio streams for ${service.name}`, {
        func: 'torrentio',
      });
      let configString = getServicePair(service.id, service.credentials);
      const torrentio = new Torrentio(
        configString,
        null,
        torrentioOptions.overrideName,
        addonId,
        config,
        indexerTimeout
      );
      return await torrentio.getParsedStreams(streamRequest);
    });
    const results = await Promise.allSettled(promises);
    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        addonStreams.push(...result.value.addonStreams);
        addonErrors.push(...result.value.addonErrors);
      } else if (result.status === 'rejected') {
        addonErrors.push(result.reason);
      }
    });
    return { addonStreams, addonErrors };
  } else {
    let configString = '';
    for (const service of usableServices) {
      if (!service.enabled) {
        continue;
      }
      configString += getServicePair(service.id, service.credentials) + '|';
    }
    const torrentio = new Torrentio(
      configString,
      null,
      torrentioOptions.overrideName,
      addonId,
      config,
      indexerTimeout
    );
    return await torrentio.getParsedStreams(streamRequest);
  }
}
