import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
const execute = promisify(execFile);
export function providerOf(url) {
  try { const u = new URL(url); if (['youtube.com', 'www.youtube.com', 'youtu.be'].includes(u.hostname)) { const id = u.hostname === 'youtu.be' ? u.pathname.slice(1) : u.searchParams.get('v') || u.pathname.split('/').at(-1); if (/^[\w-]{11}$/.test(id)) return { name: 'youtube', id }; } if (['dailymotion.com', 'www.dailymotion.com', 'dai.ly'].includes(u.hostname)) { const id = u.pathname.split('/').at(-1).split('_')[0]; if (/^[a-zA-Z0-9]+$/.test(id)) return { name: 'dailymotion', id }; } } catch {} return null;
}
export class ProviderResolver {
  constructor({ python = process.env.PROVIDER_PYTHON || (process.platform === 'win32' ? 'python' : 'python3'), cookieFile = process.env.YOUTUBE_COOKIE_FILE || '', youtubePython = process.env.YOUTUBE_PROVIDER_PYTHON || python, run = execute } = {}) { this.python = python; this.youtubePython = youtubePython; this.cookieFile = cookieFile; this.run = run; this.cache = new Map(); }
  configure({cookieFile = ''} = {}) { this.cookieFile = cookieFile; this.cache.clear(); }
  async resolve(url) {
    const provider = providerOf(url);
    if (!provider) throw Error('Unsupported external video provider.');
    const cached = this.cache.get(url); if (cached && cached.until > Date.now()) return cached.promise;
    const promise = this.run(provider.name === 'youtube' ? this.youtubePython : this.python, [fileURLToPath(new URL('../scripts/resolve-provider.py', import.meta.url)), url], { env: {...process.env, YOUTUBE_COOKIE_FILE: provider.name === 'youtube' ? this.cookieFile : ''}, timeout: 45000, maxBuffer: 1024 * 1024, windowsHide: true }).then(({ stdout }) => {
      const data = JSON.parse(stdout); if (data.error || !data.streams?.length) throw Error('Provider stream resolution failed.');
      for (const s of data.streams) { const u = new URL(s.url); if (!['http:', 'https:'].includes(u.protocol)) throw Error('Unsupported resolved stream.'); }
      return data;
    }).catch(error => {
      this.cache.delete(url);
      let code = 'provider_unavailable';
      try { const value=JSON.parse(error.stdout || '{}').code; if (['auth_challenge','rate_limited','video_unavailable','geo_restricted','format_unavailable','restricted_media'].includes(value)) code=value; } catch {}
      throw Object.assign(Error('External source unavailable. Check Python, yt-dlp and provider availability.'), {code});
    });
    if (this.cache.size >= 100) this.cache.delete(this.cache.keys().next().value);
    this.cache.set(url, { promise, until: Date.now() + 5 * 60000 }); return promise;
  }
  invalidate(url) { this.cache.delete(url); }
  async describe(url) {
    const provider=providerOf(url);if(!provider)return '';
    const cached=this.cache.get(url);
    if(cached&&cached.until>Date.now()){try{const data=await cached.promise;if(data.metadata?.description)return data.metadata.description;}catch{}}
    try{
      const {stdout}=await this.run(provider.name === 'youtube' ? this.youtubePython : this.python,[fileURLToPath(new URL('../scripts/resolve-provider.py',import.meta.url)),url,'--description'],{env:{...process.env,YOUTUBE_COOKIE_FILE:provider.name==='youtube'?this.cookieFile:''},timeout:35000,maxBuffer:262144,windowsHide:true});
      const data=JSON.parse(stdout);return typeof data.description==='string'?data.description:'';
    }catch{return '';}
  }
}
