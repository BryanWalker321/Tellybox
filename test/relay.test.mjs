import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { once } from 'node:events';
import { RelayManager } from '../lib/relay.mjs';
import { checkProviderPlayback } from '../lib/provider-check.mjs';
const ffmpeg = process.env.FFMPEG_PATH || 'ffmpeg';
const available = spawnSync(ffmpeg, ['-version'], { windowsHide: true, stdio: 'ignore' }).status === 0;

test('a failed holding card never logs signed provider addresses from the preceding failed source', {skip:!available,timeout:25000}, async()=>{
 const relay=new RelayManager({mediaRoot:tmpdir(),testCard:path.join(tmpdir(),'missing-tellybox-card-fixture.jpg'),ffmpeg,
  resolver:{resolve:async()=>({streams:[{url:'http://127.0.0.1:1/video?token=fictional-sensitive-query',video:true,audio:false}]})}});
 const messages=[], previous=console.error;console.error=(...args)=>messages.push(args.join(' '));
 try{
  await assert.rejects(relay.file({id:'failed-card',programmes:[{id:'fixture',title:'Fixture',duration:60,url:'https://www.youtube.com/watch?v=y9CsvDblsr0'}]},new Date().toISOString(),'index.m3u8'),/holding-screen configuration/);
  assert.ok(messages.length);
  assert.ok(!messages.join(' ').includes('fictional-sensitive-query'));
  assert.ok(!messages.join(' ').includes('127.0.0.1:1'));
 }finally{console.error=previous;await relay.close();}
});
test('FFmpeg relays local video, off-air cards and failed-source cards into playable HLS', { skip: !available, timeout: 50000 }, async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'tellybox-test-'));
  const file = path.join(dir, 'sample.mp4');
  const generated = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'testsrc2=size=320x240:rate=25', '-t', '20', '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p', file], { windowsHide: true });
  assert.equal(generated.status, 0, generated.stderr.toString());
  const relay = new RelayManager({ mediaRoot: dir, testCard: path.resolve('public/test-card-f.jpg'), ffmpeg });
  await copyFile('public/test-card-f.jpg', path.join(dir, 'custom-holding.jpg'));
  const epoch = new Date(Date.now() - 1000).toISOString();
  const base = { number: 1, colour: '#123456', name: 'Test' };
  const channels = [{ ...base, id: 'local', programmes: [{ id: 'sample', title: 'Sample', duration: 20, url: '/media/sample.mp4' }] }, { ...base, id: 'offline', status: 'offline', programmes: [] }, { ...base, id: 'broken', programmes: [{ id: 'missing', title: 'Missing', duration: 60, url: '/media/missing.mp4' }] }, { ...base, id: 'interval', schedule: { alignMinutes: 10, breaks: [] }, programmes: [{ id: 'short', title: 'Short', duration: 0.1, url: '/media/sample.mp4' }] }];
  try {
    const lists = await Promise.all(channels.map(c => relay.file(c, epoch, 'index.m3u8', c.id === 'offline' ? '/media/custom-holding.jpg' : undefined)));
    assert.equal(relay.states.get('offline').holdingImage, '/media/custom-holding.jpg');
    for (let i = 0; i < channels.length; i++) {
      const text = lists[i].toString(); assert.ok(text.includes('#EXTINF:')); assert.ok(text.includes('#EXT-X-PROGRAM-DATE-TIME'));
      const segment = text.match(/segment\d+\.ts/)[0];
      const bytes = await relay.file(channels[i], epoch, segment, channels[i].id === 'offline' ? '/media/custom-holding.jpg' : undefined); assert.ok(bytes.length > 1000); assert.equal(bytes[0], 0x47);
      // Decode a full segment rather than merely checking its file extension.
      const decoded = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-i', 'pipe:0', '-frames:v', '1', '-f', 'null', '-'], { input: bytes, windowsHide: true });
      assert.equal(decoded.status, 0, decoded.stderr.toString());
    }
    relay.resolver = {resolve:async()=>({streams:[{url:file,video:true,audio:false}]})};
    assert.equal((await checkProviderPlayback(relay,'https://www.youtube.com/watch?v=y9CsvDblsr0',ffmpeg)).result,'passed');
    assert.ok([...relay.states.keys()].every(id=>!id.startsWith('owner-check-')), 'sample relays are removed after verification');
    relay.resolver = {resolve:async()=>({streams:[{url:path.join(dir,'missing.mp4'),video:true,audio:false}]})};
    await assert.rejects(checkProviderPlayback(relay,'https://www.youtube.com/watch?v=y9CsvDblsr0',ffmpeg),/footage/,'a technical card must never count as programme playback');
  } finally { await relay.close(); if (dir.startsWith(path.join(tmpdir(), 'tellybox-test-'))) await rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 250 }); }
});

test('a late IPTV join plays an interval from its beginning to EOF, beyond its nominal slot', {skip: !available, timeout: 25000}, async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'tellybox-test-'));
  const generated = spawnSync(ffmpeg, ['-hide_banner','-loglevel','error','-f','lavfi','-i','testsrc2=size=320x240:rate=25','-t','8','-c:v','libx264','-preset','ultrafast',path.join(dir, 'ad.mp4')], {windowsHide:true});
  assert.equal(generated.status, 0, generated.stderr.toString());
  const relay = new RelayManager({mediaRoot:dir, testCard:path.resolve('public/test-card-f.jpg'), ffmpeg});
  const channel = {id:'whole-ad', programmes:[{id:'p',title:'Programme',duration:.1,url:'/media/ad.mp4'}], schedule:{alignMinutes:1, breaks:[{id:'ad',title:'Advert',duration:8,url:'/media/ad.mp4'}]}};
  try {
    const state = await relay.ensure(channel, new Date(Date.now()-4000).toISOString());
    const child = state.child, started = Date.now();
    assert.ok(child);
    assert.equal(child.spawnargs[child.spawnargs.indexOf('-ss')+1], '0');
    assert.ok(!child.spawnargs.includes('-t'), 'whole-file intervals must end at EOF, never at the wall-clock remainder');
    assert.equal((await once(child, 'close'))[0], 0, state.diagnostic);
    assert.ok(Date.now()-started >= 7000, 'the late join must not cut an eight-second clip to its four-second nominal remainder');
  } finally {
    await relay.close();
    if (dir.startsWith(path.join(tmpdir(), 'tellybox-test-'))) await rm(dir, {recursive:true,force:true,maxRetries:10,retryDelay:250});
  }
});
