import {programmeOrder,channelTimeline} from './schedule.mjs';

// Read-only programme-slot traversal. Advert choices cannot change an aligned
// slot's length, so finding a distant showing need not build every advert break.
const plans=new WeakMap();
const millis=p=>Math.max(1,Math.round(p.duration*1000));
function slot(channel,p){const duration=millis(p),quantum=channel.playout?.programmesOnly?0:(channel.schedule?.alignMinutes||0)*60000;if(!quantum)return duration;let gap=(quantum-duration%quantum)%quantum;const minimum=(channel.schedule.minimumBreakSeconds||0)*1000;if(gap<minimum)gap+=Math.ceil((minimum-gap)/quantum)*quantum;return duration+gap;}
const seriesKey=s=>String(s).trim().toLowerCase().replace(/[’'\uFFFD]/g,'');
function planFor(channel){
 let plan=plans.get(channel);if(plan)return plan;
 const active=channel.programmes.filter(p=>!p.playbackDisabled);plan={active,total:active.reduce((n,p)=>n+slot(channel,p),0),orders:new Map()};
 if(channel.playout?.seriesRotation){
  const groups=new Map(),tailIds=channel.playout.rotationTailIds||[],tailSet=new Set(tailIds);
  active.forEach((p,index)=>{if(tailSet.has(p.id))return;const key=seriesKey(p.series||p.id);if(!groups.has(key))groups.set(key,[]);groups.get(key).push({p,index});});
  const keys=[...new Set([...channel.playout.seriesRotation.map(seriesKey),...groups.keys()])].filter(k=>groups.has(k));
  plan.groups=keys.map(key=>{const items=groups.get(key).sort((a,b)=>(a.p.rotationOrder??a.p.episodeOrder??a.index)-(b.p.rotationOrder??b.p.episodeOrder??b.index)||a.index-b.index).map(x=>x.p),prefix=[0],counts=channel.playout.seriesRotationCounts||{},countKey=Object.keys(counts).find(k=>seriesKey(k)===key);for(const p of items)prefix.push(prefix.at(-1)+slot(channel,p));return {items,prefix,slots:counts[countKey]||2};});
  const byId=new Map(active.map(p=>[p.id,p])),tail=tailIds.map(id=>byId.get(id)).filter(Boolean);
  if(tail.length){const prefix=[0];for(const p of tail)prefix.push(prefix.at(-1)+slot(channel,p));plan.groups.push({items:tail,prefix,slots:tail.length});}
 }
 plans.set(channel,plan);return plan;
}
function elapsedBefore(groups,round){return groups.reduce((sum,{items,prefix,slots})=>{const episodes=round*slots;return sum+Math.floor(episodes/items.length)*prefix.at(-1)+prefix[episodes%items.length];},0);}
function orderFor(channel,plan,cycle,timed){const key=String(cycle);if(plan.orders.has(key))return plan.orders.get(key);const order=timed?channelTimeline(channel,cycle):programmeOrder(channel,cycle);if(plan.orders.size>=4)plan.orders.delete(plan.orders.keys().next().value);plan.orders.set(key,order);return order;}

export function nextSearchAirings(channel,epoch,now,keysById){
 const found=new Map(),wanted=new Set(keysById.values());if(!wanted.size||['offline','technical'].includes(channel.status))return found;
 const plan=planFor(channel);if(!plan.active.length)return found;
 const visit=(items,start,timed=false)=>{let cursor=start;for(const p of items){const end=cursor+millis(p),key=keysById.get(p.id);if(!p.isInterstitial&&end>now&&key!==undefined&&!found.has(key))found.set(key,{programme:p,start:cursor,end,onNow:cursor<=now});cursor+=timed?millis(p):slot(channel,p);if(found.size===wanted.size)break;}};
 if(plan.groups){
  const start=Date.parse(channel.playout.rotationEpoch),elapsed=Math.max(0,now-start);let low=0,high=1;while(elapsedBefore(plan.groups,high)<=elapsed)high*=2;while(high-low>1){const middle=Math.floor((low+high)/2);if(elapsedBefore(plan.groups,middle)<=elapsed)low=middle;else high=middle;}
  const span=Math.max(...plan.groups.map(g=>Math.ceil(g.items.length/g.slots)))+2;
  for(let round=low;round<=low+span&&found.size<wanted.size;round++){const items=[];for(const group of plan.groups)for(let i=0;i<group.slots;i++)items.push(group.items[((round*group.slots+i)%group.items.length+group.items.length)%group.items.length]);visit(items,start+elapsedBefore(plan.groups,round));}
 }else{
  const start=Date.parse(channel.playout?.startEpoch||epoch),timed=!channel.playout?.programmesOnly&&!channel.schedule?.alignMinutes&&Boolean(channel.schedule?.breakSeconds),first=timed?orderFor(channel,plan,0,true):null,total=timed?first.reduce((n,p)=>n+millis(p),0):plan.total;
  const cycle=channel.playout?.startEpoch&&now<start?0:Math.floor((now-start)/total);
  for(let i=cycle;i<=cycle+1&&found.size<wanted.size;i++)visit(orderFor(channel,plan,i,timed),start+i*total,timed);
 }
 return found;
}
