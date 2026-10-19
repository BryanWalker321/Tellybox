export function createOwnerNotice(element){
 let fadeTimer,clearTimer;
 return text=>{
  clearTimeout(fadeTimer);clearTimeout(clearTimer);
  element.classList.remove('notice-fading');element.textContent=text;
  if(!text)return;
  fadeTimer=setTimeout(()=>{
   element.classList.add('notice-fading');
   clearTimer=setTimeout(()=>{element.textContent='';element.classList.remove('notice-fading');},500);
  },10000);
 };
}
