import {spawn,execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdir,readFile,rm} from 'node:fs/promises';
import path from 'node:path';
import net from 'node:net';
import {repository,validateManifest,atomicJson} from './updates.mjs';
const exec=promisify(execFile);
export const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
export async function stopChild(child){if(!child||child.exitCode!==null)return;let timer;const ended=new Promise(resolve=>child.once('exit',resolve));if(child.connected)child.send({type:'tellybox:shutdown'});else child.kill('SIGTERM');await Promise.race([ended,new Promise(resolve=>{timer=setTimeout(resolve,12000);})]);clearTimeout(timer);if(child.exitCode===null){child.kill('SIGKILL');await Promise.race([ended,new Promise(resolve=>{timer=setTimeout(resolve,2000);})]);clearTimeout(timer);}}
export function startServer(root,env,{quiet=false}={}){const child=spawn(process.execPath,[path.join(root,'server.mjs')],{cwd:root,env,windowsHide:true,stdio:quiet?['ignore','ignore','ignore','ipc']:['inherit','inherit','inherit','ipc']});child.on('error',()=>{});return child;}
export async function healthy(child,origin,version,{timeout=40000}={}){const until=Date.now()+timeout;while(Date.now()<until){if(child.exitCode!==null||child.killed)throw Error('The updated application could not start.');try{const r=await fetch(origin+'/api/version',{signal:AbortSignal.timeout(1500)}),data=await r.json();if(r.ok&&data.version===version)return;}catch{}await wait(300);}throw Error('The updated application did not pass its startup check.');}
async function unusedPort(){const s=net.createServer();await new Promise((resolve,reject)=>s.once('error',reject).listen(0,'127.0.0.1',resolve));const port=s.address().port;await new Promise(resolve=>s.close(resolve));return port;}
export async function prepareNative(job,paths,{progress=async()=>{},run=exec}={}){
 validateManifest(job.manifest,job.version);if(!/^[a-f0-9-]{36}$/.test(job.id))throw Error('Invalid update request.');
 const root=path.join(paths.base,'releases',job.version+'-'+job.manifest.commit.slice(0,12)+'-'+job.id.slice(0,8));await mkdir(path.dirname(root),{recursive:true});
 await progress('downloading',15,'Downloading the official release.');
 await run('git',['clone','--quiet','--no-checkout','--filter=blob:none','--single-branch','--branch','v'+job.version,'https://github.com/'+repository+'.git',root],{windowsHide:true,timeout:180000,maxBuffer:1000000});
 await run('git',['-C',root,'checkout','--quiet','--detach',job.manifest.commit],{windowsHide:true,timeout:120000,maxBuffer:1000000});
 const result=await run('git',['-C',root,'rev-parse','HEAD'],{windowsHide:true,timeout:10000});if(result.stdout.trim()!==job.manifest.commit)throw Error('Release verification failed.');
 const pkg=JSON.parse(await readFile(path.join(root,'package.json'),'utf8'));if(pkg.version!==job.version)throw Error('The downloaded version does not match the release.');
 const minimum=/^>=(\d+)\.(\d+)/.exec(pkg.engines?.node||'');const node=process.versions.node.split('.').map(Number);if(minimum&&(node[0]<+minimum[1]||(node[0]===+minimum[1]&&node[1]<+minimum[2])))throw Error('This release needs a newer Node.js runtime.');
 await progress('verifying',55,'Checking the new version before restarting.');return root;
}
export async function probeNative(root,version,env,paths){const dir=path.join(paths.base,'probe-'+Date.now()),port=await unusedPort(),probeEnv={...env,HOST:'127.0.0.1',PORT:String(port),DATA_DIR:path.join(dir,'data'),MEDIA_DIR:path.join(dir,'media'),TELLYBOX_UPDATE_MODE:'unmanaged'};delete probeEnv.CATALOGUE_PATH;let child;try{child=startServer(root,probeEnv,{quiet:true});await healthy(child,'http://127.0.0.1:'+port,version);}finally{await stopChild(child);await rm(dir,{recursive:true,force:true,maxRetries:10,retryDelay:250});}}
export async function writeProgress(paths,job,phase,percent,message){await atomicJson(paths.status,{id:job.id,version:job.version,phase,percent,message,updatedAt:new Date().toISOString(),...(['completed','failed'].includes(phase)?{finishedAt:new Date().toISOString()}:{})});}
