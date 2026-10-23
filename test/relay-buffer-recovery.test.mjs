import test from 'node:test';import assert from 'node:assert/strict';import {ContinuousRelay} from '../lib/continuous-relay.mjs';
const FRAME=720*576*3/2,AUDIO=48000*2*2/25;
test('a starved video pipe releases paused audio even above its normal low watermark',()=>{
 let video=0,audio=0;const s={video:{length:0},audio:{length:140020},child:{stdio:[null,null,null,{resume(){video++;}},{resume(){audio++;}}]}};
 ContinuousRelay.prototype.drainSource(s);assert.equal(video,1);assert.equal(audio,1);
});
test('a stuck programme restarts only its decoder after five seconds and rate-limits retries',()=>{
 let discarded=0,prepared=0;const entry={programme:{id:'show',url:'/media/show.mp4'}};
 const s={child:{},sentFrames:1,entry,video:{length:0},audio:{length:AUDIO*18}},state={active:s,slot:entry};
 const relay={sourceFailed(){},discard(_state,source){assert.equal(source,s);discarded++;},prepare(_state,slot){assert.equal(slot,entry);prepared++;return Promise.resolve();}};
 ContinuousRelay.prototype.checkSourceProgress.call(relay,state,s,20000);
 ContinuousRelay.prototype.checkSourceProgress.call(relay,state,s,24999);assert.equal(prepared,0);
 ContinuousRelay.prototype.checkSourceProgress.call(relay,state,s,25000);assert.equal(prepared,1);assert.equal(discarded,1);assert.equal(state.active,null);assert.equal(state.decoderRecoveries,1);
 ContinuousRelay.prototype.checkSourceProgress.call(relay,state,s,26000);assert.equal(prepared,1);
});
test('starved audio releases paused video, while both queues still have safety limits',()=>{
 let video=0,audio=0;const s={video:{length:FRAME*20},audio:{length:0},child:{stdio:[null,null,null,{resume(){video++;}},{resume(){audio++;}}]}};
 ContinuousRelay.prototype.drainSource(s);assert.equal(video,1);assert.equal(audio,1);
 s.video.length=FRAME*101;ContinuousRelay.prototype.drainSource(s);assert.equal(video,1);
 s.video.length=0;s.audio.length=AUDIO*251;ContinuousRelay.prototype.drainSource(s);assert.equal(audio,2);
});
test('a new decoder has thirty seconds to load before recovery, not the five-second running timeout',()=>{
 let attempts=0;const entry={programme:{id:'loading',url:'/media/loading.mp4'}},s={child:{},sentFrames:0,entry,video:{length:0},audio:{length:0}},state={active:null,slot:entry};
 const relay={sourceFailed(){},discard(){},prepare(){attempts++;return Promise.resolve();}};
 ContinuousRelay.prototype.checkSourceProgress.call(relay,state,s,100000);
 ContinuousRelay.prototype.checkSourceProgress.call(relay,state,s,129999);assert.equal(attempts,0);
 ContinuousRelay.prototype.checkSourceProgress.call(relay,state,s,130000);assert.equal(attempts,1);
});
test('failed source fallback is a countdown to the programme boundary, never a test card',()=>{
 const entry={programme:{id:'failed-ad'},start:100,end:200},s={key:'parent',entry,deadline:500},state={sources:new Map([['parent',s]])};let prepared;
 const relay={key:e=>e.programme.id,prepare(_state,e){prepared=e;state.sources.set(e.programme.id,{entry:e});return Promise.resolve();}};
 ContinuousRelay.prototype.holdingFallback.call(relay,state,s);
 assert.equal(prepared.programme.isPresentation,true);assert.equal(prepared.programme.isTestCard,undefined);assert.equal(prepared.end,500);assert.equal(s.fallback.owner,s);
});
test('advert recovery searches beyond three unavailable candidates',async()=>{
 const now=Date.now(),entry={programme:{id:'failed-ad',url:'/media/original'},start:now,end:now+60000};
 const s={key:'parent',entry,deadline:now+90000},ads=Array.from({length:4},(_,i)=>({id:'ad'+i,url:'/media/ad'+i,kind:'advert',duration:2}));
 const state={sources:new Map([['parent',s]]),channel:{schedule:{breaks:ads}}};let holding=0;
 const relay={key:e=>e.programme.id+e.start,prepare(_state,e){state.sources.set(this.key(e),{key:this.key(e),entry:e,ready:e.programme.url==='/media/ad3',failed:e.programme.url!=='/media/ad3'});return Promise.resolve();},discard(_state,x){state.sources.delete(x.key);},holdingFallback(){holding++;}};
 await ContinuousRelay.prototype.replaceFailedAdvert.call({...relay,replaceFailedAdvert:ContinuousRelay.prototype.replaceFailedAdvert},state,s);
 assert.equal(s.fallback.entry.programme.url,'/media/ad3');assert.equal(holding,0);assert.equal(s.rejectedUrls.size,4);
});
