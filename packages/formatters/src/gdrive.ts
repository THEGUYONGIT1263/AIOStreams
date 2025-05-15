import { ParsedStream } from '@aiostreams/types';
import { formatDuration, formatSize, languageToEmoji } from './utils';
import { serviceDetails, Settings } from '@aiostreams/utils';

export function gdriveFormat(
  stream: ParsedStream,
  minimalistic: boolean = false
): {
  name: string;
  description: string;
} {
  let name: string = '';

  if (stream.provider) {
    const cacheStatus = stream.provider.cached
      ? '⚡'
      : stream.provider.cached === undefined
        ? '❓'
        : '⏳';
    const serviceShortName =
      serviceDetails.find((service) => service.id === stream.provider!.id)
        ?.shortName || stream.provider.id;
    name += `[${serviceShortName}${cacheStatus}] `;
  }

  if (stream.torrent?.infoHash) {
    name += `[P2P] `;
  }

  name += `${stream.addon.name} ${stream.personal ? '(Your Media) ' : ''}`;
  if (!minimalistic) {
    name += stream.resolution;
  } else {
    name += stream.resolution !== 'Unknown' ? stream.resolution + '' : '';
  }

  // let description: string = `${stream.quality !== 'Unknown' ? '🎥 ' + stream.quality + ' ' : ''}${stream.encode !== 'Unknown' ? '🎞️ ' + stream.encode : ''}`;
  let description: string = '';
  if (
    stream.quality ||
    stream.encode ||
    (stream.releaseGroup && !minimalistic)
  ) {
    description += stream.quality !== 'Unknown' ? `🎥 ${stream.quality} ` : '';
    description += stream.encode !== 'Unknown' ? `🎞️ ${stream.encode} ` : '';
    description +=
      stream.releaseGroup !== 'Unknown' && !minimalistic
        ? `🏷️ ${stream.releaseGroup}`
        : '';
    description += '\n';
  }

  if (stream.visualTags.length > 0 || stream.audioTags.length > 0) {
    description +=
      stream.visualTags.length > 0
        ? `📺 ${stream.visualTags.join(' | ')}   `
        : '';
    description +=
      stream.audioTags.length > 0 ? `🎧 ${stream.audioTags.join(' | ')}` : '';
    description += '\n';
  }
  if (
    stream.size ||
    (stream.torrent?.seeders && !minimalistic) ||
    (minimalistic && stream.torrent?.seeders && !stream.provider?.cached) ||
    stream.usenet?.age ||
    stream.duration
  ) {
    description += `📦 ${formatSize(stream.size || 0)} `;
    description += stream.duration
      ? `⏱️ ${formatDuration(stream.duration)} `
      : '';
    description +=
      (stream.torrent?.seeders !== undefined && !minimalistic) ||
      (minimalistic && stream.torrent?.seeders && !stream.provider?.cached)
        ? `👥 ${stream.torrent.seeders} `
        : '';

    description += stream.usenet?.age ? `📅 ${stream.usenet.age} ` : '';
    description +=
      stream.indexers && !minimalistic ? `🔍 ${stream.indexers}` : '';
    description += '\n';
  }

  if (stream.languages.length !== 0) {
    let languages = stream.languages;
    if (minimalistic) {
      languages = languages.map(
        (language) => languageToEmoji(language) || language
      );
    }
    description += `🌎 ${languages.join(minimalistic ? ' / ' : ' | ')}`;
    description += '\n';
  }

  if (!minimalistic && (stream.filename || stream.folderName)) {
    description += stream.folderName ? `📁 ${stream.folderName}\n` : '';
    description += stream.filename ? `📄 ${stream.filename}\n` : '📄 Unknown\n';
  }

  if (stream.message) {
    description += `📢 ${stream.message}`;
  }

  if (stream.proxied) {
    name = `🕵️‍♂️ ${name}`;
  } else if (Settings.SHOW_DIE) {
    name = `🎲 ${name}`;
  }

  description = description.trim();
  name = name.trim();
  return { name, description };
}
