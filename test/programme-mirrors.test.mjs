import test from 'node:test';
import assert from 'node:assert/strict';
import {applyProgrammeMirrors} from '../lib/content-policy.mjs';
test('series mirrors retain review status, avoid duplicates and propagate newer review passes',()=>{
 const p={id:'episode',title:"Alistair McGowan’s Big Impression — episode 1",url:'https://example.test/1',duration:1800,playbackDisabled:true,series:'Big Impression',episodeOrder:1};
 const config={editorial:{programmeMirrors:[{titleIncludes:"Alistair McGowan's Big Impression",channels:['comedy','saturday-night']}]},channels:[{id:'saturday-night',programmes:[]},{id:'comedy',programmes:[p]}]};
 applyProgrammeMirrors(config);assert.equal(config.channels[0].programmes.length,1);assert.equal(config.channels[0].programmes[0].playbackDisabled,true);
 const newer=config.channels[1].programmes[0];delete newer.playbackDisabled;newer.iptvCheck={result:'passed',checkedAt:'2026-10-18T01:00:00Z'};
 applyProgrammeMirrors(config);assert.equal(config.channels[0].programmes.length,1);assert.equal(config.channels[0].programmes[0].playbackDisabled,undefined);assert.equal(config.channels[0].programmes[0].episodeOrder,1);
 assert.equal(p.playbackDisabled,true,'source records are cloned');
});
