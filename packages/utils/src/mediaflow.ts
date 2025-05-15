import { Config } from '@aiostreams/types';
import path from 'path';
import { Settings } from './settings';
import { getTextHash } from './crypto';
import { Cache } from './cache';
import { createLogger, maskSensitiveInfo } from './logger';

const logger = createLogger('mediaflow');

const cache = Cache.getInstance<string, string>('publicIp');
const PRIVATE_CIDR = /^(10\.|127\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.)/;

export async function generateMediaFlowStreams(
  mediaFlowConfig: Config['mediaFlowConfig'],
  streams: {
    url: string;
    filename?: string;
    headers?: {
      request?: Record<string, string>;
      response?: Record<string, string>;
    };
  }[]
): Promise<string[] | null> {
  if (!streams.length) {
    return [];
  }
  if (!mediaFlowConfig) {
    throw new Error('MediaFlow configuration is missing');
  }
  const proxyUrl = new URL(mediaFlowConfig.proxyUrl.replace(/\/$/, ''));
  const generateUrlsEndpoint = '/generate_urls';
  proxyUrl.pathname = `${proxyUrl.pathname === '/' ? '' : proxyUrl.pathname}${generateUrlsEndpoint}`;

  const data = {
    mediaflow_proxy_url: mediaFlowConfig.proxyUrl.replace(/\/$/, ''),
    api_password: Settings.ENCRYPT_MEDIAFLOW_URLS
      ? mediaFlowConfig.apiPassword
      : undefined,
    urls: streams.map((stream) => {
      return {
        endpoint: '/proxy/stream',
        filename: stream.filename || path.basename(stream.url),
        query_params: Settings.ENCRYPT_MEDIAFLOW_URLS
          ? undefined
          : {
              api_password: mediaFlowConfig.apiPassword,
            },
        destination_url: stream.url,
        request_headers: stream.headers?.request,
        response_headers: stream.headers?.response,
      };
    }),
  };

  try {
    if (Settings.LOG_SENSITIVE_INFO) {
      logger.debug(`POST ${proxyUrl.toString()}`);
    } else {
      logger.debug(
        `POST ${proxyUrl.protocol}://${maskSensitiveInfo(proxyUrl.hostname)}${proxyUrl.port ? `:${proxyUrl.port}` : ''}/${generateUrlsEndpoint}`
      );
    }
    const response = await fetch(proxyUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
      signal: AbortSignal.timeout(Settings.MEDIAFLOW_IP_TIMEOUT),
    });
    if (!response.ok) {
      throw new Error(`${response.status}: ${response.statusText}`);
    }

    let responseData: any;
    try {
      responseData = await response.json();
    } catch (error) {
      const text = await response.text();
      logger.debug(`Response body: ${text}`);
      throw new Error('Failed to parse JSON response from MediaFlow');
    }

    if (responseData.error) {
      throw new Error(responseData.error);
    }
    if (responseData.urls) {
      return responseData.urls;
    } else {
      throw new Error('No URLs were returned from MediaFlow');
    }
  } catch (error) {
    logger.error(
      `Failed to generate MediaFlow URLs using request to ${maskSensitiveInfo(proxyUrl.toString())}: ${error}`
    );
    return null;
  }
}

export async function getMediaFlowPublicIp(
  mediaFlowConfig: Config['mediaFlowConfig']
) {
  try {
    if (!mediaFlowConfig) {
      logger.error('mediaFlowConfig is missing');
      throw new Error('MediaFlow configuration is missing');
    }

    if (!mediaFlowConfig?.proxyUrl) {
      logger.error('mediaFlowUrl is missing');
      throw new Error('MediaFlow URL is missing');
    }

    if (mediaFlowConfig.publicIp) {
      return mediaFlowConfig.publicIp;
    }

    const mediaFlowUrl = new URL(mediaFlowConfig.proxyUrl.replace(/\/$/, ''));
    if (PRIVATE_CIDR.test(mediaFlowUrl.hostname)) {
      // MediaFlow proxy URL is a private IP address
      logger.error(
        'MediaFlow proxy URL is a private IP address so returning null'
      );
      return null;
    }

    const cacheKey = getTextHash(
      `mediaFlowPublicIp:${mediaFlowConfig.proxyUrl}:${mediaFlowConfig.apiPassword}`
    );
    const cachedPublicIp = cache ? cache.get(cacheKey) : null;
    if (cachedPublicIp) {
      logger.debug(`Returning cached public IP`);
      return cachedPublicIp;
    }

    const proxyIpUrl = mediaFlowUrl;
    const proxyIpPath = '/proxy/ip';
    proxyIpUrl.pathname = `${proxyIpUrl.pathname === '/' ? '' : proxyIpUrl.pathname}${proxyIpPath}`;
    proxyIpUrl.search = new URLSearchParams({
      api_password: mediaFlowConfig.apiPassword,
    }).toString();

    if (Settings.LOG_SENSITIVE_INFO) {
      logger.debug(`GET ${proxyIpUrl.toString()}`);
    } else {
      logger.debug('GET /proxy/ip?api_password=***');
    }

    const response = await fetch(proxyIpUrl.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(Settings.MEDIAFLOW_IP_TIMEOUT),
    });

    if (!response.ok) {
      throw new Error(`${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const publicIp = data.ip;
    if (publicIp && cache) {
      cache.set(cacheKey, publicIp, Settings.CACHE_MEDIAFLOW_IP_TTL);
    } else {
      logger.error(
        `MediaFlow did not respond with a public IP. Response: ${JSON.stringify(data)}`
      );
    }
    return publicIp;
  } catch (error: any) {
    logger.error(`Failed to get MediaFlow public IP: ${error.message}`);
    return null;
  }
}

export function getMediaFlowConfig(userConfig: Config) {
  const mediaFlowConfig = userConfig.mediaFlowConfig;

  return {
    mediaFlowEnabled:
      mediaFlowConfig?.mediaFlowEnabled ||
      Settings.DEFAULT_MEDIAFLOW_URL !== '',
    proxyUrl: mediaFlowConfig?.proxyUrl || Settings.DEFAULT_MEDIAFLOW_URL,
    apiPassword:
      mediaFlowConfig?.apiPassword || Settings.DEFAULT_MEDIAFLOW_API_PASSWORD,
    publicIp: mediaFlowConfig?.publicIp || Settings.DEFAULT_MEDIAFLOW_PUBLIC_IP,
    proxiedAddons: mediaFlowConfig?.proxiedAddons || null,
    proxiedServices: mediaFlowConfig?.proxiedServices || null,
  };
}
