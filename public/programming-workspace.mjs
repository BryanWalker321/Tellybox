import {createChannelManager} from './channel-manager.mjs';
import {overlayMenu} from './manager-menu.mjs';
import {createMediaPicker} from './media-picker.mjs';
import {sortPlan,runtime,useListedPlan} from './programming-tools.mjs';
const $=id=>document.getElementById(id);
export function createProgrammingWorkspace({getChannel,getDraft,getIndex,selectProgramme,selectChannel,changed,message}){
 let manager;
 const root=document.querySelector('[data-owner-section="programming"]'),children=[...root.children];
 const fieldGrid=$('edit-channel-name').closest('.owner-field-grid'),description=$('edit-channel-description').parentElement;
 const running=children.find(el=>el.tagName==='H4'&&el.textContent==='Running order'),local=children.find(el=>el.tagName==='H3'&&el.textContent==='Local media');
 const policy=$('edit-policy').parentElement,save=$('owner-save-catalogue').parentElement;
 const ranges={details:[fieldGrid,description],programmes:children.slice(children.indexOf(running),children.indexOf(policy)),schedule:[root.querySelector('.schedule-editor')],media:children.slice(children.indexOf(local)),advanced:children.slice(children.indexOf(policy),children.indexOf(save))};
 const overview=document.createElement('p');overview.className='programming-overview';root.children[1].replaceWith(overview);
 const nav=document.createElement('div');nav.className='programming-nav';nav.setAttribute('role','group');nav.setAttribute('aria-label','Programme management sections');
 const panels=new Map(),buttons=new Map();let current='programmes',limit=30,lastChannel;
 const names={details:'Channel details',programmes:'Programming',schedule:'Schedule & repeat',media:'Media library',advanced:'Advanced'};
 const host=document.createElement('div');host.className='programming-panels';
 for(const [key,nodes] of Object.entries(ranges)){
  const panel=document.createElement('div');panel.className='programming-panel';panel.hidden=key!==current;panel.dataset.programmingPanel=key;nodes.forEach(n=>panel.append(n));panels.set(key,panel);host.append(panel);
  const button=document.createElement('button');button.type='button';button.textContent=names[key];button.setAttribute('aria-pressed',String(key===current));button.addEventListener('click',()=>show(key));nav.append(button);buttons.set(key,button);
 }
 const folder=[...panels.get('schedule').querySelectorAll('details')].find(el=>el.querySelector('summary')?.textContent==='Import a server media folder');if(folder)panels.get('media').prepend(folder);
 const flexPanel=document.createElement('div');flexPanel.className='programming-panel';flexPanel.hidden=true;const flexPool=[...panels.get('schedule').querySelectorAll('details')].find(el=>el.querySelector('summary')?.textContent.startsWith('fillers library'));if(flexPool){flexPool.open=true;flexPanel.append(flexPool);}const flexNote=document.createElement('p');flexNote.textContent='Filler fills the spaces between programmes with complete adverts, idents and intervals. Use Media library to reuse filler or import a folder. Back-to-back channels keep their pool without playing it.';flexPanel.prepend(flexNote);host.append(flexPanel);panels.set('flex',flexPanel);const flexButton=document.createElement('button');flexButton.type='button';flexButton.textContent='Adverts & fillers';flexButton.setAttribute('aria-pressed','false');flexButton.addEventListener('click',()=>show('flex'));nav.insertBefore(flexButton,buttons.get('media'));buttons.set('flex',flexButton);
 const channelActions=$('edit-channel').closest('.owner-actions');channelActions.after(nav);
 const dirty=document.createElement('span');dirty.id='programming-draft-state';dirty.setAttribute('role','status');save.prepend(dirty);save.classList.add('programming-savebar');nav.after(save,host);
 const library=createMediaPicker({container:panels.get('media'),getDraft,getChannel,changed,message});
 $('media-purpose').value='programmes';
 const fromMedia=document.createElement('button');fromMedia.type='button';fromMedia.textContent='+ Add media';fromMedia.addEventListener('click',()=>show('media'));$('add-programme').after(fromMedia);$('add-programme').textContent='Add programme by URL';
 const searchLabel=document.createElement('label');searchLabel.textContent='Find a programme';const search=document.createElement('input');search.type='search';search.placeholder='Search titles or series…';search.id='programme-search';searchLabel.append(search);
 const results=document.createElement('div');results.className='programme-results';results.tabIndex=0;results.setAttribute('aria-label','Programming plan — scroll for all rows and columns');const count=document.createElement('p');count.className='programme-search-count';
 const more=document.createElement('button');more.type='button';more.textContent='Show more programmes';more.addEventListener('click',()=>{limit+=30;renderList();});
 const list=document.createElement('div');list.className='programme-browser';list.append(searchLabel,count,results,more);running.after(list);
 const tools=document.createElement('details');tools.className='manager-menu plan-tools';const toolTitle=document.createElement('summary');toolTitle.textContent='Tools & sort';tools.append(toolTitle);
 for(const [mode,label] of [['random','Shuffle this draft'],['title','Sort by title'],['series','Sort by series / episode'],['duplicates','Remove duplicate media']]){const b=document.createElement('button');b.type='button';b.textContent=label;b.addEventListener('click',()=>{const c=getChannel(),id=c.programmes[getIndex()]?.id;c.programmes=sortPlan(c.programmes,mode);if(mode!=='duplicates')useListedPlan(c);selectProgramme(Math.max(0,c.programmes.findIndex(p=>p.id===id)));changed();tools.open=false;message('Plan updated in draft. Save to apply, or discard to undo.');});tools.append(b);}overlayMenu(tools);running.after(tools);
 const planToolbar=document.createElement('div');planToolbar.className='manager-toolbar plan-toolbar';tools.before(planToolbar);planToolbar.append(tools,$('add-programme').parentElement);const providerLink=root.querySelector('a[href="/provider-check.html"]');if(providerLink)panels.get('advanced').append(providerLink.parentElement);
 $('edit-programme').parentElement.hidden=true;
 const selected=document.createElement('h4');selected.id='programme-editor-title';selected.tabIndex=-1;$('programme-fields').before(selected);
 const flexBrowser=document.createElement('div');flexBrowser.innerHTML='<label>Search adverts & fillers<input type="search" id="flex-search" placeholder="Advert or interval title…"></label><p id="flex-count"></p><div class="manager-table-wrap"><table class="manager-table"><thead><tr><th>Filler clip</th><th>Type</th><th>Length</th><th>Actions</th></tr></thead><tbody id="flex-results"></tbody></table></div>';flexNote.after(flexBrowser);$('flex-search').addEventListener('input',renderFlex);
 const empty=document.createElement('p');empty.textContent='This channel has no programmes yet. Add a programme, or import files from Media library.';empty.id='programme-empty';$('programme-fields').before(empty);
 const help=document.createElement('p');help.className='settings-note';help.textContent='Choose a programme above to edit it. Changes stay in your draft until you save.';selected.before(help);
 function show(key){manager?.open();current=key;for(const [name,panel] of panels){panel.hidden=name!==key;buttons.get(name).setAttribute('aria-pressed',String(name===key));}if(key==='media')library.paint();if(key==='flex')renderFlex();}
 function renderFlex(){const c=getChannel();if(!c)return;const pool=c.schedule?.breaks||c.intervalPool||[],q=$('flex-search').value.toLowerCase(),items=pool.map((p,index)=>({p,index})).filter(({p})=>p.title.toLowerCase().includes(q));$('flex-results').replaceChildren();$('flex-count').textContent=`${items.length} clips${c.playout?.programmesOnly?' · Inserted media is disabled for this back-to-back channel':''}${items.length>50?' · showing first 50; search to narrow the list':''}`;for(const {p,index} of items.slice(0,50)){const row=document.createElement('tr');for(const text of [p.title,p.kind||'filler',runtime(p.duration)]){const cell=document.createElement('td');cell.textContent=text;row.append(cell);}const actions=document.createElement('td');for(const [name,action] of [['Edit',()=>{$('interval-selected').value=index;$('interval-selected').dispatchEvent(new Event('change'));$('interval-title').focus();}],['Remove',()=>{pool.splice(index,1);changed();message('Filler removed from channel draft. Save to apply.');}]]){const b=document.createElement('button');b.type='button';b.textContent=name;b.addEventListener('click',action);actions.append(b);}row.append(actions);$('flex-results').append(row);}}
 function choose(index){selectProgramme(index);renderList();selected.focus({preventScroll:true});selected.scrollIntoView({behavior:'smooth',block:'start'});}
 function move(from,to){const c=getChannel();if(to<0||to>=c.programmes.length||from===to)return;const [p]=c.programmes.splice(from,1);c.programmes.splice(to,0,p);useListedPlan(c);selectProgramme(to);changed();}
 function renderList(){
  const c=getChannel();if(!c)return;
  const query=search.value.trim().toLowerCase(),matches=c.programmes.map((p,index)=>({p,index})).filter(({p})=>`${p.title} ${p.series||''}`.toLowerCase().includes(query));
  count.textContent=`${matches.length} of ${c.programmes.length} programmes${matches.length>limit?` · showing ${limit}`:''} · drag rows or use arrows to arrange the initial plan`;results.replaceChildren();
  const table=document.createElement('table');table.className='manager-table programme-table';table.innerHTML='<thead><tr><th>#</th><th>Programme / series</th><th>Duration</th><th>Actions</th></tr></thead>';const body=document.createElement('tbody');table.append(body);results.append(table);
  for(const {p,index} of matches.slice(0,limit)){
   const row=document.createElement('tr');row.className='programme-row';row.dataset.selected=String(index===getIndex());row.draggable=true;
   const series=p.series||p.title;let hash=0;for(const ch of series)hash=(hash*31+ch.charCodeAt(0))|0;row.style.setProperty('--series-color',['#46bac5','#ae95da','#69b48c','#d5ad65','#cc879d'][Math.abs(hash)%5]);
   row.addEventListener('dragstart',e=>{e.dataTransfer.setData('text/plain',String(index));e.dataTransfer.effectAllowed='move';});row.addEventListener('dragover',e=>e.preventDefault());row.addEventListener('drop',e=>{e.preventDefault();const from=Number(e.dataTransfer.getData('text/plain'));if(Number.isInteger(from)&&from>=0&&from<c.programmes.length)move(from,index);});
   const number=document.createElement('td');number.textContent='⠿ '+(index+1);const titleCell=document.createElement('td'),button=document.createElement('button');button.type='button';button.className='programme-result';button.textContent=p.title;button.setAttribute('aria-pressed',String(index===getIndex()));button.addEventListener('click',()=>choose(index));const meta=document.createElement('small');meta.textContent=`${p.series||'Standalone programme'} · ${p.playbackDisabled?'Not scheduled':'In running order'}`;titleCell.append(button,meta);
   const length=document.createElement('td');length.textContent=runtime(p.duration);const actions=document.createElement('td');actions.className='row-actions';for(const [label,action,disabled] of [['Edit',()=>choose(index),false],['↑',()=>move(index,index-1),index===0],['↓',()=>move(index,index+1),index===c.programmes.length-1],['Remove',()=>{c.programmes.splice(index,1);selectProgramme(Math.max(0,index-1));changed();message('Programme removed from draft. Save to apply, or discard to undo.');},false]]){const b=document.createElement('button');b.type='button';b.textContent=label;b.disabled=disabled;b.setAttribute('aria-label',(label==='↑'?'Move up':label==='↓'?'Move down':label)+' '+p.title);b.addEventListener('click',action);actions.append(b);}row.append(number,titleCell,length,actions);body.append(row);
  }
  if(!matches.length){const text=document.createElement('p');text.textContent=c.programmes.length?'No programmes match your search.':'No programmes added yet.';results.append(text);}
  more.hidden=matches.length<=limit;
  const p=c.programmes[getIndex()];selected.textContent=p?'Edit programme: '+p.title:'';empty.hidden=c.programmes.length>0;
 }
 search.addEventListener('input',()=>{limit=30;renderList();});
 manager=createChannelManager({root,heading:root.querySelector('h3'),overview,editorNodes:[channelActions,nav,host],getDraft,getChannel,selectChannel,changed,openProgramming:()=>show('programmes'),message});
 return {paint({dirty:changed=false}={}){
  const c=getChannel();if(!c)return;if(lastChannel!==c.id){lastChannel=c.id;search.value='';limit=30;}
  const active=c.programmes.filter(p=>!p.playbackDisabled);overview.textContent=`${c.name} · ${active.length} programmes in rotation · ${(active.reduce((n,p)=>n+p.duration,0)/3600).toFixed(1)} hours. Choose a task below; save when you’re ready.`;
  dirty.textContent=changed?'Unsaved changes':'All changes saved';dirty.dataset.dirty=String(changed);renderList();manager.paint();if(current==='media')library.paint();if(current==='flex')renderFlex();
 },show};
}
