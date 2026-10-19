import { readFile, writeFile, stat } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { RelayManager } from '../lib/relay.mjs';
import { providerOf, ProviderResolver } from '../lib/providers.mjs';
const catalogue = JSON.parse(await readFile(process.argv[2] || 'data/catalogue.json', 'utf8'));
const reportPath = process.argv[3] || 'docs/provider-relay-audit.json';
const sources = new Map();
for (const channel of catalogue.channels) for (const p of [...channel.programmes, ...(channel.schedule?.breaks || [])]) if (!p.playbackDisabled && providerOf(p.url) && !sources.has(p.url)) sources.set(p.url, p);
const candidate = path.resolve(process.env.YOUTUBE_COOKIE_FILE || path.join(process.env.DATA_DIR || 'data','youtube-cookies.txt'));
let cookieFile = ''; try { if ((await stat(candidate)).isFile()) cookieFile = candidate; } catch (err) { if (err.code !== 'ENOENT') throw err; }
const relay = new RelayManager({mediaRoot:path.resolve('media'), testCard:path.resolve('public/test-card-f.jpg'), resolver:new ProviderResolver({cookieFile})});
const limit = process.argv[4] === undefined ? sources.size : Number(process.argv[4]);
if (!Number.isInteger(limit) || limit < 0) throw Error('Optional fourth argument must be a source limit.');
const selected = [...sources.values()].slice(0,limit), selectedUrls = new Set(selected.map(p=>p.url));
let previous; if (process.env.PROVIDER_AUDIT_RESUME === '1') { try { previous=JSON.parse(await readFile(reportPath,'utf8')); } catch(e) { if(e.code!=='ENOENT')throw e; } }
const completed = new Map((previous?.results || []).filter(r=>selectedUrls.has(r.url)).map(r=>[r.url,r]));
const queue = selected.filter(p=>!completed.has(p.url));
const report = {startedAt:previous?.startedAt || new Date().toISOString(), resumedAt:previous?new Date().toISOString():undefined, total:sources.size, requested:selected.length, authentication:cookieFile?'configured-session':'anonymous', results:[...completed.values()]};
let cursor = 0, consecutiveFailures = 0, halted = false, nextStart = Date.now(), saving = Promise.resolve();
async function pacedStart() { const stamp=Math.max(nextStart,Date.now());nextStart=stamp+8000; const wait=stamp-Date.now();if(wait>0)await new Promise(resolve=>setTimeout(resolve,wait));return !halted; }
async function save() { const text=JSON.stringify(report,null,2);saving=saving.then(()=>writeFile(reportPath,text));await saving; }
function decode(bytes) { return new Promise(resolve => {
  const child = spawn('ffmpeg', ['-v','error','-i','pipe:0','-frames:v','1','-f','null','-'], {windowsHide:true,stdio:['pipe','ignore','ignore']});
  const timer = setTimeout(() => {child.kill();resolve(false);},20000);
  child.on('error',()=>{clearTimeout(timer);resolve(false);}); child.on('close',code=>{clearTimeout(timer);resolve(code===0);}); child.stdin.on('error',()=>{});child.stdin.end(bytes);
}); }
try {
  await Promise.all(Array.from({length:2}, async (_,worker) => {
    while(!halted && cursor<queue.length) {
      const p=queue[cursor++], channel={id:'source-audit-'+worker,name:'Source audit',number:1,programmes:[{...p,duration:3600}]};
      if(!await pacedStart())break;
      let result={url:p.url,title:p.title};
      try {
        const offset=Math.min(3, Math.max(0,p.duration/10));
        const epoch=new Date(Date.now()-offset*1000).toISOString();
        const playlist=(await relay.file(channel,epoch,'index.m3u8')).toString();
        const state=relay.states.get(channel.id), segment=playlist.match(/segment\d+\.ts/)?.[0];
        if(state.playbackKind!=='programme'||!segment) throw Error('Source fell back to the technical card');
        const bytes=await relay.file(channel,epoch,segment);
        if(!await decode(bytes)||state.playbackKind!=='programme') throw Error('Programme video did not decode');
        result={...result,result:'passed',decodedBytes:bytes.length};
      } catch(e) { result={...result,result:'unverified',reason:e.message}; }
      finally { await relay.stop(channel.id); }
      report.results.push({...result,checkedAt:new Date().toISOString()});
      await save();
      console.log(`${report.results.length}/${report.total} ${result.result} ${p.title}`);
      consecutiveFailures = result.result === 'passed' ? 0 : consecutiveFailures + 1;
      if (consecutiveFailures >= 3) { report.stoppedReason = 'Paused after three consecutive unverified sources. Check the session/provider before resuming.'; halted = true; break; }
    }
  }));
} finally { await relay.close(); }
report.finishedAt=new Date().toISOString(); report.remaining=selected.length-report.results.length;
if (!report.remaining) report.completedAt=report.finishedAt;
await save();
