import {readFile} from 'node:fs/promises';
import {providerOf} from './providers.mjs';

export function descriptionSource(programme) {
 for(const value of [programme.sourceUrl,programme.url]){
  if(!value)continue;
  const provider=providerOf(value);if(provider)return {key:`${provider.name}:${provider.id}`,url:value};
  try{const url=new URL(value);if(url.hostname==='archive.org'&&/^\/(details|download)\//.test(url.pathname)){
   const id=decodeURIComponent(url.pathname.split('/')[2]);if(/^[\w.-]+$/.test(id))return{key:`archive:${id}`,archive:id};
  }}catch{}
 }
 return null;
}
export function cleanDescription(value) {
 const text=Array.isArray(value)?value.filter(v=>typeof v==='string').join('\n\n'):typeof value==='string'?value:'';
 return text.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,'')
  .replace(/<br\s*\/?\s*>|<\/(?:p|div|li)>/gi,'\n').replace(/<[^>]*>/g,'')
  .replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi,(_m,entity)=>{
   if(entity[0]==='#'){const n=entity[1].toLowerCase()==='x'?parseInt(entity.slice(2),16):Number(entity.slice(1));return n>0&&n<=0x10ffff?String.fromCodePoint(n):'';}
   return {amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '}[entity.toLowerCase()];
  }).replace(/\r/g,'').replace(/[ \t]+/g,' ').replace(/ *\n */g,'\n').replace(/\n{3,}/g,'\n\n').trim().slice(0,12000);
}

export class ProgrammeDescriptions {
 constructor({file,provider,fetcher=fetch}={}){this.file=file;this.provider=provider;this.fetcher=fetcher;this.seed={};this.cache=new Map();this.reloadAt=0;this.active=0;this.waiters=[];}
 async get(programme){
  const meaningful=value=>{const text=cleanDescription(value);return text.toLowerCase()===programme.title?.trim().toLowerCase()?'':text;};
  const own=meaningful(programme.description);if(own)return own;
  const source=descriptionSource(programme);if(!source)return '';
  if(this.file&&Date.now()>this.reloadAt){this.reloadAt=Date.now()+60000;try{this.seed=JSON.parse(await readFile(this.file,'utf8'));}catch{/* A self-hosted station need not ship a research cache. */}}
  const seeded=meaningful(this.seed[source.key]);if(seeded)return seeded;
  const cached=this.cache.get(source.key);if(cached&&cached.until>Date.now())return cached.promise;
  const promise=this.lookup(source).then(meaningful).catch(()=>'');
  if(this.cache.size>=500)this.cache.delete(this.cache.keys().next().value);
  const record={promise,until:Date.now()+600000};this.cache.set(source.key,record);
  promise.then(value=>{record.until=Date.now()+(value?12*3600000:600000);});return promise;
 }
 async lookup(source){
  if(this.active>=2&&this.waiters.length>=16)return '';
  if(this.active>=2)await new Promise(resolve=>this.waiters.push(resolve));
  else this.active++;
  try{
   if(source.archive){
    const response=await this.fetcher(`https://archive.org/metadata/${encodeURIComponent(source.archive)}/metadata`,{signal:AbortSignal.timeout(15000),redirect:'error'});
    if(!response.ok)return '';const data=await response.json();return cleanDescription(data.result?.description);
   }
   return cleanDescription(await this.provider?.describe(source.url));
  }finally{const next=this.waiters.shift();if(next)next();else this.active--;}
 }
}
