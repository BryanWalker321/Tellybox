import test from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,writeFile,rename,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import path from 'node:path';import {createCatalogueReader} from '../lib/catalogue-reader.mjs';
test('stream polling reuses channel identity and owner/source-health edits invalidate immediately',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'tellybox-reader-')),configPath=path.join(dir,'catalogue.json'),healthPath=path.join(dir,'health.json');let validations=0;
 const reader=createCatalogueReader({configPath,healthPath,validate:c=>{validations++;return c;},applyHealth:(c,h)=>{c.health=h;return c;}});
 try{await writeFile(configPath,JSON.stringify({channels:[{id:'one',programmes:[{title:'Original'}]}]}));const first=await reader();
 const parallel=await Promise.all(Array.from({length:30},()=>reader()));assert.ok(parallel.every(c=>c===first&&c.channels[0]===first.channels[0]));assert.equal(validations,1);
 await writeFile(path.join(dir,'replacement'),JSON.stringify({channels:[{id:'one',programmes:[{title:'Updated!'}]}]}));await rename(path.join(dir,'replacement'),configPath);const updated=await reader();assert.notEqual(updated,first);assert.equal(updated.channels[0].programmes[0].title,'Updated!');assert.equal(first.channels[0].programmes[0].title,'Original');
 await writeFile(healthPath,JSON.stringify({result:'failed'}));const health=await reader();assert.deepEqual(health.health,{result:'failed'});assert.notEqual(health,updated);
 await rm(healthPath);assert.equal((await reader()).health,null);
 await writeFile(configPath,'invalid');await assert.rejects(reader());await writeFile(configPath,JSON.stringify({channels:[]}));assert.deepEqual((await reader()).channels,[]);
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('concurrent cold requests share one validation and schedules can retain their compiled cache',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'tellybox-reader-cold-')),configPath=path.join(dir,'c'),healthPath=path.join(dir,'h');let count=0;
 try{await writeFile(configPath,'{"channels":[{"id":"one"}]}');const reader=createCatalogueReader({configPath,healthPath,validate:c=>{count++;return c;},applyHealth:c=>c});const values=await Promise.all(Array.from({length:20},()=>reader()));assert.equal(count,1);assert.ok(values.every(v=>v.channels[0]===values[0].channels[0]));}finally{await rm(dir,{recursive:true,force:true});}
});
