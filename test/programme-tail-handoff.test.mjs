import test from 'node:test';
import assert from 'node:assert/strict';
import {ContinuousRelay} from '../lib/continuous-relay.mjs';

function fixture(now){
 const relay=Object.create(ContinuousRelay.prototype),pipe=()=>({write(){},resume(){},writableNeedDrain:false});
 const channel={id:'tail-test',programmes:[{id:'first',title:'First',url:'/media/first.mp4',duration:20},{id:'second',title:'Second',url:'/media/second.mp4',duration:20}],schedule:{alignMinutes:1},playout:{order:'listed'}};
 const entry={programme:channel.programmes[0],start:0,end:20000},source={key:relay.key(entry),entry,sentFrames:250,playbackDuration:20,ready:true,failed:false,video:{length:1e9,take:n=>Buffer.alloc(n)},audio:{length:1e9,take:n=>Buffer.alloc(n)},child:{stdio:[null,null,null,pipe(),pipe()]}};
 const state={channel,epoch:'1970-01-01T00:00:00Z',slot:entry,active:source,sources:new Map([[source.key,source]]),nextPrepareCheck:Infinity,nextFrame:now,child:{stdio:[null,null,null,pipe(),pipe()]},sourceFrameCounts:{programme:0},fallbackFrames:0,outputFrames:0,transitions:0};
 relay.drainSource=()=>{};relay.checkSourceProgress=()=>{};relay.prepare=async(s,e)=>{s.prepared=e;};relay.discard=(s,x)=>{s.discarded=x;s.sources.delete(x.key);};
 return {relay,state,source};
}

test('delayed programme closing footage uses the interval without moving the next programme',()=>{
 const original=Date.now;let now=21000;Date.now=()=>now;
 try{
  const {relay,state,source}=fixture(now);relay.tick(state);
  assert.equal(state.active,source);assert.equal(source.sentFrames,251);assert.equal(state.discarded,undefined);assert.equal(state.slot.end,21200);
  now=60000;state.nextFrame=now;relay.tick(state);
  assert.equal(state.discarded,source);assert.equal(state.slot.programme.id,'second');assert.equal(state.slot.start,60000);
 }finally{Date.now=original;}
});

test('a completed or exhausted programme leaves the tail immediately',()=>{
 const original=Date.now;Date.now=()=>21000;
 try{for(const exhausted of [false,true]){const {relay,state,source}=fixture(21000);if(exhausted){source.videoEnded=true;source.video.length=0;}else source.sentFrames=500;relay.tick(state);assert.equal(state.discarded,source);assert.ok(state.slot.programme.isPresentation);}}
 finally{Date.now=original;}
});

test('short clock delays are repaid rather than permanently slowing every following programme',()=>{
 const original=Date.now;Date.now=()=>10000;
 try{const {relay,state}=fixture(10000);state.nextFrame=8000;for(let i=0;i<51;i++)relay.tick(state);assert.equal(state.nextFrame,10040);assert.equal(state.outputFrames,51);relay.tick(state);assert.equal(state.outputFrames,51);}
 finally{Date.now=original;}
});


test('encoder startup tolerates one queued video frame but keeps both pipe queues bounded',()=>{
 const original=Date.now;Date.now=()=>10000;
 try{const {relay,state}=fixture(10000),video=state.child.stdio[3],audio=state.child.stdio[4];video.writableNeedDrain=true;video.writableLength=622080;audio.writableLength=0;relay.tick(state);assert.equal(state.outputFrames,1,'Audio probing must receive another matching packet while video waits');state.nextFrame=0;video.writableLength=622080*2;relay.tick(state);assert.equal(state.outputFrames,1,'Video queue is bounded');video.writableLength=0;audio.writableLength=7680*24;relay.tick(state);assert.equal(state.outputFrames,1,'Audio queue is bounded');audio.writableLength=0;relay.tick(state);assert.equal(state.outputFrames,2);}
 finally{Date.now=original;}
});
