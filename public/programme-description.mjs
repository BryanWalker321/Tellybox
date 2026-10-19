const requests=new Map();
export function createProgrammeDescription({element,button,fetcher=fetch}){
 let key='',text='',expanded=false;
 function paint(value){
  text=value||'';element.hidden=!text;
  if(button)button.hidden=text.length<=600;
  element.textContent=expanded||text.length<=600?text:text.slice(0,600).replace(/\s+\S*$/,'')+'…';
  if(button){button.textContent=expanded?'Read less':'Read more';button.setAttribute('aria-expanded',String(expanded));}
 }
 button?.addEventListener('click',()=>{expanded=!expanded;paint(text);});
 return {show(programme,channel,fallback=''){
  const own=typeof programme.description==='string'?programme.description:'';
  const next=`${channel}:${programme.id}`;if(next===key)return;key=next;expanded=false;paint(own||fallback);
  if(programme.isTestCard||!programme.url)return;
  let request=requests.get(next);
  if(!request){
   request=fetcher(`/api/programme-description?channel=${encodeURIComponent(channel)}&programme=${encodeURIComponent(programme.id)}`).then(response=>response.ok?response.json():{}).then(data=>typeof data.description==='string'?data.description:'').catch(()=>'');
   if(requests.size>=250)requests.delete(requests.keys().next().value);requests.set(next,request);
  }
  request.then(description=>{if(key===next)paint(description||own||fallback);});
 }};
}
