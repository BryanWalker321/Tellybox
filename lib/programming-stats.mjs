export function mediaIdentity(value){
 try{const u=new URL(value,'https://local.invalid');const host=u.hostname.toLowerCase();
  if(['youtube.com','www.youtube.com','youtu.be'].includes(host)){const id=host==='youtu.be'?u.pathname.slice(1):u.searchParams.get('v');if(id)return 'youtube:'+id;}
  if(['vimeo.com','www.vimeo.com','player.vimeo.com'].includes(host)){const id=u.pathname.match(/^\/(?:video\/)?(\d+)(?:\/|$)/)?.[1];if(id)return 'vimeo:'+id;}
  if(['dailymotion.com','www.dailymotion.com','dai.ly'].includes(host))return 'dailymotion:'+u.pathname.split('/').at(-1).split('_')[0];
  return host+decodeURIComponent(u.pathname)+u.search;
 }catch{return value;}
}
export function programmingStats(config){
 const footage=new Map();let channels=0,programmeRecords=0;
 for(const c of config.channels){if(['offline','technical'].includes(c.status))continue;let active=false;
  for(const p of c.programmes){if(p.playbackDisabled||p.isInterstitial||p.isTestCard||p.isPresentation||p.duration<300)continue;
   active=true;programmeRecords++;const key=mediaIdentity(p.url),offset=p.sourceOffset||0;
   if(!footage.has(key))footage.set(key,[]);footage.get(key).push([offset,offset+p.duration]);
  }if(active)channels++;
 }
 let seconds=0;
 for(const ranges of footage.values()){
  ranges.sort((a,b)=>a[0]-b[0]);let start,end;
  for(const [a,b] of ranges){if(start===undefined){start=a;end=b;}else if(a<=end)end=Math.max(end,b);else{seconds+=end-start;start=a;end=b;}}
  if(start!==undefined)seconds+=end-start;
 }
 return {hours:Math.floor(seconds/3600),seconds,channels,programmeRecords,uniqueSources:footage.size,estimated:true};
}
