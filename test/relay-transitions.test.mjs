import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {RelayManager} from '../lib/relay.mjs';
const ffmpeg=process.env.FFMPEG_PATH||'ffmpeg';
const available=spawnSync(ffmpeg,['-version'],{windowsHide:true,stdio:'ignore'}).status===0;
const pause=ms=>new Promise(r=>setTimeout(r,ms));

test('timed breaks relay a complete advert, presentation and the following programme without ending HLS',{skip:!available,timeout:35000},async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'tellybox-timed-test-'));
 try{
  for(const [name,duration] of [['programme',12],['advert',3]]){const made=spawnSync(ffmpeg,['-v','error','-f','lavfi','-i','testsrc2=size=320x240:rate=25','-t',String(duration),'-c:v','libx264','-preset','ultrafast','-pix_fmt','yuv420p',path.join(dir,name+'.mp4')],{windowsHide:true});assert.equal(made.status,0,made.stderr.toString());}
  const relay=new RelayManager({mediaRoot:dir,testCard:path.resolve('public/test-card-f.jpg'),ffmpeg});
  const channel={id:'timed',programmes:[{id:'one',title:'One',duration:8,url:'/media/programme.mp4'},{id:'two',title:'Two',duration:8,url:'/media/programme.mp4'}],schedule:{breakSeconds:8,breakEvery:2,maxClips:1,transitionReserveSeconds:0,breaks:[{id:'advert',title:'Whole advert',duration:3,url:'/media/advert.mp4'}]}};
  const epoch=new Date(Date.now()-12000).toISOString(),seen=new Set();let decoded=false;
  try{const until=Date.now()+18000;while(Date.now()<until){const playlist=(await relay.file(channel,epoch,'index.m3u8')).toString();assert.ok(!playlist.includes('#EXT-X-ENDLIST'));const state=relay.states.get(channel.id);assert.notEqual(state.playbackKind,'holding');seen.add(state.playbackKind);if(state.currentEntry.id.startsWith('advert-break-'))seen.add('interval');if(state.currentEntry.id==='one')seen.add('following-programme');if(!decoded){const segment=playlist.match(/segment\d+\.ts/)[0],bytes=await relay.file(channel,epoch,segment);assert.equal(spawnSync(ffmpeg,['-v','error','-i','pipe:0','-frames:v','1','-f','null','-'],{input:bytes,windowsHide:true}).status,0);decoded=true;}await pause(150);}assert.ok(seen.has('interval'));assert.ok(seen.has('presentation'));assert.ok(seen.has('following-programme'));assert.equal(relay.states.get(channel.id).sourceFailures??0,0);}finally{await relay.close();}
 }finally{await rm(dir,{recursive:true,force:true,maxRetries:10,retryDelay:250});}
});

test('a transient provider failure recovers inside the current programme instead of holding its entire slot',{skip:!available,timeout:20000},async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'tellybox-transition-test-'));
 const file=path.join(dir,'recovered.mp4');
 const generated=spawnSync(ffmpeg,['-v','error','-f','lavfi','-i','testsrc2=size=320x240:rate=25','-t','12','-c:v','libx264','-preset','ultrafast','-pix_fmt','yuv420p',file],{windowsHide:true});
 assert.equal(generated.status,0,generated.stderr.toString());
 let attempts=0;
 const resolver={resolve:async()=>{attempts++;if(attempts===1)throw Object.assign(Error('Temporary provider failure'),{code:'temporary'});return{duration:12,streams:[{url:file,video:true,audio:false}]};}};
 const relay=new RelayManager({mediaRoot:dir,testCard:path.resolve('public/test-card-f.jpg'),ffmpeg,resolver,sourceRetryMs:2500});
 const channel={id:'recovery',programmes:[{id:'p',title:'Recoverable programme',duration:30,url:'https://www.youtube.com/watch?v=abcdefghijk'}]};
 const epoch=new Date().toISOString();
 try{
  const state=await relay.ensure(channel,epoch);
  assert.equal(state.playbackKind,'holding');
  const until=Date.now()+10000;
  while(state.transitions<2&&Date.now()<until)await pause(150);
  assert.equal(state.playbackKind,'programme');
  assert.ok(attempts>=2,'resolve a fresh source after the failed attempt (including any warm-up)');
  assert.equal(state.currentEntry.id,'p');
  assert.equal(state.sourceFailures,1);
  assert.ok((await relay.file(channel,epoch,'index.m3u8')).toString().includes('#EXTINF:'));
 }finally{await relay.close();if(dir.startsWith(path.join(tmpdir(),'tellybox-transition-test-')))await rm(dir,{recursive:true,force:true,maxRetries:10,retryDelay:250});}
});

