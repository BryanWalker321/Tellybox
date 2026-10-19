import test from 'node:test';
import assert from 'node:assert/strict';
import {validateCatalogue,channelTimeline,listingsWindow} from '../lib/schedule.mjs';
const epoch='2026-01-01T00:00:00Z';
const clip=(id,duration,extra={})=>({id,title:id,duration,url:'https://example.test/'+id+'.mp4',...extra});
const channel=(id,programmes)=>({id,name:id,number:id==='little-box'?2:1,colour:'#123456',programmes,schedule:{alignMinutes:10,breaks:[]}});
const pack=channels=>({brand:{name:'Test'},epoch,editorial:{minimumProgrammeSeconds:300},channels});
test('short clips leave main guides and become whole interval clips; exactly five minutes stays a programme',()=>{
 const config=validateCatalogue(pack([channel('after-hours',[clip('Scousers',180),clip('exactly-five-minutes',300),clip('pending',20,{playbackDisabled:true})])]));
 const c=config.channels[0];assert.deepEqual(c.programmes.map(p=>p.id),['exactly-five-minutes']);
 assert.deepEqual(c.schedule.breaks.map(p=>p.id),['Scousers','pending']);
 assert.ok(c.schedule.breaks.find(p=>p.id==='pending').playbackDisabled);
 const timeline=channelTimeline(c);assert.ok(timeline.some(p=>p.id.startsWith('Scousers-')&&p.duration===180&&p.isInterstitial));assert.ok(!timeline.some(p=>p.id.startsWith('pending')));
 assert.ok(listingsWindow(c,epoch,Date.parse(epoch),Date.parse(epoch)+3600000).every(s=>s.programme.id==='exactly-five-minutes'));
 const saved=JSON.stringify(config);validateCatalogue(config);assert.equal(JSON.stringify(config),saved,'normalisation must be idempotent');
});
test('Little Box short clips are retained in the library without inserting filler or clock gaps',()=>{
 const config=validateCatalogue(pack([channel('after-hours',[clip('adult',600)]),channel('little-box',[clip('short-cartoon',299.99),clip('episode',600)])]));
 const kids=config.channels[1];assert.equal(kids.schedule,undefined);assert.deepEqual(kids.programmes.map(p=>p.id),['episode']);
 assert.ok(config.intervalLibrary.some(p=>p.id==='short-cartoon'&&p.originChannels.includes('little-box')));
 assert.ok(!config.channels[0].schedule.breaks.some(p=>p.id==='short-cartoon'));
 assert.ok(channelTimeline(kids).every(p=>!p.isInterstitial&&!p.isPresentation));
});
test('owner/imported short clips are classified on every catalogue validation and unsafe library URLs are rejected',()=>{
 const config=pack([channel('after-hours',[clip('long',600)])]);validateCatalogue(config);
 config.channels[0].programmes.push(clip('new-short',1));validateCatalogue(config);assert.equal(config.channels[0].programmes.length,1);
 config.intervalLibrary.push(clip('unsafe',5,{url:'file:///private'}));assert.throws(()=>validateCatalogue(config),/Invalid media URL/);
});

test('programmes-only wrestling channel removes inserted breaks and has no clock gaps',()=>{
 const wrestling=channel('union-jacked',[clip('short',180),clip('match-one',601),clip('match-two',737)]);
 wrestling.playout={programmesOnly:true};
 const config=validateCatalogue(pack([wrestling]));
 assert.equal(wrestling.schedule,undefined);
 assert.deepEqual(wrestling.programmes.map(p=>p.id),['match-one','match-two']);
 assert.ok(config.intervalLibrary.some(p=>p.id==='short'));
 const timeline=channelTimeline(wrestling);
 assert.ok(timeline.every(p=>!p.isInterstitial&&!p.isPresentation));
});
