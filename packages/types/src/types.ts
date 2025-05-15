// the data that is parsed from a filename
export interface ParsedNameData {
  resolution: string;
  quality: string;
  encode: string;
  releaseGroup: string;
  visualTags: string[];
  audioTags: string[];
  languages: string[];
  title?: string;
  year?: string;
  season?: number;
  seasons?: number[];
  episode?: number;
}

// the parsed stream data which is to be used to create the final stream object
export interface ParsedStream extends ParsedNameData {
  proxied: boolean; // if the stream is proxied or not
  addon: {
    id: string;
    name: string;
  };
  filename?: string;
  folderName?: string;
  message?: string;
  size?: number;
  provider?: {
    id: string;
    cached?: boolean;
  };
  _infoHash?: string; // this infohash is used to determine duplicates, provided so that debrid strems aren't mistaken for torrent streams by providing torrent.infoHash
  torrent?: {
    infoHash?: string;
    fileIdx?: number;
    seeders?: number;
    sources?: string[];
  };
  usenet?: {
    age?: string;
  };
  type: 'usenet' | 'debrid' | 'p2p' | 'live' | 'unknown';
  duration?: number;
  url?: string;
  externalUrl?: string;
  indexers?: string;
  releaseGroup: string;
  personal?: boolean;
  regexMatched?: {
    pattern: string;
    name?: string;
    index: number;
  };
  stream?: {
    subtitles?: Subtitle[];
    behaviorHints?: {
      countryWhitelist?: string[];
      notWebReady?: boolean;
      proxyHeaders?: {
        request?: { [key: string]: string };
        response?: { [key: string]: string };
      };
      videoHash?: string;
    };
  };
}

export interface ErrorStream {
  error: string;
  addon: {
    id: string;
    name: string;
  };
}

interface ErrorParseResult {
  type: 'error';
  result: string;
}

interface SuccessParseResult {
  type: 'stream';
  result: ParsedStream;
}

export type ParseResult = SuccessParseResult | ErrorParseResult;

export interface CollectedParsedStreams {
  [key: string]: ParsedStream[];
}

export interface Stream {
  url?: string;
  externalUrl?: string;
  infoHash?: string;
  fileIdx?: number;
  name?: string;
  title?: string;
  description?: string;
  subtitles?: Subtitle[];
  sources?: string[];
  behaviorHints?: {
    countryWhitelist?: string[];
    notWebReady?: boolean;
    bingeGroup?: string;
    proxyHeaders?: {
      request?: { [key: string]: string };
      response?: { [key: string]: string };
    };
    videoHash?: string;
    videoSize?: number;
    filename?: string;
  };
}

export interface Subtitle {
  id: string;
  url: string;
  lang: string;
}

export interface StreamRequest {
  id: string;
  type: 'series' | 'movie';
}

export type Resolution = { [key: string]: boolean };
export type Quality = { [key: string]: boolean };
export type VisualTag = { [key: string]: boolean };
export type AudioTag = { [key: string]: boolean };
export type Encode = { [key: string]: boolean };
export type SortBy = { [key: string]: boolean | string | undefined };
export type StreamType = { [key: string]: boolean };

export interface CustomFormatter {
  name?: string;
  description?: string;
}

export interface Config {
  apiKey?: string;
  overrideName?: string;
  requestingIp?: string;
  resolutions: Resolution[];
  qualities: Quality[];
  visualTags: VisualTag[];
  audioTags: AudioTag[];
  encodes: Encode[];
  sortBy: SortBy[];
  streamTypes: StreamType[];
  onlyShowCachedStreams: boolean;
  prioritiseLanguage?: string; // from older configurations
  prioritisedLanguages: string[] | null;
  excludedLanguages: string[] | null;
  formatter: string;
  maxSize?: number | null;
  minSize?: number | null;
  maxMovieSize: number | null;
  minMovieSize: number | null;
  maxEpisodeSize: number | null;
  minEpisodeSize: number | null;
  cleanResults: boolean;
  maxResultsPerResolution: number | null;
  excludeFilters: string[] | null;
  strictIncludeFilters: string[] | null;
  regexFilters?: {
    excludePattern?: string;
    includePattern?: string;
  };
  mediaFlowConfig?: {
    mediaFlowEnabled: boolean;
    proxyUrl: string;
    apiPassword: string;
    publicIp: string;
    proxiedAddons: string[] | null;
    proxiedServices: string[] | null;
  };
  stremThruConfig?: {
    stremThruEnabled: boolean;
    url: string;
    credential: string;
    publicIp: string;
    proxiedAddons: string[] | null;
    proxiedServices: string[] | null;
  };
  addons: {
    id: string;
    options: { [key: string]: string | undefined };
  }[];
  services: {
    name: string;
    id: string;
    enabled: boolean;
    credentials: { [key: string]: string };
  }[];
  /** Space-separated regex patterns to sort streams by. Streams will be sorted based on the order of matching patterns. */
  regexSortPatterns?: string;
}

interface BaseOptionDetail {
  id: string;
  secret?: boolean;
  required?: boolean;
  label: string;
  description?: string;
}

export interface DeprecatedOptionDetail extends BaseOptionDetail {
  type: 'deprecated';
}

export interface TextOptionDetail extends BaseOptionDetail {
  type: 'text';
}

export interface SelectOptionDetail extends BaseOptionDetail {
  type: 'select';
  options: { value: string; label: string }[];
}

export interface MultiSelectOptionDetail extends BaseOptionDetail {
  type: 'multiSelect';
  options: { value: string; label: string }[];
}

export interface CheckboxOptionDetail extends BaseOptionDetail {
  type: 'checkbox';
}

export interface NumberOptionDetail extends BaseOptionDetail {
  type: 'number';
  constraints: {
    min?: number;
    max?: number;
  };
}

export type AddonOptionDetail =
  | TextOptionDetail
  | SelectOptionDetail
  | MultiSelectOptionDetail
  | CheckboxOptionDetail
  | NumberOptionDetail
  | DeprecatedOptionDetail;

export interface AddonDetail {
  name: string;
  id: string;
  requiresService: boolean;
  supportedServices: string[];
  options?: AddonOptionDetail[];
}

export interface ServiceDetail {
  name: string;
  id: string;
  shortName: string;
  knownNames: string[];
  credentials: ServiceCredential[];
}

export interface ServiceCredential {
  id: string;
  label: string;
  link?: string;
}
