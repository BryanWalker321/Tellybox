import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import path from 'node:path';
import {companionCatalogueReader} from '../lib/teletext-catalogue.mjs';
test('the companion guide applies shared intervals and source holds through the station catalogue reader',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'tellytext-catalogue-'));
 try{const config=JSON.parse(await readFile(new URL('../catalogue.json',import.meta.url),'utf8'));config.channels[0].schedule={...config.channels[0].schedule,useStationPool:true};config.intervalLibrary||=[];await writeFile(path.join(directory,'catalogue.json'),JSON.stringify(config));const reader=companionCatalogueReader(directory),first=await reader();assert.equal(first.channels[0].sharedIntervals,first.intervalLibrary);
 const url=config.channels[0].programmes[0].url;await writeFile(path.join(directory,'source-health.json'),JSON.stringify({results:[{url,result:'failed',failureCount:2,checkedAt:'2099-01-01T00:00:00Z'}]}));const updated=await reader();assert.equal(updated.channels[0].programmes[0].playbackDisabled,true);assert.match(updated.channels[0].programmes[0].availabilityHold,/Repeated playback/);assert.notEqual(first,updated);
 }finally{await rm(directory,{recursive:true,force:true});}
});
