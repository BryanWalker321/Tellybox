import test from 'node:test';
import assert from 'node:assert/strict';
import {scheduleAt,channelTimeline,programmeOrder,validateCatalogue} from '../lib/schedule.mjs';
const epoch='2026-01-01T00:00:00Z',start=Date.parse(epoch);
const p=(id,duration=20)=>({id,title:id,duration,url:'/media/'+id+'.mp4'});
const base=()=>({id:'demo',name:'Demo',number:1,colour:'#123456',programmes:[p('a'),p('b'),p('c')],schedule:{breakSeconds:10,breakEvery:2,transitionReserveSeconds:0,breaks:[p('ad',10)]}});
test('timed breaks keep every-N frequency across content-cycle boundaries',()=>{
 const c=base(),list=scheduleAt(c,epoch,start,30);let programmes=0;
 for(const entry of list){if(entry.programme.isInterstitial){assert.equal(programmes,2);assert.equal(entry.programme.duration,10);programmes=0;}else programmes++;}
 for(let i=1;i<list.length;i++)assert.equal(list[i].start,list[i-1].end);
 assert.deepEqual(list,scheduleAt(structuredClone(c),epoch,start,30));
 assert.equal(channelTimeline(c).reduce((sum,p)=>sum+p.duration,0),150);
});
test('whole adverts fit slots, maximum clip count is respected and unused time is presentation',()=>{
 const c=base();c.schedule={breakSeconds:45,breakEvery:1,maxClips:1,transitionReserveSeconds:5,breaks:[p('too-long',46),p('fits',30)]};
 const list=channelTimeline(c);const ads=list.filter(p=>p.isInterstitial&&!p.isPresentation);assert.equal(ads.length,3);assert.ok(ads.every(p=>p.title==='fits'&&p.duration===30));assert.equal(list.filter(p=>p.isPresentation).length,3);assert.equal(list.reduce((s,p)=>s+p.duration,0),195);
});
test('back-to-back overrides pools; random mode reshuffles deterministically; episodic preserves episode order',()=>{
 const c=base();c.playout={programmesOnly:true};assert.equal(channelTimeline(c).length,3);assert.equal(scheduleAt(c,epoch,start+60000,1)[0].programme.id,'a');
 c.playout={order:'shuffle',seed:'test'};const orders=new Set(Array.from({length:10},(_,cycle)=>programmeOrder(c,cycle).map(p=>p.id).join(',')));assert.ok(orders.size>1);assert.deepEqual(programmeOrder(c,2),programmeOrder(structuredClone(c),2));
 c.programmes=[{...p('b2'),series:'B',episodeOrder:2},{...p('a2'),series:'A',episodeOrder:2},{...p('a1'),series:'A',episodeOrder:1},{...p('b1'),series:'B',episodeOrder:1}];c.playout.order='episodic';for(const series of ['A','B'])assert.deepEqual(programmeOrder(c).filter(p=>p.series===series).map(p=>p.episodeOrder),[1,2]);
});
test('clock gaps stay aligned while adverts occur only at the chosen frequency',()=>{
 const c=base();c.schedule={alignMinutes:5,breakEvery:2,transitionReserveSeconds:0,breaks:[p('ad',30)]};const list=scheduleAt(c,epoch,start,100);for(const e of list.filter(e=>!e.programme.isInterstitial))assert.equal(e.start%300000,0);assert.ok(list.some(e=>e.programme.isPresentation));
});
test('invalid and ambiguous break settings fail validation',()=>{
 for(const bad of [{breakSeconds:0},{breakSeconds:30,breakEvery:0},{breakSeconds:30,maxClips:100},{alignMinutes:10,breakSeconds:30}]){const c=base();c.schedule={...bad,breaks:[]};assert.throws(()=>validateCatalogue({brand:{name:'Test'},epoch,channels:[c]}));}
});
