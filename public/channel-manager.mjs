import {createChannelViewers} from './channel-viewers.mjs';
import {browserId} from './browser-id.mjs';
import {overlayMenu} from './manager-menu.mjs';
import {runtime} from './programming-tools.mjs';
const make=(tag,text)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;return el;};
export function createChannelManager({root,heading,overview,editorNodes,getDraft,getChannel,selectChannel,changed,openProgramming,message}){
 let opened=false,base=location.origin;
 fetch('/api/network').then(r=>r.json()).then(n=>{if(n.base)base=n.base;}).catch(()=>{});
 const landing=make('div');landing.className='channel-manager';
 const toolbar=make('div');toolbar.className='manager-toolbar';
 const search=make('input');search.type='search';search.placeholder='Search channels…';search.setAttribute('aria-label','Search channels');
 const add=make('button','+ New channel');add.type='button';add.addEventListener('click',()=>document.getElementById('add-channel').click());toolbar.append(search,add);
 const wrap=make('div');wrap.className='manager-table-wrap';wrap.tabIndex=0;wrap.setAttribute('aria-label','Channels table — scroll horizontally for all columns');const table=make('table');table.className='manager-table';table.innerHTML='<thead><tr><th>No.</th><th>Channel</th><th>Status</th><th class="channel-viewers-heading" title="Active website viewers">Viewers</th><th>Programmes</th><th>Runtime</th><th>At end of plan</th><th>Actions</th></tr></thead>';
 const body=make('tbody');table.append(body);wrap.append(table);landing.append(toolbar,wrap);overview.after(landing);const viewers=createChannelViewers(landing);
 const back=make('button','← All channels');back.type='button';back.className='channel-breadcrumb';back.addEventListener('click',()=>{opened=false;paint();});editorNodes[0].before(back);
 function button(text,action){const b=make('button',text);b.type='button';b.addEventListener('click',action);return b;}
 function paint(){
  const draft=getDraft();if(!draft)return;
  landing.hidden=opened;back.hidden=!opened;editorNodes.forEach(el=>el.hidden=!opened);
  heading.textContent=opened?getChannel().name:'Channels';
  const selected=getChannel(),active=selected.programmes.filter(p=>!p.playbackDisabled);overview.textContent=opened?`${active.length} programmes · ${runtime(active.reduce((n,p)=>n+p.duration,0))} · changes stay in draft until saved.`:`${draft.channels.length} ${draft.channels.length===1?'channel':'channels'} · choose a channel to manage its programming, media, adverts and fillers.`;
  body.replaceChildren();
  draft.channels.map((c,index)=>({c,index})).filter(({c})=>c.name.toLowerCase().includes(search.value.trim().toLowerCase())).sort((a,b)=>a.c.number-b.c.number).forEach(({c,index})=>{
   const active=c.programmes.filter(p=>!p.playbackDisabled),row=make('tr');
   const edit=()=>{selectChannel(index);openProgramming();};
   row.append(make('td',String(c.number).padStart(2,'0')));const title=make('td');title.append(button(c.name,edit));row.append(title,make('td',c.status==='offline'?'Off air':c.status==='technical'?'Technical difficulty':'On air'));const watching=make('td','—');watching.className='viewer-count-cell';watching.dataset.viewerChannel=c.id;row.append(watching,make('td',String(active.length)),make('td',runtime(active.reduce((n,p)=>n+p.duration,0))));
   const repeat=c.playout?.repeat||(c.playout?.order==='shuffle'?'shuffle':c.playout?.order==='episodic'||c.playout?.shuffleSeries?'episodic':'same');row.append(make('td',repeat==='shuffle'?'Reshuffle all':repeat==='episodic'?'Remix series':'Repeat same order'));
   const actions=make('td'),menu=make('details'),summary=make('summary','Actions');menu.className='manager-menu';menu.append(summary,button('Modify programming',edit));
   const watch=make('a','Watch channel ↗');watch.href='/?channel='+encodeURIComponent(c.id)+'#watch';watch.target='_blank';watch.rel='noopener';menu.append(watch);
   menu.append(button('Copy stream URL',()=>navigator.clipboard.writeText(new URL('/iptv/'+c.id+'/index.m3u8',base).href).then(()=>message('Channel stream URL copied.')).catch(()=>message('Clipboard unavailable. Use the station IPTV playlist.'))));
   menu.append(button('Duplicate channel',()=>{const copy=structuredClone(c);copy.id='channel-'+browserId().slice(0,8);copy.number=Math.max(...draft.channels.map(x=>x.number))+1;copy.name=c.name+' (copy)';draft.channels.push(copy);selectChannel(draft.channels.length-1);changed();openProgramming();message('Channel duplicated in draft. Save to apply, or discard to undo.');}));
   const remove=button('Delete channel',()=>{if(draft.channels.length<2)return;draft.channels.splice(index,1);if(draft.channelAliases)for(const [alias,target] of Object.entries(draft.channelAliases))if(target===c.id)delete draft.channelAliases[alias];selectChannel(0);changed();opened=false;paint();message('Channel removed from draft. Save to apply, or discard to undo.');});remove.disabled=draft.channels.length<2;menu.append(remove);overlayMenu(menu);actions.append(menu);row.append(actions);body.append(row);
  });
  viewers.paint();
 }
 search.addEventListener('input',paint);
 return {paint,open(){opened=true;paint();}};
}
