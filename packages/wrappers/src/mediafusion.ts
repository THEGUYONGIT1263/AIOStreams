import { AddonDetail, ParseResult, StreamRequest } from '@aiostreams/types';
import { ParsedStream, Stream, Config } from '@aiostreams/types';
import { BaseWrapper } from './base';
import { addonDetails, Settings, createLogger } from '@aiostreams/utils';

const logger = createLogger('wrappers');

export class MediaFusion extends BaseWrapper {
  constructor(
    configString: string | null,
    overrideUrl: string | null,
    addonName: string = 'MediaFusion',
    addonId: string,
    userConfig: Config,
    indexerTimeout?: number
  ) {
    let url = overrideUrl ? overrideUrl : Settings.MEDIAFUSION_URL;

    super(
      addonName,
      url,
      addonId,
      userConfig,
      indexerTimeout || Settings.DEFAULT_MEDIAFUSION_TIMEOUT,
      {
        encoded_user_data: configString && !overrideUrl ? configString : '',
        // only set the user agent if it is defined in the settings, otherwise user agent would be empty in base class
        ...(Settings.DEFAULT_MEDIAFUSION_USER_AGENT
          ? { 'User-Agent': Settings.DEFAULT_MEDIAFUSION_USER_AGENT }
          : {}),
      }
    );
  }

  protected parseStream(stream: Stream): ParseResult {
    if (stream.description?.includes('Content Warning')) {
      return {
        type: 'error',
        result: stream.description,
      };
    }
    const parseResult = super.parseStream(stream);
    if (parseResult.type === 'stream' && parseResult.result) {
      const torrentNameRegex = /📂\s*(.+)/;
      const description = stream.description || stream.title;
      const match = torrentNameRegex.exec(description || '');
      if (match && match[1].trim() !== parseResult.result.filename?.trim()) {
        parseResult.result.folderName = match[1].trim();
        if (parseResult.result.folderName.split('┈➤')[1]) {
          parseResult.result.filename = parseResult.result.folderName
            .split('┈➤')[1]
            .trim();
        }
      }
    }
    return parseResult;
  }
}

