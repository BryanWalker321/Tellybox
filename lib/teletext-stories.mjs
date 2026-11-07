// Operator-supplied, licensed full-text feed. This never fetches arbitrary URLs.
import {readFile} from 'node:fs/promises';
const https=value=>{try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}catch{return null;}};
export function parseStoryPack(raw,stamp=Date.now()){
 if(typeof raw!=='string'||Buffer.byteLength(raw)>2*1024*1024)throw Error('Invalid story pack size');
 const pack=JSON.parse(raw),issued=Date.parse(pack.generatedAt),expires=Date.parse(pack.expiresAt);
 if(!Number.isFinite(issued)||!Number.isFinite(expires)||issued>stamp+60000||expires<=stamp||expires-issued>86400000||issued>=expires)throw Error('Story pack is expired or invalid');
 if(typeof pack.source?.name!=='string'||!pack.source.name.trim()||pack.source.name.length>100||!https(pack.source.url)||typeof pack.source.licence!=='string'||!pack.source.licence.trim()||pack.source.licence.length>500)throw Error('Source and licence metadata are required');
 const feeds={};
 for(const [key,limit] of [['news',20],['football',15],['otherSport',6]]){
  if(pack.sections?.[key]===undefined)continue;
  const input=pack.sections[key];if(!Array.isArray(input)||input.length>limit)throw Error('Invalid story section');
  const items=input.map(item=>{
   if(typeof item.title!=='string'||!item.title.trim()||item.title.length>500||typeof item.text!=='string'||!item.text.trim()||item.text.length>20000||!https(item.url)||!Number.isFinite(Date.parse(item.publishedAt)))throw Error('Invalid story');
   if(['byline','copyright'].some(k=>item[k]!==undefined&&(typeof item[k]!=='string'||item[k].length>500)))throw Error('Invalid attribution');
   return {title:item.title,text:item.text,url:https(item.url),publishedAt:item.publishedAt,byline:item.byline||'',copyright:item.copyright||'',licence:pack.source.licence,sourceName:pack.source.name};
  });
  if(new Set(items.map(i=>i.url)).size!==items.length)throw Error('Duplicate stories');
  feeds[key]={name:pack.source.name,source:https(pack.source.url),licence:pack.source.licence,items,updatedAt:pack.generatedAt,expiresAt:pack.expiresAt,stale:false};
 }
 return {feeds,expiresAt:expires};
}
export async function readStoryPack(file,stamp){return parseStoryPack(await readFile(file,'utf8'),stamp);}
