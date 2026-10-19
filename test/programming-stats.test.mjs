import test from 'node:test';
import assert from 'node:assert/strict';
import {programmingStats} from '../lib/programming-stats.mjs';
import {applySourceHealth} from '../lib/source-health.mjs';
const p=(url,duration,extra={})=>({url,duration,...extra});
test('hours count unique playable main footage and merge overlapping excerpts',()=>{
 const config={channels:[{programmes:[p('https://youtube.com/watch?v=abcdefghijk',3600),p('https://youtu.be/abcdefghijk',3600),p('https://example.test/a',1800),p('https://example.test/a',1800,{sourceOffset:900}),p('https://example.test/short',299),p('https://example.test/disabled',7200,{playbackDisabled:true})],schedule:{breaks:[p('https://example.test/ad',3600)]}},{status:'offline',programmes:[p('https://example.test/off',9999)]}]};
 const stats=programmingStats(config);assert.equal(stats.seconds,6300);assert.equal(stats.hours,1);assert.equal(stats.channels,1);assert.equal(stats.uniqueSources,2);
 config.channels[0].programmes.push(p('https://example.test/new',3600));assert.equal(programmingStats(config).seconds,9900);
});
test('confirmed failures reduce hours, newer review passes supersede them, and manual disables stay disabled',()=>{
 const config={channels:[{programmes:[p('https://example.test/a',3600),p('https://example.test/b',3600,{iptvCheck:{result:'passed',checkedAt:'2026-10-17T12:00:00Z'}}),p('https://example.test/c',3600,{playbackDisabled:true})]}]};
 applySourceHealth(config,{results:[{url:'https://example.test/a',result:'failed',failureCount:2,checkedAt:'2026-10-17T11:00:00Z'},{url:'https://example.test/b',result:'failed',failureCount:2,checkedAt:'2026-10-17T11:00:00Z'},{url:'https://example.test/c',result:'passed',checkedAt:'2026-10-17T11:00:00Z'}]});
 assert.equal(programmingStats(config).hours,1);assert.ok(config.channels[0].programmes[2].playbackDisabled);
});
