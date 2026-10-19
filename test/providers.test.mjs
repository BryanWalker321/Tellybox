import test from 'node:test';
import assert from 'node:assert/strict';
import { ProviderResolver, providerOf } from '../lib/providers.mjs';

test('description-only provider requests return text and keep YouTube authentication away from other hosts',async()=>{
 const calls=[];
 const resolver=new ProviderResolver({cookieFile:'/private/session.txt',run:async(_exe,args,options)=>{calls.push({args,cookie:options.env.YOUTUBE_COOKIE_FILE});return {stdout:JSON.stringify({description:'A programme synopsis.',streams:[{url:'https://example.test/private-stream'}]})};}});
 assert.equal(await resolver.describe('https://www.youtube.com/watch?v=abcdefghijk'),'A programme synopsis.');
 assert.equal(await resolver.describe('https://www.dailymotion.com/video/x123456'),'A programme synopsis.');
 assert.ok(calls.every(call=>call.args.includes('--description')));assert.equal(calls[0].cookie,'/private/session.txt');assert.equal(calls[1].cookie,'');
 assert.equal(await resolver.describe('http://127.0.0.1/private'),'');assert.equal(calls.length,2);
});
test('provider resolution is host-limited, cached briefly and drops failed resolutions', async () => {
  assert.equal(providerOf('https://www.youtube.com/watch?v=y9CsvDblsr0').id, 'y9CsvDblsr0');
  assert.equal(providerOf('https://youtu.be/-Iok_VqYUKQ').name, 'youtube');
  assert.equal(providerOf('https://www.dailymotion.com/video/x123456_title').id, 'x123456');
  assert.equal(providerOf('https://youtube.com.evil.test/watch?v=y9CsvDblsr0'), null);
  let calls = 0;
  const resolver = new ProviderResolver({ run: async () => { calls++; return { stdout: JSON.stringify({ streams: [{ url: 'https://media.example.test/stream.mp4', video: true, audio: true }] }) }; } });
  const url = 'https://www.youtube.com/watch?v=y9CsvDblsr0';
  await Promise.all([resolver.resolve(url), resolver.resolve(url)]); assert.equal(calls, 1);
  resolver.invalidate(url); await resolver.resolve(url); assert.equal(calls, 2);
  await assert.rejects(resolver.resolve('http://127.0.0.1/private'));
  const failed = new ProviderResolver({ run: async () => { throw Error('not available'); } });
  await assert.rejects(failed.resolve(url)); assert.equal(failed.cache.size, 0);
});

test('private YouTube sessions only reach YouTube resolution and switching sessions clears cache', async () => {
  const calls=[];
  const resolver=new ProviderResolver({cookieFile:'/private/session.txt',run:async (exe,args,options)=>{
    calls.push({args,options});
    return {stdout:JSON.stringify({streams:[{url:'https://media.example.test/video.mp4',video:true,audio:true}]})};
  }});
  await resolver.resolve('https://www.youtube.com/watch?v=y9CsvDblsr0');
  assert.equal(calls[0].options.env.YOUTUBE_COOKIE_FILE,'/private/session.txt');
  assert.ok(!calls[0].args.includes('/private/session.txt'));
  await resolver.resolve('https://www.dailymotion.com/video/x123456');
  assert.equal(calls[1].options.env.YOUTUBE_COOKIE_FILE,'');
  resolver.configure({cookieFile:''});
  await resolver.resolve('https://www.youtube.com/watch?v=y9CsvDblsr0');
  assert.equal(calls.length,3);assert.equal(calls[2].options.env.YOUTUBE_COOKIE_FILE,'');
});

test('a YouTube runtime upgrade leaves the other provider on its existing runtime',async()=>{
 const calls=[];
 const resolver=new ProviderResolver({python:'stable-python',youtubePython:'youtube-python',run:async(python,args)=>{calls.push(python);return {stdout:JSON.stringify({streams:[{url:'https://media.example.test/video.mp4',video:true,audio:true}]})};}});
 await resolver.resolve('https://www.youtube.com/watch?v=y9CsvDblsr0');
 await resolver.resolve('https://www.dailymotion.com/video/x123456');
 assert.deepEqual(calls,['youtube-python','stable-python']);
});
