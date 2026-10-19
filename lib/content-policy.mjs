export const MINIMUM_PROGRAMME_SECONDS = 300;
const identity = p => `${p.url}|${p.sourceOffset || 0}`;
// A short upload is interval material, regardless of its title or provider.
export function applyProgrammeDurationPolicy(config) {
 if(config.editorial?.minimumProgrammeSeconds !== MINIMUM_PROGRAMME_SECONDS)return config;
 const bank=new Map((config.intervalLibrary||[]).map(p=>[identity(p),p]));
 for(const channel of config.channels){
  if((channel.id==='little-box'||channel.playout?.programmesOnly)&&channel.schedule){
   for(const p of channel.schedule.breaks||[])bank.set(identity(p),{...p,isInterstitial:true,contentClass:'interstitial',originChannels:[...new Set([...(bank.get(identity(p))?.originChannels||[]),channel.id])]});
   delete channel.schedule;
  }
  const short=channel.programmes.filter(p=>Number.isFinite(p.duration)&&p.duration>0&&p.duration<MINIMUM_PROGRAMME_SECONDS);
  if(!short.length)continue;
  const breaks=new Map((channel.schedule?.breaks||[]).map(p=>[identity(p),p]));
  for(const p of short){
   const key=identity(p),old=bank.get(key);
   const clip={...p,kind:['advert','filler','ident','continuity','intermission','interval'].includes(p.kind)?p.kind:(/advert|commercial/i.test(p.title)?'advert':'filler'),isInterstitial:true,contentClass:'interstitial',originChannels:[...new Set([...(old?.originChannels||[]),channel.id])]};
   bank.set(key,clip);
   if(channel.id!=='little-box'&&!channel.playout?.programmesOnly&&!p.isTestCard&&!/test card f/i.test(p.title))breaks.set(key,{...p,kind:clip.kind,isInterstitial:true,contentClass:'interstitial'});
  }
  channel.programmes=channel.programmes.filter(p=>!short.includes(p));
  if(channel.id!=='little-box'&&!channel.playout?.programmesOnly)channel.schedule={alignMinutes:10,...channel.schedule,breaks:[...breaks.values()]};
 }
 config.intervalLibrary=[...bank.values()];
 applyProgrammeMirrors(config);
 return config;
}

// Explicit editorial rules let one series appear on more than one channel.
export function applyProgrammeMirrors(config){
 const rules=config.editorial?.programmeMirrors||[];
 if(!Array.isArray(rules))throw Error('Programme mirrors must be an array.');
 const normal=value=>String(value).toLowerCase().replace(/[’‘]/g,"'");
 for(const rule of rules){
  if(typeof rule.titleIncludes!=='string'||!rule.titleIncludes.trim()||!Array.isArray(rule.channels)||rule.channels.length<2)throw Error('Programme mirrors need a title match and at least two channels.');
  const destinations=rule.channels.map(id=>config.channels.find(c=>c.id===id));
  if(destinations.some(c=>!c))throw Error('Programme mirror destination not found.');
  const sources=new Map();
  for(const c of config.channels)for(const p of c.programmes){
   if(!normal(p.title).includes(normal(rule.titleIncludes))||p.isInterstitial||p.duration<300)continue;
   const key=identity(p),old=sources.get(key);
   if(!old||(Date.parse(p.iptvCheck?.checkedAt)||0)>(Date.parse(old.iptvCheck?.checkedAt)||0))sources.set(key,p);
  }
  for(const c of destinations)for(const [key,p] of sources){const index=c.programmes.findIndex(item=>identity(item)===key);const copy=structuredClone(p);if(index<0)c.programmes.push(copy);else c.programmes[index]=copy;}
 }
 return config;
}
