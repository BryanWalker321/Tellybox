import {renderTeletextModel} from './teletext-render.mjs';
import {setupTeletextKeyboard} from './teletext-keyboard.mjs';
import {setupTeletextFullscreen} from './teletext-fullscreen.mjs';
const $=id=>document.getElementById(id),query=new URLSearchParams(location.search);
let snapshot,page=/^[1-8]\d\d$/.test(query.get('page'))?query.get('page'):'100',subpage=0,auto=false,last,clockOffset=0,refreshing=false,turnedAt=0;
const now=()=>Date.now()+clockOffset;
function go(value){page=value;subpage=0;turnedAt=now();render();const url=new URL(location);url.searchParams.set('page',page);history.replaceState(null,'',url);}
function render(){if(!snapshot)return;const entry=snapshot.pages.find(p=>p.page===page);subpage=Math.max(0,Math.min((entry?.subpages.length||1)-1,subpage));last=entry?.subpages[subpage]||{page,heading:'PAGE NOT AVAILABLE',rows:[{text:'PRESS RED FOR THE MAIN INDEX',colour:'yellow'}],links:[{label:'Index',page:'100'},{label:'News',page:'101'},{label:'Sport',page:'123'},{label:'Quiz',page:'400'}],subpage:0,subpages:1};
 if(Number(page)>=400&&Number(page)<=414)auto=false;
 $('tt-content').innerHTML=renderTeletextModel({name:snapshot.station},last,{external:true});$('tt-page').textContent='P'+page;$('tt-brand').textContent=snapshot.station.toUpperCase();
 document.querySelectorAll('.teletext-nav button').forEach((b,i)=>{b.dataset.page=last.links[i].page;b.textContent=last.links[i].label;});
 $('tt-subpage').textContent=`${subpage+1}/${last.subpages}`;$('tt-previous').disabled=subpage===0;$('tt-next').disabled=subpage===last.subpages-1;
}
async function refresh(){if(refreshing)return;refreshing=true;try{const before=Date.now(),response=await fetch('/api/teletext',{cache:'no-store',signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error();snapshot=await response.json();if(!turnedAt)turnedAt=now();clockOffset=Date.parse(response.headers.get('date')||'')-(before+Date.now())/2;if(!Number.isFinite(clockOffset))clockOffset=0;render();}catch{if(snapshot){render();const notice=document.createElement('div');notice.className='tt-row tt-yellow';notice.textContent='CACHED - CONNECTION UNAVAILABLE';$('tt-content .tt-page-body').prepend(notice);}else $('tt-content').textContent='Teletext temporarily unavailable. Retrying shortly.';}finally{refreshing=false,turnedAt=0;}}
document.querySelector('#teletext').addEventListener('click',e=>{const target=e.target.closest('[data-page]');if(target)go(target.dataset.page);});
$('tt-input').addEventListener('input',e=>{e.target.value=e.target.value.replace(/\D/g,'');if(e.target.value.length===3){go(e.target.value);e.target.value='';}});
const move=step=>document.querySelectorAll('.teletext-nav button')[step<0?1:2].click();$('tt-previous').onclick=()=>move(-1);$('tt-next').onclick=()=>move(1);
setupTeletextFullscreen();setupTeletextKeyboard({go,colour:i=>document.querySelectorAll('.teletext-nav button')[i].click(),subpage:move,fullscreen:()=>$('tt-fullscreen').click()});
let shownDay='';setInterval(()=>{const stamp=now(),day=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London'}).format(stamp);$('tt-clock').textContent=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(stamp);if(day!==shownDay){const previous=shownDay;shownDay=day;if(previous)void refresh();else render();}if(last?.autoRotate&&now()-turnedAt>=10000){const entry=snapshot.pages.find(p=>p.page===page);subpage=(subpage+1)%entry.subpages.length;turnedAt=now();render();}if(auto){const sequence=['100','601','602','150'],next=sequence[Math.floor(stamp/15000)%sequence.length];if(page!==next)go(next);}},1000);
void refresh();setInterval(refresh,60000);
