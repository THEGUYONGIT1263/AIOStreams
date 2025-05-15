import { ParsedStream } from '@aiostreams/types';
import { formatSize, languageToEmoji } from './utils';
import { serviceDetails, Settings } from '@aiostreams/utils';

export function torrentioFormat(stream: ParsedStream): {
  name: string;
  description: string;
} {
  let name: string = '';

  if (stream.provider) {
    const cacheStatus = stream.provider.cached
      ? '+'
      : stream.provider.cached === undefined
        ? ' Unknown'
        : ' download';
    const serviceShortName =
      serviceDetails.find((service) => service.id === stream.provider!.id)
        ?.shortName || stream.provider.id;
    name += `[${serviceShortName}${cacheStatus}] `;
  }

  if (stream.torrent?.infoHash) {
    name += '[P2P] ';
  }

  name += `${stream.addon.name} ${stream.personal ? '(Your Media) ' : ''}${stream.resolution} `;

  if (stream.visualTags.length > 0) {
    name += stream.visualTags.join(' | ');
  }
  let description = '';

  if (stream.message) {
    description += `\n${stream.message}`;
  }

  if (stream.filename || stream.folderName) {
    description += `\n${stream.folderName ? stream.folderName : ''}/${stream.filename ? stream.filename : ''}`;
  }
  if (
    stream.size ||
    stream.torrent?.seeders ||
    stream.usenet?.age ||
    stream.indexers
  ) {
    description += '\n';

    description +=
      stream.torrent?.seeders !== undefined
        ? `👤 ${stream.torrent.seeders} `
        : '';

    description += stream.usenet?.age ? `📅 ${stream.usenet.age} ` : '';

    description += `💾 ${formatSize(stream.size || 0)} `;

    description += stream.indexers ? `⚙️ ${stream.indexers} ` : '';
  }
  const languageEmojis = stream.languages.map((lang) => {
    const emoji = languageToEmoji(lang);
    return emoji ? emoji : lang;
  });
  if (languageEmojis.length > 0) {
    description += `\n${languageEmojis.join(' / ')}`;
  }

  if (stream.proxied) {
    name = `🕵️‍♂️ ${name}`;
  } else if (Settings.SHOW_DIE) {
    name = `🎲 ${name}`;
  }

  return { name, description };
}
