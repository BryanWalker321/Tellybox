const requests=new Map();
export function shortenDescription(text,fits){
 if(fits(text))return text;
 const words=text.match(/\S+\s*/g)||[];let low=0,high=words.length;
 while(low<high){const mid=Math.ceil((low+high)/2),candidate=words.slice(0,mid).join('').trimEnd()+'…';if(fits(candidate))low=mid;else high=mid-1;}
 return words.slice(0,low).join('').trimEnd()+'…';
}
export function createProgrammeDescription({element,button,fetcher=fetch}){
 let key='',text='';
 function fit(){
  element.textContent=text;
  if(!text||!element.clientWidth||typeof getComputedStyle!=='function')return;
  const height=parseFloat(getComputedStyle(element).lineHeight)*4;
  if(!Number.isFinite(height))return;
  element.style.maxHeight=height+'px';element.style.overflow='hidden';
  element.textContent=shortenDescription(text,value=>{element.textContent=value;return element.scrollHeight<=height+1;});
 }
 function paint(value){text=value||'';element.hidden=!text;if(button){button.hidden=true;button.setAttribute('aria-expanded','false');}fit();}
 if(typeof ResizeObserver==='function'){let width=0;new ResizeObserver(entries=>{const next=entries[0].contentRect.width;if(next!==width){width=next;fit();}}).observe(element);}
 if(typeof document!=='undefined')document.fonts?.ready.then(fit);
 return {show(programme,channel,fallback=''){
  const own=typeof programme.description==='string'?programme.description:'';
  const next=`${channel}:${programme.id}`;if(next===key)return;key=next;paint(own||fallback);
  if(programme.isTestCard||!programme.url)return;
  let request=requests.get(next);
  if(!request){
   request=fetcher(`/api/programme-description?channel=${encodeURIComponent(channel)}&programme=${encodeURIComponent(programme.id)}`).then(response=>response.ok?response.json():{}).then(data=>typeof data.description==='string'?data.description:'').catch(()=>'');
   if(requests.size>=250)requests.delete(requests.keys().next().value);requests.set(next,request);
  }
  request.then(description=>{if(key===next)paint(description||own||fallback);});
 }};
}
