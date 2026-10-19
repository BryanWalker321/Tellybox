import test from 'node:test';
import assert from 'node:assert/strict';
import {validateCatalogue} from '../lib/schedule.mjs';
test('uncertain original dates must have a valid range wholly before the UK cutoff',()=>{
  const config={brand:{name:'Test'},epoch:'2026-01-01T00:00:00Z',editorial:{beforeYear:2000},channels:[{id:'test',number:1,name:'Test',colour:'#123456',programmes:[{id:'range',title:'Archive recording',url:'/media/a.mp4',duration:60,originalYearRange:[1983,1992]}]}]};
  assert.equal(validateCatalogue(config),config);
  for(const range of [[1995,2001],[1992,1983],[1983],['1983',1992]]) { const invalid=structuredClone(config);invalid.channels[0].programmes[0].originalYearRange=range;assert.throws(()=>validateCatalogue(invalid)); }
  const invalid=structuredClone(config);invalid.channels[0].programmes[0].originalYear=2001;assert.throws(()=>validateCatalogue(invalid));
});

test('owner-approved playlist sources are explicit date exceptions without relaxing other recordings',()=>{
  const config={brand:{name:'Test'},epoch:'2026-01-01T00:00:00Z',editorial:{beforeYear:2000,approvedSources:['https://www.youtube.com/watch?v=5DYSwaa23tI']},channels:[{id:'test',number:1,name:'Test',colour:'#123456',programmes:[{id:'approved',title:'Owner-approved recording',url:'https://www.youtube.com/watch?v=5DYSwaa23tI',duration:60,originalYear:2001}]}]};
  assert.equal(validateCatalogue(config),config);
  delete config.channels[0].programmes[0].originalYear;
  assert.equal(validateCatalogue(config),config,'an approved undated recording need not be assigned an invented year');
  config.channels[0].programmes.push({id:'not-approved',title:'Other modern recording',url:'/media/other.mp4',duration:60,originalYear:2001});
  assert.throws(()=>validateCatalogue(config),/before 2000/);
  config.editorial.approvedSources='*';assert.throws(()=>validateCatalogue(config),/explicit media URLs/);
});
