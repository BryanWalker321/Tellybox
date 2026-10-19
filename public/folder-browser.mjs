export function createFolderBrowser({input,browse}){
 const button=document.createElement('button');button.type='button';button.textContent='Browse…';input.after(button);
 const dialog=document.createElement('dialog');dialog.className='media-folder-dialog';
 dialog.innerHTML='<h2>Choose a media folder</h2><p>Browse folders on your station server, inside its media directory.</p><p class="folder-location"></p><button type="button" class="folder-up">↑ Parent folder</button><div class="folder-list"></div><p role="status" class="folder-status"></p><div class="owner-actions"><button type="button" class="folder-select">Use this folder</button><button type="button" class="folder-cancel">Cancel</button></div>';
 document.body.append(dialog);let current='',parent=null,generation=0;
 const find=s=>dialog.querySelector(s),status=find('.folder-status'),list=find('.folder-list'),select=find('.folder-select'),up=find('.folder-up');
 async function load(folder){const request=++generation;select.disabled=true;up.disabled=true;list.replaceChildren();status.textContent='Loading folders…';
  try{const data=await browse(folder);if(request!==generation||!dialog.open)return;current=data.folder;parent=data.parent;find('.folder-location').textContent='Media directory'+(current?' / '+current:' (root)');up.disabled=parent===null;select.disabled=false;status.textContent=data.folders.length?'Choose a subfolder, or use this folder.':'No subfolders. You can use this folder.';
   for(const entry of data.folders){const item=document.createElement('button');item.type='button';item.textContent='📁 '+entry.name;item.addEventListener('click',()=>load(entry.path));list.append(item);}
  }catch(error){if(request===generation){status.textContent=error.message;up.disabled=folder==='';parent='';}}
 }
 button.addEventListener('click',()=>{dialog.showModal();load(input.value.trim());});
 up.addEventListener('click',()=>load(parent||''));
 select.addEventListener('click',()=>{input.value=current;input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));dialog.close();input.focus();});
 find('.folder-cancel').addEventListener('click',()=>dialog.close());dialog.addEventListener('close',()=>{generation++;});
}
