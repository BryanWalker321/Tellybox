import {nativeTelevisionRows,mastheadRows,quizPortrait} from '../public/teletext-art.mjs';
import {holidayPage} from '../public/teletext-holidays.mjs';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {quizDay} from '../public/teletext-quiz.mjs';
import {specialPage,text,wrap} from '../public/teletext-pages.mjs';
import {programmesAt} from './schedule.mjs';
import {colourNavigation} from './teletext-navigation.mjs';
import {ukWeatherPage} from '../public/teletext-weather.mjs';
import {extraPage} from '../public/teletext-extras.mjs';
const row=(value,colour='white',page)=>({text:text(value).slice(0,38),colour,...(page?{page:String(page)}:{})});
const link=(label,page)=>({label,page:String(page)});
const baseLinks=[link('Index',100),link('TV now',601),link('TV next',602),link('Help',199)];
const clock=value=>new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',hour:'2-digit',minute:'2-digit',hour12:false}).format(value);
export function pageNumbers(config){return [...new Set([100,...Array.from({length:45},(_,i)=>101+i),146,147,150,160,170,180,199,200,...Array.from({length:21},(_,i)=>210+i),...Array.from({length:21},(_,i)=>250+i),300,...config.channels.map((_,i)=>301+i),...Array.from({length:15},(_,i)=>400+i),450,460,461,462,...Array.from({length:11},(_,i)=>500+i),601,602])].sort((a,b)=>a-b).map(String);}
export function exportPage(config,page,stamp,sources,requested=0){
 const special=specialPage(page,sources,stamp,requested)||extraPage(config,page,stamp,requested)||ukWeatherPage(page,sources,requested)||holidayPage(page,sources,stamp,requested);if(special)return special;
 const channels=[...config.channels];let heading='MAIN INDEX',content=[],links=baseLinks;
 const entry=(label,target)=>row(String(target)+' '+label,'yellow',target);
 if(page==='100'){
  const left=[['TV NOW',601],['TV NEXT',602],['NEWS',101],['BBC SPORT',123],['LONDON WEATHER',145],['UK WEATHER',146],['FINANCE',210],['ENTERTAINMENT',250],['HOLIDAYS',500],['DAILY QUIZ',400]],right=[['TONIGHT',170],['SPOTLIGHT',180],['DAILY WORD',460],['QUIZ ANSWERS',450],['CHANNELS',200],['TV LISTINGS',300],['WELCOME',150],['HOW TO WATCH',160],['HELP / INDEX',199]];
  content=[row('GOOD TELEVISION. ANY TIME.','cyan'),row('STATION INDEX                  PAGE')];
  for(let i=0;i<10;i++){const segments=[];for(const [column,colour] of [[left,'yellow'],[right,'cyan']]){const item=column[i];if(item)segments.push({text:item[0].padEnd(14),colour,page:String(item[1])},{text:String(item[1])+' ',colour:'white',page:String(item[1])});else segments.push({text:' '.repeat(19),colour:'black'});}content.push({text:'',segments});}
  for(const [i,art] of nativeTelevisionRows.entries())content.push({text:'',segments:[{text:['','ON YOUR TELLY','OLD FAVOURITES','TV LISTINGS 300','PRESS A COLOUR / PAGE'][i].padEnd(25),colour:i===4?'green':i===2?'cyan':'yellow'},art]});
 }
 else if(page==='200'||page==='300'){heading=page==='200'?'CHANNEL DIRECTORY':'TV LISTINGS INDEX';content=channels.map((c,i)=>entry(c.number+' '+c.name,301+i));}
 else if(page==='601'||page==='602'){heading=page==='601'?'TELEVISION NOW':'TELEVISION NEXT';for(const c of channels){const slots=programmesAt(c,config.epoch,stamp,2),slot=page==='601'?slots[0]:slots.find(s=>s.start>stamp)||slots[1];if(slot)content.push({...row(c.number+' '+c.name,'yellow'),channel:c.id},...wrap(clock(slot.start)+' '+slot.programme.title).map(t=>({...row(t),channel:c.id})));}}
 else if(/^3\d\d$/.test(page)&&channels[Number(page)-301]){const c=channels[Number(page)-301];heading=text(c.name).slice(0,38);content=programmesAt(c,config.epoch,stamp,36).filter(s=>s.start<stamp+86400000).flatMap(s=>wrap(clock(s.start)+' '+s.programme.title).map(t=>row(t,'yellow')));content.push(row('TIMES: EUROPE/LONDON','cyan'));}
 else if(page==='150'){heading='WELCOME TO YOUR STATION';content=[...wrap(config.brand.description||'Your collection, your channels, your television station.').map(t=>row(t,'cyan')),row(''),...wrap('Everyone joins the same live schedule. Choose a channel and see what comes next.').map(t=>row(t)),entry('TV NEXT',602)];}
 else if(page==='160'){heading='HOW TO WATCH';content=[row('ON YOUR COMPUTER OR PHONE','yellow'),{...row('TELLY-BOX.UK','cyan'),sourceUrl:'https://telly-box.uk'},row('SELECT LIVE FROM THE TOP MENU.'),row('PICK A CHANNEL AND PRESS PLAY.'),row(''),row('ON YOUR IPTV PLAYER','yellow'),{...row('TELLY-BOX.UK/CHANNELS.M3U','cyan'),sourceUrl:'https://telly-box.uk/channels.m3u'},row('IMPORT THE STATION IPTV PLAYLIST.'),row('SETUP HELP IS IN HOST YOUR OWN.'),row(''),row('SAME CHANNEL. SAME MOMENT.','cyan'),row('YOU MAY JOIN A PROGRAMME IN PROGRESS.'),row(''),row('NO ACCOUNT IS NEEDED TO WATCH.','green')];}
 else if(page==='199'){heading='HELP / INDEX';content=[...wrap('Type three digits to choose a page. Use coloured keys for the links below. Green goes back; yellow goes forward. Index screens rotate every 10 seconds.').map(t=>row(t)),row(''),entry('NEWS',101),entry('SPORT',123),entry('UK WEATHER',146),entry('FINANCE',210),entry('ENTERTAINMENT',250),entry('HOLIDAYS',500),entry('QUIZ',400),entry('LISTINGS',300),entry('MAIN INDEX',100)];}
 else return null;
 const subpages=Math.max(1,Math.ceil(content.length/17)),subpage=Math.max(0,Math.min(subpages-1,Math.trunc(Number(requested))||0));
 return {page,heading,rows:content.slice(subpage*17,(subpage+1)*17),links,subpage,subpages};
}
const codes={black:'@',red:'A',green:'B',yellow:'C',blue:'D',magenta:'E',cyan:'F',white:'G'};
const encoded=value=>text(value).replace(/£/g,'#');
// Header has 32 broadcast text cells; the receiver owns the first eight.
// VBIT substitutes these tokens from its local clock at transmission time.
export function ttiHeader(brand){const title=(encoded(brand)+' TEXT').slice(0,13).padEnd(13);return '\x1bB'+title+'\x1bG%%a%d%%b %H:%M:%S';}
const encodedLine=value=>String(value??'').split(/( +)/).map(s=>/^ +$/.test(s)?s:encoded(s)).join('');
const ttiRow=r=>r.segments?r.segments.map(s=>s.cells?s.cells.map(c=>c<32?'\x1b'+String.fromCharCode(64+c):String.fromCharCode(c)).join(''):s.mosaic?'\x1b'+String.fromCharCode(0x50+['black','red','green','yellow','blue','magenta','cyan','white'].indexOf(s.colour))+s.mosaic.map(b=>String.fromCharCode(0x20+(b&31)+((b&32)?0x40:0))).join(''):'\x1b'+(codes[s.colour]||'G')+String(s.text).replace(/£/g,'#')).join(''):r.mosaic?'\x1b'+String.fromCharCode(0x50+(['black','red','green','yellow','blue','magenta','cyan','white'].indexOf(r.colour)))+r.mosaic.map(b=>String.fromCharCode(0x20+(b&31)+((b&32)?0x40:0))).join(''):'\x1b'+(codes[r.colour]||'G')+encodedLine(r.text).slice(0,38).padEnd(38);
function receiverBody(m){
 if(m.kind!=='quiz')return m.rows;
 if(m.question){const q=m.question,question=wrap(q.question,18),out=[row('Q'+(m.questionIndex+1)+'/12 - '+q.category,'cyan')];for(let i=0;i<Math.max(question.length,quizPortrait.length);i++)out.push({text:'',segments:[{text:(question[i]||'').padEnd(18),colour:'yellow'},...(quizPortrait[i]?[quizPortrait[i]]:[])]});q.answers.forEach((a,i)=>out.push(...wrap(String.fromCharCode(65+i)+'. '+a).map(t=>row(t,['red','green','yellow','blue'][i]))));out.push(row('ONE WRONG - BACK TO THE START!','cyan'));return out;}
 const message=wrap(m.page==='400'?'12 questions. Choose a colour. Wrong answer: page 414. Red restarts page 401. A fresh quiz at UK midnight.':m.rows.map(r=>r.text).join(' '),18);
 const out=[row('BOX BAFFLER!','yellow'),row(m.page==='400'?'THE DAILY DOZEN':'','cyan')];
 for(let i=0;i<Math.max(message.length,quizPortrait.length);i++)out.push({text:'',segments:[{text:(message[i]||'').padEnd(18),colour:'white'},...(quizPortrait[i]?[quizPortrait[i]]:[])]});
 out.push(...wrap('Use the coloured keys or type a page.').map(t=>row(t,'cyan')),...wrap('The same daily quiz on web and TV.').map(t=>row(t,'cyan')),row(m.page==='400'?'PRESS RED TO START':'PRESS RED TO PLAY AGAIN','red'));return out;
}
export function ttiFile(brand,models){
 const lines=['DE,'+encoded(brand)+' TELETEXT'];
 for(const [screen,m] of models.entries()){
  lines.push('PN,'+m.page+String(screen).padStart(2,'0'),'SC,0000','PS,'+(m.autoRotate?'8010':'8000'),'CT,10,T','RE,0','OL,0,'+ttiHeader(brand));
  // Native Level 1 frame: three-row mosaic masthead, strap, section, 17 body
  // rows, slogan and Fastext footer. Same content and colours as the website.
  const marker=String(m.subpage+1)+'/'+String(m.subpages),section=encoded(m.heading).slice(0,37-marker.length).padEnd(38-marker.length)+'\x1bG'+marker;
  const mosaic=bits=>bits.map(b=>String.fromCharCode(0x20+(b&31)+((b&32)?0x40:0))).join('');for(const [i,art] of mastheadRows(encoded(brand)).entries())lines.push('OL,'+(i+1)+',\x1bD\x1b]\x1b@\x1b]\x1bW'+mosaic(art.logo)+'\x1bD\x1b]\x1bS'+mosaic(art.title)+' '.repeat(25-art.title.length));
  lines.push('OL,4,'+ttiRow(row('YOUR WORLD AT THE TOUCH OF A BUTTON','cyan')),'OL,5,\x1bC'+section);
  const body=receiverBody(m);if(body.length>17)throw Error('Native page body exceeds screen: '+m.page);for(let i=0;i<17;i++)lines.push('OL,'+(i+6)+','+ttiRow(body[i]||row('')));
  const slogan=(encoded(brand).slice(0,14)+': ALWAYS SOMETHING ON'),padding=Math.max(0,Math.floor((39-slogan.length)/2)-2);lines.push('OL,23,\x1bD\x1b]\x1bC'+(' '.repeat(padding)+slogan).padEnd(37));
  const nav=m.links.map(l=>encoded(l.label).slice(0,8).padEnd(9));lines.push('OL,24,'+nav.map((s,i)=>'\x1b'+codes[['red','green','yellow','blue'][i]]+s).join(''),'FL,'+m.links.map(l=>l.page).join(',')+',100,199');
 }
 return Buffer.from(lines.join('\r\n')+'\r\n','ascii');
}
function tarEntry(name,bytes){const header=Buffer.alloc(512);header.write(name,0,100,'ascii');header.write('0000644\0',100,8);header.write('0000000\0',108,8);header.write('0000000\0',116,8);header.write(bytes.length.toString(8).padStart(11,'0')+'\0',124,12);header.write('00000000000\0',136,12);header.fill(32,148,156);header[156]=48;header.write('ustar\0',257,6);header.write('00',263,2);const sum=header.reduce((a,b)=>a+b,0);header.write(sum.toString(8).padStart(6,'0')+'\0 ',148,8);return [header,bytes,Buffer.alloc((512-bytes.length%512)%512)];}
export function createTeletextSnapshot(config,sources,stamp=Date.now(),navigationTargets){
 const basePages=[],files=new Map();
 for(const number of pageNumbers(config)){const first=exportPage(config,number,stamp,sources);if(!first)continue;const subpages=[first];for(let i=1;i<first.subpages;i++)subpages.push(exportPage(config,number,stamp,sources,i));basePages.push({page:number,subpages});}
 const pages=colourNavigation(basePages,navigationTargets);for(const entry of pages)files.set(entry.page+'.tti',ttiFile(config.brand.name,entry.subpages));
 const manifest={format:'tellytext-tti-v1',vbitHeader:ttiHeader(config.brand.name),generatedAt:new Date(stamp).toISOString(),station:config.brand.name,timezone:'Europe/London',files:[...files].map(([name,bytes])=>({name,sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length}))};
 manifest.revision=createHash('sha256').update(JSON.stringify([manifest.vbitHeader,manifest.files])).digest('hex').slice(0,24);
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
