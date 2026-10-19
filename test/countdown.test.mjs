import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {RelayManager,countdownText} from '../lib/relay.mjs';

test('countdown rounds up remaining seconds and never goes negative',()=>{
 assert.equal(countdownText(65500,0),'STARTS IN 01:06');
 assert.equal(countdownText(65500,1500),'STARTS IN 01:04');
 assert.equal(countdownText(3661000,0),'STARTS IN 1:01:01');
 assert.equal(countdownText(1000,2000),'STARTS IN 00:00');
});

test('shared station presentation encodes a live countdown for web and IPTV',{timeout:18000},async t=>{
 const ffmpeg=process.env.FFMPEG_PATH||'ffmpeg';if(spawnSync(ffmpeg,['-version'],{windowsHide:true,stdio:'ignore'}).status!==0){t.skip('FFmpeg unavailable');return;}
 const dir=await mkdtemp(path.join(tmpdir(),'tellybox-countdown-test-'));
 const relay=new RelayManager({mediaRoot:dir,testCard:path.resolve('public/test-card-f.jpg'),ffmpeg});
 const channel={id:'countdown',programmes:[{id:'p',title:'Next programme',duration:1,url:'/media/unused.mp4'}],schedule:{alignMinutes:1,breaks:[]}};
 const epoch=new Date(Date.now()-10000).toISOString();
 try{
  const playlist=(await relay.file(channel,epoch,'index.m3u8')).toString(),state=relay.states.get(channel.id);
  assert.equal(state.playbackKind,'presentation');
  const before=await readFile(state.countdownFile,'utf8');await new Promise(resolve=>setTimeout(resolve,2100));const after=await readFile(state.countdownFile,'utf8');
  assert.match(before,/^STARTS IN \d{2}:\d{2}$/);assert.notEqual(after,before);
  const segment=playlist.match(/segment\d+\.ts/)[0],bytes=await relay.file(channel,epoch,segment);
  const decoded=spawnSync(ffmpeg,['-v','error','-i','pipe:0','-frames:v','1','-f','null','-'],{input:bytes,windowsHide:true,timeout:10000});
  assert.equal(decoded.status,0,decoded.stderr.toString());
 }finally{await relay.close();if(dir.startsWith(path.join(tmpdir(),'tellybox-countdown-test-')))await rm(dir,{recursive:true,force:true});}
});
