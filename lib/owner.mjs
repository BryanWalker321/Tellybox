import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, rename, readdir, open, rm, realpath } from 'node:fs/promises';
import path from 'node:path';
import { validateCatalogue, validateBrand } from './schedule.mjs';
import { isLanAlias } from './network.mjs';
import { YoutubeAuth } from './youtube-auth.mjs';
import { providerOf } from './providers.mjs';
import {scanMediaFolder,listMediaFolders} from './media-library.mjs';

const random = () => randomBytes(32).toString('hex');
const hash = text => createHash('sha256').update(text).digest('hex');
const equal = (a, b) => typeof a === 'string' && typeof b === 'string' && Buffer.byteLength(a) === Buffer.byteLength(b) && timingSafeEqual(Buffer.from(a), Buffer.from(b));
const fail = (status, message) => Object.assign(Error(message), { status });
const keys = ['PUBLIC_BASE_URL', 'DISCORD_CLIENT_ID', 'DISCORD_CLIENT_SECRET', 'DISCORD_WEBHOOK_URL', 'DISCORD_MODERATOR_IDS', 'DISCORD_INVITE_URL', 'DISCORD_GUILD_ID', 'DISCORD_BOT_TOKEN', 'DISCORD_AUTO_JOIN', 'DISCORD_JOIN_ROLE_ID', 'CHAT_DAILY_LIMIT', 'IPTV_ENABLED'];
const secrets = new Set(['DISCORD_CLIENT_SECRET', 'DISCORD_WEBHOOK_URL', 'DISCORD_BOT_TOKEN']);
const json = (res, code, value) => { res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(value)); };
export const MAX_CATALOGUE_BYTES = 8000000;
async function input(req, limit = 2000000) {
  if (!req.headers['content-type']?.startsWith('application/json')) throw fail(415, 'Use JSON for this request.');
  let value = ''; for await (const chunk of req) { value += chunk; if (Buffer.byteLength(value) > limit) throw fail(413, `Maximum JSON request size is ${limit / 1000000} MB.`); }
  try { return JSON.parse(value); } catch { throw fail(400, 'Invalid JSON.'); }
}
async function atomic(file, value) { const temp = file + '.' + random() + '.tmp'; try { await writeFile(temp, JSON.stringify(value, null, 2) + '\n', { mode: 0o600 }); await rename(temp, file); } finally { await rm(temp, { force: true }); } }

