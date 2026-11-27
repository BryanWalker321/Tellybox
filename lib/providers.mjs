import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
const execute = promisify(execFile);
export function providerOf(url) {
  try { const u = new URL(url);
    if (['vimeo.com','www.vimeo.com','player.vimeo.com'].includes(u.hostname)) {
      const match = (u.hostname === 'player.vimeo.com' ? /^\/video\/(\d{1,12})\/?$/ : /^\/(\d{1,12})(?:\/[a-f0-9]{8,64})?\/?$/i).exec(u.pathname);
      if (u.protocol === 'https:' && !u.username && !u.password && !u.port && match && (!u.searchParams.has('h') || /^[a-f0-9]{8,64}$/i.test(u.searchParams.get('h')))) return {name:'vimeo',id:match[1]};
      return null;
    }
    if (['dailymotion.com', 'www.dailymotion.com', 'dai.ly'].includes(u.hostname)) { const id = u.pathname.split('/').at(-1).split('_')[0]; if (/^[a-zA-Z0-9]+$/.test(id)) return { name: 'dailymotion', id }; } } catch {} return null;
}
export class ProviderResolver {
  constructor({python=process.env.PROVIDER_PYTHON || (process.platform==='win32'?'python':'python3'),run=execute}={}) {
    this.python=python;
    this.run=run;
    this.cache=new Map();
  }
  async resolve(url) {
    if (!providerOf(url)) throw Error('Unsupported external video provider.');
    const cached=this.cache.get(url);
    if(cached&&cached.until>Date.now())return cached.promise;
    const script=fileURLToPath(new URL('../scripts/resolve-provider.py',import.meta.url));
    const entry={until:Date.now()+5*60000};
    entry.promise=this.run(this.python,[script,url],{timeout:90000,maxBuffer:1024*1024,windowsHide:true}).then(({stdout})=>{
      const data=JSON.parse(stdout);
      if(data.error||!data.streams?.length)throw Error('No provider stream.');
      for(const stream of data.streams)if(!['http:','https:'].includes(new URL(stream.url).protocol))throw Error('Unsupported provider stream.');
      return data;
    }).catch(error=>{
      if(this.cache.get(url)===entry)this.cache.delete(url);
      let code='provider_unavailable';
      try {code=JSON.parse(error.stdout||'{}').code||code;}catch{}
      throw Object.assign(Error('External source unavailable. Check Python, yt-dlp and provider availability.'),{code});
    });
    if(this.cache.size>=100)this.cache.delete(this.cache.keys().next().value);
    this.cache.set(url,entry);
    return entry.promise;
  }
  invalidate(url) { this.cache.delete(url); }
  async describe(url) {
    if(!providerOf(url))return '';
    const cached=this.cache.get(url);
    if(cached&&cached.until>Date.now()){
      try {const data=await cached.promise;if(data.metadata?.description)return data.metadata.description;}catch{}
    }
    try{
      const script=fileURLToPath(new URL('../scripts/resolve-provider.py',import.meta.url));
      const {stdout}=await this.run(this.python,[script,url,'--description'],{timeout:35000,maxBuffer:262144,windowsHide:true});
      const {description}=JSON.parse(stdout);
      return typeof description==='string'?description:'';
    }catch{return '';}
  }
}
