import { Config } from '@aiostreams/types';
import { Settings } from './settings';
import { getTextHash } from './crypto';
import { Cache } from './cache';
import { createLogger, maskSensitiveInfo } from './logger';

const logger = createLogger('stremthru');

const cache = Cache.getInstance<string, string>('publicIp');

const PRIVATE_CIDR = /^(10\.|127\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.)/;

export async function generateStremThruStreams(
  stremThruConfig: Config['stremThruConfig'],
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
  if (!stremThruConfig) {
    throw new Error('StremThru configuration is missing');
  }
  const proxyUrl = new URL(stremThruConfig.url.replace(/\/$/, ''));
  const generateUrlsEndpoint = '/v0/proxy';
  proxyUrl.pathname = `${proxyUrl.pathname === '/' ? '' : proxyUrl.pathname}${generateUrlsEndpoint}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
  };

  const data = new URLSearchParams();

  streams.forEach((stream, i) => {
    data.append('url', stream.url);
    let req_headers = '';
    if (stream.headers?.request) {
      for (const [key, value] of Object.entries(stream.headers.request)) {
        req_headers += `${key}: ${value}\n`;
      }
    }
    data.append(`req_headers[${i}]`, req_headers);
    if (stream.filename) {
      data.append(`filename[${i}]`, stream.filename);
    }
  });

  if (Settings.ENCRYPT_STREMTHRU_URLS) {
    headers['X-StremThru-Authorization'] =
      `Basic ${stremThruConfig.credential}`;
  } else {
    proxyUrl.searchParams.set('token', stremThruConfig.credential);
  }

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
      headers,
      body: data,
      signal: AbortSignal.timeout(Settings.STREMTHRU_TIMEOUT),
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
      throw new Error('Failed to parse JSON response from StremThru');
    }

    if (responseData.error) {
      throw new Error(responseData.error);
    }
    if (responseData.data?.items) {
      return responseData.data.items;
    } else {
      throw new Error('No URLs were returned from StremThru');
    }
  } catch (error) {
    logger.error(
      `Failed to generate StremThru URLs using request to ${maskSensitiveInfo(proxyUrl.toString())}: ${error}`
    );
    return null;
  }
}

export async function getStremThruPublicIp(
  stremThruConfig: Config['stremThruConfig']
) {
  try {
    if (!stremThruConfig) {
      logger.error('stremThruConfig is missing');
      throw new Error('StremThru configuration is missing');
    }

    if (!stremThruConfig?.url) {
      logger.error('stremThruUrl is missing');
      throw new Error('StremThru URL is missing');
    }

    if (stremThruConfig.publicIp) {
      return stremThruConfig.publicIp;
    }

    const stremThruUrl = new URL(stremThruConfig.url.replace(/\/$/, ''));
    if (PRIVATE_CIDR.test(stremThruUrl.hostname)) {
      // StremThru URL is a private IP address
      logger.error('StremThru URL is a private IP address so returning null');
      return null;
    }

    const cacheKey = getTextHash(
      `stremThruPublicIp:${stremThruConfig.url}:${stremThruConfig.credential}`
    );
    const cachedPublicIp = cache ? cache.get(cacheKey) : null;
    if (cachedPublicIp) {
      logger.debug(`Returning cached public IP`);
      return cachedPublicIp;
    }

    const proxyIpUrl = stremThruUrl;
    const proxyIpPath = '/v0/health/__debug__';
    proxyIpUrl.pathname = `${proxyIpUrl.pathname === '/' ? '' : proxyIpUrl.pathname}${proxyIpPath}`;

    if (Settings.LOG_SENSITIVE_INFO) {
      logger.debug(`GET ${proxyIpUrl.toString()}`);
    } else {
      logger.debug(`GET ${proxyIpUrl}`);
    }

    const response = await fetch(proxyIpUrl.toString(), {
      method: 'GET',
      headers: {
        'X-StremThru-Authorization': `Basic ${stremThruConfig.credential}`,
      },
      signal: AbortSignal.timeout(Settings.STREMTHRU_TIMEOUT),
    });

    if (!response.ok) {
      throw new Error(`${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const publicIp =
      typeof data.data?.ip?.exposed === 'object' // available from `v0.71.0`
        ? data.data.ip.exposed['*'] || data.data.ip.machine
        : data.data?.ip?.machine;
    if (publicIp && cache) {
      cache.set(cacheKey, publicIp, Settings.CACHE_STREMTHRU_IP_TTL);
    } else {
      logger.error(
        `StremThru did not respond with a public IP address, please check a valid credential was used. Response: ${JSON.stringify(data)}`
      );
    }
    return publicIp;
  } catch (error: any) {
    logger.error(`Failed to get StremThru public IP: ${error.message}`);
    return null;
  }
}

export function getStremThruConfig(userConfig: Config) {
  const stremThruConfig = userConfig.stremThruConfig;

  return {
    stremThruEnabled:
      stremThruConfig?.stremThruEnabled ||
      Settings.DEFAULT_STREMTHRU_URL !== '',
    url: stremThruConfig?.url || Settings.DEFAULT_STREMTHRU_URL,
    credential:
      stremThruConfig?.credential || Settings.DEFAULT_STREMTHRU_CREDENTIAL,
    publicIp: stremThruConfig?.publicIp || Settings.DEFAULT_STREMTHRU_PUBLIC_IP,
    proxiedAddons: stremThruConfig?.proxiedAddons || null,
    proxiedServices: stremThruConfig?.proxiedServices || null,
  };
}
