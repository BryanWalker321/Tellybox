import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {RelayManager} from '../lib/relay.mjs';
const ffmpeg=process.env.FFMPEG_PATH||'ffmpeg',probe=process.env.FFPROBE_PATH||'ffprobe';
const available=spawnSync(ffmpeg,['-version'],{stdio:'ignore',windowsHide:true}).status===0;
test('programme, mixed-audio adverts and silent clips retain stereo AAC and advancing timestamps',{skip:!available,timeout:55000},async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'tellybox-audio-'));let relay;
 try{
  for(const [name,rate,channels] of [['main',48000,2],['advert',44100,1],['silent',0,0]]){
   const args=['-v','error','-f','lavfi','-i','testsrc2=size=320x240:rate=25'];
   if(rate)args.push('-f','lavfi','-i',`sine=frequency=440:sample_rate=${rate}`);
   args.push('-t','10','-c:v','libx264','-preset','ultrafast','-pix_fmt','yuv420p');if(rate)args.push('-c:a','aac','-ac',String(channels));args.push(path.join(dir,name+'.mp4'));
   const r=spawnSync(ffmpeg,args,{windowsHide:true});assert.equal(r.status,0,r.stderr.toString());
  }
  relay=new RelayManager({mediaRoot:dir,testCard:path.resolve('public/test-card-f.jpg'),ffmpeg});
  const channel={id:'audio-handoffs',programmes:[{id:'main',title:'Programme',duration:8,url:'/media/main.mp4'},{id:'silent',title:'Silent',duration:8,url:'/media/silent.mp4'},{id:'ad',title:'Advert',duration:8,url:'/media/advert.mp4'}]};
  const epoch=new Date().toISOString(),seen=new Set(),packets=[];const until=Date.now()+31000;
  while(Date.now()<until){
   const list=(await relay.file(channel,epoch,'index.m3u8')).toString();
   for(const file of [...list.matchAll(/segment\d+\.ts/g)].map(m=>m[0])){
    if(seen.has(file))continue;seen.add(file);
    const bytes=await relay.file(channel,epoch,file);
    const r=spawnSync(probe,['-v','error','-show_streams','-show_packets','-of','json','pipe:0'],{input:bytes,windowsHide:true,maxBuffer:4000000});assert.equal(r.status,0,r.stderr.toString());const d=JSON.parse(r.stdout);
    const audio=d.streams.find(s=>s.codec_type==='audio');assert.ok(audio,'every segment carries audio, including silent material');assert.equal(audio.channels,2);assert.equal(audio.sample_rate,'48000');
    const a=d.packets.filter(p=>p.codec_type==='audio').map(p=>Number(p.pts_time));assert.ok(a.length>10);packets.push({file,start:a[0],end:a.at(-1)});
   }
   await new Promise(r=>setTimeout(r,250));
  }
  assert.ok(relay.states.get(channel.id).transitions>=4);assert.ok(packets.length>=10);
  for(let i=1;i<packets.length;i++){assert.ok(packets[i].start>packets[i-1].start,'audio clock advances through handoffs');assert.ok(packets[i].start-packets[i-1].end<2,'no long audio gap at handoff');}
 }finally{await relay?.close();await rm(dir,{recursive:true,force:true});}
});
