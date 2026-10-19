import {mediaIdentity} from './programming-stats.mjs';
export function applySourceHealth(config,report){
 const checks=new Map((report?.results||[]).map(r=>[mediaIdentity(r.url),r]));
 for(const c of config.channels)for(const p of [...c.programmes,...(c.schedule?.breaks||[])]){
  const check=checks.get(mediaIdentity(p.url));if(!check)continue;
  if(Date.parse(p.iptvCheck?.checkedAt||'')>Date.parse(check.checkedAt||''))continue;
  if(check.result==='failed'&&check.failureCount>=2){p.playbackDisabled=true;p.availabilityHold='Repeated playback sample failure during source audit.';}
  else if(check.result==='passed')p.iptvCheck={result:'passed',checkedAt:check.checkedAt,reason:'Original footage decoded during source health audit.'};
 }
 return config;
}
