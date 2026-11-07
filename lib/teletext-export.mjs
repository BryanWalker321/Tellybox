import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {quizDay} from '../public/teletext-quiz.mjs';
import {specialPage,text,wrap} from '../public/teletext-pages.mjs';
import {programmesAt} from './schedule.mjs';
import {colourNavigation} from './teletext-navigation.mjs';
const row=(value,colour='white',page)=>({text:text(value).slice(0,38),colour,...(page?{page:String(page)}:{})});
const link=(label,page)=>({label,page:String(page)});
const baseLinks=[link('Index',100),link('TV now',601),link('TV next',602),link('Help',199)];
const clock=value=>new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',hour:'2-digit',minute:'2-digit',hour12:false}).format(value);
export function pageNumbers(config){return [...new Set([100,...Array.from({length:45},(_,i)=>101+i),150,160,199,200,300,...config.channels.map((_,i)=>301+i),...Array.from({length:15},(_,i)=>400+i),601,602])].sort((a,b)=>a-b).map(String);}
export function exportPage(config,page,stamp,sources,requested=0){
 const special=specialPage(page,sources,stamp,requested);if(special)return special;
 const channels=[...config.channels];let heading='MAIN INDEX',content=[],links=baseLinks;
 const entry=(label,target)=>row(String(target)+' '+label,'yellow',target);
 if(page==='100'){content=[row('GOOD TELEVISION. ANY TIME.','cyan'),entry('NEWS INDEX',101),entry('SPORT INDEX',123),entry('WEATHER',145),entry('DAILY QUIZ',400),entry('CHANNELS',200),entry('TV LISTINGS',300),entry('TV NOW',601),entry('TV NEXT',602),entry('WELCOME',150),entry('HOW TO WATCH',160),entry('HELP',199)];}
 else if(page==='200'||page==='300'){heading=page==='200'?'CHANNEL DIRECTORY':'TV LISTINGS INDEX';content=channels.map((c,i)=>entry(c.number+' '+c.name,301+i));}
 else if(page==='601'||page==='602'){heading=page==='601'?'TELEVISION NOW':'TELEVISION NEXT';for(const c of channels){const slots=programmesAt(c,config.epoch,stamp,2),slot=page==='601'?slots[0]:slots.find(s=>s.start>stamp)||slots[1];if(slot)content.push({...row(c.number+' '+c.name,'yellow'),channel:c.id},...wrap(clock(slot.start)+' '+slot.programme.title).map(t=>({...row(t),channel:c.id})));}}
 else if(/^3\d\d$/.test(page)&&channels[Number(page)-301]){const c=channels[Number(page)-301];heading=text(c.name).slice(0,38);content=programmesAt(c,config.epoch,stamp,36).filter(s=>s.start<stamp+86400000).flatMap(s=>wrap(clock(s.start)+' '+s.programme.title).map(t=>row(t,'yellow')));content.push(row('TIMES: EUROPE/LONDON','cyan'));}
 else if(page==='150'){heading='WELCOME TO YOUR STATION';content=[...wrap(config.brand.description||'Your collection, your channels, your television station.').map(t=>row(t,'cyan')),row(''),...wrap('Everyone joins the same live schedule. Choose a channel and see what comes next.').map(t=>row(t)),entry('TV NEXT',602)];}
 else if(page==='160'){heading='HOW TO WATCH';content=[row('ON YOUR COMPUTER OR PHONE','yellow'),{...row('TELLY-BOX.UK','cyan'),sourceUrl:'https://telly-box.uk'},row('SELECT LIVE FROM THE TOP MENU.'),row('PICK A CHANNEL AND PRESS PLAY.'),row(''),row('ON YOUR IPTV PLAYER','yellow'),{...row('TELLY-BOX.UK/CHANNELS.M3U','cyan'),sourceUrl:'https://telly-box.uk/channels.m3u'},row('IMPORT THE STATION IPTV PLAYLIST.'),row('SETUP HELP IS IN HOST YOUR OWN.'),row(''),row('SAME CHANNEL. SAME MOMENT.','cyan'),row('YOU MAY JOIN A PROGRAMME IN PROGRESS.'),row(''),row('NO ACCOUNT IS NEEDED TO WATCH.','green')];}
 else if(page==='199'){heading='HELP / INDEX';content=[...wrap('Type three digits to choose a page. Use coloured keys for the links below. Green goes back; yellow goes forward. Index screens rotate every 10 seconds.').map(t=>row(t)),row(''),entry('NEWS',101),entry('SPORT',123),entry('WEATHER',145),entry('QUIZ',400),entry('LISTINGS',300),entry('MAIN INDEX',100)];}
 else return null;
 const subpages=Math.max(1,Math.ceil(content.length/18)),subpage=Math.max(0,Math.min(subpages-1,Math.trunc(Number(requested))||0));
 return {page,heading,rows:content.slice(subpage*18,(subpage+1)*18),links,subpage,subpages};
}
const codes={red:'A',green:'B',yellow:'C',blue:'D',magenta:'E',cyan:'F',white:'G'};
const encoded=value=>text(value).replace(/£/g,'#');
export function ttiFile(brand,models){
 const lines=['DE,'+encoded(brand)+' TELETEXT'];
 for(const [screen,m] of models.entries()){lines.push('PN,'+m.page+String(screen).padStart(2,'0'),'SC,0000','PS,'+(m.autoRotate?'8010':'8000'),'CT,10,T','RE,0','OL,0,'+(encoded(brand).slice(0,15).padEnd(15)+' '+m.page+' '+String(m.subpage+1).padStart(2,'0')+'/'+String(m.subpages).padStart(2,'0')).padEnd(32));
  const output=[row(m.heading,'yellow'),row('--------------------------------------','blue'),...m.rows];
  for(let i=0;i<22;i++){const r=output[i]||row('');lines.push('OL,'+(i+1)+',\x1b'+(codes[r.colour]||'G')+encoded(r.text).slice(0,38).padEnd(38));}
  const nav=m.links.map(l=>encoded(l.label).slice(0,8).padEnd(9));lines.push('OL,24,'+nav.map((s,i)=>'\x1b'+codes[['red','green','yellow','blue'][i]]+s).join(''),'FL,'+m.links.map(l=>l.page).join(',')+',100,199');
 }
 return Buffer.from(lines.join('\r\n')+'\r\n','ascii');
}
function tarEntry(name,bytes){const header=Buffer.alloc(512);header.write(name,0,100,'ascii');header.write('0000644\0',100,8);header.write('0000000\0',108,8);header.write('0000000\0',116,8);header.write(bytes.length.toString(8).padStart(11,'0')+'\0',124,12);header.write('00000000000\0',136,12);header.fill(32,148,156);header[156]=48;header.write('ustar\0',257,6);header.write('00',263,2);const sum=header.reduce((a,b)=>a+b,0);header.write(sum.toString(8).padStart(6,'0')+'\0 ',148,8);return [header,bytes,Buffer.alloc((512-bytes.length%512)%512)];}
export function createTeletextSnapshot(config,sources,stamp=Date.now(),navigationTargets){
 const basePages=[],files=new Map();
 for(const number of pageNumbers(config)){const first=exportPage(config,number,stamp,sources);if(!first)continue;const subpages=[first];for(let i=1;i<first.subpages;i++)subpages.push(exportPage(config,number,stamp,sources,i));basePages.push({page:number,subpages});}
 const pages=colourNavigation(basePages,navigationTargets);for(const entry of pages)files.set(entry.page+'.tti',ttiFile(config.brand.name,entry.subpages));
 const manifest={format:'tellytext-tti-v1',generatedAt:new Date(stamp).toISOString(),station:config.brand.name,timezone:'Europe/London',files:[...files].map(([name,bytes])=>({name,sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length}))};
 manifest.revision=createHash('sha256').update(JSON.stringify(manifest.files)).digest('hex').slice(0,24);
 const manifestBytes=Buffer.from(JSON.stringify(manifest,null,2)+'\n');const tar=Buffer.concat([...files].flatMap(([name,bytes])=>tarEntry(name,bytes)).concat(tarEntry('manifest.json',manifestBytes),[Buffer.alloc(1024)]));
 return {manifest,pages,files,tar};
}
export function createTeletextHandler({getConfig,getFeeds,clock=Date.now}){
 const navigationTargets=new Map();
 let cache,pending;const snapshot=async()=>{if(cache&&clock()<cache.validUntil&&quizDay(clock())===quizDay(cache.stamp))return cache.value;if(!pending)pending=(async()=>{const [config,feeds]=await Promise.all([getConfig(),getFeeds()]);const stamp=clock(),value=createTeletextSnapshot(config,feeds,stamp,navigationTargets),expiries=Object.values(feeds.feeds||{}).map(f=>Date.parse(f.expiresAt)).filter(Number.isFinite);cache={stamp,value,validUntil:Math.min(stamp+60000,...expiries)};return value;})().finally(()=>pending=null);return pending;};
 return async(req,res,url)=>{
  const path=url.pathname;
  if(path==='/teletext/update.py'){const body=await readFile(new URL('../scripts/update-teletext.py',import.meta.url));res.writeHead(200,{'Content-Type':'text/plain; charset=utf-8','Content-Disposition':'attachment; filename="update-teletext.py"','Content-Length':body.length});res.end(req.method==='HEAD'?undefined:body);return true;}
  if(!['/api/teletext','/teletext/manifest.json','/teletext/service.tar'].includes(path)&&!/^\/teletext\/pages\/[1-8]\d\d\.tti$/.test(path))return false;
  const data=await snapshot();res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Cache-Control','public, max-age='+Math.max(0,Math.min(30,Math.floor((cache.validUntil-clock())/1000))));res.setHeader('ETag','"'+data.manifest.revision+'"');
  if(req.headers['if-none-match']==='"'+data.manifest.revision+'"'){res.writeHead(304);res.end();return true;}
  if(url.searchParams.has('revision')&&url.searchParams.get('revision')!==data.manifest.revision){res.writeHead(409);res.end('Snapshot changed; refresh the manifest.');return true;}
  let body,type='application/json; charset=utf-8';
  if(path==='/api/teletext'){const wanted=url.searchParams.get('page'),pages=wanted?data.pages.filter(p=>p.page===wanted):data.pages;if(wanted&&!pages.length){res.writeHead(404);res.end('Unknown page');return true;}body=Buffer.from(JSON.stringify({...data.manifest,pages}));}
  else if(path.endsWith('manifest.json'))body=Buffer.from(JSON.stringify(data.manifest));
  else if(path.endsWith('.tar')){body=data.tar;type='application/x-tar';res.setHeader('Content-Disposition','attachment; filename="tellytext-service.tar"');}
  else{body=data.files.get(path.split('/').at(-1));type='text/plain; charset=us-ascii';if(!body){res.writeHead(404);res.end('Unknown page');return true;}}
  res.writeHead(200,{'Content-Type':type,'Content-Length':body.length});res.end(req.method==='HEAD'?undefined:body);return true;
 };
}
