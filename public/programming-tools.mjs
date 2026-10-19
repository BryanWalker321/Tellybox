export function mediaKey(p){
 let source=p.url;
 try{const u=new URL(p.url,'http://station.invalid');if(['www.youtube.com','youtube.com','m.youtube.com'].includes(u.hostname)&&u.searchParams.get('v'))source='youtube:'+u.searchParams.get('v');else if(u.hostname==='youtu.be')source='youtube:'+u.pathname.slice(1);else source=u.href.replace('http://station.invalid','');}catch{}
 return `${source}|${p.sourceOffset||0}`;
}
export function uniqueMedia(items){const seen=new Set();return items.filter(p=>{const key=mediaKey(p);if(seen.has(key))return false;seen.add(key);return true;});}
export function runtime(seconds){const n=Math.max(0,Math.round(seconds||0));return [n>=86400?Math.floor(n/86400)+'d':'',n>=3600?Math.floor(n%86400/3600)+'h':'',n>=60?Math.floor(n%3600/60)+'m':'',n<3600?n%60+'s':''].filter(Boolean).join(' ');}
export function useListedPlan(c){const initial=c.playout?.order||(c.playout?.shuffleSeries?'episodic':'listed');c.playout={...c.playout,repeat:c.playout?.repeat||(initial==='shuffle'?'shuffle':initial==='episodic'?'episodic':'same'),order:'listed',shuffleSeries:false};}
export function sortPlan(items,mode,random=Math.random){
 const result=[...items];
 if(mode==='random'){for(let i=result.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}return result;}
 if(mode==='title')return result.sort((a,b)=>a.title.localeCompare(b.title,undefined,{numeric:true}));
 if(mode==='series')return result.sort((a,b)=>(a.series||a.title).localeCompare(b.series||b.title,undefined,{numeric:true})||(a.episodeOrder??0)-(b.episodeOrder??0));
 if(mode==='duplicates')return uniqueMedia(result);
 return result;
}
