import { AddonDetail, Config } from '@aiostreams/types';
import {
  addonDetails,
  isValueEncrypted,
  parseAndDecryptString,
  serviceDetails,
  Settings,
  unminifyConfig,
} from '@aiostreams/utils';

export const allowedFormatters = [
  'gdrive',
  'minimalistic-gdrive',
  'torrentio',
  'torbox',
  'imposter',
  'custom',
];

export const allowedLanguages = [
  'Multi',
  'English',
  'Japanese',
  'Chinese',
  'Russian',
  'Arabic',
  'Portuguese',
  'Spanish',
  'French',
  'German',
  'Italian',
  'Korean',
  'Hindi',
  'Bengali',
  'Punjabi',
  'Marathi',
  'Gujarati',
  'Tamil',
  'Telugu',
  'Kannada',
  'Malayalam',
  'Thai',
  'Vietnamese',
  'Indonesian',
  'Turkish',
  'Hebrew',
  'Persian',
  'Ukrainian',
  'Greek',
  'Lithuanian',
  'Latvian',
  'Estonian',
  'Polish',
  'Czech',
  'Slovak',
  'Hungarian',
  'Romanian',
  'Bulgarian',
  'Serbian',
  'Croatian',
  'Slovenian',
  'Dutch',
  'Danish',
  'Finnish',
  'Swedish',
  'Norwegian',
  'Malay',
  'Latino',
  'Unknown',
  'Dual Audio',
  'Dubbed',
];

