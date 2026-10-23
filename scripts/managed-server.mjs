import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {rename,rm} from 'node:fs/promises';
import {updatePaths,readJson,atomicJson} from '../lib/updates.mjs';
import {startServer,stopChild,healthy,prepareNative,probeNative,writeProgress} from '../lib/update-native.mjs';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url))),paths=updatePaths(process.env.DATA_DIR),version=(await readJson(path.join(root,'package.json'))).version;
const env={...process.env,TELLYBOX_UPDATE_MODE:'managed-node'};let server,busy=false,stopping=false,ready=false;
const host=env.HOST&&!['0.0.0.0','::'].includes(env.HOST)?env.HOST:'127.0.0.1',origin='http://'+(host.includes(':')?'['+host+']':host)+':'+(env.PORT||4173);
async function heartbeat(){await atomicJson(paths.agent,{mode:'managed-node',version,at:new Date().toISOString()});}
async function shutdown(code=0){if(stopping)return;stopping=true;clearInterval(timer);clearInterval(heart);await stopChild(server);process.exitCode=code;if(process.connected)process.disconnect();}
const timer=setInterval(()=>void poll(),1000),heart=setInterval(()=>heartbeat().catch(()=>{}),5000);
process.on('SIGINT',()=>shutdown());process.on('SIGTERM',()=>shutdown());process.on('message',message=>{if(message?.type==='tellybox:shutdown')shutdown();});
process.on('disconnect',()=>shutdown(1));
try{server=startServer(root,env);await healthy(server,origin,version);await heartbeat();const active=await readJson(paths.active);if(active){if(active.version===version)await writeProgress(paths,active,'completed',100,'Update installed. Your station data has been retained.');else await writeProgress(paths,active,'failed',0,'The update was interrupted. Your previous version and station data are available.');await rm(paths.active,{force:true});}server.once('exit',()=>{if(!stopping)shutdown(1);});ready=true;}catch{await shutdown(1);}
async function poll(){if(busy||stopping||!server||!ready)return;const job=await readJson(paths.request);if(!job)return;busy=true;try{await rename(paths.request,paths.active);const progress=(phase,percent,message)=>writeProgress(paths,job,phase,percent,message);const candidate=await prepareNative(job,paths,{progress});await probeNative(candidate,job.version,env,paths);await progress('restarting',85,'Restarting Tellybox. Your media and saved station settings stay in place.');await atomicJson(paths.pointer,{path:candidate,version:job.version,previous:{path:root,version}});await shutdown(75);}catch{await writeProgress(paths,job,'failed',0,'The update could not be installed. Your current version and station data are unchanged. Check Git, network access and runtime requirements, then retry.');await rm(paths.active,{force:true});busy=false;}}
