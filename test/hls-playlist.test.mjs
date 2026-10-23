import test from 'node:test';import assert from 'node:assert/strict';import {livePlaylist} from '../lib/hls-playlist.mjs';
const raw=(first,segments,{duplicate=false,target=2}={})=>Buffer.from(['#EXTM3U','#EXT-X-VERSION:6',`#EXT-X-TARGETDURATION:${target}`,`#EXT-X-MEDIA-SEQUENCE:${first}`,...(duplicate?['#EXT-X-DISCONTINUITY']:[]),'#EXT-X-INDEPENDENT-SEGMENTS',...segments.flatMap(([id,boundary])=>[...(boundary?['#EXT-X-DISCONTINUITY']:[]),'#EXTINF:2.000000,',`segment${id}.ts`]),''].join('\n'));
const identities=bytes=>{const out=new Map();let count=Number(bytes.toString().match(/#EXT-X-DISCONTINUITY-SEQUENCE:(\d+)/)[1]);for(const line of bytes.toString().split('\n')){if(line==='#EXT-X-DISCONTINUITY')count++;if(/^segment\d+\.ts$/.test(line))out.set(line,count);}return out;};
test('IPTV discontinuity identities survive sliding windows and several encoder restarts',()=>{
 const state={hlsBoundaries:new Set([100])};const seen=new Map();
 const check=(first,segments,options)=>{const output=livePlaylist(state,raw(first,segments,options));for(const [key,value] of identities(output)){if(seen.has(key))assert.equal(value,seen.get(key),'retained segments cannot change timeline');seen.set(key,value);}return output.toString();};
 assert.equal((check(100,[[100,true],[101,false]],{duplicate:true}).match(/#EXT-X-DISCONTINUITY\n/g)||[]).length,1);
 state.hlsBoundaries.add(102);check(100,[[100,true],[101,false],[102,true],[103,false]]);
 assert.match(check(101,[[101,false],[102,true],[103,false]]),/#EXT-X-DISCONTINUITY-SEQUENCE:1/);
 state.hlsBoundaries.add(104);check(102,[[102,true],[103,false],[104,true],[105,false]]);
 assert.match(check(103,[[103,false],[104,true],[105,false]],{target:1}),/#EXT-X-TARGETDURATION:2/);
 assert.match(check(105,[[105,false]]),/#EXT-X-DISCONTINUITY-SEQUENCE:3/);
 const latest=state.servedPlaylist;assert.equal(livePlaylist(state,raw(100,[[100,true]])),latest,'concurrent stale reads must not rewind a live playlist');assert.equal(state.hlsBoundaries.size,0);
});
test('malformed live sequence is rejected rather than emitting misleading timing',()=>{assert.throws(()=>livePlaylist({},Buffer.from('#EXTM3U\n#EXTINF:2,\nsegment0.ts')),/sequence/);});
