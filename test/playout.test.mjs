import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {programmeOrder,channelTimeline,scheduleAt,validateCatalogue} from '../lib/schedule.mjs';

test('series shuffle varies by cycle, preserves episodes, and is identical for independent viewers',()=>{
 const channel={id:'mixed',playout:{shuffleSeries:true,seed:'station'},programmes:[]};
 for(const series of ['A','B','C','D'])for(const episode of [3,1,2])channel.programmes.push({id:series+episode,title:series+episode,series,episodeOrder:episode,duration:61+episode,url:'https://example.com/'+series+episode+'.mp4'});
 channel.programmes.push({id:'blocked',title:'Blocked',series:'A',episodeOrder:0,duration:10,url:'https://example.com/blocked.mp4',playbackDisabled:true});
 const orders=new Set();
 for(let cycle=-2;cycle<8;cycle++){
  const order=programmeOrder(channel,cycle);orders.add(order.map(p=>p.id).join(','));
  assert.equal(order.length,12);assert.equal(new Set(order.map(p=>p.id)).size,12);
  for(const series of ['A','B','C','D'])assert.deepEqual(order.filter(p=>p.series===series).map(p=>p.episodeOrder),[1,2,3]);
  for(let i=1;i<order.length;i++)assert.notEqual(order[i].series,order[i-1].series);
  assert.deepEqual(order,programmeOrder(structuredClone(channel),cycle));
 }
 assert.ok(orders.size>=5);
 const epoch='2026-01-01T00:00:00Z';
 for(const aligned of [false,true]){
  const c=structuredClone(channel);if(aligned)c.schedule={alignMinutes:10,breaks:[]};
  const duration=channelTimeline(c,0).reduce((sum,p)=>sum+p.duration,0);
  for(const cycle of [-1,0,1,2]){
   const entries=scheduleAt(c,epoch,Date.parse(epoch)+cycle*duration*1000,60);
   assert.deepEqual(entries,scheduleAt(structuredClone(c),epoch,Date.parse(epoch)+cycle*duration*1000,60));
   for(let i=1;i<entries.length;i++)assert.equal(entries[i].start,entries[i-1].end);
   if(aligned)for(const entry of entries.filter(e=>!e.programme.isInterstitial))assert.equal(entry.start%600000,0);
  }
 }
});

test('seven-channel consolidation retains every programme and keeps retired branding out of rotation',async t=>{
 const config=validateCatalogue(JSON.parse(await readFile('catalogue.json','utf8')));
 if(!config.channels.some(c=>c.id==='british-collection')){t.skip('Not the consolidated curated pack');return;}
 const baseline=JSON.parse(await readFile('docs/channel-consolidation.json','utf8'));
 const identity=p=>JSON.stringify([p.id,p.url,p.sourceOffset||0]);
 assert.deepEqual(config.channels.map(c=>c.name),['Saturday Night Out','After Hours','Prize Time','The Little Box','The Unexplained','A Proper Laugh','The British Collection']);
 assert.deepEqual(config.channels.map(c=>c.number),[1,2,3,4,5,6,7]);
 const current=new Set([...config.channels.flatMap(c=>c.programmes),...(config.intervalLibrary||[])].map(identity));
 for(const identity of baseline.programmeIdentities)assert.ok(current.has(JSON.stringify(identity)),identity[0]+' must survive');
 for(const c of config.channels){
  assert.ok(c.playout.shuffleSeries);assert.ok(c.programmes.every(p=>p.series&&p.episodeOrder>0));
  assert.ok(!(c.schedule?.breaks||[]).some(p=>p.stationBrand));
 }
 const strange=config.channels.find(c=>c.id==='unexplained');
 assert.ok(strange.programmes.some(p=>p.title.startsWith('Children of the Stones')));
 assert.ok(strange.programmes.some(p=>p.title.startsWith('Quatermass II')));
 const kids=config.channels.find(c=>c.id==='little-box');assert.equal(kids.schedule,undefined);
 for(const id of baseline.retiredChannels)assert.ok(config.channels.some(n=>n.id===config.channelAliases[id]));
});
