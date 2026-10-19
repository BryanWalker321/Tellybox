import test from 'node:test';
import assert from 'node:assert/strict';
import {ProgrammeDescriptions,descriptionSource,cleanDescription} from '../lib/descriptions.mjs';
import {createProgrammeDescription} from '../public/programme-description.mjs';

test('source descriptions are plain text and metadata requests stay on supported hosts',async()=>{
 assert.equal(cleanDescription('<p>A &amp; B</p><script>bad()</script><div>Next &#39;episode&#39;</div>'),"A & B\nNext 'episode'");
 assert.equal(descriptionSource({url:'http://127.0.0.1/private',sourceUrl:'https://archive.org.evil.test/details/x'}),null);
 assert.equal(descriptionSource({url:'https://archive.org/download/a/one.mp4'}).key,'archive:a');
 assert.equal(descriptionSource({url:'https://archive.org/details/a%2Fb'}),null);
 let requests=0;
 const service=new ProgrammeDescriptions({fetcher:async url=>{requests++;assert.equal(url,'https://archive.org/metadata/archive-item/metadata');return {ok:true,json:async()=>({result:{description:'<div>A British television documentary.</div>'}})};}});
 const programme={title:'Documentary',url:'https://archive.org/download/archive-item/film.mp4'};
 const result=await Promise.all([service.get(programme),service.get(programme)]);
 assert.deepEqual(result,['A British television documentary.','A British television documentary.']);assert.equal(requests,1);
 assert.equal(await service.get({...programme,url:'https://unrelated.example/video.mp4'}),'');
});

test('missing or title-only descriptions stay empty and provider lookups use the public watch URL',async()=>{
 let calls=0;
 const service=new ProgrammeDescriptions({provider:{describe:async url=>{calls++;assert.equal(url,'https://www.youtube.com/watch?v=abcdefghijk');return 'Episode title';}}});
 const p={title:'Episode title',url:'https://www.youtube.com/watch?v=abcdefghijk'};
 assert.equal(await service.get(p),'');assert.equal(await service.get(p),'');assert.equal(calls,1);
 assert.equal(await service.get({...p,description:'Owner-written synopsis.'}),'Owner-written synopsis.');
});

test('late descriptions cannot overwrite a newly selected programme and long text expands',async()=>{
 const element={hidden:true,textContent:''},handlers={},button={hidden:true,textContent:'',setAttribute(){},addEventListener(name,fn){handlers[name]=fn;}},pending=[];
 const view=createProgrammeDescription({element,button,fetcher:()=>new Promise(resolve=>pending.push(resolve))});
 view.show({id:'description-old',url:'https://example.com/one'},'c');
 view.show({id:'description-new',url:'https://example.com/two'},'c');
 const text='A longer programme description. '.repeat(30);
 pending[1]({ok:true,json:async()=>({description:text})});await new Promise(resolve=>setImmediate(resolve));
 pending[0]({ok:true,json:async()=>({description:'Wrong old programme'})});await new Promise(resolve=>setImmediate(resolve));
 assert.ok(element.textContent.startsWith('A longer'));assert.ok(element.textContent.length<text.length);assert.equal(button.hidden,false);
 handlers.click();assert.equal(element.textContent,text);assert.equal(button.textContent,'Read less');
});
