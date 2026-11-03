import {nextSearchAirings} from './search-schedule.mjs';
const indexes=new WeakMap();
export const normalizeSearch=value=>String(value??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[’'`]/g,'').replace(/&/g,' and ').replace(/[^a-z0-9]+/g,' ').trim();
function indexFor(config){let index=indexes.get(config);if(index)return index;index=config.channels.map(channel=>({channel,items:channel.programmes.filter(p=>!p.playbackDisabled&&!p.isInterstitial&&!p.isPresentation&&!p.isTestCard).map(p=>({p,group:normalizeSearch(p.series||p.title),text:normalizeSearch([p.title,p.series,p.sourceEpisodeLabel].filter(Boolean).join(' '))}))}));indexes.set(config,index);return index;}
export function searchProgrammes(config,query,{now=Date.now(),offset=0,limit=24}={}){
 const normalized=normalizeSearch(query),tokens=normalized.split(' '),index=indexFor(config),results=[];
 if(normalized.length>=2)for(const {channel,items}of index){
  const groups=new Map(),keys=new Map();
  for(const item of items){if(!tokens.every(t=>item.text.includes(t)))continue;const key=item.group;keys.set(item.p.id,key);let group=groups.get(key);if(!group){group={title:item.p.series||item.p.title,count:0};groups.set(key,group);}group.count++;}
  if(!groups.size)continue;const airings=nextSearchAirings(channel,config.epoch,now,keys);
  for(const [key,group]of groups){const entry=airings.get(key);results.push({title:group.title,matchingRecordings:group.count,channel:{id:channel.id,number:channel.number,name:channel.name,colour:channel.colour,status:channel.status||'online'},airing:entry?{title:entry.programme.title,programmeId:entry.programme.id,start:entry.start,end:entry.end,onNow:entry.onNow}:null,score:key===normalized?0:key.startsWith(normalized)?1:2});}
 }
 results.sort((a,b)=>a.score-b.score||(a.airing?.start??Infinity)-(b.airing?.start??Infinity)||a.channel.number-b.channel.number||a.title.localeCompare(b.title));
 const invite=config.brand.discordInvite||'';
 return {query:String(query??'').trim(),generatedAt:now,total:results.length,offset,limit,hasMore:offset+limit<results.length,results:results.slice(offset,offset+limit).map(({score,...r})=>r),brand:{name:config.brand.name,accent:config.brand.accent,discordInvite:/^https:\/\/(?:discord\.gg\/|discord\.com\/invite\/)[\w-]+\/?$/.test(invite)?invite:''},channels:config.channels.length};
}
export function createProgrammeSearchHandler({getConfig,getDiscordInvite=()=>undefined,clock=Date.now}){
 let current,cache=new Map();
 return async function handleProgrammeSearch(req,res,url=new URL(req.url,'http://localhost')){
  if(url.pathname!=='/api/programme-search')return false;
  const send=(status,body)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:JSON.stringify(body));};
  if(!['GET','HEAD'].includes(req.method)){res.setHeader('Allow','GET, HEAD');send(405,{error:'Use GET to search programmes.'});return true;}
  const q=(url.searchParams.get('q')||'').trim();if(q.length>120){send(400,{error:'Please use a shorter programme title (up to 120 characters).'});return true;}
  const offset=Number(url.searchParams.get('offset')||0);if(!Number.isInteger(offset)||offset<0||offset>100000){send(400,{error:'Invalid results page.'});return true;}
  try{const config=await getConfig(),now=clock(),invite=getDiscordInvite();if(current!==config){cache=new Map();current=config;}const key=q+'\n'+offset+'\n'+String(invite);let saved=cache.get(key);if(!saved||saved.until<=now){const body=searchProgrammes(config,q,{now,offset});if(invite!==null&&invite!==undefined)body.brand.discordInvite=/^https:\/\/(?:discord\.gg\/|discord\.com\/invite\/)[\w-]+\/?$/.test(invite)?invite:'';const boundaries=body.results.flatMap(r=>r.airing?[r.airing.start,r.airing.end]:[]).filter(t=>t>now);saved={body,until:Math.min(now+15000,...boundaries)};if(cache.size>=128)cache.delete(cache.keys().next().value);cache.set(key,saved);}send(200,saved.body);}catch{send(503,{error:'Programme search is temporarily unavailable. Please try again shortly.'});}
  return true;
 };
}
