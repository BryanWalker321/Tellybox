import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {listMediaFolders} from '../lib/media-library.mjs';
test('folder browser lists directories with relative paths and rejects escapes',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'tb-folders-'));
 try{
  await mkdir(path.join(root,'Adverts','1980s & 90s'),{recursive:true});await writeFile(path.join(root,'clip.mp4'),'fixture');
  assert.deepEqual(await listMediaFolders(root),{folder:'',parent:null,folders:[{name:'Adverts',path:'Adverts'}]});
  assert.deepEqual(await listMediaFolders(root,'Adverts'),{folder:'Adverts',parent:'',folders:[{name:'1980s & 90s',path:'Adverts/1980s & 90s'}]});
  assert.deepEqual((await listMediaFolders(root,'Adverts/1980s & 90s')).folders,[]);
  for(const folder of ['../','/etc','C:/private','Adverts/../../','..\\private'])await assert.rejects(listMediaFolders(root,folder));
  if(process.platform!=='win32'){await symlink(tmpdir(),path.join(root,'escape'));assert.equal((await listMediaFolders(root)).folders.length,1);await assert.rejects(listMediaFolders(root,'escape'));}
 }finally{await rm(root,{recursive:true,force:true});}
});
