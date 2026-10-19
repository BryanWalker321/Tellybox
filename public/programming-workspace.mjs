const $=id=>document.getElementById(id);
export function createProgrammingWorkspace({getChannel,getIndex,selectProgramme}){
 const root=document.querySelector('[data-owner-section="programming"]'),children=[...root.children];
 const fieldGrid=$('edit-channel-name').closest('.owner-field-grid'),description=$('edit-channel-description').parentElement;
 const running=children.find(el=>el.tagName==='H4'&&el.textContent==='Running order'),local=children.find(el=>el.tagName==='H3'&&el.textContent==='Local media');
 const policy=$('edit-policy').parentElement,save=$('owner-save-catalogue').parentElement;
 const ranges={details:[fieldGrid,description],programmes:children.slice(children.indexOf(running),children.indexOf(policy)),schedule:[root.querySelector('.schedule-editor')],media:children.slice(children.indexOf(local)),advanced:children.slice(children.indexOf(policy),children.indexOf(save))};
 const overview=document.createElement('p');overview.className='programming-overview';root.children[1].replaceWith(overview);
 const nav=document.createElement('div');nav.className='programming-nav';nav.setAttribute('role','group');nav.setAttribute('aria-label','Programme management sections');
 const panels=new Map(),buttons=new Map();let current='programmes',limit=30,lastChannel;
 const names={details:'Channel details',programmes:'Programmes',schedule:'Schedule & breaks',media:'Media library',advanced:'Advanced'};
 const host=document.createElement('div');host.className='programming-panels';
 for(const [key,nodes] of Object.entries(ranges)){
  const panel=document.createElement('div');panel.className='programming-panel';panel.hidden=key!==current;panel.dataset.programmingPanel=key;nodes.forEach(n=>panel.append(n));panels.set(key,panel);host.append(panel);
  const button=document.createElement('button');button.type='button';button.textContent=names[key];button.setAttribute('aria-pressed',String(key===current));button.addEventListener('click',()=>show(key));nav.append(button);buttons.set(key,button);
 }
 const folder=[...panels.get('schedule').querySelectorAll('details')].find(el=>el.querySelector('summary')?.textContent==='Import a server media folder');if(folder)panels.get('media').prepend(folder);
 const channelActions=$('edit-channel').closest('.owner-actions');channelActions.after(nav);
 const dirty=document.createElement('span');dirty.id='programming-draft-state';dirty.setAttribute('role','status');save.prepend(dirty);save.classList.add('programming-savebar');nav.after(save,host);
 $('media-purpose').value='programmes';
 const fromMedia=document.createElement('button');fromMedia.type='button';fromMedia.textContent='Import from media folder';fromMedia.addEventListener('click',()=>show('media'));$('add-programme').after(fromMedia);
 const searchLabel=document.createElement('label');searchLabel.textContent='Find a programme';const search=document.createElement('input');search.type='search';search.placeholder='Search titles or series…';search.id='programme-search';searchLabel.append(search);
 const results=document.createElement('div');results.className='programme-results';const count=document.createElement('p');count.className='programme-search-count';
 const more=document.createElement('button');more.type='button';more.textContent='Show more programmes';more.addEventListener('click',()=>{limit+=30;renderList();});
 const list=document.createElement('div');list.className='programme-browser';list.append(searchLabel,count,results,more);running.after(list);
 $('edit-programme').parentElement.hidden=true;
 const selected=document.createElement('h4');selected.id='programme-editor-title';selected.tabIndex=-1;$('programme-fields').before(selected);
 const empty=document.createElement('p');empty.textContent='This channel has no programmes yet. Add a programme, or import files from Media library.';empty.id='programme-empty';$('programme-fields').before(empty);
 const help=document.createElement('p');help.className='settings-note';help.textContent='Choose a programme above to edit it. Changes stay in your draft until you save.';selected.before(help);
 function show(key){current=key;for(const [name,panel] of panels){panel.hidden=name!==key;buttons.get(name).setAttribute('aria-pressed',String(name===key));}}
 function renderList(){
  const c=getChannel();if(!c)return;
  const query=search.value.trim().toLowerCase(),matches=c.programmes.map((p,index)=>({p,index})).filter(({p})=>`${p.title} ${p.series||''}`.toLowerCase().includes(query));
  count.textContent=`${matches.length} of ${c.programmes.length} programmes${matches.length>limit?` · showing ${limit}`:''}`;results.replaceChildren();
  for(const {p,index} of matches.slice(0,limit)){
   const button=document.createElement('button');button.type='button';button.className='programme-result';button.setAttribute('aria-pressed',String(index===getIndex()));
   const title=document.createElement('strong');title.textContent=p.title;const meta=document.createElement('span');meta.textContent=`${Math.floor(p.duration/60)}m ${Math.round(p.duration%60)}s · ${p.playbackDisabled?'Not scheduled':'In running order'}${p.series?' · '+p.series:''}`;
   button.append(title,meta);button.addEventListener('click',()=>{selectProgramme(index);renderList();selected.focus({preventScroll:true});selected.scrollIntoView({behavior:'smooth',block:'start'});});results.append(button);
  }
  if(!matches.length){const text=document.createElement('p');text.textContent=c.programmes.length?'No programmes match your search.':'No programmes added yet.';results.append(text);}
  more.hidden=matches.length<=limit;
  const p=c.programmes[getIndex()];selected.textContent=p?'Edit programme: '+p.title:'';empty.hidden=c.programmes.length>0;
 }
 search.addEventListener('input',()=>{limit=30;renderList();});
 return {paint({dirty:changed=false}={}){
  const c=getChannel();if(!c)return;if(lastChannel!==c.id){lastChannel=c.id;search.value='';limit=30;}
  const active=c.programmes.filter(p=>!p.playbackDisabled);overview.textContent=`${c.name} · ${active.length} programmes in rotation · ${(active.reduce((n,p)=>n+p.duration,0)/3600).toFixed(1)} hours. Choose a task below; save when you’re ready.`;
  dirty.textContent=changed?'Unsaved changes':'All changes saved';dirty.dataset.dirty=String(changed);renderList();
 },show};
}
