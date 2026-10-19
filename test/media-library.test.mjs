import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm,copyFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {scanMediaFolder} from '../lib/media-library.mjs';
test('media scan recurses, reads durations, encodes file paths and rejects traversal',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'tb-library-'));
 try{await mkdir(path.join(root,'adverts','1980s'),{recursive:true});await writeFile(path.join(root,'adverts','1980s','A clip.mp4'),'fixture');await writeFile(path.join(root,'adverts','private.txt'),'not media');const result=await scanMediaFolder(root,'adverts',{probe:async()=>30});assert.equal(result.files.length,1);assert.equal(result.files[0].duration,30);assert.equal(result.files[0].url,'/media/adverts/1980s/A%20clip.mp4');for(const folder of ['../','C:/private','/etc','adverts/../../','..\\private'])await assert.rejects(scanMediaFolder(root,folder));const broken=await scanMediaFolder(root,'adverts',{probe:async()=>{throw Error('broken');}});assert.ok(broken.files[0].error);}finally{await rm(root,{recursive:true,force:true});}
});
test('real FFprobe reads the bundled demo file duration',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'tb-probe-'));try{await copyFile('examples/demo/demo-one.mp4',path.join(root,'demo.mp4'));const r=await scanMediaFolder(root);assert.equal(r.files.length,1);assert.ok(Math.abs(r.files[0].duration-20)<1,r.files[0].error);}finally{await rm(root,{recursive:true,force:true});}
});
