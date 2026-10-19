import { readFile, writeFile, rename, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

export function normaliseYoutubeCookies(text, now = Date.now()) {
  if (typeof text !== 'string' || Buffer.byteLength(text) > 262144 || text.includes('\0')) throw Error('Use a YouTube-only cookies.txt file smaller than 256 KB.');
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/);
  if (!/^# (?:Netscape HTTP Cookie File|HTTP Cookie File)\s*$/.test(lines[0])) throw Error('Export a Netscape-format cookies.txt file, not JSON or a password.');
  const cookies = [];
  let authenticated = false, expiresAt = Infinity;
  for (const line of lines.slice(1)) {
    if (!line.trim() || (line.startsWith('#') && !line.startsWith('#HttpOnly_'))) continue;
    const fields = line.split('\t');
    const domain = fields[0].replace(/^#HttpOnly_/, '').replace(/^\./, '').toLowerCase();
    if (fields.length !== 7 || !['TRUE', 'FALSE'].includes(fields[1]) || !['TRUE', 'FALSE'].includes(fields[3]) || !/^\d+$/.test(fields[4]) || !fields[2].startsWith('/') || !fields[5] || !fields[6] || fields.some(s => /[\r\n\0]/.test(s))) throw Error('The cookie file has an invalid row. Export it again from YouTube.');
    if (!(domain === 'youtube.com' || domain.endsWith('.youtube.com'))) throw Error('Export only youtube.com cookies. Files containing cookies for other websites are rejected.');
    const expiry = Number(fields[4]) * 1000;
    if (expiry && expiry <= now) continue;
    cookies.push(line);
    if (/^(?:SID|SAPISID|LOGIN_INFO|__Secure-[13]P(?:APISID|SID))$/.test(fields[5])) {
      authenticated = true;
      if (expiry) expiresAt = Math.min(expiresAt, expiry);
    }
  }
  if (!authenticated) throw Error('No current YouTube sign-in cookies were found. Sign into YouTube, then export its cookies again.');
  return {text: '# Netscape HTTP Cookie File\n' + cookies.join('\n') + '\n', expiresAt: Number.isFinite(expiresAt) ? new Date(expiresAt).toISOString() : null};
}

export class YoutubeAuth {
  constructor(directory) { this.file = path.join(directory, 'youtube-cookies.txt'); }
  async status() {
    try {
      const [bytes, info] = await Promise.all([readFile(this.file, 'utf8'), stat(this.file)]);
      try { const {expiresAt} = normaliseYoutubeCookies(bytes); return {configured: true, expired: false, expiresAt, savedAt: info.mtime.toISOString()}; }
      catch { return {configured: true, expired: true}; }
    } catch (err) { if (err.code === 'ENOENT') return {configured: false, expired: false}; throw err; }
  }
  async save(text) {
    const result = normaliseYoutubeCookies(text), temporary = this.file + '.' + randomUUID() + '.tmp';
    try { await writeFile(temporary, result.text, {mode: 0o600, flag: 'wx'}); await rename(temporary, this.file); }
    finally { await rm(temporary, {force: true}); }
    return this.status();
  }
  async remove() { await rm(this.file, {force: true}); }
}
