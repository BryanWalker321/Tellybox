export function setupTeletextFullscreen(){
 const screen=document.querySelector('#teletext'),surface=screen.querySelector('.tt-surface'),button=document.querySelector('#tt-fullscreen');
 const active=()=>document.fullscreenElement===screen||screen.classList.contains('tt-fullscreen-fallback');
 function fit(){const on=active();button.textContent=on?'Exit fullscreen':'Fullscreen';button.setAttribute('aria-pressed',String(on));if(!on){surface.style.removeProperty('--tt-scale');return;}const scale=Math.min(screen.clientWidth/1200,screen.clientHeight/surface.scrollHeight);surface.style.setProperty('--tt-scale',String(scale));}
 async function exit(){if(document.fullscreenElement===screen)await document.exitFullscreen();screen.classList.remove('tt-fullscreen-fallback');document.body.classList.remove('tt-fullscreen-open');fit();}
 button.addEventListener('click',async()=>{if(active()){await exit();return;}try{if(!screen.requestFullscreen)throw Error();await screen.requestFullscreen();}catch{screen.classList.add('tt-fullscreen-fallback');document.body.classList.add('tt-fullscreen-open');}fit();});
 window.addEventListener('hashchange',()=>{if(location.hash!=='#teletext'&&active())exit();});document.addEventListener('fullscreenchange',fit);window.addEventListener('resize',fit);document.addEventListener('keydown',e=>{if(e.key==='Escape'&&screen.classList.contains('tt-fullscreen-fallback'))exit();});new ResizeObserver(()=>{if(active())fit();}).observe(surface);document.fonts.ready.then(fit);
}
