import {browserId} from './browser-id.mjs';
import {mediaKey,uniqueMedia,runtime} from './programming-tools.mjs';
export function createMediaPicker({container,getDraft,getChannel,changed,message}){
 const panel=document.createElement('section');panel.className='station-library';panel.innerHTML='<h4>Station library</h4><p>Reuse media already in your station. Add programmes or fillers to the selected channel; existing media is kept once per channel.</p><div class="owner-field-grid"><label>Library<select id="library-kind"><option value="programmes">Programmes</option><option value="flex">Adverts & fillers</option></select></label><label>Search library<input type="search" id="library-search" placeholder="Title or series…"></label></div><p id="library-count"></p><div class="manager-table-wrap"><table class="manager-table"><thead><tr><th>Title</th><th>Length</th><th>Action</th></tr></thead><tbody id="library-results"></tbody></table></div><button type="button" id="library-more">Show more media</button>';
 container.prepend(panel);const $=id=>panel.querySelector('#'+id);let limit=30;
 function paint(){
  const draft=getDraft(),c=getChannel();if(!draft||!c)return;
  const flex=$('library-kind').value==='flex',pool=flex?[...(draft.intervalLibrary||[]),...draft.channels.flatMap(c=>c.schedule?.breaks||c.intervalPool||[])]:draft.channels.flatMap(c=>c.programmes);
  const q=$('library-search').value.trim().toLowerCase(),items=uniqueMedia(pool).filter(p=>p.url&&!p.isPresentation&&!p.isTestCard&&`${p.title} ${p.series||''}`.toLowerCase().includes(q));
  const selected=flex?(c.schedule?.breaks||c.intervalPool||[]):c.programmes,keys=new Set(selected.map(mediaKey));$('library-results').replaceChildren();$('library-count').textContent=`${items.length} matching items · target: ${c.name}`;
  for(const p of items.slice(0,limit)){
   const row=document.createElement('tr'),title=document.createElement('td');title.textContent=p.title;const length=document.createElement('td');length.textContent=runtime(p.duration);const action=document.createElement('td'),add=document.createElement('button');add.type='button';const wrongBrand=flex&&p.stationBrand&&p.stationBrand.toLowerCase()!==String(c.stationBrand||'').toLowerCase();add.textContent=wrongBrand?'Different station brand':keys.has(mediaKey(p))?'Already added':p.playbackDisabled||p.editorialHold?'Held / disabled':flex?'Add filler':'Add programme';add.disabled=Boolean(wrongBrand)||keys.has(mediaKey(p))||Boolean(p.playbackDisabled||p.editorialHold);
   add.addEventListener('click',()=>{const copy={...structuredClone(p),id:(flex?'flex-':'programme-')+browserId().slice(0,8)};if(flex){copy.isInterstitial=true;copy.kind||='filler';const target=c.schedule?(c.schedule.breaks||=[]):(c.intervalPool||=[]);target.push(copy);}else c.programmes.push(copy);changed();paint();message('Media added to channel draft. Save programming to apply.');});action.append(add);row.append(title,length,action);$('library-results').append(row);
  }
  $('library-more').hidden=items.length<=limit;
 }
 $('library-kind').addEventListener('change',()=>{limit=30;paint();});$('library-search').addEventListener('input',()=>{limit=30;paint();});$('library-more').addEventListener('click',()=>{limit+=30;paint();});
 return {paint};
}
