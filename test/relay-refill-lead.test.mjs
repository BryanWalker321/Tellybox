import test from 'node:test';
import assert from 'node:assert/strict';
import {ContinuousRelay} from '../lib/continuous-relay.mjs';
const FRAME=720*576*3/2,AUDIO=48000*2*2/25;

test('a lagging video buffer releases ahead-of-video audio before the picture runs dry',()=>{
 let video=0,audio=0;
 const s={video:{length:FRAME*3},audio:{length:AUDIO*110},child:{stdio:[null,null,null,{resume(){video++;}},{resume(){audio++;}}]}};
 ContinuousRelay.prototype.drainSource(s);
 assert.equal(video,1);assert.equal(audio,1,'The decoder needs its audio pipe released while reserve picture frames remain');
 s.video.length=FRAME*101;s.audio.length=AUDIO*5;ContinuousRelay.prototype.drainSource(s);
 assert.equal(video,1,'The maximum video queue still applies');
 s.video.length=FRAME*3;s.audio.length=AUDIO*251;ContinuousRelay.prototype.drainSource(s);
 assert.equal(audio,2,'The maximum audio queue still applies');
});

test('interleaved decoder bursts retain continuous source pictures and audio',()=>{
 const originalNow=Date.now;let now=0,pendingAt=null;
 const picture=Buffer.alloc(FRAME),sound=Buffer.alloc(AUDIO),queue=(length,value)=>({length,take(n){if(this.length<n)return null;this.length-=n;return value;}});
 const encoderPipe=()=>({writableLength:0,write(){}}),entry={start:0,end:3000,programme:{id:'interleaved',title:'Interleaved',duration:3}};
 const source={entry,key:'interleaved:0',ready:true,failed:false,sentFrames:0,video:queue(FRAME*3,picture),audio:queue(AUDIO*110,sound),child:{stdio:[null,null,null,{resume(){}},{resume(){pendingAt??=now+80;}}]}};
 const state={slot:entry,active:source,sources:new Map([[source.key,source]]),nextPrepareCheck:Infinity,nextFrame:0,child:{stdio:[null,null,null,encoderPipe(),encoderPipe()]},sourceFrameCounts:{programme:0},fallbackFrames:0,outputFrames:0};
 const relay=Object.create(ContinuousRelay.prototype);relay.checkSourceProgress=()=>{};
 Date.now=()=>now;
 try{
  for(now=0;now<2000;now+=10){
   if(pendingAt!==null&&now>=pendingAt){source.video.length+=FRAME*12;source.audio.length+=AUDIO*12;pendingAt=null;}
   relay.tick(state);
  }
  assert.equal(state.outputFrames,50);assert.equal(state.fallbackFrames,0,'No frozen picture or silence while the decoder still has playable content');
  assert.equal(source.sentFrames,50);
 }finally{Date.now=originalNow;}
});
