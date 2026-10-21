import test from 'node:test';
import assert from 'node:assert/strict';
import {viewerCounts} from '../public/channel-viewers.mjs';

test('viewer counts keep each channel separate and retain genuine zero counts',()=>{
  const result=viewerCounts({counts:{one:12,two:0,three:4}});
  assert.equal(result.one,12);assert.equal(result.two,0);assert.equal(result.three,4);
  assert.equal(Object.getPrototypeOf(result),null);
});
test('unavailable or invalid counts are rejected instead of being displayed as zero',()=>{
  for(const data of [null,{}, {counts:[]},{counts:{one:-1}},{counts:{one:'5'}},{counts:{one:NaN}},{counts:{one:1.5}}])assert.throws(()=>viewerCounts(data));
});