export async function getMediafusionStreams(
  config: Config,
  mediafusionOptions: {
    prioritiseDebrid?: string;
    overrideUrl?: string;
    indexerTimeout?: string;
    overrideName?: string;
    filterCertificationLevels?: string;
    filterNudity?: string;
    liveSearchStreams?: string;
  },
  streamRequest: StreamRequest,
  addonId: string
): Promise<{
  addonStreams: ParsedStream[];
  addonErrors: string[];
}> {
  const supportedServices: string[] =
    addonDetails.find((addon: AddonDetail) => addon.id === 'mediafusion')
      ?.supportedServices || [];
  const addonStreams: ParsedStream[] = [];
  const indexerTimeout = mediafusionOptions.indexerTimeout
    ? parseInt(mediafusionOptions.indexerTimeout)
    : undefined;
  const liveSearchStreams =
    mediafusionOptions.liveSearchStreams === 'true' ? true : false;

  // If overrideUrl is provided, use it to get streams and skip all other steps
  if (mediafusionOptions.overrideUrl) {
    const mediafusion = new MediaFusion(
      null,
      mediafusionOptions.overrideUrl as string,
      mediafusionOptions.overrideName,
      addonId,
      config,
      indexerTimeout
    );
    return mediafusion.getParsedStreams(streamRequest);
  }

  // find all usable and enabled services
  const usableServices = config.services.filter(
    (service) => supportedServices.includes(service.id) && service.enabled
  );

  // if no usable services found, use mediafusion without debrid
  if (usableServices.length < 1) {
    const configString = getConfigString(
      mediafusionOptions.filterCertificationLevels,
      mediafusionOptions.filterNudity,
      liveSearchStreams
    );

    const mediafusion = new MediaFusion(
      configString,
      null,
      mediafusionOptions.overrideName,
      addonId,
      config,
      indexerTimeout
    );
    return await mediafusion.getParsedStreams(streamRequest);
  }

  // otherwise, depending on the configuration, create multiple instances of mediafusion or use a single instance with the prioritised service

  if (
    mediafusionOptions.prioritiseDebrid &&
    !supportedServices.includes(mediafusionOptions.prioritiseDebrid)
  ) {
    throw new Error(
      `The service ${mediafusionOptions.prioritiseDebrid} is invalid for MediaFusion`
    );
  }

  if (mediafusionOptions.prioritiseDebrid) {
    const debridService = usableServices.find(
      (service) => service.id === mediafusionOptions.prioritiseDebrid
    );
    if (!debridService) {
      throw new Error(
        `${mediafusionOptions.prioritiseDebrid} could not be found in your services`
      );
    }
    if (!debridService.credentials.apiKey) {
      throw new Error(
        `Missing API key for ${mediafusionOptions.prioritiseDebrid}`
      );
    }

    // get the encrypted mediafusion string
    const mediafusionConfig = getConfigString(
      mediafusionOptions.filterCertificationLevels,
      mediafusionOptions.filterNudity,
      liveSearchStreams,
      debridService.id,
      debridService.credentials
    );
    const mediafusion = new MediaFusion(
      mediafusionConfig,
      null,
      mediafusionOptions.overrideName,
      addonId,
      config,
      indexerTimeout
    );

    return await mediafusion.getParsedStreams(streamRequest);
  }

  // if no prioritised service is provided, create a mediafusion instance for each service
  const addonErrors: string[] = [];
  const servicesToUse = usableServices.filter((service) => service.enabled);
  if (servicesToUse.length < 1) {
    throw new Error(`No enabled services found for MediaFusion`);
  }
  const promises = servicesToUse.map(async (service) => {
    logger.info(`Getting MediaFusion streams for ${service.id}`, {
      func: 'mediafusion',
    });
    const encodedConfigString = getConfigString(
      mediafusionOptions.filterCertificationLevels,
      mediafusionOptions.filterNudity,
      liveSearchStreams,
      service.id,
      service.credentials
    );
    const mediafusion = new MediaFusion(
      encodedConfigString,
      null,
      mediafusionOptions.overrideName,
      addonId,
      config,
      indexerTimeout
    );
    return mediafusion.getParsedStreams(streamRequest);
  });

  const results = await Promise.allSettled(promises);
  results.forEach((result) => {
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

const getConfigString = (
  filterCertificationLevels?: string,
  filterNudity?: string,
  liveSearchStreams: boolean = false,
  service?: string,
  credentials: { [key: string]: string } = {}
): any => {
  let nudityFilter = ['Disable'];
  let certificationFilter = ['Disable'];
  if (filterCertificationLevels) {
    const levels = filterCertificationLevels.split(',');
    certificationFilter = levels.map((level) => level.trim());
  }
  if (filterNudity) {
    const levels = filterNudity.split(',');
    nudityFilter = levels.map((level) => level.trim());
  }
  return Buffer.from(
    JSON.stringify({
      streaming_provider: service
        ? {
            token: !['pikpak'].includes(service)
              ? credentials.apiKey
              : undefined,
            email: credentials.email,
            password: credentials.password,
            service: service,
            enable_watchlists_catalogs: false,
            download_via_browser: false,
            only_show_cached_streams: false,
          }
        : null,
      selected_catalogs: [],
      selected_resolutions: [
        '4k',
        '2160p',
        '1440p',
        '1080p',
        '720p',
        '576p',
        '480p',
        '360p',
        '240p',
        null,
      ],
      enable_catalogs: true,
      enable_imdb_metadata: false,
      max_size: 'inf',
      max_streams_per_resolution: '500',
      torrent_sorting_priority: [
        { key: 'language', direction: 'desc' },
        { key: 'cached', direction: 'desc' },
        { key: 'resolution', direction: 'desc' },
        { key: 'quality', direction: 'desc' },
        { key: 'size', direction: 'desc' },
        { key: 'seeders', direction: 'desc' },
        { key: 'created_at', direction: 'desc' },
      ],
      show_full_torrent_name: true,
      show_language_country_flag: true,
      nudity_filter: nudityFilter,
      certification_filter: certificationFilter,
      language_sorting: [
        'English',
        'Tamil',
        'Hindi',
        'Malayalam',
        'Kannada',
        'Telugu',
        'Chinese',
        'Russian',
        'Arabic',
        'Japanese',
        'Korean',
        'Taiwanese',
        'Latino',
        'French',
        'Spanish',
        'Portuguese',
        'Italian',
        'German',
        'Ukrainian',
        'Polish',
        'Czech',
        'Thai',
        'Indonesian',
        'Vietnamese',
        'Dutch',
        'Bengali',
        'Turkish',
        'Greek',
        'Swedish',
        null,
      ],
      quality_filter: [
        'BluRay/UHD',
        'WEB/HD',
        'DVD/TV/SAT',
        'CAM/Screener',
        'Unknown',
      ],
      api_password: Settings.MEDIAFUSION_API_PASSWORD || null,
      mediaflow_config: null,
      rpdb_config: null,
      live_search_streams: liveSearchStreams,
      contribution_streams: false,
      mdblist_config: null,
    })
  )
    .toString('base64')
    .replace(/\+/g, '-') // Convert '+' to '-'
    .replace(/\//g, '_') // Convert '/' to '_'
    .replace(/=+$/, '');
};
