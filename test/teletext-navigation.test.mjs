import test from 'node:test';import assert from 'node:assert/strict';
import {createTeletextSnapshot} from '../lib/teletext-export.mjs';
import {colourNavigation} from '../lib/teletext-navigation.mjs';
const config={brand:{name:'Example'},channels:[],epoch:'2026-01-01'},stamp=Date.parse('2026-11-07T12:00:00Z');
const feed={name:'Example',items:Array.from({length:20},(_,i)=>({title:'Long headline '+i+' '.repeat(1)+'headline '.repeat(10),description:'Article text '.repeat(100),url:'https://www.bbc.co.uk/news/'+i,publishedAt:new Date(stamp).toISOString()}))};
test('coloured keys reach every index screen as real pages and return to the previous screen',()=>{
 const snapshot=createTeletextSnapshot(config,{feeds:{news:feed}},stamp),byPage=new Map(snapshot.pages.map(p=>[p.page,p]));const index=byPage.get('101');assert.ok(index.subpages.length>1);
 let current=index.subpages[0];const visited=new Set();for(let i=0;i<index.subpages.length;i++){visited.add(current.subpage);assert.equal(current.autoRotate,true);assert.equal(current.rotationSeconds,10);const next=byPage.get(current.links[2].page).subpages[0];assert.equal(next.subpage,(current.subpage+1)%index.subpages.length);const back=byPage.get(next.links[1].page).subpages[0];assert.equal(back.subpage,current.subpage);assert.ok(snapshot.files.has(current.links[2].page+'.tti'));current=next;}assert.equal(visited.size,index.subpages.length);
 const story=byPage.get('102').subpages[0];assert.equal(story.autoRotate,false);const nextStoryScreen=byPage.get(story.links[2].page).subpages[0];assert.equal(nextStoryScreen.basePage,'102');assert.equal(nextStoryScreen.subpage,1);
 for(const entry of snapshot.pages)for(const model of entry.subpages)for(const link of model.links)assert.ok(byPage.has(link.page),'Missing Fastext target '+link.page);
 assert.match(snapshot.files.get('101.tti').toString(),/CT,10,T/);
 assert.match(snapshot.files.get('101.tti').toString(),/PS,8010/);
});
test('continuation addresses stay stable when an earlier index gains another screen',()=>{const model=(page,i,n)=>({page,heading:'Test',rows:[],links:[],subpage:i,subpages:n}),entry=(page,n)=>({page,subpages:Array.from({length:n},(_,i)=>model(page,i,n))}),targets=new Map();const a=colourNavigation([entry('101',2),entry('102',2)],targets),before=a.find(e=>e.page==='102').subpages[0].links[2].page;const b=colourNavigation([entry('101',3),entry('102',2)],targets);assert.equal(b.find(e=>e.page==='102').subpages[0].links[2].page,before);});
