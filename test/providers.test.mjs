import test from 'node:test';
import assert from 'node:assert/strict';
import {ProviderResolver,providerOf} from '../lib/providers.mjs';
import {validateCatalogue} from '../lib/schedule.mjs';

const watch='https://www.youtube.com/watch?v=abcdefghijk';
const dailymotion='https://www.dailymotion.com/video/x12345';
const vimeo='https://vimeo.com/12345';
const programme={id:'p',title:'Test programme',duration:300,url:watch};
function legacy(){
 return {brand:{name:'Test'},epoch:'2026-01-01T00:00:00Z',channels:[{id:'one',number:1,name:'Test',colour:'#123456',programmes:[programme,{...programme,id:'local',url:'/media/demo.mp4'}],schedule:{breaks:[{...programme,id:'advert'}]}}]};
}
test('legacy catalogues load without YouTube while new YouTube sources are rejected',()=>{
 const original=legacy();
 assert.throws(()=>validateCatalogue(structuredClone(original),{rejectRemovedSources:true}),/YouTube playback sources/);
 const result=validateCatalogue(structuredClone(original));
 assert.deepEqual(result.channels[0].programmes.map(p=>p.id),['local']);
 assert.deepEqual(result.channels[0].schedule.breaks,[]);
 assert.equal(original.channels[0].programmes.length,2);
 assert.equal(providerOf(watch),null);
 assert.equal(providerOf('https://youtu.be/abcdefghijk'),null);
 assert.equal(providerOf('https://youtube-nocookie.com/embed/abcdefghijk'),null);
});
test('Dailymotion and Vimeo share provider resolution and keep a brief cache',async()=>{
 let calls=0;
 const run=async(_python,args)=>{
  calls++;
  const payload=args.includes('--description')?{description:'A programme synopsis.'}:{streams:[{url:'https://media.example.test/stream.mp4',video:true}]};
  return {stdout:JSON.stringify(payload)};
 };
 const resolver=new ProviderResolver({run});
 assert.equal(providerOf(dailymotion).name,'dailymotion');
 assert.equal(providerOf(vimeo).name,'vimeo');
 await Promise.all([resolver.resolve(dailymotion),resolver.resolve(dailymotion)]);
 assert.equal(calls,1);
 resolver.invalidate(dailymotion);
 await resolver.resolve(dailymotion);
 assert.equal(calls,2);
 assert.equal(await resolver.describe(vimeo),'A programme synopsis.');
 await assert.rejects(resolver.resolve(watch),/Unsupported/);
 assert.equal(calls,3);
});
