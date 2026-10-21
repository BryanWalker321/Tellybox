import {Updates} from './lib/updates.mjs';
import {TeletextFeeds} from './lib/teletext-feeds.mjs';
import http from 'node:http';
import {randomUUID} from 'node:crypto';
import { readFile, stat, realpath, mkdir, writeFile } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {programmingStats} from './lib/programming-stats.mjs';
import {applySourceHealth} from './lib/source-health.mjs';
import { validateCatalogue } from './lib/schedule.mjs';
import { directM3u, liveM3u, xmltv } from './lib/iptv.mjs';
import { RelayManager } from './lib/relay.mjs';
import { Community } from './lib/community.mjs';
import { Owner } from './lib/owner.mjs';
import { checkProviderPlayback } from './lib/provider-check.mjs';
import { iptvNetworkInfo } from './lib/network.mjs';
import { ProgrammeDescriptions } from './lib/descriptions.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const appVersion=JSON.parse(await readFile(path.join(root,'package.json'),'utf8')).version;
const directory = path.resolve(process.env.DATA_DIR || path.join(root, 'data'));
await mkdir(directory,{recursive:true});
const connectionIdentityFile=path.join(directory,'connection-identity');
try{await writeFile(connectionIdentityFile,randomUUID(),{flag:'wx',mode:0o600});}catch(error){if(error.code!=='EEXIST')throw error;}
const connectionInstance=(await readFile(connectionIdentityFile,'utf8')).trim();
const configPath = path.resolve(process.env.CATALOGUE_PATH || path.join(directory, 'catalogue.json'));
if (!process.env.CATALOGUE_PATH) {
  await mkdir(directory, { recursive: true });
  try { await writeFile(configPath, await readFile(path.join(root, 'catalogue.json')), { flag: 'wx', mode: 0o600 }); } catch (err) { if (err.code !== 'EEXIST') throw err; }
}
const mediaRoot = path.resolve(process.env.MEDIA_DIR || path.join(root, 'media'));
await mkdir(mediaRoot, { recursive: true });
for (const name of ['demo-one.mp4', 'demo-two.mp4']) {
  try { await writeFile(path.join(mediaRoot, name), await readFile(path.join(root, 'examples/demo', name)), { flag: 'wx', mode: 0o600 }); } catch (err) { if (!['ENOENT', 'EEXIST'].includes(err.code)) throw err; }
}
const host = process.env.HOST || '127.0.0.1';
const port = Number(process.env.PORT || 4173);
const relay = new RelayManager({ mediaRoot, testCard: path.join(root, 'public/test-card-f.jpg') });
const teletextFeeds=new TeletextFeeds({file:path.join(directory,'teletext-feeds.json')});
const descriptions = new ProgrammeDescriptions({file:path.join(root,'programme-descriptions.json'),provider:relay.resolver});
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.mjs': 'text/javascript', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.mp4': 'video/mp4', '.webm': 'video/webm', '.m4v': 'video/mp4', '.mp3': 'audio/mpeg', '.vtt': 'text/vtt' };
await readConfig();
async function sourceHealth(){try{return JSON.parse(await readFile(path.join(directory,'source-health.json'),'utf8'));}catch{return null;}}
async function readConfig() { return applySourceHealth(validateCatalogue(JSON.parse(await readFile(configPath, 'utf8'))),await sourceHealth()); }
let community;
const updates=new Updates({directory,root});
const owner = await Owner.create({ updates,directory, configPath, mediaRoot, onSettings: env => { community?.configure(env); relay.resolver.configure({cookieFile: env.YOUTUBE_COOKIE_FILE}); }, checkYoutube: url => checkProviderPlayback(relay, url) });
community = new Community({ directory, getConfig: readConfig, env: owner.runtime });
function mediaBase(req) {
  const configured = (owner.runtime.PUBLIC_BASE_URL || '').replace(/\/$/, '');
  const requested = new URL(`http://${req.headers.host}`).origin;
  if (!configured) return requested;
  const loopback = name => ['localhost', '127.0.0.1', '[::1]'].includes(name);
  // A localhost OAuth address can coexist with LAN IPTV testing. Never export
  // localhost stream links to a device requesting the playlist through the LAN.
  if (loopback(new URL(configured).hostname) && !loopback(new URL(requested).hostname)) return requested;
  return configured;
}
function within(base, target) { return target.startsWith(base + path.sep); }
const server = http.createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' https://www.youtube.com https://s.ytimg.com; style-src 'self' 'unsafe-inline'; img-src 'self' https: data:; media-src 'self' https: http: blob:; connect-src 'self'; frame-src https://www.youtube-nocookie.com https://www.youtube.com https://www.dailymotion.com https://geo.dailymotion.com; frame-ancestors 'self'; base-uri 'self'; object-src 'none'");
  try {
    const requestUrl = new URL(req.url, 'http://localhost');
    if (await owner.handle(req, res, requestUrl)) return;
    if (await community.handle(req, res, requestUrl)) return;
    if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405, { Allow: 'GET, HEAD' }); return res.end(); }
    const pathname = decodeURIComponent(requestUrl.pathname);
    if(pathname==='/api/version'){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});return res.end(JSON.stringify({version:appVersion,updateProtocol:1}));}
    if(pathname==='/api/teletext-feeds'){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});return res.end(JSON.stringify(await teletextFeeds.get()));}
    if(pathname==='/api/connection-identity'){
      res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});
      return res.end(JSON.stringify({instance:connectionInstance}));
    }
    if (pathname === '/api/network') {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      return res.end(JSON.stringify(iptvNetworkInfo({base:mediaBase(req),listenHost:host,port,remoteAddress:req.socket.remoteAddress,iptvEnabled:owner.runtime.IPTV_ENABLED!=='0'})));
    }
    if (pathname === '/api/distribution') {
      let available = false; try { available = (await stat(path.join(root, 'release/tellybox-self-hosted.zip'))).isFile(); } catch {}
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); return res.end(JSON.stringify({ downloadAvailable: available }));
    }
    if (pathname === '/downloads/tellybox-self-hosted.zip') {
      const file = path.join(root, 'release/tellybox-self-hosted.zip'); const info = await stat(file);
      res.writeHead(200, { 'Content-Type': 'application/zip', 'Content-Length': info.size, 'Content-Disposition': 'attachment; filename="tellybox-self-hosted.zip"' });
      if (req.method === 'HEAD') return res.end(); const stream = createReadStream(file); stream.on('error', () => res.destroy()); res.on('close', () => stream.destroy()); stream.pipe(res); return;
    }
    if (pathname === '/channels.m3u' || pathname === '/direct.m3u' || pathname === '/guide.xml') {
      const config = await readConfig();
      const base = mediaBase(req);
      const body = pathname === '/channels.m3u' ? liveM3u(config, base) : pathname === '/direct.m3u' ? directM3u(config, base) : xmltv(config);
      res.writeHead(200, { 'Content-Type': pathname.endsWith('.m3u') ? 'audio/x-mpegurl; charset=utf-8' : 'application/xml; charset=utf-8', 'Cache-Control': 'no-store', ...(pathname.endsWith('.m3u') ? { 'Content-Disposition': 'attachment; filename="channels.m3u"' } : {}) });
      return res.end(req.method === 'HEAD' ? undefined : body);
    }
    if (pathname.startsWith('/iptv/')) {
      const match = /^\/iptv\/([a-z0-9-]+)\/(index\.m3u8|segment\d+\.ts)$/.exec(pathname);
      const config = await readConfig(); const channel = match && config.channels.find(c => c.id === (config.channelAliases?.[match[1]] || match[1]));
      if (!channel) { res.writeHead(404); return res.end('Unknown channel or stream file.'); }
      if (owner.runtime.IPTV_ENABLED === '0') { res.writeHead(503); return res.end('IPTV relay is disabled on this server.'); }
      try {
        const body = await relay.file(channel, config.epoch, match[2], config.brand.holdingImage);
        res.writeHead(200, { 'Content-Type': match[2].endsWith('.m3u8') ? 'application/vnd.apple.mpegurl' : 'video/mp2t', 'Cache-Control': 'no-store', 'Content-Length': body.length });
        return res.end(req.method === 'HEAD' ? undefined : body);
      } catch (err) { res.writeHead(503, { 'Retry-After': '3', 'Content-Type': 'text/plain' }); return res.end(err.message); }
    }
    if (pathname === '/api/programme-description') {
      const query=new URL(req.url,'http://localhost').searchParams,config=await readConfig();
      const id=query.get('channel'),channel=config.channels.find(c=>c.id===(config.channelAliases?.[id]||id));
      const programme=channel?.programmes.find(p=>p.id===query.get('programme'));
      if(!programme){res.writeHead(404);return res.end('Unknown programme.');}
      const description=await descriptions.get(programme);
      res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'public, max-age=300'});return res.end(JSON.stringify({description}));
    }
    if(pathname==='/api/programming-stats'){const config=await readConfig(),health=await sourceHealth();const stats=programmingStats(config);res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});return res.end(JSON.stringify({...stats,updatedAt:new Date().toISOString(),audit:health?{reviewed:health.results.length,total:health.total,finishedAt:health.finishedAt||null}:null}));}
    if (pathname === '/api/catalogue' || pathname === '/api/time') {
      const body = JSON.stringify(pathname === '/api/time' ? { now: Date.now() } : await readConfig());
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); return res.end(req.method === 'HEAD' ? undefined : body);
    }
    const isMedia = pathname.startsWith('/media/');
    const base = isMedia ? mediaRoot : path.join(root, 'public');
    const publicModule = ['/lib/schedule.mjs','/lib/content-policy.mjs'].includes(pathname);
    const file = publicModule ? path.join(root, pathname.slice(1)) : path.resolve(base, '.' + (isMedia ? pathname.slice(6) : pathname === '/' ? '/index.html' : pathname));
    if (!publicModule && !within(base, file)) { res.writeHead(403); return res.end(); }
    const real = await realpath(file);
    if (!publicModule && !within(await realpath(base), real)) { res.writeHead(403); return res.end(); }
    const info = await stat(real);
    if (!info.isFile()) { res.writeHead(404); return res.end(); }
    res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', isMedia ? 'private, max-age=3600' : 'no-cache');
    let start = 0, end = info.size - 1, status = 200;
    if (req.headers.range) {
      const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
      if (!range || (!range[1] && !range[2])) { res.writeHead(416, { 'Content-Range': `bytes */${info.size}` }); return res.end(); }
      start = range[1] ? Number(range[1]) : Math.max(0, info.size - Number(range[2]));
      end = range[1] && range[2] ? Math.min(Number(range[2]), end) : end;
      if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= info.size) { res.writeHead(416, { 'Content-Range': `bytes */${info.size}` }); return res.end(); }
      status = 206; res.setHeader('Content-Range', `bytes ${start}-${end}/${info.size}`);
    }
    res.writeHead(status, { 'Content-Length': Math.max(0, end - start + 1) });
    if (req.method === 'HEAD' || !info.size) return res.end();
    const stream = createReadStream(real, { start, end });
    stream.on('error', () => res.destroy());
    res.on('close', () => stream.destroy()); stream.pipe(res);
  } catch (err) {
    const missing = ['ENOENT', 'ENOTDIR', 'URIError'].includes(err.code || err.name);
    res.writeHead(missing ? 404 : 500, { 'Content-Type': 'text/plain' });
    res.end(missing ? 'Not found' : 'Catalogue or server error. Check the server console.');
    if (!missing) console.error(err.message);
  }
});
server.listen(port, host, () => {
  console.log(`Tellybox is on air at http://${host}:${server.address().port}`);
  if (owner.bootstrap) console.log(`First-run owner setup key: ${owner.bootstrap}\nOpen Settings to claim this station and choose your owner password.`);
});
let closing = false;
async function shutdown() { if (closing) return; closing = true; server.close(); await relay.close(); community.close(); process.exit(0); }
process.on('SIGINT', shutdown); process.on('SIGTERM', shutdown);

process.on('message',message=>{if(message?.type==='tellybox:shutdown')shutdown();});
process.on('disconnect',shutdown);
