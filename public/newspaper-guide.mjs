import {listingsWindow} from '../lib/schedule.mjs';
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
export function newspaperTime(value){const d=new Date(value),hour=d.getHours();return `${hour%12||12}.${String(d.getMinutes()).padStart(2,'0')}${hour<12?'am':'pm'}`;}
export function newspaperSynopsis(programme){
 const text=programme.synopsis||programme.description;if(typeof text!=='string')return '';
 const clean=text.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
 const promotion=/(?:upload|subscrib|copyright|rights reserved|rights belong|infringement|my channel|like and share|trimmed|\(c\)|©|^enjoy\b)/i;
 const synopsis=(clean.match(/[^.!?]+[.!?]*/g)||[]).filter(sentence=>!promotion.test(sentence.trim())).join('').trim();
 return synopsis.length>280?synopsis.slice(0,277).replace(/\s+\S*$/,'')+'…':synopsis;
}
export function renderPaperListings({config,start,end,now}){
 return config.channels.map(channel=>{
  const colour=/^#[0-9a-f]{6}$/i.test(channel.colour)?channel.colour:'#164da3';
  const slots=listingsWindow(channel,config.epoch,start,end);
  return `<section class="paper-channel" style="--paper-channel:${colour}"><button class="paper-channel-heading" data-guide-channel="${escape(channel.id)}" aria-label="Watch ${escape(channel.name)} live"><span>${String(channel.number).padStart(2,'0')}</span><strong>${escape(channel.name)}</strong><small>WATCH THIS CHANNEL ↗</small></button><p class="paper-channel-description">${escape(channel.description||channel.category||'')}</p><div class="paper-listings">${slots.map(slot=>{
   const p=slot.programme,live=slot.start<=now&&slot.end>now,synopsis=newspaperSynopsis(p);
   return `<article class="paper-listing ${live?'on-now':''}"><time datetime="${new Date(slot.start).toISOString()}">${newspaperTime(slot.start)}</time><div><h3>${escape(p.title)}${live?' <span class="paper-live">ON NOW</span>':''}</h3>${synopsis?`<p class="paper-synopsis">${escape(synopsis)}</p>`:''}<p class="paper-programme-meta">${escape(p.year||'Archive programme')}${slot.start<start?' · Joined in progress':''}</p></div></article>`;
  }).join('')}</div></section>`;
 }).join('');
}
