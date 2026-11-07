// ?keys=r,g,y,b can override colour shortcuts on standalone receivers.
export function setupTeletextKeyboard({active=()=>true,go,colour,subpage,fullscreen}){
 let digits='',timer;const configured=new URLSearchParams(location.search).get('keys')?.split(',');
 const colours=configured?.length===4?configured:['r','g','y','b'];
 document.addEventListener('keydown',e=>{
  if(!active()||e.ctrlKey||e.metaKey||e.altKey||e.target.isContentEditable)return;
  const tag=e.target.tagName,key=e.key.toLowerCase();
  if(/^\d$/.test(key)&&tag!=='INPUT'&&tag!=='TEXTAREA'&&tag!=='SELECT'){e.preventDefault();clearTimeout(timer);digits+=key;if(digits.length===3){go(digits);digits='';}else timer=setTimeout(()=>digits='',2500);return;}
  if(['INPUT','TEXTAREA','SELECT'].includes(tag))return;
  const index=colours.findIndex(k=>k.toLowerCase()===key),functionKey=['F1','F2','F3','F4'].indexOf(e.key);
  if(index>=0||functionKey>=0){e.preventDefault();colour(index>=0?index:functionKey);}
  else if(['ArrowLeft','PageUp'].includes(e.key)){e.preventDefault();subpage(-1);}
  else if(['ArrowRight','PageDown'].includes(e.key)){e.preventDefault();subpage(1);}
  else if(key==='f'){e.preventDefault();fullscreen();}
 });
}
