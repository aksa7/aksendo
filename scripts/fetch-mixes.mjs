// fetch-mixes.mjs — pull the 6 newest YouTube uploads into src/data/mixes.json.
// Uses the public Atom feed (no API key). On failure, keeps the previous file.
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT = join(ROOT, 'src', 'data', 'mixes.json');
const links = JSON.parse(await readFile(join(ROOT, 'src', 'data', 'links.json'), 'utf8'));
const channelId = links.artist.youtubeChannelId;
const channelUrl = links.artist.youtube;

function decode(s = '') {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function parseEntries(xml) {
  const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map((m) => m[1]);
  return entries.map((block) => {
    const id = (block.match(/<yt:videoId>([^<]+)<\/yt:videoId>/) || [])[1];
    const title = decode((block.match(/<title>([^<]*)<\/title>/) || [])[1] || '');
    const published = (block.match(/<published>([^<]+)<\/published>/) || [])[1] || '';
    const thumb = (block.match(/<media:thumbnail[^>]+url="([^"]+)"/) || [])[1]
      || (id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : '');
    if (!id) return null;
    return {
      id,
      title,
      published,
      url: `https://www.youtube.com/watch?v=${id}`,
      thumb: thumb.replace('/hqdefault.jpg', '/maxresdefault.jpg'),
      thumbFallback: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
    };
  }).filter(Boolean).slice(0, 6);
}

async function main() {
  let previous = [];
  if (existsSync(OUT)) {
    try { previous = JSON.parse(await readFile(OUT, 'utf8')); } catch { /* keep empty */ }
  }
  if (!channelId) {
    console.warn('fetch-mixes: no youtubeChannelId — keeping previous mixes.json');
    if (!previous.length) await writeFile(OUT, '[]\n');
    return;
  }
  try {
    const res = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`, {
      headers: { 'user-agent': 'aksendo-site-build/1.0' }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();
    const mixes = parseEntries(xml);
    if (!mixes.length) throw new Error('no entries parsed');
    await writeFile(OUT, JSON.stringify(mixes, null, 2) + '\n');
    console.log(`fetch-mixes: ${mixes.length} videos from ${channelId}`);
  } catch (err) {
    console.warn(`fetch-mixes: ${err.message} — keeping previous (${previous.length})`);
    if (!existsSync(OUT)) {
      await writeFile(OUT, JSON.stringify([], null, 2) + '\n');
    }
  }
}

await main();
