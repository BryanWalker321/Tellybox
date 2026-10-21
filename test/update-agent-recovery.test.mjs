import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {atomicJson,updatePaths,readJson} from '../lib/updates.mjs';
import {wait,stopChild} from '../lib/update-native.mjs';

test('restarting the Docker updater after an interrupted download makes retry possible without touching media',{timeout:15000},async t=>{
  const directory=await mkdtemp(path.join(os.tmpdir(),'tellybox interrupted download '));
  const paths=updatePaths(directory),id=randomUUID();let child;
  t.after(async()=>{await stopChild(child);await rm(directory,{recursive:true,force:true,maxRetries:10,retryDelay:100});});
  const bytes=Buffer.from('Owner media must survive an interrupted download');
  await writeFile(path.join(directory,'owner-video.mp4'),bytes);
  await atomicJson(paths.active,{id,version:'0.1.6'});
  await atomicJson(paths.status,{id,version:'0.1.6',phase:'downloading',percent:12});
  child=spawn(process.execPath,[path.resolve(import.meta.dirname,'../scripts/update-agent.mjs')],{
    env:{...process.env,DATA_DIR:directory,TELLYBOX_UPDATE_PROJECT:'test-download-recovery'},windowsHide:true,stdio:'ignore',
  });
  let status;
  for(let i=0;i<50;i++){status=await readJson(paths.status);if(status?.phase==='failed'&&!(await readJson(paths.active)))break;await wait(100);}
  assert.equal(status?.phase,'failed');assert.match(status.message,/download was interrupted/i);
  assert.equal(await readJson(paths.active),null);
  assert.deepEqual(await readFile(path.join(directory,'owner-video.mp4')),bytes);
});
