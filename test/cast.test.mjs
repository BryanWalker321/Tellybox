import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {castSettings,viewingSettings} from '../lib/cast.mjs';
import {Owner} from '../lib/owner.mjs';
import {castCommand,adjacentChannel,liveCastMedia} from '../public/cast-shared.mjs';
const channels=[{id:'one',number:1,name:'One'},{id:'two',number:2,name:'Two'}];
test('AirPlay and mirroring help can be disabled independently from Google Cast',()=>{
 assert.deepEqual(viewingSettings({}),{airplay:true,mirroring:true,broadcast:true});
 assert.deepEqual(viewingSettings({AIRPLAY_ENABLED:'0',MIRRORING_HELP_ENABLED:'0',CAST_ENABLED:'1',IPTV_ENABLED:'0'}),{airplay:false,mirroring:false,broadcast:false});
});
test('casting is opt-in, needs a valid app ID and honours disabled broadcast',()=>{
 assert.equal(castSettings({}).ready,false);assert.equal(castSettings({CAST_APP_ID:'AABB1122'}).ready,false);
 assert.equal(castSettings({CAST_ENABLED:'1',CAST_APP_ID:'bad'}).ready,false);
 assert.equal(castSettings({CAST_ENABLED:'1',CAST_APP_ID:'AABB1122',IPTV_ENABLED:'0'}).ready,false);
 assert.equal(castSettings({CAST_ENABLED:'1',CAST_APP_ID:'aabb1122'}).appId,'AABB1122');
 assert.deepEqual(Object.keys(castSettings({CAST_ENABLED:'0',CAST_APP_ID:'AABB1122',DISCORD_CLIENT_SECRET:'secret'})),['enabled','ready','appId','receiverPath']);
 assert.equal(castSettings({CAST_ENABLED:'0',CAST_APP_ID:'AABB1122'}).appId,'');
});
test('TV commands cannot select arbitrary URLs or unknown channels; channel wrap follows station order',()=>{
 assert.equal(castCommand({type:'channel',channel:'https://elsewhere'},channels),null);
 assert.equal(castCommand({type:'admin'},channels),null);
 assert.equal(castCommand({type:'fit',mode:'bad'},channels),null);
 assert.equal(adjacentChannel(channels,'one',-1).id,'two');assert.equal(adjacentChannel(channels,'two',1).id,'one');
 assert.deepEqual(castCommand({type:'channel',channel:'two',url:'https://elsewhere'},channels),{type:'channel',channel:'two'});
 const media=liveCastMedia(channels[0],{name:'Test station'},'https://station.example');
 assert.equal(media.contentId,'https://station.example/iptv/one/index.m3u8');assert.equal(media.streamType,'LIVE');assert.equal(media.customData.station,'https://station.example');
 assert.throws(()=>liveCastMedia({id:'../escape'}, {},'https://station.example'));
});
test('Cast setting validation persists separately from programme catalogue',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'tellybox-cast-'));const configPath=path.join(directory,'catalogue.json');const original='{"channels":[{"programmes":[{"title":"Keep me"}]}]}';
 try{await writeFile(configPath,original);const owner=await Owner.create({directory,configPath,mediaRoot:directory,env:{}});
 assert.throws(()=>owner.validate({CAST_ENABLED:'yes'}));assert.throws(()=>owner.validate({CAST_APP_ID:'<script>'}));
 owner.validate({CAST_ENABLED:'1',CAST_APP_ID:'ABCD1234'});owner.state.settings={CAST_ENABLED:'1',CAST_APP_ID:'ABCD1234'};await writeFile(owner.file,JSON.stringify(owner.state));
 const reloaded=await Owner.create({directory,configPath,mediaRoot:directory,env:{}});assert.equal(castSettings(reloaded.runtime).ready,true);assert.equal(await readFile(configPath,'utf8'),original);
 }finally{await rm(directory,{recursive:true,force:true});}
});