export class Owner {
  static async create(options) { const owner = new Owner(options); await owner.init(); return owner; }
  constructor({ directory, configPath, mediaRoot, env = process.env, onSettings = () => {}, checkYoutube = async () => { throw Error('IPTV check unavailable.'); }, fetchImpl = fetch,updates }) {
    Object.assign(this, { directory, configPath, mediaRoot, env, onSettings, checkYoutube, fetch: fetchImpl,updates });
    this.file = path.join(directory, 'owner.json'); this.sessions = new Map(); this.attempts = new Map(); this.saving = false;
    this.youtubeAuth = new YoutubeAuth(directory); this.youtubeCheckBusy = false; this.youtubeLastCheck = 0;
  }
  async init() {
    await mkdir(this.directory, { recursive: true });
    try { this.state = JSON.parse(await readFile(this.file, 'utf8')); } catch (err) { if (err.code !== 'ENOENT') throw err; this.state = { settings: {} }; }
    this.youtubeConfigured = (await this.youtubeAuth.status()).configured;
    this.bootstrap = this.state.password ? null : random(); this.apply();
  }
  apply() { this.runtime = { ...this.env, ...this.state.settings, YOUTUBE_COOKIE_FILE: this.youtubeConfigured ? this.youtubeAuth.file : '' }; this.onSettings(this.runtime); }
  origin(req) { return this.runtime.PUBLIC_BASE_URL || `http://${req.headers.host}`; }
  checkOrigin(req) { if (req.headers.origin !== this.origin(req) && !isLanAlias(req, this.origin(req))) throw fail(403, 'Open Settings from the station’s own address.'); }
  session(req) {
    for (const [key, value] of this.sessions) if (value.expires < Date.now()) this.sessions.delete(key);
    const cookie = /(?:^|;\s*)tb_owner=([a-f0-9]+)/.exec(req.headers.cookie || '')?.[1]; return cookie ? this.sessions.get(hash(cookie)) : null;
  }
  login(req, res) {
    const value = random(), csrf = random(); this.sessions.set(hash(value), { csrf, expires: Date.now() + 8 * 3600000 });
    res.setHeader('Set-Cookie', `tb_owner=${value}; HttpOnly; SameSite=Strict; Path=/api/owner; Max-Age=28800${this.origin(req).startsWith('https:') ? '; Secure' : ''}`);
    return csrf;
  }
  protected(req) { const session = this.session(req); if (!session) throw fail(401, 'Sign in as the station owner.'); if (req.method !== 'GET') { this.checkOrigin(req); if (!equal(session.csrf, req.headers['x-csrf-token'])) throw fail(403, 'Refresh Settings and try again.'); } return session; }
  safeSettings() { return Object.fromEntries(keys.map(key => [key, secrets.has(key) ? Boolean(this.runtime[key]) : key === 'DISCORD_INVITE_URL' ? this.runtime[key] ?? null : this.runtime[key] || (key === 'CHAT_DAILY_LIMIT' ? '20' : key === 'IPTV_ENABLED' ? '1' : '')])); }
  validate(settings) {
    for (const key of keys) if (settings[key] !== undefined && (typeof settings[key] !== 'string' || settings[key].length > 4000)) throw fail(400, 'Invalid setting: ' + key);
    if (settings.PUBLIC_BASE_URL) {
      let url; try { url = new URL(settings.PUBLIC_BASE_URL); } catch { throw fail(400, 'Enter a valid station address.'); }
      if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw fail(400, 'Station address must be an http(s) origin, without a path.');
      settings.PUBLIC_BASE_URL = url.origin;
    }
    if (settings.DISCORD_CLIENT_ID && !/^\d{5,30}$/.test(settings.DISCORD_CLIENT_ID)) throw fail(400, 'Discord application ID must contain digits.');
    if (settings.DISCORD_GUILD_ID && !/^\d{5,30}$/.test(settings.DISCORD_GUILD_ID)) throw fail(400, 'Discord server ID must contain digits.');
    if (settings.DISCORD_JOIN_ROLE_ID && !/^\d{5,30}$/.test(settings.DISCORD_JOIN_ROLE_ID)) throw fail(400, 'Discord member role ID must contain digits.');
    if (settings.DISCORD_INVITE_URL && !/^https:\/\/(?:discord\.gg\/|discord\.com\/invite\/)[\w-]+$/.test(settings.DISCORD_INVITE_URL)) throw fail(400, 'Enter an official https://discord.gg/ invite URL.');
    if (settings.DISCORD_AUTO_JOIN !== undefined && !['0', '1'].includes(settings.DISCORD_AUTO_JOIN)) throw fail(400, 'Invalid automatic Discord joining option.');
    if (settings.DISCORD_BOT_TOKEN && /\s/.test(settings.DISCORD_BOT_TOKEN)) throw fail(400, 'Paste the bot token without spaces or a Bot prefix.');
    if (settings.DISCORD_AUTO_JOIN === '1' && !(settings.DISCORD_GUILD_ID && settings.DISCORD_BOT_TOKEN && settings.DISCORD_CLIENT_ID && settings.DISCORD_CLIENT_SECRET)) throw fail(400, 'Automatic joining needs the server ID, bot token and Discord application credentials. Turn it off to save an invite only.');
    if (settings.DISCORD_WEBHOOK_URL && !/^https:\/\/(?:canary\.|ptb\.)?discord(?:app)?\.com\/api(?:\/v\d+)?\/webhooks\/\d+\/[\w-]+$/.test(settings.DISCORD_WEBHOOK_URL)) throw fail(400, 'Paste an official Discord webhook URL (without query parameters).');
    if (settings.DISCORD_MODERATOR_IDS && !/^\d+(?:\s*,\s*\d+)*$/.test(settings.DISCORD_MODERATOR_IDS)) throw fail(400, 'Use comma-separated Discord user IDs for moderators.');
    if (settings.CHAT_DAILY_LIMIT && (!/^\d+$/.test(settings.CHAT_DAILY_LIMIT) || +settings.CHAT_DAILY_LIMIT < 1 || +settings.CHAT_DAILY_LIMIT > 1000)) throw fail(400, 'Daily comment limit must be between 1 and 1,000.');
    if (settings.IPTV_ENABLED !== undefined && !['0', '1'].includes(settings.IPTV_ENABLED)) throw fail(400, 'Invalid IPTV option.');
  }
  async handle(req, res, url) {
    if (!url.pathname.startsWith('/api/owner/')) return false;
    try {
      const route = url.pathname.slice(11);
      if (route === 'session' && req.method === 'GET') { json(res, 200, { claimed: Boolean(this.state.password), authenticated: Boolean(this.session(req)), csrf: this.session(req)?.csrf }); return true; }
      if (route === 'login' && req.method === 'POST') {
        this.checkOrigin(req); const data = await input(req); const address = req.socket.remoteAddress;
        const attempt = this.attempts.get(address) || { count: 0, until: Date.now() + 600000 };
        if (attempt.until < Date.now()) { attempt.count = 0; attempt.until = Date.now() + 600000; }
        if (++attempt.count > 10) throw fail(429, 'Too many attempts. Try again in ten minutes.'); this.attempts.set(address, attempt);
        if (typeof data.password !== 'string' || data.password.length < 12 || data.password.length > 256) throw fail(400, 'Use an owner password of 12–256 characters.');
        if (!this.state.password) {
          if (!equal(data.setupKey, this.bootstrap)) throw fail(403, 'The setup key must match the one printed in the server console.');
          const salt = random(); const password = { salt, digest: scryptSync(data.password, salt, 64).toString('hex') };
          if (this.saving) throw fail(409, 'Setup is already being saved.'); this.saving = true;
          try { await atomic(this.file, { ...this.state, password }); this.state.password = password; this.bootstrap = null; } finally { this.saving = false; }
        } else if (!equal(scryptSync(data.password, this.state.password.salt, 64).toString('hex'), this.state.password.digest)) throw fail(403, 'Owner password is incorrect.');
        this.attempts.delete(address); json(res, 200, { csrf: this.login(req, res) }); return true;
      }
      const session = this.protected(req);
      if(route==='updates'&&req.method==='GET'){if(!this.updates)throw fail(503,'Update checking is unavailable.');json(res,200,await this.updates.status());return true;}
      if(route==='updates/check'&&req.method==='POST'){if(!this.updates)throw fail(503,'Update checking is unavailable.');await input(req,10000);json(res,200,await this.updates.status(true));return true;}
      if(route==='updates/install'&&req.method==='POST'){if(!this.updates)throw fail(503,'Updates are unavailable.');const data=await input(req,10000);json(res,202,await this.updates.install(data.version));return true;}

      if (route === 'youtube-auth' && req.method === 'GET') { json(res, 200, await this.youtubeAuth.status()); return true; }
      if (route === 'youtube-auth' && req.method === 'PUT') {
        const loopback = ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress) && ['127.0.0.1', 'localhost', '[::1]'].includes(new URL(`http://${req.headers.host}`).hostname);
        if (!loopback && !this.origin(req).startsWith('https:')) throw fail(403, 'Upload the YouTube session from localhost on the server, or use your HTTPS station address. Plain HTTP across the network is not supported for this secret.');
        const data = await input(req);
        if (this.saving) throw fail(409, 'Another settings change is being saved. Try again.');
        this.saving = true;
        try {
          let status;
          try { status = await this.youtubeAuth.save(data.cookies); } catch (err) { if (!err.code) throw fail(400, err.message); throw err; }
          this.youtubeConfigured = true; this.apply(); json(res, 200, status);
        } finally { this.saving = false; }
        return true;
      }
      if (route === 'youtube-auth' && req.method === 'DELETE') {
        if (this.saving) throw fail(409, 'Another settings change is being saved. Try again.');
        this.saving = true;
        try { await this.youtubeAuth.remove(); this.youtubeConfigured = false; this.apply(); json(res, 200, {configured: false, expired: false}); }
        finally { this.saving = false; }
        return true;
      }
      if (route === 'youtube-check' && req.method === 'POST') {
        const data = await input(req), source = data.url;
        if (typeof source !== 'string' || source.length > 500 || providerOf(source)?.name !== 'youtube' || !source.startsWith('https://') || new URL(source).username || new URL(source).password) throw fail(400, 'Enter an HTTPS YouTube video-page URL.');
        if (this.youtubeCheckBusy || Date.now() - this.youtubeLastCheck < 30000) throw fail(429, 'Please wait thirty seconds between sample checks.');
        this.youtubeCheckBusy = true; this.youtubeLastCheck = Date.now();
        try { json(res, 200, await this.checkYoutube(source)); }
        catch { json(res, 200, {result: 'unverified', reason: 'The sample did not produce decodable IPTV footage. The session may have expired, or YouTube may still be restricting this server. No programme was marked as passed.'}); }
        finally { this.youtubeCheckBusy = false; }
        return true;
      }
      if (route === 'logout' && req.method === 'POST') { for (const [key, value] of this.sessions) if (value === session) this.sessions.delete(key); res.setHeader('Set-Cookie', 'tb_owner=; HttpOnly; SameSite=Strict; Path=/api/owner; Max-Age=0'); json(res, 200, { ok: true }); return true; }
      if (route === 'settings' && req.method === 'GET') { json(res, 200, { settings: this.safeSettings(), catalogue: JSON.parse(await readFile(this.configPath, 'utf8')) }); return true; }
      if (route === 'settings' && req.method === 'PUT') {
        const data = await input(req), next = { ...this.state.settings };
        for (const key of keys) if (data[key] !== undefined) next[key] = data[key];
        this.validate(next); if (this.saving) throw fail(409, 'Another settings change is being saved. Try again.'); this.saving = true;
        try { await atomic(this.file, { ...this.state, settings: next }); this.state.settings = next; } finally { this.saving = false; }
        this.apply(); json(res, 200, { ok: true, settings: this.safeSettings() }); return true;
      }
      if (route === 'password' && req.method === 'PUT') {
        const data = await input(req);
        if (typeof data.current !== 'string' || data.current.length > 256 || !equal(scryptSync(data.current, this.state.password.salt, 64).toString('hex'), this.state.password.digest)) throw fail(403, 'Current owner password is incorrect.');
        if (typeof data.password !== 'string' || data.password.length < 12 || data.password.length > 256) throw fail(400, 'Use a new owner password of 12–256 characters.');
        if (this.saving) throw fail(409, 'Another settings change is being saved. Try again.'); this.saving = true;
        const salt = random(), password = { salt, digest: scryptSync(data.password, salt, 64).toString('hex') };
        try { await atomic(this.file, { ...this.state, password }); this.state.password = password; } finally { this.saving = false; }
        this.sessions.clear(); json(res, 200, { ok: true, csrf: this.login(req, res) }); return true;
      }
      if (route === 'brand' && req.method === 'PUT') {
        const patch = await input(req, 100000);
        if (!patch || typeof patch !== 'object' || Array.isArray(patch)) throw fail(400, 'Design changes must be an object.');
        if (patch.theme !== undefined && (!patch.theme || typeof patch.theme !== 'object' || Array.isArray(patch.theme))) throw fail(400, 'Theme must be an object.');
        const next = JSON.parse(await readFile(this.configPath, 'utf8'));
        next.brand = { ...next.brand, ...patch, ...(patch.theme ? { theme: { ...next.brand.theme, ...patch.theme } } : {}) };
        try { validateBrand(next.brand); } catch (err) { throw fail(400, err.message); }
        await atomic(this.configPath, next); json(res, 200, { ok: true, brand: next.brand }); return true;
      }
      if (route === 'catalogue' && req.method === 'PUT') {
        const data = await input(req, MAX_CATALOGUE_BYTES); try { validateCatalogue(data); } catch (err) { throw fail(400, err.message); }
        await atomic(this.configPath, data); json(res, 200, { ok: true }); return true;
      }
      if (route === 'webhook-check' && req.method === 'POST') {
        if (!this.runtime.DISCORD_WEBHOOK_URL) throw fail(400, 'Save a webhook URL first.');
        const response = await this.fetch(this.runtime.DISCORD_WEBHOOK_URL, { signal: AbortSignal.timeout(10000), redirect: 'error' });
        if (!response.ok) throw fail(400, 'Discord rejected this webhook. Check its URL and permissions.');
        const info = await response.json(); json(res, 200, { ok: true, name: info.name, channelId: info.channel_id, serverId: info.guild_id }); return true;
      }
      if (route === 'media' && req.method === 'GET') { await mkdir(this.mediaRoot, { recursive: true }); json(res, 200, { files: (await readdir(this.mediaRoot, { withFileTypes: true })).filter(f => f.isFile() && /\.(mp4|webm|m4v|mp3)$/i.test(f.name)).map(f => ({ name: f.name, url: '/media/' + encodeURIComponent(f.name) })) }); return true; }
      if(route==='media-folders'&&req.method==='GET'){
        try{json(res,200,await listMediaFolders(this.mediaRoot,new URL(req.url,'http://localhost').searchParams.get('folder')||''));}catch(error){if(error.status)throw error;throw fail(400,'Could not open that media folder. Check that it exists and the server can read it.');}return true;
      }
      if(route==='media-scan'&&req.method==='POST'){
        if(this.mediaScanBusy)throw fail(409,'A media scan is already running.');
        const {folder=''}=await input(req);this.mediaScanBusy=true;
        try{json(res,200,await scanMediaFolder(this.mediaRoot,folder));}catch(error){if(error.status)throw error;throw fail(400,'Could not open that folder. Use a folder inside the station media directory.');}finally{this.mediaScanBusy=false;}return true;
      }
      if (route === 'logo' && req.method === 'PUT') {
        const chunks = []; let size = 0;
        for await (const chunk of req) { size += chunk.length; if (size > 2 * 1024 ** 2) throw fail(413, 'Logo maximum size is 2 MB.'); chunks.push(chunk); }
        const bytes = Buffer.concat(chunks);
        const extension = bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ? 'png' : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 ? 'jpg' : bytes.toString('ascii',0,4) === 'RIFF' && bytes.toString('ascii',8,12) === 'WEBP' ? 'webp' : null;
        if (!extension) throw fail(400, 'Upload a PNG, JPEG or WebP logo.');
        await mkdir(this.mediaRoot, { recursive: true }); const name = 'network-logo-' + random() + '.' + extension;
        await writeFile(path.join(this.mediaRoot, name), bytes, { flag: 'wx', mode: 0o600 });
        json(res, 200, { ok: true, url: '/media/' + name }); return true;
      }
      if (route === 'media' && req.method === 'PUT') {
        const name = url.searchParams.get('name');
        if (!name || !/^[a-zA-Z0-9][a-zA-Z0-9._ -]{0,180}\.(mp4|webm|m4v|mp3)$/i.test(name)) throw fail(400, 'Use a simple video/audio filename ending in .mp4, .webm, .m4v or .mp3.');
        await mkdir(this.mediaRoot, { recursive: true }); const root = await realpath(this.mediaRoot), destination = path.join(root, name);
        let file; try { file = await open(destination, 'wx', 0o600); } catch (err) { if (err.code === 'EEXIST') throw fail(409, 'A file with this name already exists. Rename the upload first.'); throw err; }
        try { let size = 0; for await (const chunk of req) { size += chunk.length; if (size > 4 * 1024 ** 3) throw fail(413, 'Uploads are limited to 4 GB per file.'); await file.writeFile(chunk); } } catch (err) { await file.close(); await rm(destination, { force: true }); throw err; }
        await file.close(); json(res, 200, { ok: true, url: '/media/' + encodeURIComponent(name) }); return true;
      }
      throw fail(404, 'Owner endpoint not found.');
    } catch (err) { json(res, err.status || 500, { error: err.status ? err.message : 'Could not save the station. Check server storage and permissions.' }); return true; }
  }
}
