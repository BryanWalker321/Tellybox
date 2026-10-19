import test from 'node:test';
import assert from 'node:assert/strict';
import {programmeOrder,scheduleAt,channelTimeline,validateCatalogue} from '../lib/schedule.mjs';
import {sortPlan,mediaKey} from '../public/programming-tools.mjs';
const epoch='2026-01-01T00:00:00Z',start=Date.parse(epoch);
const channel=()=>({id:'repeat',number:1,name:'Repeat',colour:'#123456',programmes:Array.from({length:12},(_,i)=>({id:'p'+i,title:'Episode '+i,series:i%2?'B':'A',episodeOrder:i,duration:300+i,url:'/media/'+i+'.mp4'})),playout:{order:'shuffle',repeat:'same',programmesOnly:true}});
test('same-order repeat preserves the first generated plan, including initially shuffled plans',()=>{
 const c=channel(),first=programmeOrder(c,0);for(const cycle of [-1,1,2,100])assert.deepEqual(programmeOrder(c,cycle),first);
 const duration=first.reduce((n,p)=>n+p.duration,0)*1000;
 const edge=scheduleAt(c,epoch,start+duration-1,2);assert.equal(edge[0].programme.id,first.at(-1).id);assert.equal(edge[1].programme.id,first[0].id);assert.equal(edge[0].end,edge[1].start);
});
test('reshuffle repeats use the entire active collection and agree after restart and at exact boundaries',()=>{
 const c=channel();c.playout.repeat='shuffle';c.programmes[3].playbackDisabled=true;
 const orders=Array.from({length:8},(_,i)=>programmeOrder(c,i));assert.ok(new Set(orders.map(a=>a.map(p=>p.id).join(','))).size>1);
 for(const [cycle,order] of orders.entries()){assert.equal(order.length,11);assert.equal(new Set(order.map(p=>p.id)).size,11);assert.ok(!order.some(p=>p.playbackDisabled));assert.deepEqual(order,programmeOrder(structuredClone(c),cycle));}
 const duration=orders[0].reduce((n,p)=>n+p.duration,0)*1000;
 assert.equal(scheduleAt(c,epoch,start+duration,1)[0].programme.id,orders[1][0].id);
 assert.deepEqual(scheduleAt(c,epoch,start+duration+12345,5),scheduleAt(structuredClone(c),epoch,start+duration+12345,5));
});
test('repeat policy retains clock boundaries, whole Flex and uninterrupted channels',()=>{
 const c=channel();c.playout={order:'episodic',repeat:'shuffle'};c.schedule={alignMinutes:10,breaks:[{id:'ad',title:'Advert',duration:30,url:'/media/ad.mp4',kind:'advert'}],maxClips:1};
 for(const cycle of [0,1,4]){const list=channelTimeline(c,cycle);assert.equal(list.filter(p=>!p.isInterstitial).length,12);assert.ok(list.filter(p=>p.kind==='advert').every(p=>p.duration===30));}
 for(const entry of scheduleAt(c,epoch,start+7200000,60).filter(e=>!e.programme.isInterstitial))assert.equal(entry.start%600000,0);
 c.playout.programmesOnly=true;assert.ok(channelTimeline(c,2).every(p=>!p.isInterstitial));
 c.playout.repeat='stop';assert.throws(()=>validateCatalogue({brand:{name:'Test'},epoch,channels:[c]}),/repeat/);
});
test('programme tools deduplicate canonical media without losing excerpts or modifying the input plan',()=>{
 const a={title:'Episode 10',url:'https://youtu.be/abcdefghijk',duration:300},b={title:'Episode 2',url:'https://www.youtube.com/watch?v=abcdefghijk&list=example',duration:300};
 assert.equal(mediaKey(a),mediaKey(b));assert.equal(sortPlan([a,b],'duplicates').length,1);assert.equal(sortPlan([a,{...b,sourceOffset:300}],'duplicates').length,2);
 const input=[a,b];assert.deepEqual(sortPlan(input,'title').map(p=>p.title),['Episode 2','Episode 10']);assert.deepEqual(input,[a,b]);assert.equal(sortPlan(input,'random',()=>0).length,2);
});
