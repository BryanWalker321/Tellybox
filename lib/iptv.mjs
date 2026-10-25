import { scheduleAt, listingsWindow } from './schedule.mjs';
const clean = text => String(text ?? '').replace(/[\r\n"]/g, ' ');
const xml = text => String(text ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]);
export const xmlTime = n => new Date(n).toISOString().replace(/[-:T]/g, '').slice(0, 14) + ' +0000';
export function directM3u(config, base, now = Date.now()) {
  const lines = [`#EXTM3U x-tvg-url="${base}/guide.xml"`, '# Direct-source snapshot. Original files play from their host. IPTV clients may start at the beginning and do not follow future schedule changes.'];
  for (const c of config.channels) {
    const s = scheduleAt(c, config.epoch, now, 1)[0];
    if (s.programme.isTestCard || s.programme.isPresentation || /(?:youtube\.com|youtu\.be|dailymotion\.com|dai\.ly|vimeo\.com)/i.test(s.programme.url)) continue; // JPEG holding cards aren't IPTV streams.
    lines.push(`#EXTINF:-1 tvg-id="${c.id}" tvg-chno="${c.number}" tvg-name="${clean(c.name)}" group-title="${clean(config.brand.name)}",${clean(c.name)}`);
    lines.push(`#EXTVLCOPT:start-time=${Math.floor(s.offset + (s.programme.sourceOffset || 0))}`); // Best effort, VLC-specific. Not a live stream.
    lines.push(s.programme.url.startsWith('/') ? base + s.programme.url : s.programme.url);
  }
  return lines.join('\n') + '\n';
}
export function liveM3u(config, base) {
  return [`#EXTM3U x-tvg-url="${base}/guide.xml"`, ...config.channels.flatMap(c => [`#EXTINF:-1 tvg-id="${c.id}" tvg-chno="${c.number}" tvg-name="${clean(c.name)}" group-title="${clean(config.brand.name)}",${clean(c.name)}`, `${base}/iptv/${c.id}/index.m3u8`])].join('\n') + '\n';
}
export function xmltv(config, now = Date.now()) {
  const start = Math.floor(now / 86400000) * 86400000;
  return `<?xml version="1.0" encoding="UTF-8"?>\n<tv generator-info-name="${xml(config.brand.name)}">\n${config.channels.map(c => `<channel id="${xml(c.id)}"><display-name>${xml(c.name)}</display-name></channel>`).join('\n')}\n${config.channels.flatMap(c => listingsWindow(c, config.epoch, start, start + 2 * 86400000).map(s => `<programme start="${xmlTime(s.start)}" stop="${xmlTime(s.end)}" channel="${xml(c.id)}"><title lang="en">${xml(s.programme.title)}</title><desc lang="en">${xml(c.description || c.name)}</desc></programme>`)).join('\n')}\n</tv>\n`;
}
