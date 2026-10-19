import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, writeFile, readFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {once} from 'node:events';
import {normaliseYoutubeCookies, YoutubeAuth} from '../lib/youtube-auth.mjs';
import {Owner} from '../lib/owner.mjs';

const example = (domain = '.youtube.com', expiry = Math.floor(Date.now()/1000)+3600) => `# Netscape HTTP Cookie File\n# A comment is not retained\n${domain}\tTRUE\t/\tTRUE\t${expiry}\tSID\tfictional-test-session\n`;
test('YouTube session imports reject unrelated websites, stale sessions and malformed files', () => {
  assert.ok(normaliseYoutubeCookies(example()).expiresAt);
  assert.ok(!normaliseYoutubeCookies(example()).text.includes('A comment'));
  assert.ok(normaliseYoutubeCookies(example('#HttpOnly_.youtube.com')).text.includes('#HttpOnly_'));
  assert.throws(() => normaliseYoutubeCookies(example('.example.com')), /other websites/);
  assert.throws(() => normaliseYoutubeCookies(example('.youtube.com.evil.test')), /other websites/);
  assert.throws(() => normaliseYoutubeCookies(example('.youtube.com', 1)), /No current/);
  assert.throws(() => normaliseYoutubeCookies('{}'), /Netscape/);
  assert.throws(() => normaliseYoutubeCookies('x'.repeat(262145)), /256 KB/);
  assert.throws(() => normaliseYoutubeCookies(example().replace('SID','PREF')), /No current/);
});

test('private YouTube authentication requires owner consent and survives restart without leaking cookies', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'tellybox-owner-test-'));
  const configPath = path.join(directory,'catalogue.json');
  await writeFile(configPath, JSON.stringify({brand:{name:'Test'},epoch:'2026-01-01T00:00:00Z',channels:[]}));
  let runtime, checks=0;
  const options = {directory,configPath,mediaRoot:path.join(directory,'media'),env:{},onSettings: env => runtime=env,checkYoutube:async()=>{checks++;return {result:'passed',reason:'Test double, not a real provider request.'};}};
  const owner = await Owner.create(options);
  const server = http.createServer((req,res)=>owner.handle(req,res,new URL(req.url,'http://localhost')));
  server.listen(0,'127.0.0.1'); await once(server,'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  let cookie='',csrf='';
  const call=(route,method='GET',body,extra={})=>fetch(base+'/api/owner/'+route,{method,headers:{Origin:base,Cookie:cookie,'X-CSRF-Token':csrf,'Content-Type':'application/json',...extra},...(body===undefined?{}:{body:JSON.stringify(body)})});
  try {
    assert.equal((await call('youtube-auth')).status,401);
    assert.equal((await call('youtube-auth','PUT',{cookies:example()})).status,401);
    const login=await call('login','POST',{setupKey:owner.bootstrap,password:'test-only-owner-password'});
    cookie=login.headers.get('set-cookie').split(';')[0];csrf=(await login.json()).csrf;
    assert.equal((await call('youtube-auth','PUT',{cookies:example()},{'X-CSRF-Token':''})).status,403);
    assert.equal((await call('youtube-auth','PUT',{cookies:example()},{Origin:'http://elsewhere.example'})).status,403);
    assert.equal((await call('youtube-auth','PUT',{cookies:example()},{Host:`192.168.0.50:${server.address().port}`,Origin:`http://192.168.0.50:${server.address().port}`})).status,403);
    assert.equal((await call('youtube-auth','PUT',{cookies:example('.example.com')})).status,400);
    const saved=await call('youtube-auth','PUT',{cookies:example()});assert.equal(saved.status,200);
    assert.ok(!JSON.stringify(await saved.json()).includes('fictional-test-session'));
    assert.equal(runtime.YOUTUBE_COOKIE_FILE,path.join(directory,'youtube-cookies.txt'));
    assert.ok((await readFile(runtime.YOUTUBE_COOKIE_FILE,'utf8')).includes('fictional-test-session'));
    assert.ok(!(await (await call('settings')).text()).includes('fictional-test-session'));
    assert.ok(!(await readFile(owner.file,'utf8')).includes('fictional-test-session'));
    const restored = await Owner.create(options);
    assert.equal(restored.youtubeConfigured,true);
    assert.equal((await call('youtube-check','POST',{url:'http://127.0.0.1/private'})).status,400);
    assert.equal((await call('youtube-check','POST',{url:'https://youtube.com.evil.test/watch?v=y9CsvDblsr0'})).status,400);
    const checked=await call('youtube-check','POST',{url:'https://www.youtube.com/watch?v=y9CsvDblsr0'});
    assert.equal((await checked.json()).result,'passed');assert.equal(checks,1);
    assert.equal((await call('youtube-check','POST',{url:'https://www.youtube.com/watch?v=y9CsvDblsr0'})).status,429);
    assert.equal((await call('youtube-auth','DELETE')).status,200);
    assert.equal(runtime.YOUTUBE_COOKIE_FILE,'');
    assert.equal((await (await call('youtube-auth')).json()).configured,false);
    await assert.rejects(readFile(path.join(directory,'youtube-cookies.txt')),/ENOENT/);
    const noSession=await Owner.create(options);assert.equal(noSession.youtubeConfigured,false);
  } finally {server.close();server.closeAllConnections();await once(server,'close');if(directory.startsWith(path.join(tmpdir(),'tellybox-owner-test-')))await rm(directory,{recursive:true,force:true});}
});

test('an expired on-disk session is reported without exposing its contents', async () => {
  const directory = await mkdtemp(path.join(tmpdir(),'tellybox-owner-test-'));
  try {
    const auth = new YoutubeAuth(directory);
    await writeFile(auth.file,example('.youtube.com',1));
    assert.deepEqual(await auth.status(),{configured:true,expired:true});
  } finally {if(directory.startsWith(path.join(tmpdir(),'tellybox-owner-test-')))await rm(directory,{recursive:true,force:true});}
});
