import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createHash,randomUUID} from 'node:crypto';
import {Releases,Updates,registry,validateManifest,newer,atomicJson,updatePaths} from '../lib/updates.mjs';
import {cloneConfig} from '../lib/docker-engine.mjs';
import {DockerTransaction} from '../lib/update-docker-transaction.mjs';

const manifest={format:1,version:'0.1.6',commit:'a'.repeat(40),image:registry+'@sha256:'+'b'.repeat(64),dataProtocol:1};
const release={tag_name:'v0.1.6',body:'Release notes',published_at:'2026-10-21T00:00:00Z',assets:[{name:'tellybox-update.json',browser_download_url:'https://github.com/BryanWalker321/Tellybox/releases/download/v0.1.6/tellybox-update.json'}]};
const fetcher=async url=>Response.json(url.includes('api.github.com')?release:manifest);
test('only compatible official stable releases can be installed',async()=>{
  assert.equal(newer('0.1.10','0.1.9'),true);assert.equal(newer('0.1.6','0.1.6'),false);
  for(const change of [{image:'evil.example/image@sha256:'+'b'.repeat(64)},{dataProtocol:2},{commit:'main'},{version:'../../media'}])assert.throws(()=>validateManifest({...manifest,...change},'0.1.6'));
  const releases=new Releases({fetcher});assert.equal((await releases.get()).ready,true);
  for(const change of [{draft:true},{prerelease:true},{tag_name:'v0.1.6-rc1'},{assets:[{...release.assets[0],browser_download_url:'https://example.com/manifest'}]}]){
    const invalid=new Releases({fetcher:async()=>Response.json({...release,...change})});assert.ok((await invalid.get()).error);
  }
  const pending=new Releases({fetcher:async()=>Response.json({...release,assets:[]})});assert.equal((await pending.get()).ready,false);
});
test('release caching avoids repeat requests and keeps offline errors visible',async()=>{
  let now=1000,calls=0,offline=false;
  const releases=new Releases({clock:()=>now,fetcher:async url=>{calls++;if(offline)throw Error('offline');return fetcher(url);}});
  await Promise.all([releases.get(),releases.get()]);assert.equal(calls,2);
  await releases.get();assert.equal(calls,2);offline=true;now+=7*3600000;
  const state=await releases.get();assert.ok(state.error);assert.equal(state.version,'0.1.6');
});
test('update queue leaves media, catalogue, schedules and settings byte-identical',async t=>{
  const dir=await mkdtemp(path.join(os.tmpdir(),'tellybox update data '));t.after(()=>rm(dir,{recursive:true,force:true}));
  const media=path.join(dir,'media');await mkdir(media);
  const files={'media/owner video.mp4':Buffer.from(Array.from({length:65536},(_,i)=>i%256)),'catalogue.json':JSON.stringify({channels:[{name:'My channel',programmes:[{title:'My programme',url:'/media/owner video.mp4'}]}],epoch:'2026-01-01'}),'settings.json':'{"station":"Owner station","secret":"private"}','community.sqlite':Buffer.from('existing database bytes')};
  for(const [name,bytes] of Object.entries(files))await writeFile(path.join(dir,name),bytes);
  await writeFile(path.join(dir,'package.json'),'{"version":"0.1.5"}');
  const hash=async()=>Object.fromEntries(await Promise.all(Object.keys(files).map(async name=>[name,createHash('sha256').update(await readFile(path.join(dir,name))).digest('hex')])));
  const before=await hash(),env={TELLYBOX_UPDATE_MODE:'managed-node'},updates=new Updates({directory:dir,root:dir,env,fetcher});
  await assert.rejects(updates.install('0.1.6'),/managed updater/);
  await atomicJson(updatePaths(dir).agent,{mode:'managed-node',at:new Date().toISOString()});
  await assert.rejects(updates.install('0.1.7'),/Check for updates/);
  const result=await updates.install('0.1.6');assert.ok(result.id);
  await assert.rejects(updates.install('0.1.6'),/already/);
  assert.deepEqual(await hash(),before);
  const status=JSON.stringify(await updates.status());assert.ok(!status.includes(dir));assert.ok(!status.includes('private'));
});

function container(){return {Id:'1'.repeat(64),Name:'/station-web',Config:{Image:registry+':latest',User:'1000',Env:['DATA_DIR=/app/data','MEDIA_DIR=/app/media','PORT=4173','OWNER_SETTING=retained'],Cmd:['node','server.mjs'],Labels:{'com.docker.compose.project':'station','com.docker.compose.service':'tellybox'}},HostConfig:{Binds:['station-data:/app/data','/owner/media:/app/media:ro'],PortBindings:{'4173/tcp':[{HostIp:'127.0.0.1',HostPort:'4999'}]},RestartPolicy:{Name:'unless-stopped'}},Mounts:[{Type:'volume',Source:'/var/lib/docker/volumes/station-data/_data',Destination:'/app/data'},{Type:'bind',Source:'/owner/media',Destination:'/app/media',RW:false}],State:{Running:true},NetworkSettings:{Networks:{station_default:{Aliases:['tellybox']}}}};}
test('Docker replacement preserves every volume, media mount, setting, port and network',()=>{
  const original=container(),copy=cloneConfig(original,manifest.image,{'org.opencontainers.image.version':'0.1.6'});
  assert.deepEqual(copy.HostConfig.Binds,original.HostConfig.Binds);assert.deepEqual(copy.Env,original.Config.Env);assert.deepEqual(copy.HostConfig.PortBindings,original.HostConfig.PortBindings);
  assert.deepEqual(copy.NetworkingConfig.EndpointsConfig.station_default.Aliases,['tellybox']);assert.equal(copy.HostConfig.AutoRemove,false);
  assert.ok(!JSON.stringify(copy.HostConfig.Binds).includes('docker.sock'));
});
test('rollback never reports success when the old application cannot restart',async t=>{
  const dir=await mkdtemp(path.join(os.tmpdir(),'tellybox recovery '));t.after(()=>rm(dir,{recursive:true,force:true}));
  const old=container(),calls=[],engine={inspect:async()=>({...old,Name:'/station-web-rollback',State:{Running:false}}),call:async(method,route,body)=>{calls.push({method,route,body});},health:async()=>{throw Error('health failed');}};
  const journal={steps:[{oldId:old.Id,newId:'2'.repeat(64),name:'station-web',networks:{station_default:{}}}]};
  const tx=new DockerTransaction(engine,updatePaths(dir),{id:randomUUID()},journal);
  await tx.save();await assert.rejects(tx.rollback(),/health failed/);
  assert.ok(await readFile(updatePaths(dir).journal));
  assert.ok(calls.some(c=>c.route.includes('v=false')));assert.ok(!calls.some(c=>c.route.startsWith('/volumes/')));
});
test('recovery after a committed update does not resurrect removed old containers',async()=>{
  const tx=new DockerTransaction({inspect(){throw Error('must not touch old containers');}},null,{}, {committed:true,steps:[{oldId:'deleted'}]});
  await tx.rollback();
});
