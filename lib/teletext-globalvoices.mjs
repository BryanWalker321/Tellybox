const entities={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' ',ndash:'-',mdash:'-',hellip:'...',lsquo:"'",rsquo:"'",ldquo:'"',rdquo:'"'};
const rawTag=(xml,name)=>xml.match(new RegExp('<'+name+'\\b[^>]*>([\\s\\S]*?)<\\/'+name+'>','i'))?.[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1')||'';
export function articleText(html){return String(html).replace(/<(script|style|iframe|object|figure)\b[^>]*>[\s\S]*?<\/\1>/gi,' ').replace(/<div\b[^>]*class=["'][^"']*wp-caption[^"']*["'][^>]*>[\s\S]*?<\/div>/gi,' ').replace(/<p\b[^>]*class=["'][^"']*(?:wp-caption-text|originally-published)[^"']*["'][^>]*>[\s\S]*?<\/p>/gi,' ').replace(/<[^>]*>/g,' ').replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi,(all,key)=>{if(key[0]==='#'){const n=key[1].toLowerCase()==='x'?parseInt(key.slice(2),16):Number(key.slice(1));return n>0&&n<=0x10ffff?String.fromCodePoint(n):' ';}return entities[key.toLowerCase()]??all;}).replace(/\s+/g,' ').trim();}
export function parseGlobalVoicesRss(xml,stamp=Date.now()){
 if(typeof xml!=='string'||Buffer.byteLength(xml)>2*1024*1024||!/<rss\b/i.test(xml))throw Error('Invalid full-text feed');
 const items=[];
 for(const [,body] of xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)){
  const title=articleText(rawTag(body,'title')),byline=articleText(rawTag(body,'dc:creator')),html=rawTag(body,'content:encoded'),published=Date.parse(rawTag(body,'pubDate'));let url;
  try{const u=new URL(articleText(rawTag(body,'link')));if(u.protocol!=='https:'||!['globalvoices.org','www.globalvoices.org'].includes(u.hostname)||u.username||u.password)continue;url=u.href;}catch{continue;}
  // A partner's separate restriction overrides the site's default CC BY grant.
  if(/all rights reserved|republished (?:here )?with permission|reproduced (?:here )?with permission|CC BY-NC|creativecommons\.org\/licenses\/(?:by-nc|by-nd)/i.test(html))continue;
  const text=articleText(html);if(!title||title.length>500||!byline||!text||text.length>20000||!Number.isFinite(published)||published>stamp+86400000||stamp-published>30*86400000)continue;
  items.push({title,byline,text,url,publishedAt:new Date(published).toISOString(),sourceName:'Global Voices',copyright:'Global Voices and credited author',licence:'CC BY 3.0',licenceUrl:'https://creativecommons.org/licenses/by/3.0/',formatNote:'Text-only Teletext layout; images omitted.'});
  if(items.length===20)break;
 }
 if(!items.length)throw Error('No recent reusable full-text stories');
 return {items,issuedAt:new Date(stamp).toISOString(),copyright:'Global Voices / CC BY 3.0'};
}
