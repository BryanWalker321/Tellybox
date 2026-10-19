import { createDirectory } from '/directory.mjs';
import { scheduleAt, programmesAt, listingsWindow, validateCatalogue } from '/lib/schedule.mjs';
import { createBroadcastPlayer } from '/broadcast-player.mjs';
import { createTelevisionGuide } from '/guide.mjs';
import { createCommunity } from '/community.mjs';
import { createIptvHelp } from '/iptv-help.mjs';
import { createProgrammeDescription } from '/programme-description.mjs';
const $ = id => document.getElementById(id);
const video = $('video');
video.addEventListener('loadedmetadata', () => {
  for (const track of video.textTracks) {
    if (['captions', 'subtitles'].includes(track.kind)) track.mode = 'disabled';
  }
});
document.querySelectorAll('.dialog-close').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
let config, channel, playing = false, loadedKey = '', clockOffset = 0, ttPage = '100', ttAuto = false, lastSync = 0, stationDefault;
const now = () => Date.now() + clockOffset;
const time = n => new Date(n).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
const duration = n => { n = Math.max(0, Math.floor(n)); return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`; };
const esc = str => String(str ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const stored = (key, value) => { try { if (value === undefined) return localStorage.getItem(key); localStorage.setItem(key, value); } catch {} };
function applyBranding(brand) {
  const logo = brand.logo || '/icon.svg';
  for (const id of ['brand-logo', 'footer-logo']) { $(id).src = logo; $(id).hidden = false; }
  $('brand-mark').hidden = true; $('footer-mark').hidden = true;
  $('receiver-name').textContent = brand.name.toUpperCase(); $('strip-mark').textContent = brand.name;
  $('paper-station-name').textContent = `THE ${brand.name.toUpperCase()} LISTINGS · COLOUR SERVICE`;
  document.querySelector('.wordmark').setAttribute('aria-label', brand.name + ' home');
  document.querySelector('meta[name=description]').content = `${brand.name} · ${brand.description || 'An independent archive television network'}`;
  document.querySelector('link[rel=icon]').href = logo;
  const theme = brand.theme || {};
  for (const key of ['background', 'surface', 'text', 'highlight', 'link']) { if (/^#[0-9a-f]{6}$/i.test(theme[key] || '')) document.documentElement.style.setProperty('--network-' + key, theme[key]); else document.documentElement.style.removeProperty('--network-' + key); }
  document.body.dataset.cabinet = ['wood', 'charcoal', 'ivory'].includes(theme.cabinet) ? theme.cabinet : 'wood';
  document.documentElement.style.setProperty('--mono', theme.font === 'sans' ? "'Segoe UI',Arial,sans-serif" : "Consolas,'Courier New',monospace");
  document.documentElement.style.setProperty('--holding-image', 'url(' + JSON.stringify(brand.holdingImage || '/test-card-f.jpg') + ')');
  $('service-wording').textContent = brand.serviceLine || 'AN INDEPENDENT TELEVISION SERVICE';
  $('footer-wording').textContent = `© Copyright 2026 ${brand.name}. ${brand.footerLine || 'Preserved by others. Rediscovered together.'}`;
  $('paper-title').textContent = brand.paperTitle || 'The Television Times';
  if (!stored('tellybox-picture')) { $('picture').value = theme.crtDefault === false ? 'clean' : 'crt'; picture(false); }
  document.querySelectorAll('.dialog-caption').forEach(el => el.textContent = brand.name + ' · CONTROL WINDOW');
}
const current = c => scheduleAt(c, config.epoch, now(), 4);
const listed = c => programmesAt(c, config.epoch, now(), 4);
const televisionGuide = createTelevisionGuide({ now, onTune: c => tune(c, true), readPreference: stored, savePreference: stored });
const community = createCommunity({ video });
const programmeDescription=createProgrammeDescription({element:$('rights'),button:$('description-expand')});
createIptvHelp({getBrand:()=>config?.brand||{}});
const broadcast = createBroadcastPlayer({video,onStatus:message=>status(message),onPlaying:()=>{ $('tuning-card').hidden=true; $('station-bug').hidden=false; status('On air · Shared live broadcast with IPTV.'); }});
const directory=createDirectory({root:$('directory-grid'),detail:$('directory-detail'),now,onTune:c=>{location.hash='watch';showView();tune(c,true);}});
function status(message) { $('status').textContent = message; }
let homeStatsGeneration=0;
async function refreshHomeStats(){
 if(!$('home-view'))return;const generation=++homeStatsGeneration;
 try{const response=await fetch('/api/programming-stats',{cache:'no-store',signal:AbortSignal.timeout(10000)});if(!response.ok)return;const stats=await response.json();if(generation!==homeStatsGeneration)return;$('home-hours').textContent=Number(stats.hours).toLocaleString('en-GB');$('home-channels').textContent=String(stats.channels);$('home-hours').title='Estimated unique hours of available programmes. Adverts and filler are excluded.';}catch{/* Retain the last estimate during a network interruption. */}
}
function install(next) {
  validateCatalogue(next); config = next; directory.install(config);
  document.title = `${config.brand.name} · ${config.brand.tagline || 'Archive television'}`;
  for (const id of ['brand-name', 'card-brand', 'footer-name']) $(id).textContent = config.brand.name;
  $('brand-tagline').textContent = config.brand.tagline || 'THE ARCHIVE TELEVISION SERVICE';
  applyBranding(config.brand);
  if($('home-view')){ $('home-brand').textContent=config.brand.name; refreshHomeStats(); }
  $('tt-brand').textContent = config.brand.name.toUpperCase() + ' TEXT';
  for (const [id, key, fallback] of [['hero-kicker', 'kicker', 'YOUR MEDIA. YOUR STATION.'], ['hero-line1', 'heroLine1', 'A little television.'], ['hero-line2', 'heroLine2', 'Of your own.']]) $(id).textContent = config.brand[key] || fallback;
  $('about-description').textContent = config.brand.about || `${config.brand.name} is an independent station built from its operator’s own catalogue. Find your channel in the television guide and join a shared live schedule.`;
  if (/^#[0-9a-f]{6}$/i.test(config.brand.accent)) document.documentElement.style.setProperty('--accent', config.brand.accent);
  $('channel-count').textContent = `${config.channels.filter(c => c.programmes.some(p => !p.playbackDisabled) && !['offline', 'technical'].includes(c.status)).length} ON AIR`;
  const requested = new URLSearchParams(location.search).get('channel') || stored('tellybox-channel');
  televisionGuide.install(config, config.channels[0]);
  tune(config.channels.find(c => c.id === (config.channelAliases?.[requested] || requested)) || config.channels[0], false);
  renderTeletext(); if(location.hash.startsWith('#channel/'))directory.showChannel(location.hash.slice(9));
}
function tune(next, start = playing) {
  channel = next; loadedKey = '';
  stored('tellybox-channel', channel.id);
  const url = new URL(location.href); if (location.hash === '#watch' || url.searchParams.has('channel')) url.searchParams.set('channel', channel.id); history.replaceState(null, '', url);
  televisionGuide.setChannel(channel);
  community.setChannel(channel);
  renderChannels(); renderGuide(); renderUpcoming(); tick();
  if (start) { playing = true; loadLive(); }
}
function renderChannels() {
  $('channels').innerHTML = config.channels.map(c => { const s = listed(c)[0]; return `<button class="channel ${c.id === channel.id ? 'selected' : ''}" style="--channel:${c.colour}" data-channel="${esc(c.id)}" aria-pressed="${c.id === channel.id}"><span class="channel-number">${String(c.number).padStart(2, '0')}</span><span class="channel-copy"><span class="channel-name">${esc(c.name)}</span><span class="channel-title">${s.start > now() ? `NEXT ${time(s.start)} · ` : ''}${esc(s.programme.title)}</span><span class="channel-tag">${esc(c.category || 'Archive television')}</span></span></button>`; }).join('');
}
function renderUpcoming() {
  $('coming-up').innerHTML = listed(channel).filter(s => s.start > now()).map(s => `<article class="upcoming"><time>${time(s.start)}</time><h3>${esc(s.programme.title)}</h3><p>${esc(s.programme.year || 'ARCHIVE')} · ${duration(s.programme.duration)}</p></article>`).join('');
}
function renderGuide() {
  if (!config || !$('guide-date').value) return;
  const day = new Date($('guide-date').value + 'T00:00:00');
  const period = $('guide-period').value;
  const start = new Date(day); if (period !== 'all') start.setHours(Number(period));
  const end = new Date(start); if (period === 'all') end.setDate(end.getDate() + 1); else end.setHours(end.getHours() + 6);
  $('edition-date').textContent = day.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  $('guide-note').textContent = `All times local (${Intl.DateTimeFormat().resolvedOptions().timeZone}). Select a channel heading to tune in live. ${config.brand.guideNote || 'Channel running orders repeat throughout the day.'}`;
  $('guide').style.setProperty('--columns', config.channels.length);
  $('guide').innerHTML = config.channels.map(c => `<section class="paper-channel"><button class="paper-channel-heading" data-guide-channel="${c.id}"><span>${String(c.number).padStart(2, '0')}</span><strong>${esc(c.name)}</strong><small>TUNE IN LIVE ↗</small></button><p class="paper-channel-description">${esc(c.description || c.category || '')}</p><div class="paper-listings">${listingsWindow(c, config.epoch, start.getTime(), end.getTime()).map(s => `<article class="paper-listing ${s.start <= now() && s.end > now() ? 'on-now' : ''}"><time>${time(s.start)}</time><div><h3>${esc(s.programme.title)} ${s.start <= now() && s.end > now() ? '<span class="paper-live">ON NOW</span>' : ''}</h3><p>${esc(s.programme.year || 'Archive')} ${s.start < start.getTime() ? ' · In progress' : ''}</p></div></article>`).join('')}</div></section>`).join('');
  televisionGuide.render();
  community.refresh();
}
const localDate = () => { const d = new Date(now()); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
$('guide-date').value = localDate();
$('guide-period').value = String(Math.floor(new Date().getHours() / 6) * 6);
$('guide-date').addEventListener('change', renderGuide);
$('guide-period').addEventListener('change', renderGuide);
$('guide-today').addEventListener('click', () => { $('guide-date').value = localDate(); renderGuide(); });
function updateProgramme(s) {
  const p = s.programme;
  $('screen-channel').textContent = `CH ${String(channel.number).padStart(2, '0')} / ${channel.name.toUpperCase()}`;
  $('station-bug').textContent = `${config.brand.name.toUpperCase()} / ${String(channel.number).padStart(2, '0')}`;
  $('programme-title').textContent = p.title;
  $('programme-meta').textContent = `${p.year || 'Archive'} · ${duration(p.duration)} · ${p.source || 'Station media'}`;
  programmeDescription.show(p,channel.id);
  $('source-link').hidden = !p.sourceUrl;
  if (p.sourceUrl) { $('source-link').href = p.sourceUrl; $('source-link').textContent = 'Original source ↗'; }
  $('now-label').textContent = s.start > now() ? `UP NEXT · ${time(s.start)}` : 'NOW SHOWING';
  $('mode-label').textContent = p.isTestCard ? 'STATION HOLDING SCREEN' : 'LIVE TRANSMISSION';
}
function tick() {
  $('clock').textContent = new Date(now()).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' }).toUpperCase() + ' / ' + time(now());
  $('tt-clock').textContent = time(now());
  if (!config || !channel) return;
  const s = current(channel)[0], programmeList = listed(channel), display = programmeList[0];
  updateProgramme(display);
  televisionGuide.tick($('status').textContent);
  const elapsed = display.start > now() ? 0 : display.offset;
  $('progress').style.width = `${Math.min(100, elapsed / display.programme.duration * 100)}%`;
  $('elapsed').textContent = display.start > now() ? `Starts at ${time(display.start)}` : `${duration(elapsed)} / ${duration(display.programme.duration)}`;
  const upcoming = programmeList.find(entry => entry.start > now());
  $('up-next').textContent = upcoming ? `NEXT ${time(upcoming.start)} · ${upcoming.programme.title}` : '';
  if (playing && loadedKey !== `${s.programme.id}:${Math.round(s.start)}`) {
    loadedKey = `${s.programme.id}:${Math.round(s.start)}`;
    renderChannels(); renderGuide(); renderUpcoming();
  }
}
function loadLive() {
  clearTimeout(bufferTimer);
  $('interval-presentation').hidden = true; $('external-player').hidden = true;
  $('tuning-card').hidden = false; $('tuning-card').classList.add('test-card-only');
  $('player-message').textContent = 'Tuning in to the live broadcast…';
  $('start').textContent = '↻ Retry channel';
  community.setExternalPlayback(false);
  broadcast.tune(channel.id);
}
let bufferTimer;
video.addEventListener('playing',()=>{clearTimeout(bufferTimer);$('tuning-card').classList.remove('test-card-only');});
video.addEventListener('waiting',()=>{if(playing)status('Buffering the live broadcast…');});
$('start').addEventListener('click', () => { playing = true; loadLive(); });
for (const [id, step] of [['previous', -1], ['next', 1]]) $(id).addEventListener('click', () => { const i = config.channels.indexOf(channel); tune(config.channels[(i + step + config.channels.length) % config.channels.length], true); });
$('return-live').addEventListener('click', () => tune(channel, true));
$('channels').addEventListener('click', e => { const b = e.target.closest('[data-channel]'); if (b) tune(config.channels.find(c => c.id === b.dataset.channel), true); });
$('guide').addEventListener('click', e => { const b = e.target.closest('[data-guide-channel]'); if (b) { tune(config.channels.find(c => c.id === b.dataset.guideChannel), true); location.hash = 'watch'; } });
$('fullscreen').addEventListener('click', async () => { try { if (document.fullscreenElement) await document.exitFullscreen(); else if ($('screen').requestFullscreen) await $('screen').requestFullscreen(); else if (video.webkitEnterFullscreen) video.webkitEnterFullscreen(); else status('Use your browser’s fullscreen control.'); } catch { status('Fullscreen is unavailable in this browser window.'); } });
let lastView;
function stopForHome(){playing=false;loadedKey='';clearTimeout(bufferTimer);broadcast.destroy();$('tuning-card').hidden=false;$('tuning-card').classList.remove('test-card-only');$('station-bug').hidden=true;$('player-message').textContent='A whole other time. Just one button away.';$('start').textContent='▶ Switch on the telly';}
function showView() { const route=location.hash.slice(1);const requested=route.startsWith('channel/')?'channel':route;const view=['home','watch','guide','directory','channel','about','teletext','hosting'].includes(requested)&&$(requested+'-view')?requested:($('home-view')&&(!new URLSearchParams(location.search).has('channel')||new URLSearchParams(location.search).has('home'))?'home':'watch'); if(view==='home')stopForHome();const changed=view!==lastView;lastView=view; document.body.classList.toggle('home-active', view === 'home'); document.querySelectorAll('.view').forEach(el => el.hidden = el.id !== `${view}-view`); televisionGuide.setVisible(view === 'guide'); community.setView(view); document.querySelectorAll('nav [data-view]').forEach(el => { el.classList.toggle('active', el.dataset.view === view); if (el.dataset.view === view) el.setAttribute('aria-current', 'page'); else el.removeAttribute('aria-current'); }); if (config) { renderGuide(); renderTeletext(); if(view==='directory')directory.render();if(view==='channel')directory.showChannel(route.slice(8)); } if(changed)requestAnimationFrame(()=>window.scrollTo({top:0,left:0,behavior:'instant'})); }
window.addEventListener('hashchange', showView); showView();
$('tv-controls-open').addEventListener('click', () => $('tv-controls').showModal());
async function refreshNetworkNotice() { try { const r = await fetch('/api/network'); const n = await r.json(); $('iptv-status').textContent = n.iptvEnabled ? '' : 'IPTV relay disabled by station owner.'; } catch {} }
refreshNetworkNotice(); document.addEventListener('community-settings-changed', refreshNetworkNotice);
fetch('/hosting-guide.html').then(r => { if (!r.ok) throw Error(); return r.text(); }).then(markup => { $('hosting-content').innerHTML = markup; fetch('/api/distribution').then(r => r.json()).then(info => { if (!info.downloadAvailable) { $('hosting-download').href = 'https://github.com/BryanWalker321/Tellybox/releases/latest'; $('hosting-download-status').textContent = 'This installation does not bundle a source ZIP. Download the latest starter from github.com/BryanWalker321/Tellybox/releases.'; } }).catch(() => {}); }).catch(() => { $('hosting-content').textContent = 'Hosting instructions are unavailable. See docs/HOSTING.md in your download.'; });
$('tv-open-guide').addEventListener('click', () => $('tv-controls').close());
$('picture-key').addEventListener('click', () => { $('picture').value = $('picture').value === 'crt' ? 'clean' : 'crt'; picture(); });
$('picture').value = stored('tellybox-picture') || 'crt';
function picture(persist = true) { $('picture-key').textContent = $('picture').value === 'crt' ? 'CRT on' : 'CRT off'; $('picture-key').setAttribute('aria-pressed', String($('picture').value === 'crt')); $('screen').classList.toggle('crt', $('picture').value === 'crt'); if (persist) stored('tellybox-picture', $('picture').value); }
$('picture').addEventListener('change', () => picture()); picture(false);
try { localStorage.removeItem('tellybox-appearance'); } catch {}
function renderTeletext() {
  if (!config) return;
  $('tt-page').textContent = 'P' + ttPage;
  let content;
  if (ttPage === '100') content = `<h2>${esc(config.brand.name)}<br>TEXT</h2><p class="tt-cyan">THE ARCHIVE TELEVISION SERVICE</p><div class="teletext-links"><button data-page="601"><strong>601</strong> What’s on now</button><button data-page="602"><strong>602</strong> Coming up next</button><button data-page="150"><strong>150</strong> About this station</button></div><p class="tt-yellow">Enter a three-digit page number below.</p>`;
  else if (ttPage === '601' || ttPage === '602') content = `<h2>TV ${ttPage === '601' ? 'NOW' : 'NEXT'}</h2><div class="teletext-links">${config.channels.map(c => { const list = listed(c), s = ttPage === '601' ? list[0] : list.find(entry => entry.start > now()) || list[1]; return `<button data-tt-channel="${c.id}"><strong>${String(c.number).padStart(2, '0')}</strong>${esc(c.name)}<br><span class="tt-green">${time(s.start)}</span> ${esc(s.programme.title)}</button>`; }).join('')}</div><p class="tt-yellow">Select a channel to tune in live.</p>`;
  else if (ttPage === '150') content = `<h2>WELCOME</h2><p class="tt-cyan">A little television from another time.</p><p>This is an independent archive station.<br>No login. No subscription. Just television.</p><p>Programmes come from their original hosts.<br>Web and IPTV share one live broadcast.<br>Source credits appear beside every programme.</p><p class="tt-yellow">Original Teletext-style pages, built for this station.</p><p>Inspired by Britain’s television information services.</p>`;
  else content = '<h2>PAGE NOT FOUND</h2><p class="tt-yellow">Try 100, 150, 601 or 602.</p>';
  $('tt-content').innerHTML = content;
}
$('teletext').addEventListener('click', e => { const page = e.target.closest('[data-page]'), ch = e.target.closest('[data-tt-channel]'); if (page) { ttPage = page.dataset.page; renderTeletext(); } if (ch) { tune(config.channels.find(c => c.id === ch.dataset.ttChannel), true); location.hash = 'watch'; } });
$('tt-input').addEventListener('input', e => { e.target.value = e.target.value.replace(/\D/g, ''); if (e.target.value.length === 3) { ttPage = e.target.value; renderTeletext(); e.target.value = ''; } });
$('tt-auto').addEventListener('click', () => { ttAuto = !ttAuto; $('tt-auto').innerHTML = `<span class="tt-cyan">■</span> Auto: ${ttAuto ? 'on' : 'off'}`; });
setInterval(() => { if (ttAuto && !$('teletext-view').hidden) { const pages = ['100', '601', '602', '150']; ttPage = pages[Math.floor(now() / 15000) % pages.length]; renderTeletext(); } }, 1000);
let digits = '', digitTimer;
document.addEventListener('keydown', e => { if (['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(e.target.tagName)  || !config) return; if (e.key.toLowerCase() === 't') { location.hash = location.hash === '#teletext' ? 'watch' : 'teletext'; return; } if (!/^\d$/.test(e.key)) return; clearTimeout(digitTimer); digits += e.key; if (location.hash === '#teletext') { if (digits.length === 3) { ttPage = digits; digits = ''; renderTeletext(); } } else digitTimer = setTimeout(() => { const c = config.channels.find(c => c.number === Number(digits)); digits = ''; if (c) { tune(c, true); location.hash = 'watch'; } }, 700); });
async function syncClock() {
  const before = Date.now();
  try { const response = await fetch('/api/time', { cache: 'no-store', signal: AbortSignal.timeout(5000) }); if (!response.ok) throw Error('Clock unavailable'); const data = await response.json(); if (!Number.isFinite(data.now)) throw Error('Invalid clock'); clockOffset = data.now - (before + Date.now()) / 2; }
  catch { /* Keep the last clock offset until the next successful sync. */ }
}
async function refreshCatalogue() {
  try {
    const response = await fetch('/api/catalogue', {cache:'no-store', signal:AbortSignal.timeout(5000)});
    if (!response.ok) return;
    const next = validateCatalogue(await response.json());
    if (JSON.stringify(next) === JSON.stringify(stationDefault)) return;
    stationDefault = next; install(next);
  } catch { /* Keep the last valid running order during a network interruption. */ }
}
try {
  const response = await fetch('/api/catalogue'); if (!response.ok) throw Error('Unable to read station catalogue');
  stationDefault = validateCatalogue(await response.json());
  await syncClock();
  try { localStorage.removeItem('tellybox-preview'); } catch {}
  install(stationDefault); status('Ready when you are. Switch on to join the live transmission.');
  setInterval(tick, 1000); setInterval(() => { renderChannels(); renderGuide(); renderUpcoming(); if (!$('teletext-view').hidden) renderTeletext(); if(!$('directory-view').hidden||!$('channel-view').hidden)directory.render(); }, 30000); setInterval(syncClock, 300000); setInterval(refreshCatalogue,60000); setInterval(refreshHomeStats,60000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { syncClock(); tick(); } });
} catch (err) { status(`The station could not start: ${err.message}. Check catalogue.json and restart the server.`); $('player-message').textContent = 'The station catalogue is unavailable.'; $('start').disabled = true; }
