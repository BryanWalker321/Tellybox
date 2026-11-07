import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {once} from 'node:events';
import {createTeletextHandler} from '../lib/teletext-export.mjs';
test('public receiver endpoints share one bounded snapshot and support HEAD, revisions and CORS',async()=>{
 let calls=0,stamp=Date.parse('2026-11-07T12:00:00Z');const handler=createTeletextHandler({getConfig:async()=>({brand:{name:'Example'},channels:[],epoch:'2026-01-01'}),getFeeds:async()=>{calls++;return {feeds:{}};},clock:()=>stamp});
 const server=http.createServer(async(req,res)=>{if(!await handler(req,res,new URL(req.url,'http://localhost'))){res.writeHead(404);res.end();}});server.listen(0,'127.0.0.1');await once(server,'listening');const base='http://127.0.0.1:'+server.address().port;
 try{const manifest=await (await fetch(base+'/teletext/manifest.json')).json();assert.equal(manifest.format,'tellytext-tti-v1');const page=await fetch(base+'/teletext/pages/401.tti');assert.equal(page.headers.get('access-control-allow-origin'),'*');assert.match(await page.text(),/PN,40100/);assert.equal(calls,1);
 const json=await (await fetch(base+'/api/teletext?page=414')).json();assert.equal(json.pages.length,1);assert.equal(json.pages[0].subpages[0].links[0].page,'401');assert.equal((await fetch(base+'/api/teletext?page=999')).status,404);assert.equal((await fetch(base+'/teletext/pages/999.tti')).status,404);assert.equal((await fetch(base+'/teletext/pages/101.tti?revision=old')).status,409);
 const head=await fetch(base+'/teletext/service.tar',{method:'HEAD'});assert.ok(Number(head.headers.get('content-length'))>1024);assert.equal(await head.text(),'');assert.equal((await fetch(base+'/teletext/manifest.json',{headers:{'If-None-Match':'"'+manifest.revision+'"'}})).status,304);stamp+=61000;await fetch(base+'/teletext/manifest.json');assert.equal(calls,2);
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});
