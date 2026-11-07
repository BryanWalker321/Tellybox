import {wrap} from './teletext-pages.mjs';
import {ukMapRows} from './teletext-art.mjs';
const locations=[['aberdeen','Aberdeen'],['edinburgh','Edinburgh'],['belfast','Belfast'],['newcastle','Newcastle'],['manchester','Manchester'],['birmingham','Birmingham'],['cardiff','Cardiff'],['plymouth','Plymouth'],['','London']];
const row=(text,colour='white')=>({text,colour});
export function ukWeatherPage(page,data,requested=0){
 if(!['146','147'].includes(page))return null;
 const feeds=data?.feeds||{},feedFor=k=>feeds[k?'weather_'+k:'weather'];let content=[];
 if(page==='146'){
  const reference=feedFor('')?.items?.[0],minimum=!/Maximum Temperature:/i.test(reference?.description||''),kind=minimum?'Minimum':'Maximum',period=(reference?.title?.split(':')[0]||'NEXT PERIOD').toUpperCase();
  content=[row('UK FORECAST - SCHEMATIC MAP','cyan'),...ukMapRows(),row((period+' - FORECAST '+kind.toUpperCase()+' C').slice(0,38),'yellow')];
  const labels=locations.map(([key,name])=>{const f=feedFor(key),value=f?.items?.[0]?.description?.match(new RegExp(kind+' Temperature:\\s*(-?\\d+)\\s*°?C','i'))?.[1];return name.toUpperCase()+' '+(value??'--')+(f?.stale?'*':'');});
  for(let i=0;i<labels.length;i+=2)content.push(row(labels[i].padEnd(20)+(labels[i+1]||'')));
  content.push(row('* CACHED. -- UNAVAILABLE. DETAILS 147','cyan'),row('SOURCE: BBC WEATHER','cyan'));
 }else for(const [key,name] of locations){const f=feedFor(key);content.push(row(name.toUpperCase()+(f?.stale?' - CACHED':''),'yellow'));for(const item of (f?.items||[]).slice(0,3))content.push(...wrap(item.title).map(t=>row(t)),...wrap(item.description).map(t=>row(t)));if(!f?.items?.length)content.push(row('FORECAST TEMPORARILY UNAVAILABLE'));content.push(row('SOURCE: '+(f?.name||'BBC WEATHER'),'cyan'),...wrap(f?.updatedAt?'CHECKED '+f.updatedAt:'NO UPDATE AVAILABLE').map(t=>row(t,'cyan')),row(''));}
 const subpages=Math.max(1,Math.ceil(content.length/18)),subpage=Math.max(0,Math.min(subpages-1,Number(requested)||0));return {page,heading:page==='146'?'UK WEATHER MAP':'UK REGIONAL WEATHER',rows:content.slice(subpage*18,(subpage+1)*18),subpage,subpages,links:[{label:'Index',page:'100'},{label:'London',page:'145'},{label:'UK details',page:'147'},{label:'UK map',page:'146'}]};
}
