import test from 'node:test';
import assert from 'node:assert/strict';
import {newsPage,quizPage} from '../public/teletext-pages.mjs';
import {createTeletextSnapshot,ttiFile} from '../lib/teletext-export.mjs';
import {buildTeletext} from '../public/teletext.mjs';
const stamp=Date.parse('2026-11-07T12:00:00Z'),config={brand:{name:'Example & Co',description:'Our station'},channels:[],epoch:'2026-01-01'};
const items=Array.from({length:20},(_,i)=>({title:'Story '+i,description:'Complete supplied summary '+i+' '+('readable news text '.repeat(80)),url:'https://www.bbc.co.uk/news/articles/'+i,publishedAt:'2026-11-07T10:00:00Z'}));
const sources={feeds:{news:{name:'BBC News',items,updatedAt:new Date(stamp).toISOString()},football:{name:'BBC Football',items:items.slice(0,15)},otherSport:{name:'BBC Sport',items:items.slice(0,6)}}};
test('numbered indices lead to stories and long summaries remain readable through subpages',()=>{
 const index=newsPage('101',sources);const pages=[];for(let i=0;i<index.subpages;i++)pages.push(...newsPage('101',sources,i).rows.filter(r=>r.page).map(r=>r.page));assert.equal(new Set(pages).size,20);assert.ok(pages.includes('102')&&pages.includes('121'));
 const first=newsPage('102',sources);assert.ok(first.subpages>1);let text='';for(let i=0;i<first.subpages;i++){const p=newsPage('102',sources,i);assert.ok(p.rows.length<=18);assert.ok(p.rows.every(r=>r.text.length<=38));text+=p.rows.map(r=>r.text).join(' ');}assert.match(text,/COMPLETE SUPPLIED SUMMARY 0/);assert.match(text,/RSS SUMMARY/);assert.equal(newsPage('102',sources,999).subpage,first.subpages-1);
 const sport=[];for(let i=0;i<newsPage('123',sources).subpages;i++)sport.push(...newsPage('123',sources,i).rows.filter(r=>r.page).map(r=>r.page));assert.equal(new Set(sport).size,21);assert.ok(sport.includes('124')&&sport.includes('144'));assert.match(newsPage('145',{feeds:{}}).heading,/WEATHER/);
});
test('browser and hardware quiz use identical actual pages for all four choices',()=>{
 for(let page=401;page<=412;page++){const model=quizPage(String(page),stamp),rendered=buildTeletext(config,String(page),stamp);assert.deepEqual(rendered.links,model.links);for(let i=0;i<4;i++){assert.equal(model.links[i].page,String(i===model.question.correct?page+1:414));assert.ok(rendered.html.includes('data-page="'+model.links[i].page+'"'));}}
 assert.equal(quizPage('414',stamp).links[0].page,'401');assert.match(buildTeletext(config,'414',stamp).html,/WRONG ANSWER/);assert.equal(quizPage('413',stamp).links[0].page,'401');assert.match(buildTeletext(config,'410',stamp).html,/Q10\/12/);
});
test('snapshot exports every page, bounded rows and matching Fastext links without browser markup',()=>{
 const snapshot=createTeletextSnapshot(config,sources,stamp);assert.ok(snapshot.files.has('414.tti'));assert.ok(snapshot.files.has('145.tti'));assert.equal(snapshot.manifest.files.length,snapshot.pages.length);assert.equal(snapshot.tar.length%512,0);
 for(const p of snapshot.pages)for(const m of p.subpages){assert.ok(m.rows.length<=18,m.page);assert.ok(m.rows.every(r=>r.text.length<=38),m.page);assert.equal(m.links.length,4);}
 const file=snapshot.files.get('401.tti').toString('ascii');assert.match(file,/PN,40100\r\n/);assert.match(file,/PS,8000/);assert.doesNotMatch(file,/<button|<div|undefined|NaN/);assert.ok(file.includes('FL,'+quizPage('401',stamp).links.map(l=>l.page).join(',')));
 for(const bytes of snapshot.files.values())for(const l of bytes.toString('ascii').split('\r\n')){if(l.startsWith('OL,')&&!l.startsWith('OL,0,')){const visible=l.replace(/^OL,\d+,/,'').replace(/\x1b[\x40-\x5f]/g,' ');assert.ok(visible.length<=40,'Long TTI row '+visible.length);}}
 assert.deepEqual(ttiFile('Example',[quizPage('414',stamp)]),ttiFile('Example',[quizPage('414',stamp)]));
});
