import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {updatePaths,readJson,atomicJson} from '../lib/updates.mjs';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const env={...process.env,DATA_DIR:path.resolve(root,process.env.DATA_DIR||'data'),MEDIA_DIR:path.resolve(root,process.env.MEDIA_DIR||'media')};if(env.CATALOGUE_PATH)env.CATALOGUE_PATH=path.resolve(root,env.CATALOGUE_PATH);
const paths=updatePaths(env.DATA_DIR);let child,stopping=false,failures=0;
function stop(){stopping=true;if(child?.connected)child.send({type:'tellybox:shutdown'});else child?.kill('SIGTERM');}
process.on('SIGINT',stop);process.on('SIGTERM',stop);
while(!stopping){const pointer=await readJson(paths.pointer);let active=pointer?.path||root;const relative=path.relative(path.join(paths.base,'releases'),active);if(active!==root&&(relative.startsWith('..')||path.isAbsolute(relative)))throw Error('Invalid managed release path.');const started=Date.now();child=spawn(process.execPath,[path.join(active,'scripts/managed-server.mjs')],{cwd:active,env,windowsHide:true,stdio:['inherit','inherit','inherit','ipc']});const result=await new Promise(resolve=>{child.once('error',()=>resolve(1));child.once('exit',code=>resolve(code??1));});if(stopping||result===0)break;if(result===75){failures=0;continue;}if(pointer?.previous&&Date.now()-started<60000){await atomicJson(paths.pointer,{path:pointer.previous.path,version:pointer.previous.version});const job=await readJson(paths.active);if(job)await atomicJson(paths.status,{id:job.id,version:job.version,phase:'failed',percent:0,message:'The new version could not start. Tellybox is returning to the previous version; station data is retained.',finishedAt:new Date().toISOString()});failures=0;continue;}if(++failures>=3){process.exitCode=1;break;}await new Promise(resolve=>setTimeout(resolve,1000));}
