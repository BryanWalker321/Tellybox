import test from 'node:test';
import assert from 'node:assert/strict';
import {parseStoryPack} from '../lib/teletext-stories.mjs';
import {newsPage} from '../public/teletext-pages.mjs';
const stamp=Date.parse('2026-11-07T12:00:00Z');
const pack={generatedAt:'2026-11-07T11:00:00Z',expiresAt:'2026-11-08T10:00:00Z',source:{name:'Licensed example',url:'https://example.org',licence:'Example test permission'},sections:{news:[{title:'A full story',text:'All the supplied article text. '.repeat(80),url:'https://example.org/story',publishedAt:'2026-11-07T11:00:00Z',byline:'Example Writer',copyright:'Example copyright'}]}};
test('licensed full-text input retains text and attribution across readable subpages',()=>{const parsed=parseStoryPack(JSON.stringify(pack),stamp),first=newsPage('102',parsed);assert.ok(first.subpages>1);let words='';for(let i=0;i<first.subpages;i++)words+=newsPage('102',parsed,i).rows.map(r=>r.text).join(' ')+' ';assert.match(words,/ALL THE SUPPLIED ARTICLE TEXT/);assert.match(words,/EXAMPLE WRITER/);assert.match(words,/EXAMPLE COPYRIGHT/);assert.match(words,/EXAMPLE TEST PERMISSION/);assert.doesNotMatch(words,/RSS SUMMARY/);assert.equal(first.source.name,'Licensed example');});
test('full-text input rejects expired, overlong, duplicate and unattributed records',()=>{
 for(const changed of [{...pack,expiresAt:'2026-11-07T11:59:59Z'},{...pack,source:{...pack.source,licence:''}},{...pack,sections:{news:[{...pack.sections.news[0],text:'x'.repeat(20001)}]}},{...pack,sections:{news:[pack.sections.news[0],pack.sections.news[0]]}},{...pack,sections:{news:[{...pack.sections.news[0],url:'javascript:alert(1)'}]}}])assert.throws(()=>parseStoryPack(JSON.stringify(changed),stamp));
});
