import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {RelayManager} from '../lib/relay.mjs';
import {validateCatalogue} from '../lib/schedule.mjs';
const ffmpeg=process.env.FFMPEG_PATH||'ffmpeg';
const available=spawnSync(ffmpeg,['-version'],{stdio:'ignore',windowsHide:true}).status===0;
const crop={width:320,height:240,x:54,y:0};
const programme={id:'p',title:'Bordered footage',duration:300,url:'/media/barred.mp4',videoCrop:crop};
const channel={id:'crop',number:1,name:'Crop',colour:'#ffffff',programmes:[programme]};
test('reviewed video crops reject malformed or injectable coordinates',()=>{
 const config={brand:{name:'Test'},epoch:'2026-01-01T00:00:00Z',channels:[channel]};
 assert.doesNotThrow(()=>validateCatalogue(structuredClone(config)));
 for(const value of [null,[],{...crop,width:0},{...crop,x:-2},{...crop,height:241},{...crop,x:'0,evil'},{...crop,width:20000}]){
  const copy=structuredClone(config);copy.channels[0].programmes[0].videoCrop=value;
  assert.throws(()=>validateCatalogue(copy),/Video crop/);
 }
});
test('reviewed source borders are removed in playable HLS without changing the source or 4:3 geometry',{skip:!available,timeout:20000},async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'tellybox-crop-'));
 const run=args=>spawnSync(ffmpeg,['-v','error',...args],{windowsHide:true});
 const made=run(['-f','lavfi','-i','color=red:s=320x240:r=25','-vf','pad=428:240:54:0:black','-t','10','-c:v','libx264','-preset','ultrafast',path.join(dir,'barred.mp4')]);assert.equal(made.status,0,made.stderr.toString());
 const relay=new RelayManager({mediaRoot:dir,testCard:path.resolve('public/test-card-f.jpg'),ffmpeg});
 try{
  const epoch=new Date().toISOString();const list=(await relay.file(channel,epoch,'index.m3u8')).toString();
  const segment=await relay.file(channel,epoch,list.match(/segment\d+\.ts/)[0]);
  const decoded=spawnSync(ffmpeg,['-v','error','-i','pipe:0','-frames:v','1','-pix_fmt','rgb24','-f','rawvideo','pipe:1'],{input:segment,maxBuffer:2e6,windowsHide:true});
  assert.equal(decoded.status,0,decoded.stderr.toString());assert.equal(decoded.stdout.length,720*576*3);
  for(const [x,y] of [[10,10],[710,10],[10,566],[710,566],[360,288]]){const at=(y*720+x)*3;assert.ok(decoded.stdout[at]>200&&decoded.stdout[at+1]<40,'Picture should fill the decoded raster, including its corners');}
 }finally{await relay.close();await rm(dir,{recursive:true,force:true});}
});
