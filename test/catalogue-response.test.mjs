import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {createCatalogueResponse} from '../lib/catalogue-response.mjs';

test('catalogue responses reuse encoding, revalidate without a body, and immediately reflect new snapshots',async()=>{
 let serialisations=0,config={toJSON(){serialisations++;return {title:'Original',disabled:false};}};
 const handle=createCatalogueResponse({getConfig:async()=>config}),server=createServer((req,res)=>void handle(req,res));
 server.listen(0,'127.0.0.1');await once(server,'listening');const url='http://127.0.0.1:'+server.address().port;
 try{
  await handle.prime();assert.equal(serialisations,1);
  const first=await fetch(url),etag=first.headers.get('etag');assert.equal(first.status,200);assert.deepEqual(await first.json(),{title:'Original',disabled:false});assert.ok(etag);
  const same=await fetch(url,{headers:{'If-None-Match':etag},cache:'no-store'});assert.equal(same.status,304);assert.equal(await same.text(),'');assert.equal(serialisations,1);
  const head=await fetch(url,{method:'HEAD'});assert.equal(await head.text(),'');assert.equal(head.headers.get('etag'),etag);assert.equal(serialisations,1);
  const weak=await fetch(url,{headers:{'If-None-Match':'"unrelated", W/'+etag}});assert.equal(weak.status,304);
  config={toJSON(){serialisations++;return {title:'Updated',disabled:true};}};
  const changed=await fetch(url,{headers:{'If-None-Match':etag}});assert.equal(changed.status,200);assert.notEqual(changed.headers.get('etag'),etag);assert.deepEqual(await changed.json(),{title:'Updated',disabled:true});assert.equal(serialisations,2);
  assert.equal((await fetch(url,{headers:{'If-None-Match':'*'}})).status,304);
  assert.equal((await fetch(url,{method:'POST'})).status,405);
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});
