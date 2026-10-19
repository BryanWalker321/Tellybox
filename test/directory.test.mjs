import test from 'node:test';
import assert from 'node:assert/strict';
import {channelSummary} from '../public/directory.mjs';
test('directory counts only available main programmes and ignores repeated video references',()=>{
 const p={url:'https://example.test/match.mp4',duration:1800};
 const summary=channelSummary({programmes:[p,{...p,title:'Duplicate reference'},{url:'https://example.test/second.mp4',duration:3600},{...p,url:'https://example.test/disabled.mp4',playbackDisabled:true},{...p,url:'https://example.test/advert.mp4',isInterstitial:true}]});
 assert.equal(summary.count,2);assert.equal(summary.hours,1.5);
});
