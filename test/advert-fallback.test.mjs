import test from 'node:test';import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';import {mkdtemp,rm} from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {ContinuousRelay} from '../lib/continuous-relay.mjs';
const ffmpeg=process.env.FFMPEG_PATH||'ffmpeg',available=spawnSync(ffmpeg,['-version'],{stdio:'ignore',windowsHide:true}).status===0;
test('a failed advert warms a whole replacement without test-card frames or an encoder reset',{skip:!available,timeout:35000},async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'tellybox-ad-backup-'));let relay;
 try{const made=spawnSync(ffmpeg,['-v','error','-f','lavfi','-i','testsrc2=size=320x240:rate=25','-f','lavfi','-i','sine=frequency=440:sample_rate=48000','-t','6','-c:v','libx264','-preset','ultrafast','-c:a','aac',path.join(dir,'good.mp4')],{windowsHide:true});assert.equal(made.status,0,made.stderr?.toString());
 const good={id:'good-ad',title:'Healthy advert',kind:'advert',duration:6,url:'/media/good.mp4'},bad={id:'bad-ad',title:'Failed advert',kind:'advert',duration:4,url:'/media/not-present.mp4'};
 const channel={id:'ad-recovery',programmes:[{id:'programme',title:'Programme',duration:6,url:'/media/good.mp4'}],schedule:{breakSeconds:14,breakEvery:1,transitionReserveSeconds:1,shuffleBreaks:false,breaks:[bad,good]}};
 relay=new ContinuousRelay({mediaRoot:dir,testCard:path.resolve('public/test-card-f.jpg')});const epoch=new Date().toISOString(),until=Date.now()+16500;let replacement=false,pid;
 while(Date.now()<until){await relay.file(channel,epoch,'index.m3u8');const state=relay.states.get(channel.id);pid??=state.child.pid;assert.equal(state.child.pid,pid);assert.equal(state.sourceFrameCounts.holding,0,'A failed advert with a playable alternative must not show a test card');if(state.active?.entry.programme.isReplacementAdvert&&state.active.sentFrames>20)replacement=true;await new Promise(r=>setTimeout(r,50));}
 assert.ok(replacement,'The replacement advert must actually play');assert.equal(relay.states.get(channel.id).encoderStarts,1);
 }finally{await relay?.close();await rm(dir,{recursive:true,force:true});}
});
test('a long failed advert is covered by several short adverts before the next programme',{skip:!available,timeout:35000},async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'tellybox-short-ad-backups-'));let relay;
 try{
  const made=spawnSync(ffmpeg,['-v','error','-f','lavfi','-i','testsrc2=size=320x240:rate=25','-f','lavfi','-i','sine=frequency=440:sample_rate=48000','-t','6','-c:v','libx264','-preset','ultrafast','-c:a','aac',path.join(dir,'good.mp4')],{windowsHide:true});assert.equal(made.status,0,made.stderr?.toString());
  const good={id:'short-ad',title:'Short healthy advert',kind:'advert',duration:2,sourceOffset:0,url:'/media/good.mp4'},bad={id:'long-bad-ad',title:'Unavailable long advert',kind:'advert',duration:10,url:'/media/missing.mp4'};
  const channel={id:'short-backups',programmes:[{id:'one',title:'First programme',duration:5,url:'/media/good.mp4'},{id:'two',title:'Next programme',duration:5,url:'/media/good.mp4'}],schedule:{breakSeconds:13,breakEvery:1,transitionReserveSeconds:1,shuffleBreaks:false,breaks:[bad,good]}};
  relay=new ContinuousRelay({mediaRoot:dir,testCard:path.resolve('public/test-card-f.jpg')});const epoch=new Date().toISOString(),until=Date.now()+22500,replacements=new Set();let nextProgramme=false;
  while(Date.now()<until){await relay.file(channel,epoch,'index.m3u8');const state=relay.states.get(channel.id);assert.equal(state.sourceFrameCounts.holding,0,'Short playable adverts must prevent a test card');assert.equal(state.encoderStarts,1,'Recovery must retain the IPTV encoder');const active=state.active;if(active?.entry.programme.isReplacementAdvert&&active.sentFrames>=20)replacements.add(active.key);if(active?.entry.programme.id==='two'&&active.sentFrames>=25)nextProgramme=true;await new Promise(r=>setTimeout(r,40));}
  assert.ok(replacements.size>=3,`Expected several short adverts, saw ${replacements.size}`);assert.ok(nextProgramme,'Next programme must start without restarting the stream');
 }finally{await relay?.close();await rm(dir,{recursive:true,force:true});}
});
