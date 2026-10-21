import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,cp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import net from 'node:net';
import {execFile,spawn} from 'node:child_process';
import {promisify} from 'node:util';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import {readJson,updatePaths} from '../lib/updates.mjs';
import {stopChild,wait} from '../lib/update-native.mjs';
const exec=promisify(execFile),source=path.resolve(import.meta.dirname,'..');
async function port(){const s=net.createServer();await new Promise(r=>s.listen(0,'127.0.0.1',r));const p=s.address().port;await new Promise(r=>s.close(r));return p;}
async function until(fn,message,timeout=60000){const end=Date.now()+timeout;while(Date.now()<end){try{const r=await fn();if(r)return r;}catch{}await wait(200);}throw Error(typeof message==='function'?message():message);}
async function copyApp(target){await mkdir(target,{recursive:true});for(const name of ['lib','scripts','public','examples','server.mjs','catalogue.json','package.json'])await cp(path.join(source,name),path.join(target,name),{recursive:true});}

test('native managed update and failed startup rollback preserve real owner media and station data',{timeout:180000},async t=>{
  const base=await mkdtemp(path.join(os.tmpdir(),'Tellybox owner space '));
  let child,db,logs='';
  t.after(async()=>{await stopChild(child);db?.close();await rm(base,{recursive:true,force:true,maxRetries:20,retryDelay:200});});
  const original=path.join(base,'original app'),upstream=path.join(base,'official fixture'),data=path.join(base,'station data'),media=path.join(base,'owner media');
  await copyApp(original);await copyApp(upstream);await mkdir(data);await mkdir(media);
  const pkg=JSON.parse(await readFile(path.join(original,'package.json'),'utf8'));
  await writeFile(path.join(original,'package.json'),JSON.stringify({...pkg,version:'0.1.5'}));
  const git=async args=>exec('git',['-C',upstream,...args],{windowsHide:true});
  await git(['init','-q']);await git(['config','user.email','test@localhost']);await git(['config','user.name','Updater test']);
  await git(['add','.']);await git(['commit','-qm','working candidate']);await git(['tag','v0.1.6']);
  const commit=(await git(['rev-parse','HEAD'])).stdout.trim();
  // Candidate two passes its disposable probe, but deliberately fails against
  // this test station's live data directory. This exercises actual rollback.
  await writeFile(path.join(upstream,'package.json'),JSON.stringify({...pkg,version:'0.1.7'}));
  const server=await readFile(path.join(upstream,'server.mjs'),'utf8');
  await writeFile(path.join(upstream,'server.mjs'),`if(process.env.DATA_DIR===${JSON.stringify(data)})throw Error('deliberate candidate startup failure');\n`+server);
  await git(['add','.']);await git(['commit','-qm','failing candidate']);await git(['tag','v0.1.7']);
  const badCommit=(await git(['rev-parse','HEAD'])).stdout.trim();
  const releaseFile=path.join(base,'release.json'),hook=path.join(base,'test-network.mjs');
  await writeFile(hook,`import {readFile} from 'node:fs/promises';const real=globalThis.fetch;globalThis.fetch=async(url,options)=>{const u=String(url);if(u.startsWith('https://api.github.com/repos/BryanWalker321/Tellybox/releases/latest')){const fixture=JSON.parse(await readFile(${JSON.stringify(releaseFile)},'utf8'));return Response.json(fixture.release);}if(u.startsWith('https://github.com/BryanWalker321/Tellybox/releases/download/')){const fixture=JSON.parse(await readFile(${JSON.stringify(releaseFile)},'utf8'));return Response.json(fixture.manifest);}return real(url,options);};`);
  const fixture=async(version,sha)=>writeFile(releaseFile,JSON.stringify({release:{tag_name:'v'+version,body:'test release',assets:[{name:'tellybox-update.json',browser_download_url:'https://github.com/BryanWalker321/Tellybox/releases/download/v'+version+'/tellybox-update.json'}]},manifest:{format:1,version,commit:sha,image:'ghcr.io/bryanwalker321/tellybox@sha256:'+'b'.repeat(64),dataProtocol:1}}));
  await fixture('0.1.6',commit);
  const video=Buffer.from(Array.from({length:1024*1024},(_,i)=>(i*71)%256));await writeFile(path.join(media,'Owner video ü.mp4'),video);
  const catalogue=JSON.parse(await readFile(path.join(original,'catalogue.json'),'utf8'));catalogue.brand.name='Owner preservation station';catalogue.channels[0].name='My preserved channel';
  await writeFile(path.join(data,'catalogue.json'),JSON.stringify(catalogue));
  const customConfig=path.join(base,'custom catalogue.json');await writeFile(customConfig,JSON.stringify(catalogue));
  const listen=await port(),origin='http://127.0.0.1:'+listen;
  const env={...process.env,HOST:'127.0.0.1',PORT:String(listen),DATA_DIR:data,MEDIA_DIR:media,CATALOGUE_PATH:customConfig,NODE_OPTIONS:'--import='+pathToFileURL(hook).href,GIT_CONFIG_COUNT:'1',GIT_CONFIG_KEY_0:'url.'+pathToFileURL(upstream).href+'.insteadOf',GIT_CONFIG_VALUE_0:'https://github.com/BryanWalker321/Tellybox.git'};
  child=spawn(process.execPath,[path.join(original,'scripts/launch.mjs')],{cwd:original,env,windowsHide:true,stdio:['ignore','pipe','pipe','ipc']});child.stdout.on('data',c=>{logs+=c;});child.stderr.on('data',c=>{logs+=c;});
  await until(async()=>(await fetch(origin+'/api/version').then(r=>r.json())).version==='0.1.5',()=> 'original did not start: '+logs);
  const key=/Setup key:\s*(\S+)/i.exec(logs)?.[1] || /setup key[^\n]*:\s*(\S+)/i.exec(logs)?.[1];
  assert.ok(key,'Setup key not found in captured test output');
  let cookie,csrf;
  const api=async(route,method='GET',body)=>{
    const r=await fetch(origin+'/api/owner/'+route,{method,headers:{Origin:origin,'Content-Type':'application/json',Cookie:cookie||'','X-CSRF-Token':csrf||''},...(body?{body:JSON.stringify(body)}:{})});
    const result=await r.json();assert.ok(r.ok,JSON.stringify(result));return {r,result};
  };
  const login=await api('login','POST',{password:'preserved-owner-password',setupKey:key});cookie=login.r.headers.get('set-cookie').split(';')[0];csrf=login.result.csrf;
  await api('settings','PUT',{PUBLIC_BASE_URL:origin,CHAT_DAILY_LIMIT:'77'});
  db=new DatabaseSync(path.join(data,'community.sqlite'));db.prepare('INSERT INTO users(id,name) VALUES (?,?)').run('owner-test','Retained viewer');db.prepare('INSERT INTO comments(channel,user_id,text,created) VALUES (?,?,?,?)').run(catalogue.channels[0].id,'owner-test','Retained viewer comment',Date.now());const readRows=()=>db.prepare('SELECT channel,user_id,text,created FROM comments ORDER BY id').all();const savedRows=readRows();
  const paths=updatePaths(data),mediaHash=createHash('sha256').update(video).digest('hex'),catalogueBytes=await readFile(customConfig),ownerBytes=await readFile(path.join(data,'owner.json'));
  await until(async()=>(await api('updates')).result.supported,'managed updater heartbeat missing');
  await api('updates/install','POST',{version:'0.1.6'});
  await until(async()=>(await readJson(paths.status))?.phase==='completed','update did not complete: '+logs,90000);
  assert.equal((await fetch(origin+'/api/version').then(r=>r.json())).version,'0.1.6');
  assert.deepEqual(await readFile(customConfig),catalogueBytes);assert.deepEqual(await readFile(path.join(data,'owner.json')),ownerBytes);assert.deepEqual(readRows(),savedRows);
  assert.equal(createHash('sha256').update(await readFile(path.join(media,'Owner video ü.mp4'))).digest('hex'),mediaHash);
  // Old owner sessions expire; the same owner password and settings survive.
  const relogin=await api('login','POST',{password:'preserved-owner-password'});cookie=relogin.r.headers.get('set-cookie').split(';')[0];csrf=relogin.result.csrf;
  const saved=await api('settings');assert.equal(saved.result.settings.CHAT_DAILY_LIMIT,'77');assert.equal(saved.result.catalogue.channels[0].name,'My preserved channel');
  await fixture('0.1.7',badCommit);
  // Force a fresh server-side release lookup without waiting for the normal cache.
  await stopChild(child);child=spawn(process.execPath,[path.join(original,'scripts/launch.mjs')],{cwd:original,env,windowsHide:true,stdio:['ignore','pipe','pipe','ipc']});child.stdout.on('data',c=>{logs+=c;});child.stderr.on('data',c=>{logs+=c;});
  await until(async()=>(await fetch(origin+'/api/version').then(r=>r.json())).version==='0.1.6','managed version did not survive launcher restart');
  const again=await api('login','POST',{password:'preserved-owner-password'});cookie=again.r.headers.get('set-cookie').split(';')[0];csrf=again.result.csrf;
  await until(async()=>(await api('updates')).result.available,'next release not available');
  await api('updates/install','POST',{version:'0.1.7'});
  await until(async()=>(await readJson(paths.status))?.phase==='failed'&&(await fetch(origin+'/api/version').then(r=>r.json())).version==='0.1.6','failed candidate did not roll back: '+logs,90000);
  assert.deepEqual(await readFile(customConfig),catalogueBytes);assert.deepEqual(await readFile(path.join(data,'owner.json')),ownerBytes);assert.deepEqual(readRows(),savedRows);
  assert.equal(createHash('sha256').update(await readFile(path.join(media,'Owner video ü.mp4'))).digest('hex'),mediaHash);
});
