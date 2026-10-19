import {iptvPlayers} from './iptv-players.mjs';

export function iptvAddresses(base) {
 const url=new URL(base);
 if(!['http:','https:'].includes(url.protocol)||url.username||url.password)throw Error('Invalid station address');
 const origin=url.origin;
 return {base:origin,playlist:origin+'/channels.m3u',guide:origin+'/guide.xml',localOnly:['localhost','127.0.0.1','[::1]'].includes(url.hostname)};
}

export function createIptvHelp({getBrand=()=>({}),fetchInfo=async()=>{
 const response=await fetch('/api/network',{cache:'no-store'});if(!response.ok)throw Error();return response.json();
}}={}) {
 const $=id=>document.getElementById(id),dialog=$('iptv-help');let opening=0;
 const chooser=$('iptv-player-choices');
 chooser.innerHTML=iptvPlayers.map(p=>`<button type="button" role="tab" id="iptv-tab-${p.id}" data-iptv-player="${p.id}" aria-controls="iptv-player-panel" aria-selected="false" tabindex="-1">${p.name}</button>`).join('');
 function selectPlayer(id,focus=false){
  const player=iptvPlayers.find(p=>p.id===id)||iptvPlayers[0];
  for(const button of chooser.querySelectorAll('[data-iptv-player]')){const selected=button.dataset.iptvPlayer===player.id;button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1;if(selected&&focus)button.focus();}
  $('iptv-player-panel').setAttribute('aria-labelledby',`iptv-tab-${player.id}`);
  $('iptv-player-heading').textContent=`Set up ${player.name}`;
  $('iptv-player-devices').textContent=player.devices;
  $('iptv-player-steps').innerHTML=player.steps.map(step=>`<li>${step}</li>`).join('');
  $('iptv-player-note').textContent=player.note||'';$('iptv-player-note').hidden=!player.note;
  $('iptv-player-help').hidden=!player.help;
  if(player.help){$('iptv-player-help').href=player.help;$('iptv-player-help').textContent=player.name+' official help ↗';}
 }
 chooser.addEventListener('click',event=>{const button=event.target.closest('[data-iptv-player]');if(button)selectPlayer(button.dataset.iptvPlayer);});
 chooser.addEventListener('keydown',event=>{
  const buttons=[...chooser.querySelectorAll('[data-iptv-player]')],index=buttons.indexOf(event.target);if(index<0)return;
  const next=event.key==='ArrowRight'?(index+1)%buttons.length:event.key==='ArrowLeft'?(index+buttons.length-1)%buttons.length:event.key==='Home'?0:event.key==='End'?buttons.length-1:null;
  if(next!==null){event.preventDefault();selectPlayer(buttons[next].dataset.iptvPlayer,true);}
 });
 selectPlayer('kodi');
 async function refresh(){
  const ticket=++opening,brand=getBrand();$('iptv-help-name').textContent=brand.name||'This network';
  $('iptv-help-playlist').value='';$('iptv-help-guide').value='';$('iptv-help-base').textContent='';$('iptv-help-copy-status').textContent='';
  for(const button of dialog.querySelectorAll('[data-copy-iptv]'))button.disabled=true;
  $('iptv-help-status').textContent='Finding this station’s IPTV address…';
  try{
   const info=await fetchInfo();if(ticket!==opening)return;
   const links=iptvAddresses(info.iptvBase||info.base||location.origin);
   $('iptv-help-playlist').value=links.playlist;$('iptv-help-guide').value=links.guide;
   $('iptv-help-base').textContent=links.base;
   for(const button of dialog.querySelectorAll('[data-copy-iptv]'))button.disabled=false;
   $('iptv-help-local-warning').hidden=!links.localOnly;
   $('iptv-help-status').textContent=info.iptvEnabled===false?'The owner has disabled IPTV on this installation. Ask them to enable it before following these steps.':links.localOnly?'This address works on the server computer only. See the note below before connecting another device.':'Ready to connect. No Discord sign-in is needed.';
  }catch{if(ticket===opening)$('iptv-help-status').textContent='Could not read the station’s connection settings. Close this window and try again.';}
 }
 for(const button of document.querySelectorAll('[data-open-iptv]'))button.addEventListener('click',()=>{dialog.showModal();refresh();});
 for(const input of [ $('iptv-help-playlist'),$('iptv-help-guide') ])input.addEventListener('click',()=>input.select());
 for(const button of dialog.querySelectorAll('[data-copy-iptv]'))button.addEventListener('click',async()=>{
  const input=$(button.dataset.copyIptv);input.focus();input.select();
  try{if(!navigator.clipboard?.writeText)throw Error();await navigator.clipboard.writeText(input.value);$('iptv-help-copy-status').textContent='Address copied.';}
  catch{$('iptv-help-copy-status').textContent='Address selected. Use Copy on your device to copy it.';}
 });
 $('iptv-help-hosting').addEventListener('click',()=>dialog.close());
 return {refresh};
}
