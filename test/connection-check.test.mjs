import test from 'node:test';
import assert from 'node:assert/strict';
import {checkConnection} from '../public/connection-check.mjs';
const origin='https://tv.example.com';
function responses({identity='station-one',stream=origin+'/iptv/demo/index.m3u8',broken=false}={}){return async url=>{
 if(url.endsWith('/api/connection-identity'))return Response.json({instance:identity});
 if(url.endsWith('/api/catalogue'))return Response.json({brand:{name:'My station'},channels:[]});
 if(url.endsWith('/channels.m3u'))return new Response('#EXTM3U\n'+stream+'\n');
 return new Response(broken?'not XMLTV':'<?xml version="1.0"?><tv></tv>');
};}
test('connection check verifies station identity and reachable public guide/playlist',async()=>{
 const result=await checkConnection({origin,expected:'station-one',fetchImpl:responses()});assert.equal(result.length,4);assert.ok(result.every(r=>r.passed));
});
test('wrong installation, localhost IPTV links and invalid guide fail independently',async()=>{
 const result=await checkConnection({origin,expected:'station-one',fetchImpl:responses({identity:'other-station',stream:'http://127.0.0.1:4173/iptv/demo/index.m3u8',broken:true})});assert.deepEqual(result.map(r=>r.passed),[false,true,false,false]);
});
test('network failures remain failures without claiming reachability',async()=>{
 const result=await checkConnection({origin,fetchImpl:async()=>{throw Error('unreachable');}});assert.ok(result.every(r=>!r.passed));
});
