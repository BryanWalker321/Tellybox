import test from 'node:test';
import assert from 'node:assert/strict';
import {validateCatalogue,channelTimeline} from '../lib/schedule.mjs';
test('station pool fills breaks with random whole clips and a two minute cooldown by media identity',()=>{
 const clip=(id,url,duration=20)=>({id,title:id,url,duration});
 const channel={id:'test',name:'Test',number:1,colour:'#123456',programmes:[clip('p','/media/p.mp4',300)],schedule:{breakSeconds:360,useStationPool:true,cooldownSeconds:120,transitionReserveSeconds:0,breaks:[]}};
 const config={brand:{name:'Test'},epoch:'2026-10-20T00:00:00Z',channels:[channel],intervalLibrary:Array.from({length:30},(_,i)=>clip('ad'+i,'/media/ad'+i+'.mp4'))};
 validateCatalogue(config);assert.equal(channel.sharedIntervals.length,30);
 const orders=[];
 for(let cycle=0;cycle<3;cycle++){let elapsed=0;const last=new Map();const timeline=channelTimeline(channel,cycle);orders.push(timeline.filter(p=>p.isInterstitial).map(p=>p.url).join('|'));
  assert.ok(!timeline.some(p=>p.isPresentation));
  for(const p of timeline){if(p.isInterstitial){assert.ok(elapsed-(last.get(p.url)??-Infinity)>=120);last.set(p.url,elapsed+p.duration);}elapsed+=p.duration;}
 }
 assert.equal(new Set(orders).size,3);
 channel.schedule.useStationPool=false;validateCatalogue(config);assert.equal(channel.schedule.breaks.length,0);assert.equal(channel.sharedIntervals,undefined);
 assert.ok(channelTimeline(structuredClone(channel),20).some(p=>p.isPresentation));
});
