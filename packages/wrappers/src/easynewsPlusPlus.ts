import { ParseResult, StreamRequest } from '@aiostreams/types';
import { ParsedStream, Stream, Config } from '@aiostreams/types';
import { BaseWrapper } from './base';
import { Settings } from '@aiostreams/utils';

export class EasynewsPlusPlus extends BaseWrapper {
  constructor(
    configString: string | null,
    overrideUrl: string | null,
    addonName: string = 'Easynews++',
    addonId: string,
    userConfig: Config,
    indexerTimeout?: number
  ) {
    let url = overrideUrl
      ? overrideUrl
      : Settings.EASYNEWS_PLUS_PLUS_URL +
        (configString ? configString + '/' : '');

    super(
      addonName,
      url,
      addonId,
      userConfig,
      indexerTimeout || Settings.DEFAULT_EASYNEWS_PLUS_PLUS_TIMEOUT,
      Settings.DEFAULT_EASYNEWS_PLUS_PLUS_USER_AGENT
        ? { 'User-Agent': Settings.DEFAULT_EASYNEWS_PLUS_PLUS_USER_AGENT }
        : undefined
    );
  }

  protected parseStream(stream: Stream): ParseResult {
    const parseResult = super.parseStream(stream);
    if (parseResult.type !== 'error') {
      parseResult.result.type = 'usenet';
      const ageString = stream.description?.match(/📅\s*(\d+[a-zA-Z])/);
      parseResult.result.usenet = {
        age: ageString ? ageString[1] : '',
      };
    }
    return parseResult;
  }
}

const getEasynewsPlusPlusConfigString = (
  username: string,
  password: string,
  strictTitleMatching: boolean = false
) => {
  const options = {
    uiLanguage: 'eng',
    username: username,
    password: password,
    strictTitleMatching: strictTitleMatching,
    preferredLanguage: '',
    sortingPreference: 'quality_first',
    showQualities: '4k,1080p,720p,480p',
    maxResultsPerQuality: '',
    maxFileSize: '',
  };
  return encodeURIComponent(JSON.stringify(options));
};

export async function getEasynewsPlusPlusStreams(
  config: Config,
  easynewsPlusOptions: {
    overrideName?: string;
    overrideUrl?: string;
    strictTitleMatching?: boolean;
    indexerTimeout?: string;
  },
  streamRequest: StreamRequest,
  addonId: string
): Promise<{
  addonStreams: ParsedStream[];
  addonErrors: string[];
}> {
  // check for the presence of the username and password in teh easynewsService.credentials object
  // if not found, throw an error
  const credentails = config.services.find(
    (service) => service.id === 'easynews'
  )?.credentials;
  if (!credentails || !credentails.username || !credentails.password) {
    throw new Error('Easynews credentials not found');
  }
  const easynewsPlusConfigString = getEasynewsPlusPlusConfigString(
    credentails.username,
    credentails.password,
    easynewsPlusOptions.strictTitleMatching
  );

  const easynews = new EasynewsPlusPlus(
    easynewsPlusConfigString,
    easynewsPlusOptions.overrideUrl ?? null,
    easynewsPlusOptions.overrideName,
    addonId,
    config,
    easynewsPlusOptions.indexerTimeout
      ? parseInt(easynewsPlusOptions.indexerTimeout)
      : undefined
  );

  return await easynews.getParsedStreams(streamRequest);
}
