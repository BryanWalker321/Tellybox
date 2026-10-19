import test from 'node:test';
import assert from 'node:assert/strict';
import {scheduleAt, channelTimeline, listingsWindow} from '../lib/schedule.mjs';
const epoch='2026-01-01T00:00:00Z', start=Date.parse(epoch);
const programme=(id,duration=60)=>({id,title:id,duration,url:'https://example.com/'+id+'.mp4'});
test('disabled uploads are absent from playback, guide and interval pool across cycles',()=>{
  const c={id:'test',programmes:[{...programme('blocked'),playbackDisabled:true},programme('good')],schedule:{alignMinutes:10,breaks:[{...programme('blocked-ad'),playbackDisabled:true},programme('good-ad',30)]}};
  const timeline=channelTimeline(c); assert.equal(timeline[0].id,'good');
  assert.ok(timeline.every(p=>!p.id.startsWith('blocked')));
  const slots=scheduleAt(c,epoch,start,40); assert.ok(slots.every(s=>!s.programme.id.startsWith('blocked')));
  const starts=slots.filter(s=>!s.programme.isInterstitial).map(s=>s.start); assert.deepEqual(starts.slice(0,2),[start,start+600000]);
  assert.ok(listingsWindow(c,epoch,start,start+7200000).every(s=>!s.programme.id.startsWith('blocked')));
});
test('disabled items do not create holes in an unaligned running order',()=>{
  const c={id:'test',programmes:[programme('a'),{...programme('blocked',3600),playbackDisabled:true},programme('b')]};
  const slots=scheduleAt(c,epoch,start+60000,3); assert.equal(slots[0].programme.id,'b');assert.equal(slots[1].programme.id,'a');assert.equal(slots[1].start,start+120000);
});
test('a channel with no usable programmes safely goes off air',()=>{
  const c={id:'test',programmes:[{...programme('blocked'),playbackDisabled:true}]};
  assert.equal(scheduleAt(c,epoch,start)[0].programme.isTestCard,true);
});
