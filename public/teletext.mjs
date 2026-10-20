import {programmesAt} from '../lib/schedule.mjs';
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ascii=value=>String(value??'').replace(/[’‘]/g,"'").replace(/[–—]/g,'-').replace(/\s+/g,' ').toUpperCase();
export function teletextLine(value,width=40){const text=ascii(value);return text.length<=width?text:text.slice(0,width-3).replace(/\s+\S*$/,'')+'...';}
const line=(text,colour='white',extra='')=>`<div class="tt-row tt-${colour} ${extra}">${escape(text||' ')}</div>`;
const link=(label,page,colour='yellow')=>`<button type="button" class="tt-index-link tt-${colour}" data-page="${page}"><span>${escape(label)}</span><span>${page}</span></button>`;
const clock=value=>new Date(value).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
const mosaic=`<svg class="tt-mosaic" viewBox="0 0 32 24" aria-hidden="true" shape-rendering="crispEdges"><path fill="#ff0" d="M0 20h32v4H0zM3 4h26v16H3z"/><path fill="#00f" d="M5 6h20v12H5z"/><path fill="#0ff" d="M7 8h16v8H7z"/><path fill="#000" d="M9 8h12v8H9zM7 20h4v2H7zM23 20h4v2h-4zM10 0h2v2h2v2h-2V2h-2zM20 0h2v2h-2v2h-2V2h2z"/><path fill="#fff" d="M11 10h3v4h-3zM17 10h3v4h-3zM27 8h2v2h-2zM27 12h2v2h-2z"/></svg>`;
function wrap(text,width=40){const result=[];let row='';for(const word of ascii(text).split(' ')){if((row+' '+word).trim().length>width&&row){result.push(row);row=word;}else row=(row+' '+word).trim();}if(row)result.push(row);return result;}
export function buildTeletext(config,page='100',stamp=Date.now(),requestedSubpage=0){
 const channels=[...config.channels].sort((a,b)=>a.number-b.number),perPage=6;
 const scheduleChannel=/^3\d\d$/.test(page)?channels[Number(page)-301]:null;
 let entries=[];
 if(page==='601'||page==='602')entries=channels.map(c=>{const list=programmesAt(c,config.epoch,stamp,2);return {channel:c,slot:page==='601'?list[0]:list.find(s=>s.start>stamp)||list[1]};});
 if(page==='200'||page==='300')entries=channels;
 if(scheduleChannel)entries=programmesAt(scheduleChannel,config.epoch,stamp,36).filter(s=>s.start<stamp+24*3600000);
 const pageSize=scheduleChannel?7:page==='300'?12:perPage,subpages=Math.max(1,Math.ceil(entries.length/pageSize)),subpage=Math.max(0,Math.min(subpages-1,requestedSubpage));
 const marker=`${subpage+1}/${subpages}`;let body='',heading='MAIN INDEX';
 if(page==='100'){
  body=line('GOOD TELEVISION. ANY TIME.','cyan')+line('STATION INDEX                  PAGE','white')+`<div class="tt-index-columns"><div>${link('TV NOW','601')}${link('TV NEXT','602')}${link('CHANNELS','200')}${link('TV LISTINGS','300')}</div><div>${link('WELCOME','150','cyan')}${link('HOW TO WATCH','160','cyan')}${link('HELP / INDEX','199','cyan')}${link('MAIN INDEX','100','cyan')}</div></div>`+line(' ')+`<div class="tt-feature"><div>${line('ON YOUR TELLY','yellow')}${line('OLD FAVOURITES','cyan')}${line('NEW DISCOVERIES','cyan')}${line('SHARED LIVE TV','white')}${line('TV LISTINGS 300','yellow')}</div>${mosaic}</div>`+line('PRESS A COLOUR OR KEY IN A PAGE','green');
 }else if(page==='601'||page==='602'){
  heading=page==='601'?'TELEVISION NOW':'TELEVISION NEXT';body=line('CH  CHANNEL                   START','cyan');
  for(const {channel:c,slot:s} of entries.slice(subpage*pageSize,(subpage+1)*pageSize)){const left=String(c.number).padStart(2,'0')+' '+teletextLine(c.name,27);body+=`<button type="button" class="tt-programme-link" data-tt-channel="${escape(c.id)}" aria-label="Tune in to ${escape(c.name)}">${line(left.padEnd(33)+clock(s.start),'yellow')}${line(' '+teletextLine(s.programme.title,38))}</button>`;}
  body+=line(' ')+line('SELECT A CHANNEL TO WATCH LIVE','green');
 }else if(page==='200'||page==='300'){
  heading=page==='200'?'CHANNEL DIRECTORY':'TV LISTINGS INDEX';const rows=entries.slice(subpage*pageSize,(subpage+1)*pageSize);
  body=line('YOUR STATION - EVERY CHANNEL','cyan')+line(' ');
  for(const c of rows){const n=channels.indexOf(c)+301;body+=link(teletextLine(String(c.number).padStart(2,'0')+' '+c.name,33),String(n));}
  body+=line(' ')+line('SELECT A PAGE FOR THE RUNNING ORDER','green');
 }else if(scheduleChannel){
  heading=teletextLine(scheduleChannel.name,31);body=line('TIME  PROGRAMME','cyan');
  for(const s of entries.slice(subpage*pageSize,(subpage+1)*pageSize)){body+=line(clock(s.start)+' '+teletextLine(s.programme.title,33),'yellow')+line(s.start<=stamp?'      ON NOW':' ');}
  body+=line('GUIDE TIMES ARE LOCAL TO YOUR DEVICE','cyan');
 }else if(page==='150'){
  heading='WELCOME TO YOUR STATION';body=line('A LITTLE TELEVISION.','yellow')+line('FROM ANOTHER TIME.','yellow')+line(' ')+wrap(config.brand.description||'Your collection, your channels, your television station.').slice(0,5).map(t=>line(t,'cyan')).join('')+line(' ')+wrap('Everyone joins the same live schedule. Choose a channel, settle in and see what comes next.').map(t=>line(t)).join('')+line(' ')+line('FIND YOUR NEXT PROGRAMME ON PAGE 602','green');
 }else if(page==='160'){
  heading='HOW TO WATCH';body=line('ON YOUR COMPUTER OR PHONE','yellow')+line('SELECT LIVE FROM THE TOP MENU.')+line('PICK A CHANNEL AND PRESS PLAY.')+line(' ')+line('ON YOUR IPTV PLAYER','yellow')+line('OPEN THE STATION IPTV PLAYLIST.')+line('SETUP HELP IS IN HOST YOUR OWN.')+line(' ')+line('SAME CHANNEL. SAME MOMENT.','cyan')+line('YOU MAY JOIN A PROGRAMME IN PROGRESS.')+line(' ')+line('NO ACCOUNT IS NEEDED TO WATCH.','green');
 }else if(page==='199'){
  heading='HELP / A-Z INDEX';body=line('HOW TO USE THIS SERVICE','cyan')+line(' ')+link('CHANNEL DIRECTORY','200')+link('HOW TO WATCH','160')+link('MAIN INDEX','100')+link('STATION INFORMATION','150')+link('TV LISTINGS','300')+link('WHAT IS ON NOW','601')+link('WHAT IS ON NEXT','602')+line(' ')+line('TYPE THREE DIGITS TO CHANGE PAGE.')+line('USE THE ARROWS FOR MORE SUBPAGES.')+line('BLUE SWITCHES AUTOMATIC PAGES ON/OFF.','green');
 }else{heading='PAGE NOT AVAILABLE';body=line('SORRY - THIS PAGE IS NOT IN SERVICE.','yellow')+line(' ')+line('PRESS RED OR ENTER 100 FOR THE INDEX.','cyan');}
 const title=ascii(config.brand.name||'Tellybox');
 const html=`<div class="tt-banner"><span class="tt-box-mark" aria-hidden="true">T B</span><strong style="font-size:${Math.min(12,210/Math.max(title.length,1))}cqw">${escape(title)}</strong></div><div class="tt-strap">YOUR WORLD AT THE TOUCH OF A BUTTON</div><div class="tt-section"><strong>${escape(heading)}</strong><span>${marker}</span></div><div class="tt-page-body">${body}</div><div class="tt-slogan">${escape(teletextLine(config.brand.name+': THERE\'S ALWAYS SOMETHING ON',40))}</div>`;
 return {html,subpages,subpage};
}
