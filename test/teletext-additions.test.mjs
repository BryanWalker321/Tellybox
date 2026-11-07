import test from 'node:test';
import assert from 'node:assert/strict';
import {dailyWord,wordBank,londonHour,extraPage} from '../public/teletext-extras.mjs';
import {holidayPage} from '../public/teletext-holidays.mjs';
import {parseHaysOffers} from '../lib/teletext-holidays.mjs';
import {ukWeatherPage} from '../public/teletext-weather.mjs';
import {newsPage} from '../public/teletext-pages.mjs';
import {renderSpecial} from '../public/teletext-render.mjs';
import {ttiFile} from '../lib/teletext-export.mjs';
test('daily words have exactly one valid anagram, stable choices and real answer pages',()=>{
 assert.ok(wordBank.every(w=>/^[A-Z]{6}$/.test(w.word)));assert.equal(new Set(wordBank.map(w=>w.word)).size,wordBank.length);
 for(let i=0;i<366;i++){const stamp=Date.parse('2026-01-01')+i*86400000,day=new Date(stamp).toISOString().slice(0,10),q=dailyWord(day),sort=s=>s.split('').sort().join('');assert.deepEqual(q,dailyWord(day));assert.notEqual(q.letters,q.word);assert.equal(q.answers.filter(a=>sort(a)===sort(q.letters)).length,1);const p=extraPage({},'460',stamp);assert.equal(p.links[q.correct].page,'461');assert.equal(p.links.filter(l=>l.page==='462').length,3);assert.ok(renderSpecial(p).includes(q.clue.toUpperCase().split(' ').slice(0,2).join(' ')));}
});
test('tonight uses UK evening boundaries in both winter and summer',()=>{assert.equal(londonHour('2026-07-01',18),Date.parse('2026-07-01T17:00:00Z'));assert.equal(londonHour('2026-11-07',18),Date.parse('2026-11-07T18:00:00Z'));});
const card=`<div class="splide__slide js-link-card"><h3>Test Hotel</h3><p><span>x</span>7 Nights</p><p><span>x</span>Half Board</p><p class="text-4xl">&#xA3;250<span>pp</span></p><a class="js-link-card-primary-href" href="/destinations/europe/test/">Details</a></div>`;
test('holiday parser rejects missing or malformed prices and expired offers disappear',()=>{const stamp=Date.parse('2026-11-07T12:00:00Z'),feed=parseHaysOffers(card,stamp);assert.equal(feed.items[0].price,'£250 pp');assert.throws(()=>parseHaysOffers(card.replace('&#xA3;250','CALL'),stamp));assert.throws(()=>parseHaysOffers(card.replace('/destinations/europe/test/','https://evil.example/'),stamp));const before=holidayPage('502',{feeds:{holidays:feed}},stamp);assert.ok(before.rows.some(r=>r.text.includes('250')));assert.ok(holidayPage('502',{feeds:{holidays:feed}},stamp+6*3600000).rows.some(r=>r.text.includes('UNAVAILABLE')));assert.doesNotMatch(renderSpecial(before,{external:true}),/href=/);});
test('UK map and beach use bounded native mosaic rows in browser and TTI',()=>{for(const model of [ukWeatherPage('146',{feeds:{}}),holidayPage('500',{feeds:{}},Date.now())]){assert.ok(model.rows.length<=18);assert.ok(model.rows.every(r=>r.mosaic?r.mosaic.length===38&&r.mosaic.every(b=>b>=0&&b<64):r.text.length<=38));assert.match(renderSpecial(model),/<svg/);const file=ttiFile('Example',[model]).toString();assert.ok(file.split('\r\n').filter(l=>/^OL,\d+,/.test(l)).every(l=>l.replace(/^OL,\d+,/,'').replace(/\x1b/g,'').length<=40));assert.doesNotMatch(file,/<svg/);}});
test('finance and entertainment indices select their own bounded story ranges',()=>{for(const [page,key,target] of [['210','finance','211'],['250','entertainment','251']]){const data={feeds:{[key]:{name:'BBC',items:[{title:'Example headline',description:'Supplied summary',url:'https://www.bbc.co.uk/news/test'}]}}};assert.equal(newsPage(page,data).rows.find(r=>r.page)?.page,target);assert.ok(newsPage(target,data).rows.some(r=>r.text.includes('SUPPLIED SUMMARY')));}});

test('evening UK map labels and displays supplied minimum temperatures',()=>{const p=ukWeatherPage('146',{feeds:{weather:{items:[{title:'Today: Clear',description:'Minimum Temperature: 6°C'}]},weather_aberdeen:{items:[{description:'Minimum Temperature: 7°C'}]}}});assert.ok(p.rows.some(r=>r.text==='TODAY - FORECAST MINIMUM C'));assert.ok(p.rows.some(r=>r.text.includes('ABERDEEN 7')));assert.equal(p.rows.length,18);});
