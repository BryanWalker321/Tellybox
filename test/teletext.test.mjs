import test from 'node:test';
import assert from 'node:assert/strict';
import {buildTeletext} from '../public/teletext.mjs';
const config={brand:{name:'Example & Co Station',description:'Our station'},channels:[],epoch:'2026-01-01T00:00:00Z'};
test('Teletext uses the configured name safely and keeps page links',()=>{const r=buildTeletext(config);assert.match(r.html,/Example &amp; Co Station/i);assert.match(r.html,/data-page="601"/);assert.doesNotMatch(r.html,/TELLYTEXT/);assert.equal(r.subpages,1);});
test('Teletext directory paginates and bounds requested subpages',()=>{const c={...config,channels:Array.from({length:14},(_,i)=>({number:i+1,id:String(i),name:'Channel '+i}))};assert.equal(buildTeletext(c,'200').subpages,3);assert.equal(buildTeletext(c,'200',Date.now(),99).subpage,2);assert.match(buildTeletext(c,'999').html,/PAGE NOT AVAILABLE/);});
