import {programmesAt,listingsWindow} from '../lib/schedule.mjs';
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function channelSummary(channel){
 const items=[...new Map(channel.programmes.filter(p=>!p.playbackDisabled&&!p.isInterstitial&&!p.isTestCard&&!p.isPresentation).map(p=>[p.url+'|'+(p.sourceOffset||0),p])).values()];
 return {items,count:items.length,hours:Math.round(items.reduce((n,p)=>n+p.duration,0)/3600*10)/10};
}
export function createDirectory({root,detail,now,onTune}){
 let config,detailId;
 const description=c=>String(c.description||c.category||'Discover what’s on this channel.').replace(' without inserted interval media.','. No interruptions, and no adverts!').replace('No inserted adverts, continuity or intervals.','No interruptions, and no adverts!');
 const number=c=>String(c.number).padStart(2,'0');
 const clock=stamp=>new Date(stamp).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
 const stats=c=>{const s=channelSummary(c);return `${s.count.toLocaleString('en-GB')} PROGRAMMES · ${s.hours.toLocaleString('en-GB')} HOURS`;};
 const badge=c=>`<span class="directory-badge" aria-hidden="true">${number(c)}</span>`;
 function showing(c){
  if(['offline','technical'].includes(c.status)||!channelSummary(c).count)return '<p class="directory-offline">Currently off air</p>';
  const slot=programmesAt(c,config.epoch,now(),1)[0];
  return `<p class="directory-now"><span>${slot.start>now()?'UP NEXT · '+clock(slot.start):'NOW PLAYING'}</span><strong>${escape(slot.programme.title)}</strong></p>`;
 }
 function render(){
  if(!config)return;
  root.innerHTML=[...config.channels].sort((a,b)=>a.number-b.number).map(c=>`<article class="directory-card" style="--channel:${c.colour}"><header>${badge(c)}<div><h2>${escape(c.name)}</h2><p>${escape(c.category||c.tagline||'Archive television')}</p></div></header><p class="directory-description">${escape(description(c))}</p><p class="directory-stats">${stats(c)}</p><div class="directory-card-bottom">${showing(c)}<div class="directory-actions"><button class="primary" data-directory-tune="${c.id}" ${!channelSummary(c).count||['offline','technical'].includes(c.status)?'disabled':''} aria-label="Tune in to ${escape(c.name)}">▶ Tune in</button><a href="#channel/${c.id}" aria-label="View channel ${escape(c.name)}">View channel ↗</a></div></div></article>`).join('');
  if(detailId)renderDetail(detailId);
 }
 function renderDetail(id){
  detailId=id;if(!config)return;
  const c=config.channels.find(c=>c.id===id);
  if(!c){detail.innerHTML='<h1>Channel not found</h1><a href="#directory">Back to directory</a>';return;}
  const summary=channelSummary(c),slots=listingsWindow(c,config.epoch,now(),now()+24*3600000);
  detail.innerHTML=`<a class="directory-back" href="#directory">← All channels</a><header class="directory-detail-heading" style="--channel:${c.colour}">${badge(c)}<div><p class="eyebrow">${escape(c.category||c.tagline||'Archive television')}</p><h1>${escape(c.name)}</h1></div></header><p class="directory-detail-description">${escape(description(c))}</p><p class="directory-stats">${stats(c)}</p>${showing(c)}<button class="primary" data-directory-tune="${c.id}" ${!summary.count||['offline','technical'].includes(c.status)?'disabled':''}>▶ Tune in to ${escape(c.name)}</button><section class="directory-upcoming"><h2>On this channel</h2><p class="page-description">The next 24 hours. All times are local.</p><ol>${slots.map(s=>`<li><time>${s.start<=now()?'On now':clock(s.start)}</time><strong>${escape(s.programme.title)}</strong></li>`).join('')}</ol></section>`;
 }
 function click(event){const button=event.target.closest('[data-directory-tune]');if(!button)return;const c=config?.channels.find(c=>c.id===button.dataset.directoryTune);if(c)onTune(c);}
 root.addEventListener('click',click);detail.addEventListener('click',click);
 return {install(next){config=next;render();},render,showChannel:renderDetail};
}