export function validateConfig(
  config: Config,
  environment: 'client' | 'server' = 'server'
): {
  valid: boolean;
  errorCode: string | null;
  errorMessage: string | null;
} {
  config = unminifyConfig(config);
  const createResponse = (
    valid: boolean,
    errorCode: string | null,
    errorMessage: string | null
  ) => {
    return { valid, errorCode, errorMessage };
  };

  if (config.addons.length < 1) {
    return createResponse(
      false,
      'noAddons',
      'At least one addon must be selected'
    );
  }

  if (config.addons.length > Settings.MAX_ADDONS) {
    return createResponse(
      false,
      'tooManyAddons',
      `You can only select a maximum of ${Settings.MAX_ADDONS} addons`
    );
  }
  // check for apiKey if Settings.API_KEY is set
  if (environment === 'server' && Settings.API_KEY) {
    const { apiKey } = config;
    if (!apiKey) {
      return createResponse(
        false,
        'missingApiKey',
        'The AIOStreams API key is required'
      );
    }
    let decryptedApiKey = apiKey;
    if (isValueEncrypted(apiKey)) {
      const decryptionResult = parseAndDecryptString(apiKey);
      if (decryptionResult === null) {
        return createResponse(
          false,
          'decryptionFailed',
          'Failed to decrypt the AIOStreams API key'
        );
      } else if (decryptionResult === '') {
        return createResponse(
          false,
          'emptyDecryption',
          'Decrypted API key is empty'
        );
      }
      decryptedApiKey = decryptionResult;
    }
    if (decryptedApiKey !== Settings.API_KEY) {
      return createResponse(
        false,
        'invalidApiKey',
        'Invalid AIOStreams API key. Please use the one defined in your environment variables'
      );
    }
  }
  const duplicateAddons = config.addons.filter(
    (addon, index) =>
      config.addons.findIndex(
        (a) =>
          a.id === addon.id &&
          JSON.stringify(a.options) === JSON.stringify(addon.options)
      ) !== index
  );

  if (duplicateAddons.length > 0) {
    return createResponse(
      false,
      'duplicateAddons',
      'Duplicate addons found. Please remove any duplicates'
    );
  }

  for (const addon of config.addons) {
    if (Settings.DISABLE_TORRENTIO && addon.id === 'torrentio') {
      return createResponse(
        false,
        'torrentioDisabled',
        Settings.DISABLE_TORRENTIO_MESSAGE
      );
    }

    const details = addonDetails.find(
      (detail: AddonDetail) => detail.id === addon.id
    );
    if (!details) {
      return createResponse(
        false,
        'invalidAddon',
        `Invalid addon: ${addon.id}`
      );
    }
    if (details.requiresService) {
      const supportedServices = details.supportedServices;
      const isAtLeastOneServiceEnabled = config.services.some(
        (service) => supportedServices.includes(service.id) && service.enabled
      );
      const isOverrideUrlSet = addon.options?.overrideUrl;
      if (!isAtLeastOneServiceEnabled && !isOverrideUrlSet) {
        return createResponse(
          false,
          'missingService',
          `${addon.options?.name || details.name} requires at least one of the following services to be enabled: ${supportedServices
            .map(
              (service) =>
                serviceDetails.find((detail) => detail.id === service)?.name ||
                service
            )
            .join(', ')}`
        );
      }
    }
    if (details.options) {
      for (const option of details.options) {
        if (option.required && !addon.options[option.id]) {
          return createResponse(
            false,
            'missingRequiredOption',
            `Option ${option.label} is required for addon ${addon.id}`
          );
        }

        if (
          option.id.toLowerCase().includes('url') &&
          addon.options[option.id] &&
          ((isValueEncrypted(addon.options[option.id]) &&
            environment === 'server') ||
            !isValueEncrypted(addon.options[option.id]))
        ) {
          const url = parseAndDecryptString(addon.options[option.id] ?? '');
          if (url === null) {
            return createResponse(
              false,
              'decryptionFailed',
              `Failed to decrypt URL for ${option.label}`
            );
          } else if (url === '') {
            return createResponse(
              false,
              'emptyDecryption',
              `Decrypted URL for ${option.label} is empty`
            );
          }
          if (
            Settings.DISABLE_TORRENTIO &&
            url.match(/torrentio\.strem\.fun/) !== null
          ) {
            // if torrentio is disabled, don't allow the user to set URLs with torrentio.strem.fun
            return createResponse(
              false,
              'torrentioDisabled',
              Settings.DISABLE_TORRENTIO_MESSAGE
            );
          } else if (
            Settings.DISABLE_TORRENTIO &&
            url.match(/stremthru\.elfhosted\.com/) !== null
          ) {
            // if torrentio is disabled, we need to inspect the stremthru URL to see if it's using torrentio
            try {
              const parsedUrl = new URL(url);
              // get the component before manifest.json
              const pathComponents = parsedUrl.pathname.split('/');
              if (pathComponents.includes('manifest.json')) {
                const index = pathComponents.indexOf('manifest.json');
                const componentBeforeManifest = pathComponents[index - 1];
                // base64 decode the component before manifest.json
                const decodedComponent = atob(componentBeforeManifest);
                const stremthruData = JSON.parse(decodedComponent);
                if (stremthruData?.manifest_url?.match(/torrentio.strem.fun/)) {
                  return createResponse(
                    false,
                    'torrentioDisabled',
                    Settings.DISABLE_TORRENTIO_MESSAGE
                  );
                }
              }
            } catch (_) {
              // ignore
            }
          } else {
            try {
              new URL(url);
            } catch (_) {
              return createResponse(
                false,
                'invalidUrl',
                ` Invalid URL for ${option.label}`
              );
            }
          }
        }

        if (option.type === 'number' && addon.options[option.id]) {
          const input = addon.options[option.id];
          if (input !== undefined && !parseInt(input)) {
            return createResponse(
              false,
              'invalidNumber',
              `${option.label} must be a number`
            );
          } else if (input !== undefined) {
            const value = parseInt(input);
            const { min, max } = option.constraints || {};
            if (
              (min !== undefined && value < min) ||
              (max !== undefined && value > max)
            ) {
              return createResponse(
                false,
                'invalidNumber',
                `${option.label} must be between ${min} and ${max}`
              );
            }
          }
        }
      }
    }
  }

  if (!allowedFormatters.includes(config.formatter)) {
    if (config.formatter.startsWith('custom') && config.formatter.length > 7) {
      const jsonString = config.formatter.slice(7);
      const data = JSON.parse(jsonString);
      if (!data.name || !data.description) {
        return createResponse(
          false,
          'invalidCustomFormatter',
          'Invalid custom formatter: name and description are required'
        );
      }
    } else {
      return createResponse(
        false,
        'invalidFormatter',
        `Invalid formatter: ${config.formatter}`
      );
    }
  }
  for (const service of config.services) {
    if (service.enabled) {
      const serviceDetail = serviceDetails.find(
        (detail) => detail.id === service.id
      );
      if (!serviceDetail) {
        return createResponse(
          false,
          'invalidService',
          `Invalid service: ${service.id}`
        );
      }
      for (const credential of serviceDetail.credentials) {
        if (!service.credentials[credential.id]) {
          return createResponse(
            false,
            'missingCredential',
            `${credential.label} is required for ${service.name}`
          );
        }
      }
    }
  }

  // need at least one visual tag, resolution, quality

  if (
    !config.visualTags.some((tag) => Object.values(tag)[0]) ||
    !config.resolutions.some((resolution) => Object.values(resolution)[0]) ||
    !config.qualities.some((quality) => Object.values(quality)[0])
  ) {
    return createResponse(
      false,
      'noFilters',
      'At least one visual tag, resolution, and quality must be selected'
    );
  }

  for (const [min, max] of [
    [config.minMovieSize, config.maxMovieSize],
    [config.minEpisodeSize, config.maxEpisodeSize],
    [config.minSize, config.maxSize],
  ]) {
    if (min && max) {
      if (min >= max) {
        return createResponse(
          false,
          'invalidSizeRange',
          "Your minimum size limit can't be greater than or equal to your maximum size limit"
        );
      }
    }
  }

  if (config.maxResultsPerResolution && config.maxResultsPerResolution < 1) {
    return createResponse(
      false,
      'invalidMaxResultsPerResolution',
      'Max results per resolution must be greater than 0'
    );
  }

  if (
    config.mediaFlowConfig?.mediaFlowEnabled &&
    config.stremThruConfig?.stremThruEnabled
  ) {
    return createResponse(
      false,
      'multipleProxyServices',
      'Multiple proxy services are not allowed'
    );
  }
  if (config.mediaFlowConfig?.mediaFlowEnabled) {
    if (!config.mediaFlowConfig.proxyUrl) {
      return createResponse(
        false,
        'missingProxyUrl',
        'Proxy URL is required if MediaFlow is enabled'
      );
    }
    if (!config.mediaFlowConfig.apiPassword) {
      return createResponse(
        false,
        'missingApiPassword',
        'API Password is required if MediaFlow is enabled'
      );
    }
  }

  if (config.stremThruConfig?.stremThruEnabled) {
    if (!config.stremThruConfig.url) {
      return createResponse(
        false,
        'missingUrl',
        'URL is required if Stremthru is enabled'
      );
    }
    if (!config.stremThruConfig.credential) {
      return createResponse(
        false,
        'missingCredential',
        'Credential is required if StremThru is enabled'
      );
    }
  }

  if (
    (config.excludeFilters?.length ?? 0) > Settings.MAX_KEYWORD_FILTERS ||
    (config.strictIncludeFilters?.length ?? 0) > Settings.MAX_KEYWORD_FILTERS
  ) {
    return createResponse(
      false,
      'tooManyFilters',
      `You can only have a maximum of ${Settings.MAX_KEYWORD_FILTERS} filters`
    );
  }

  const filters = [
    ...(config.excludeFilters || []),
    ...(config.strictIncludeFilters || []),
  ];
  filters.forEach((filter) => {
    if (filter.length > 20) {
      return createResponse(
        false,
        'invalidFilter',
        'One of your filters is too long'
      );
    }
    if (!filter) {
      return createResponse(
        false,
        'invalidFilter',
        'Filters must not be empty'
      );
    }
  });

  if (config.regexFilters) {
    if (!config.apiKey) {
      return createResponse(
        false,
        'missingApiKey',
        'Regex filtering requires an API key to be set'
      );
    }

    if (config.regexFilters.excludePattern) {
      try {
        new RegExp(config.regexFilters.excludePattern);
      } catch (e) {
        return createResponse(
          false,
          'invalidExcludeRegex',
          'Invalid exclude regex pattern'
        );
      }
    }

    if (config.regexFilters.includePattern) {
      try {
        new RegExp(config.regexFilters.includePattern);
      } catch (e) {
        return createResponse(
          false,
          'invalidIncludeRegex',
          'Invalid include regex pattern'
        );
      }
    }
  }

  if (config.regexSortPatterns) {
    if (!config.apiKey) {
      return createResponse(
        false,
        'missingApiKey',
        'Regex sorting requires an API key to be set'
      );
    }

    // Split the pattern by spaces and validate each one
    const patterns = config.regexSortPatterns.split(/\s+/).filter(Boolean);
    // Enforce an upper bound on the number of patterns
    if (patterns.length > Settings.MAX_REGEX_SORT_PATTERNS) {
      return createResponse(
        false,
        'tooManyRegexSortPatterns',
        `You can specify at most ${Settings.MAX_REGEX_SORT_PATTERNS} regex sort patterns`
      );
    }

    for (const pattern of patterns) {
      const delimiter = '<::>';
      const delimiterIndex = pattern.indexOf(delimiter);
      let name: string = 'Unamed';
      let regexPattern = pattern;
      if (delimiterIndex !== -1) {
        name = pattern.slice(0, delimiterIndex).replace(/_/g, ' ');
        regexPattern = pattern.slice(delimiterIndex + delimiter.length);
      }
      try {
        new RegExp(regexPattern);
      } catch (e) {
        return createResponse(
          false,
          'invalidRegexSortPattern',
          `Invalid regex sort pattern: ${name ? `"${name}" ` : ''}${regexPattern}`
        );
      }
    }
  }
  return createResponse(true, null, null);
}