test('a live HLS channel keeps consecutive segments and a real client playing across multiple programme boundaries',{skip:!available,timeout:45000},async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'tellybox-transition-test-'));
 const generated=spawnSync(ffmpeg,['-v','error','-f','lavfi','-i','testsrc2=size=320x240:rate=25','-f','lavfi','-i','sine=frequency=440:sample_rate=48000','-t','12','-c:v','libx264','-preset','ultrafast','-pix_fmt','yuv420p','-c:a','aac',path.join(dir,'programme.mp4')],{windowsHide:true});
 assert.equal(generated.status,0,generated.stderr.toString());
 const relay=new RelayManager({mediaRoot:dir,testCard:path.resolve('public/test-card-f.jpg'),ffmpeg});
 const channel={id:'continuous-channel',programmes:[{id:'one',title:'One',duration:8,url:'/media/programme.mp4'},{id:'two',title:'Two',duration:8,url:'/media/programme.mp4'}]};
 const epoch=new Date(Date.now()-1000).toISOString(),numbers=new Set();let revisions=0,last='';
 const server=createServer(async(req,res)=>{
  const filename=req.url.slice(1);
  if(!/^(index\.m3u8|segment\d+\.ts)$/.test(filename)){res.writeHead(404);res.end();return;}
  try{const bytes=await relay.file(channel,epoch,filename);res.writeHead(200,{'Content-Type':filename.endsWith('m3u8')?'application/vnd.apple.mpegurl':'video/mp2t','Cache-Control':'no-store'});res.end(bytes);}
  catch{res.writeHead(503);res.end();}
 });
 let reader;
 try{
  server.listen(0,'127.0.0.1');await once(server,'listening');
  reader=spawn(ffmpeg,['-v','error','-rw_timeout','10000000','-i',`http://127.0.0.1:${server.address().port}/index.m3u8`,'-t','17','-progress','pipe:1','-f','null','-'],{windowsHide:true,stdio:['ignore','pipe','pipe']});
  let progress='',diagnostic='';reader.stdout.on('data',d=>progress+=d);reader.stderr.on('data',d=>diagnostic+=d);
  const clientResult=once(reader,'close');
  const until=Date.now()+23000;
  while(Date.now()<until){
   const playlist=(await relay.file(channel,epoch,'index.m3u8')).toString();
   assert.ok(!playlist.includes('#EXT-X-ENDLIST'));
   if(playlist!==last){revisions++;last=playlist;}
   for(const match of playlist.matchAll(/segment(\d+)\.ts/g))numbers.add(Number(match[1]));
   await pause(300);
  }
  const ordered=[...numbers].sort((a,b)=>a-b);
  assert.ok(revisions>=4&&ordered.length>=7,'observe real segments through more than one programme handoff');
  for(let i=1;i<ordered.length;i++)assert.equal(ordered[i],ordered[i-1]+1,'segment numbering must not jump when FFmpeg switches programmes');
  const timeout=setTimeout(()=>reader.kill(),10000);
  const [code]=await clientResult;clearTimeout(timeout);
  assert.equal(code,0,diagnostic);
  assert.ok([...progress.matchAll(/out_time_us=(\d+)/g)].some(m=>Number(m[1])>=16000000),'decode at least sixteen seconds through programme handoffs');
 }finally{reader?.kill();server.closeAllConnections();await new Promise(r=>server.close(r));await relay.close();if(dir.startsWith(path.join(tmpdir(),'tellybox-transition-test-')))await rm(dir,{recursive:true,force:true,maxRetries:10,retryDelay:250});}
});

test('IPTV advert handoffs never restart a finished scheduled slot or replace working adverts with a test card',{skip:!available,timeout:35000},async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'tellybox-transition-test-'));
 const file=path.join(dir,'advert.mp4');
 const generated=spawnSync(ffmpeg,['-v','error','-f','lavfi','-i','testsrc2=size=320x240:rate=25','-t','3','-c:v','libx264','-preset','ultrafast','-pix_fmt','yuv420p',file],{windowsHide:true});
 assert.equal(generated.status,0,generated.stderr.toString());
 const relay=new RelayManager({mediaRoot:dir,testCard:path.resolve('public/test-card-f.jpg'),ffmpeg});
 const channel={id:'adverts',programmes:[{id:'p',title:'Programme',duration:8,url:'/media/advert.mp4'}],schedule:{alignMinutes:1,breaks:[{id:'a',title:'Advert A',duration:3.5,url:'/media/advert.mp4'},{id:'b',title:'Advert B',duration:3.5,url:'/media/advert.mp4'}]}};
 const epoch=new Date(Date.now()-9500).toISOString(),seen=new Set();let transitions=0;
 try{
  const until=Date.now()+18000;
  while(Date.now()<until){
   await relay.file(channel,epoch,'index.m3u8');
   const state=relay.states.get(channel.id);
   if(state.transitions!==transitions){
    transitions=state.transitions;assert.notEqual(state.playbackKind,'holding');
    if(/^[ab]-break-/.test(state.currentEntry.id)){
     assert.ok(!seen.has(state.currentEntry.id),'a completed ad slot must not be selected again before its clock boundary');seen.add(state.currentEntry.id);
    }
   }
   await pause(150);
  }
  assert.ok(seen.size>=3,'observe several complete adverts');
 }finally{await relay.close();if(dir.startsWith(path.join(tmpdir(),'tellybox-transition-test-')))await rm(dir,{recursive:true,force:true,maxRetries:10,retryDelay:250});}
});
