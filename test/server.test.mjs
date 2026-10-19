import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import { get } from 'node:http';
test('HTTP server serves catalogue, time and byte-range media while isolating files', async () => {
  const temp = await mkdtemp(path.join(tmpdir(), 'tellybox-test-'));
  await writeFile(path.join(temp, 'clip.mp4'), '0123456789');
  const child = spawn(process.execPath, ['server.mjs'], { env: { ...process.env, HOST: '127.0.0.1', PORT: '0', PUBLIC_BASE_URL: 'http://127.0.0.1:4173', MEDIA_DIR: temp, DATA_DIR: path.join(temp, 'data') }, stdio: ['ignore', 'pipe', 'pipe'] });
  try {
    // Ask the OS for a free port; parse the address the server reports.
    const ready = await Promise.race([once(child.stdout, 'data'), once(child, 'exit').then(() => { throw Error('Server exited before ready'); }), new Promise((_, reject) => { const t = setTimeout(() => reject(Error('Server start timed out')), 5000); t.unref(); })]);
    const url = ready[0].toString().match(/http:\/\/[^\s]+/)[0];
    assert.equal((await fetch(url)).status, 200);
    const admin=await fetch(url+'/admin.html');assert.equal(admin.status,200);assert.ok((await admin.text()).includes('id="owner-login"'));assert.equal((await fetch(url+'/api/owner/settings')).status,401);
    const catalogue = await (await fetch(url + '/api/catalogue')).json(); assert.ok(catalogue.channels.length);
    const clock = await (await fetch(url + '/api/time')).json(); assert.ok(Math.abs(clock.now - Date.now()) < 3000);
    const playlist = await (await fetch(url + '/channels.m3u')).text(); assert.ok(playlist.startsWith('#EXTM3U')); assert.ok(playlist.includes(`/iptv/${catalogue.channels[0].id}/index.m3u8`));
    const network = await (await fetch(url + '/api/network')).json(); assert.equal(network.loopbackOnly, true); assert.equal(network.base, 'http://127.0.0.1:4173');
    const lanHeaders = { Host: '192.168.0.194:4173' };
    const lanGet = route => new Promise((resolve, reject) => {
      get(url + route, { headers: lanHeaders }, response => { let body = ''; response.setEncoding('utf8'); response.on('data', chunk => body += chunk); response.on('end', () => resolve(body)); response.on('error', reject); }).on('error', reject);
    });
    const lanPlaylist = await lanGet('/channels.m3u');
    assert.ok(lanPlaylist.includes('http://192.168.0.194:4173/iptv/'));
    assert.ok(!lanPlaylist.includes('http://127.0.0.1:4173/iptv/'));
    const lanNetwork = JSON.parse(await lanGet('/api/network')); assert.equal(lanNetwork.base, 'http://192.168.0.194:4173');
    const epg = await (await fetch(url + '/guide.xml')).text(); assert.ok(epg.includes('<tv ')); assert.ok(epg.includes('<programme '));
    assert.equal((await fetch(url + '/iptv/unknown/index.m3u8')).status, 404);
    assert.equal((await fetch(url + '/api/programme-description?channel=missing&programme=missing&url=http://127.0.0.1/private')).status,404);
    assert.equal((await fetch(url + '/data/youtube-cookies.txt')).status, 404);
    assert.equal((await fetch(url + '/youtube-cookies.txt')).status, 404);
    assert.equal((await fetch(url + '/api/owner/youtube-auth')).status, 401);
    const range = await fetch(url + '/media/clip.mp4', { headers: { Range: 'bytes=2-5' } }); assert.equal(range.status, 206); assert.equal(range.headers.get('Content-Range'), 'bytes 2-5/10'); assert.equal(await range.text(), '2345');
    const suffix = await fetch(url + '/media/clip.mp4', { headers: { Range: 'bytes=-3' } }); assert.equal(await suffix.text(), '789');
    assert.equal((await fetch(url + '/media/clip.mp4', { headers: { Range: 'bytes=99-' } })).status, 416);
    const head = await fetch(url + '/media/clip.mp4', { method: 'HEAD' }); assert.equal(head.headers.get('content-length'), '10'); assert.equal(await head.text(), '');
    assert.equal((await fetch(url + '/api/catalogue', { method: 'POST' })).status, 405);
    assert.equal((await fetch(url + '/catalogue.json')).status, 404);
    assert.notEqual((await fetch(url + '/media/%2e%2e%2fpackage.json')).status, 200);
  } finally { const exited = once(child, 'exit'); child.kill(); await exited; await rm(temp, { recursive: true, force: true }); }
});
