import {questions} from '../public/quiz-questions.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {newsPage,quizPage} from '../public/teletext-pages.mjs';
import {createTeletextSnapshot,ttiFile,ttiHeader} from '../lib/teletext-export.mjs';
import {buildTeletext} from '../public/teletext.mjs';
import {renderTeletextModel} from '../public/teletext-render.mjs';
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
test('receiver view keeps outbound credits as plain text and has no website tuning links',()=>{const model={page:'150',heading:'Example',subpage:0,subpages:1,rows:[{text:'Source credit',sourceUrl:'https://example.org/story'},{text:'Channel',channel:'one'},{text:'101 News',page:'101'}],links:[]};const external=renderTeletextModel(config.brand,model,{external:true});assert.doesNotMatch(external,/<a |href=|data-tt-channel/);assert.match(external,/Source credit/);assert.match(external,/data-page="101"/);const website=renderTeletextModel(config.brand,model);assert.match(website,/href="https:\/\/example.org\/story"/);assert.match(website,/data-tt-channel="one"/);});
test('How To Watch gives the station address as plain text in receiver files',()=>{const snapshot=createTeletextSnapshot(config,{feeds:{}},stamp),file=snapshot.files.get('160.tti').toString();assert.match(file,/TELLY-BOX.UK/);assert.doesNotMatch(file,/<a |href=/);const model=snapshot.pages.find(e=>e.page==='160').subpages[0];assert.match(renderTeletextModel(config.brand,model),/href="https:\/\/telly-box.uk"/);assert.doesNotMatch(renderTeletextModel(config.brand,model,{external:true}),/href=/);});

test('native export matches branded frame and delegates the live date/time to VBIT',()=>{
 const header=ttiHeader('Tellybox');assert.equal(header.replace(/\x1b[\x40-\x5f]/g,' ').length,32);assert.equal(header,'\x1bBTELLYBOX TEXT\x1bG%%a%d%%b %H:%M:%S');
 for(const brand of ['X','An exceptionally long station name'])assert.equal(ttiHeader(brand).replace(/\x1b[\x40-\x5f]/g,' ').length,32);
 const file=ttiFile('Tellybox',[quizPage('414',stamp)]).toString('ascii');assert.ok(file.includes('OL,0,'+header));assert.ok(file.includes('OL,1,\x1bD\x1b]\x1b@\x1b]\x1bW'));assert.match(file,/OL,4,.*YOUR WORLD AT THE TOUCH OF A BUTTON/);assert.match(file,/OL,5,.*BOX BAFFLER/);assert.match(file,/OL,23,.*ALWAYS SOMETHING ON/);assert.match(file,/OL,24,/);
});

test("all quiz questions fit the native portrait layout without losing answer text",()=>{for(const question of questions){const model={...quizPage("401",stamp),question};const file=ttiFile("Tellybox",[model]).toString("ascii");assert.ok(file.includes("OL,24,"));}});

test('native slogan is centred in the blue band with balanced margins',()=>{const file=ttiFile('Tellybox',[quizPage('414',stamp)]).toString('ascii'),line=file.split('\r\n').find(s=>s.startsWith('OL,23,')).slice(6).replace(/\x1b[\x40-\x5f]/g,' '),caption='TELLYBOX: ALWAYS SOMETHING ON';assert.equal(line.length,40);const start=line.indexOf(caption);assert.equal(start-1,40-start-caption.length);});
