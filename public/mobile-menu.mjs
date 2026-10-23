export function setupMobileMenu(){
 const header=document.querySelector('.masthead'),button=document.getElementById('mobile-menu-button'),nav=document.getElementById('station-navigation');
 if(!header||!button||!nav)return;
 const mobile=matchMedia('(max-width:760px)');
 function close(restoreFocus=false){nav.dataset.mobileOpen='false';button.setAttribute('aria-expanded','false');button.setAttribute('aria-label','Open menu');if(restoreFocus)button.focus();}
 button.addEventListener('click',()=>{if(!mobile.matches)return;if(button.getAttribute('aria-expanded')==='true'){close();return;}nav.dataset.mobileOpen='true';button.setAttribute('aria-expanded','true');button.setAttribute('aria-label','Close menu');nav.querySelector('a,button')?.focus();});
 nav.addEventListener('click',event=>{if(mobile.matches&&event.target.closest('a,button'))close();});
 document.addEventListener('click',event=>{if(mobile.matches&&!nav.contains(event.target)&&!button.contains(event.target))close();});
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&button.getAttribute('aria-expanded')==='true'){event.preventDefault();close(true);}});
 mobile.addEventListener('change',()=>close());window.addEventListener('hashchange',()=>close());
 close();header.classList.add('mobile-menu-ready');
}
