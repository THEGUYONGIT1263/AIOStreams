import { ParsedStream } from '@aiostreams/types';
import { formatSize } from './utils';
import { serviceDetails, Settings } from '@aiostreams/utils';

export function torboxFormat(stream: ParsedStream): {
  name: string;
  description: string;
} {
  let name: string = '';

  name += `${stream.addon.name} `;
  if (stream.provider) {
    const serviceShortName =
      serviceDetails.find((service) => service.id === stream.provider!.id)
        ?.shortName || stream.provider.id;
    name += `(${stream.provider.cached === undefined ? 'Unknown' : stream.provider.cached ? 'Instant' : ''} ${serviceShortName}) `;
  }

  if (stream.torrent?.infoHash) {
    name += `(P2P) `;
  }

  name += `${stream.personal ? '(Your Media) ' : ''}(${stream.resolution})`;

  let description: string = '';

  let streamType = '';
  if (stream?.torrent?.seeders) {
    streamType = 'Torrent';
  } else if (stream?.usenet?.age) {
    streamType = 'Usenet';
  }

  description += `Quality: ${stream.quality}\nName: ${stream.filename || 'Unknown'}\nSize: ${stream.size ? formatSize(stream.size) : 'Unknown'}${stream.indexers ? ` | Source: ${stream.indexers}` : ''}\nLanguage: ${stream.languages.length > 0 ? stream.languages.join(', ') : 'Unknown'}`;

  if (streamType === 'Torrent' || streamType === 'Usenet') {
    description += `\nType: ${streamType} | ${streamType === 'Torrent' ? 'Seeders' : 'Age'}: ${streamType === 'Torrent' ? stream.torrent?.seeders : stream.usenet?.age}`;
  }

  if (stream.message) {
    description += `\n${stream.message}`;
  }

  if (stream.proxied) {
    name = `🕵️‍♂️ ${name}`;
  } else if (Settings.SHOW_DIE) {
    name = `🎲 ${name}`;
  }

  return { name, description };
}
