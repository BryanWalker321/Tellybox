import {readFile,writeFile,rename} from 'node:fs/promises';
import {readStoryPack} from './teletext-stories.mjs';
const definitions={
 news:{name:'BBC News',url:'https://feeds.bbci.co.uk/news/rss.xml',source:'https://www.bbc.co.uk/news'},
 sport:{name:'BBC Sport',url:'https://feeds.bbci.co.uk/sport/rss.xml',source:'https://www.bbc.co.uk/sport'},
 football:{name:'BBC Football',url:'https://feeds.bbci.co.uk/sport/football/rss.xml',source:'https://www.bbc.co.uk/sport/football'},
 weather:{name:'BBC Weather - London',url:'https://weather-broker-cdn.api.bbci.co.uk/en/forecast/rss/3day/2643743',source:'https://www.bbc.co.uk/weather/2643743'}
};
const decode=value=>String(value||'').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/<[^>]*>/g,' ').replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi,(all,key)=>{if(key[0]==='#'){const code=key[1].toLowerCase()==='x'?parseInt(key.slice(2),16):Number(key.slice(1));return code>0&&code<=0x10ffff?String.fromCodePoint(code):'';}return {amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '}[key.toLowerCase()];}).replace(/\s+/g,' ').trim();
const tag=(xml,name)=>decode(xml.match(new RegExp('<'+name+'\\b[^>]*>([\\s\\S]*?)<\\/'+name+'>','i'))?.[1]);
const date=value=>{const stamp=Date.parse(value);return Number.isFinite(stamp)?new Date(stamp).toISOString():null;};
export function bbcLink(value){try{const u=new URL(value);return u.protocol==='https:'&&(u.hostname==='bbc.co.uk'||u.hostname.endsWith('.bbc.co.uk')||u.hostname==='bbc.com'||u.hostname.endsWith('.bbc.com'))?u.href:null;}catch{return null;}}
export function parseBbcRss(xml){
 if(typeof xml!=='string'||xml.length>500000||!/<rss\b/i.test(xml))throw Error('Invalid feed');
 const items=[...xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)].slice(0,60).map(([,item])=>({title:tag(item,'title').slice(0,500),description:tag(item,'description').slice(0,1500),url:bbcLink(tag(item,'link')),publishedAt:date(tag(item,'pubDate'))})).filter(item=>item.title&&item.url);
 if(!items.length)throw Error('Empty feed');return {items,issuedAt:date(tag(xml,'lastBuildDate')),copyright:tag(xml,'copyright')};
}
export class TeletextFeeds{
 constructor({file,storyFile=process.env.TELETEXT_STORIES_FILE,fetcher=fetch,clock=Date.now}={}){this.file=file;this.storyFile=storyFile;this.fetcher=fetcher;this.clock=clock;this.current=null;this.next=0;this.pending=null;this.loaded=false;}
 async get(){if(this.current&&this.clock()<this.next)return this.current;if(!this.pending)this.pending=this.refresh().finally(()=>{this.pending=null;});return this.pending;}
 async refresh(){
  if(!this.loaded){this.loaded=true;if(this.file)try{const saved=JSON.parse(await readFile(this.file,'utf8'));if(saved?.feeds)this.current=saved;}catch{}}
  const stamp=this.clock();let failed=false;
  const entries=await Promise.all(Object.entries(definitions).map(async([key,definition])=>{
   try{const response=await this.fetcher(definition.url,{headers:{Accept:'application/rss+xml, application/xml, text/xml','User-Agent':'Tellybox-Teletext/0.1'},signal:AbortSignal.timeout(8000)});if(!response.ok)throw Error('Feed unavailable');const data=parseBbcRss(await response.text());return [key,{...data,name:definition.name,source:definition.source,updatedAt:new Date(stamp).toISOString(),stale:false}];}
   catch{failed=true;const old=this.current?.feeds?.[key];return [key,{name:definition.name,source:definition.source,items:[],...(old?.updatedAt&&stamp-Date.parse(old.updatedAt)<86400000&&(!old.expiresAt||stamp<Date.parse(old.expiresAt))?old:{}),stale:true,error:'temporarily-unavailable'}];}
  }));
  const feeds=Object.fromEntries(entries);
  const identity=item=>{try{const u=new URL(item.url);return u.origin+u.pathname;}catch{return item.url;}};
  const football=new Set(feeds.football.items.map(identity));
  feeds.otherSport={...feeds.sport,name:'BBC Sport',items:feeds.sport.items.filter(item=>!football.has(identity(item))&&!/\/football\//i.test(item.url))};
  let storyExpiry=Infinity;
  if(this.storyFile)try{const pack=await readStoryPack(this.storyFile,stamp);Object.assign(feeds,pack.feeds);storyExpiry=pack.expiresAt;}catch{console.warn('Licensed Teletext story pack unavailable; using RSS summaries.');}
  // Retain the page slot while a story stays in the selected latest feed items.
  for(const [key,limit] of [['news',20],['football',15],['otherSport',6]]){
   const selected=[...new Map(feeds[key].items.map(item=>[identity(item),item])).values()].slice(0,limit),remaining=new Map(selected.map(item=>[identity(item),item]));
   const slots=Array.from({length:limit},(_,i)=>{const old=this.current?.feeds?.[key]?.pages?.[i];if(!old)return null;const item=remaining.get(identity(old));if(item)remaining.delete(identity(old));return item||null;});
   for(const item of remaining.values()){const i=slots.indexOf(null);if(i>=0)slots[i]=item;}
   feeds[key].pages=slots;
  }
  this.current={feeds};this.next=Math.min(storyExpiry,stamp+(failed?60000:600000));
  if(this.file)try{const temp=this.file+'.tmp';await writeFile(temp,JSON.stringify(this.current),{mode:0o600});await rename(temp,this.file);}catch{}
  return this.current;
 }
}
