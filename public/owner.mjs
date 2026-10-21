import {createUpdates} from '/updates.mjs';
import { createDesign } from '/design.mjs';
import { createCatalogueEditor } from '/catalogue-editor.mjs';
import {createSetup} from '/setup.mjs';
import {createOwnerNotice} from '/owner-notice.mjs';
const $ = id => document.getElementById(id);
export function createOwner({ onCatalogue }) {
  let csrf, catalogue, settings;
  const message = createOwnerNotice($('settings-status'));
  const editor = createCatalogueEditor({ message,browse:folder=>api('media-folders?folder='+encodeURIComponent(folder)),scan:folder=>api('media-scan',{method:'POST',body:JSON.stringify({folder})}) });
  const design = createDesign({ message, save: async brand => { const next = { ...catalogue, brand }; await put('catalogue', next); catalogue = next; fillCatalogue(); await onCatalogue(next); } });
  document.addEventListener('owner-upload-holding', async e => { try { if (e.detail.size > 2 * 1024 ** 2) throw Error('Maximum image size is 2 MB.'); const result = await api('logo', { method: 'PUT', body: e.detail, headers: { 'Content-Type': 'application/octet-stream' } }); $('owner-holding-url').value = result.url; message('Holding screen uploaded to draft. Save design & wording to apply.'); } catch (err) { message(err.message); } });
  async function api(route, options = {}) {
    const response = await fetch('/api/owner/' + route, { ...options, headers: { 'Content-Type': 'application/json', ...(csrf ? { 'X-CSRF-Token': csrf } : {}), ...options.headers } });
    const result = await response.json();
    if (!response.ok) { if (response.status === 401) { $('owner-panel').hidden = true; $('owner-gate').hidden = false; } throw Error(result.error); } return result;
  }
  const updates=createUpdates({api});
  const put = (route, data) => api(route, { method: 'PUT', body: JSON.stringify(data) });
  const setup=createSetup({message,save:async data=>{const result=await put('settings',data);settings=result.settings;fillSettings();document.dispatchEvent(new Event('community-settings-changed'));return settings;}});
  async function youtubeStatus() {
    const result = await api('youtube-auth');
    $('owner-youtube-state').textContent = !result.configured ? 'No private YouTube session saved. IPTV resolution uses anonymous requests.' : result.expired ? 'A session file is saved, but its sign-in cookies have expired or are invalid. Upload a fresh export.' : `Private session saved${result.savedAt ? ' · ' + new Date(result.savedAt).toLocaleString('en-GB') : ''}. Run an IPTV sample to check whether YouTube accepts it.`;
    $('owner-youtube-remove').disabled = !result.configured;
  }
  async function apiNetworkNotice() { try { const r = await fetch('/api/network'); const n = await r.json(); $('owner-network-note').textContent = n.loopbackOnly ? 'Current server: localhost only. Other TVs/devices cannot connect until the launcher listens on the LAN interface.' : `Current playlist origin: ${n.base}. Test this address from the device that will watch.`; } catch {} }
  function fillSettings() {
    setup.load(settings);
    $('owner-base').value = settings.PUBLIC_BASE_URL || location.origin;
    apiNetworkNotice();
    $('owner-iptv').value = settings.IPTV_ENABLED;
    $('owner-client-id').value = settings.DISCORD_CLIENT_ID;
    $('owner-invite').value = settings.DISCORD_INVITE_URL ?? catalogue.brand.discordInvite ?? '';
    $('owner-guild').value = settings.DISCORD_GUILD_ID || '';
    $('owner-join-role').value = settings.DISCORD_JOIN_ROLE_ID || '';
    $('owner-auto-join').checked = settings.DISCORD_AUTO_JOIN === '1';
    $('owner-bot-token').value = '';
    $('owner-bot-token').placeholder = settings.DISCORD_BOT_TOKEN ? 'Saved · leave blank to keep' : 'Bot token from the same Discord application';
    $('owner-clear-bot').checked = false;
    $('owner-mods').value = settings.DISCORD_MODERATOR_IDS;
    $('owner-daily').value = settings.CHAT_DAILY_LIMIT;
    $('owner-callback').textContent = ($('owner-base').value || location.origin).replace(/\/$/, '') + '/auth/discord/callback';
    $('owner-client-secret').value = ''; $('owner-webhook').value = '';
    $('owner-client-secret').placeholder = settings.DISCORD_CLIENT_SECRET ? 'Saved · leave blank to keep' : 'Enter client secret';
    $('owner-webhook').placeholder = settings.DISCORD_WEBHOOK_URL ? 'Saved · leave blank to keep' : 'https://discord.com/api/webhooks/…';
    $('owner-clear-secret').checked = false; $('owner-clear-webhook').checked = false;
    $('owner-discord-state').textContent = (settings.DISCORD_CLIENT_ID && settings.DISCORD_CLIENT_SECRET && settings.PUBLIC_BASE_URL ? 'Sign-in is configured.' : 'Sign-in needs a station address, application ID and client secret.') + (settings.DISCORD_WEBHOOK_URL ? ' Comment logging is connected.' : ' Comment logging is optional.');
    $('owner-discord-state').textContent += settings.DISCORD_AUTO_JOIN === '1' && settings.DISCORD_BOT_TOKEN && settings.DISCORD_GUILD_ID ? ' Automatic server joining is enabled for new sign-ins.' : ' Automatic joining needs a bot token and server ID, then the option below must be enabled.';
  }
  function fillCatalogue() {
    $('owner-brand').value = catalogue.brand.name; $('owner-tagline').value = catalogue.brand.tagline || ''; $('owner-accent').value = catalogue.brand.accent || '#eabf43';
    $('owner-logo-url').value = catalogue.brand.logo || '/icon.svg'; $('owner-logo-preview').src = catalogue.brand.logo || '/icon.svg'; $('owner-reset-logo').checked = false;
    editor.load(catalogue); design.load(catalogue.brand);
  }
  async function media() {
    const result = await api('media'); $('owner-media-list').replaceChildren();
    for (const file of result.files) { const li = document.createElement('li'), code = document.createElement('code'), button = document.createElement('button'); code.textContent = file.url; button.type = 'button'; button.textContent = 'Copy URL'; button.addEventListener('click', () => navigator.clipboard.writeText(file.url).then(() => message('Media URL copied.')).catch(() => message('Select and copy the URL shown.'))); li.append(code, ' ', button); $('owner-media-list').append(li); }
    if (!result.files.length) $('owner-media-list').textContent = 'No local media uploaded yet.';
  }
  async function load() { const result = await api('settings'); catalogue = result.catalogue; settings = result.settings; fillSettings(); fillCatalogue(); await onCatalogue(catalogue); $('owner-panel').hidden = false; $('owner-gate').hidden = true; await media(); await youtubeStatus(); updates.start(); if (!$('owner-youtube-check-url').value) $('owner-youtube-check-url').value = catalogue.channels.flatMap(c => c.programmes).find(p => !p.playbackDisabled && /^https:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)\//.test(p.url))?.url || ''; }
  async function open() {
    message('');
    try { const session = await api('session'); csrf = session.csrf; $('owner-key-label').hidden = session.claimed; $('owner-password').autocomplete = session.claimed ? 'current-password' : 'new-password'; $('owner-gate-title').textContent = session.claimed ? 'Owner sign-in' : 'Welcome to your new station'; $('owner-gate-note').textContent = session.claimed ? 'Enter your station owner password. This is separate from viewer Discord sign-in.' : 'Copy the one-time setup key from your server console, then choose an owner password (at least 12 characters).'; $('owner-panel').hidden = true; $('owner-gate').hidden = false; if (session.authenticated) await load(); } catch (err) { message(err.message); }
  }
  $('owner-login').addEventListener('submit', async e => { e.preventDefault(); try { const result = await api('login', { method: 'POST', body: JSON.stringify({ password: $('owner-password').value, setupKey: $('owner-key').value.trim() }) }); csrf = result.csrf; $('owner-password').value = ''; $('owner-key').value = ''; await load(); message('Owner settings unlocked.'); } catch (err) { message(err.message); } });
  function selectSection(){const name=location.hash.slice(1),tabs=[...document.querySelectorAll('[data-owner-tab]')],selected=tabs.find(b=>b.dataset.ownerTab===name)||tabs[0];document.querySelectorAll('[data-owner-section]').forEach(section=>section.hidden=section.dataset.ownerSection!==selected.dataset.ownerTab);tabs.forEach(b=>b.setAttribute('aria-pressed',String(b===selected)));message('');}
  document.querySelectorAll('[data-owner-tab]').forEach(button=>button.addEventListener('click',()=>{location.hash=button.dataset.ownerTab;window.scrollTo({top:0,behavior:'instant'});}));
  window.addEventListener('hashchange',selectSection);selectSection();
  $('owner-station-form').addEventListener('submit', async e => { e.preventDefault(); try { const next = structuredClone(catalogue); Object.assign(next.brand, { name: $('owner-brand').value, tagline: $('owner-tagline').value, accent: $('owner-accent').value, logo: $('owner-reset-logo').checked ? '/icon.svg' : $('owner-logo-url').value.trim() }); await put('catalogue', next); catalogue = next; fillCatalogue(); await onCatalogue(next); message('Network name and logo saved for everyone.'); } catch (err) { message(err.message); } });
  $('owner-upload-logo').addEventListener('click', async () => { const file = $('owner-logo-file').files[0]; if (!file) return message('Choose a logo image first.'); if (file.size > 2 * 1024 ** 2) return message('Logo maximum size is 2 MB.'); try { const result = await api('logo', { method: 'PUT', body: file, headers: { 'Content-Type': 'application/octet-stream' } }); $('owner-logo-url').value = result.url; $('owner-logo-preview').src = result.url; $('owner-reset-logo').checked = false; message('Logo uploaded to your draft. Save station identity to apply it.'); } catch (err) { message(err.message); } });
  $('owner-service-form').addEventListener('submit', async e => { e.preventDefault(); try { const result = await put('settings', { PUBLIC_BASE_URL: $('owner-base').value.trim(), IPTV_ENABLED: $('owner-iptv').value }); settings = result.settings; fillSettings(); message('Service settings saved. No server restart needed.'); document.dispatchEvent(new Event('community-settings-changed')); } catch (err) { message(err.message); } });
  $('owner-youtube-form').addEventListener('submit', async e => {
    e.preventDefault(); const file = $('owner-youtube-file').files[0];
    if (!file) return message('Choose the exported YouTube-only cookies.txt file.');
    if (file.size > 262144) return message('Session files must be smaller than 256 KB. Export only youtube.com cookies.');
    $('owner-youtube-save').disabled = true;
    try { await put('youtube-auth', {cookies: await file.text()}); await youtubeStatus(); message('Private YouTube session saved. No restart needed. Test one IPTV sample next.'); }
    catch (err) { message(err.message); }
    finally { $('owner-youtube-file').value = ''; $('owner-youtube-save').disabled = false; }
  });
  $('owner-youtube-remove').addEventListener('click', async () => { try { await api('youtube-auth', {method:'DELETE'}); await youtubeStatus(); $('owner-youtube-result').textContent = 'Session disconnected. Future resolutions use anonymous requests; existing streams may continue until their next programme change.'; message('The server’s saved YouTube session has been removed.'); } catch (err) { message(err.message); } });
  $('owner-youtube-check-form').addEventListener('submit', async e => {
    e.preventDefault(); $('owner-youtube-check').disabled = true; $('owner-youtube-result').textContent = 'Preparing and decoding an IPTV sample. This may take about a minute…';
    try { const result = await api('youtube-check', {method:'POST',body:JSON.stringify({url:$('owner-youtube-check-url').value.trim()})}); $('owner-youtube-result').textContent = (result.result === 'passed' ? 'Sample passed. ' : 'Still unverified. ') + result.reason; }
    catch (err) { $('owner-youtube-result').textContent = err.message; }
    finally { $('owner-youtube-check').disabled = false; }
  });
  $('owner-discord-form').addEventListener('submit', async e => {
    e.preventDefault(); const data = { DISCORD_CLIENT_ID: $('owner-client-id').value.trim(), DISCORD_MODERATOR_IDS: $('owner-mods').value.trim(), CHAT_DAILY_LIMIT: $('owner-daily').value, DISCORD_INVITE_URL: $('owner-invite').value.trim(), DISCORD_GUILD_ID: $('owner-guild').value.trim(), DISCORD_JOIN_ROLE_ID: $('owner-join-role').value.trim(), DISCORD_AUTO_JOIN: $('owner-auto-join').checked ? '1' : '0' };
    if (!settings.PUBLIC_BASE_URL) data.PUBLIC_BASE_URL = location.origin;
    for (const [key, field, clear] of [['DISCORD_CLIENT_SECRET', 'owner-client-secret', 'owner-clear-secret'], ['DISCORD_WEBHOOK_URL', 'owner-webhook', 'owner-clear-webhook']]) { if ($(clear).checked) data[key] = ''; else if ($(field).value.trim()) data[key] = $(field).value.trim(); }
    if ($('owner-clear-bot').checked) data.DISCORD_BOT_TOKEN = ''; else if ($('owner-bot-token').value.trim()) data.DISCORD_BOT_TOKEN = $('owner-bot-token').value.trim();
    try { const result = await put('settings', data); settings = result.settings; fillSettings(); message('Discord settings saved and active. Use Sign in to test your Discord application.'); document.dispatchEvent(new Event('community-settings-changed')); } catch (err) { message(err.message); }
  });
  $('owner-copy-callback').addEventListener('click', () => navigator.clipboard.writeText($('owner-callback').textContent).then(() => message('Callback address copied.')).catch(() => message('Select and copy the callback address shown.')));
  $('owner-check-webhook').addEventListener('click', async () => { try { const result = await api('webhook-check', { method: 'POST', body: '{}' }); message(`Webhook verified: ${result.name} · server ${result.serverId} · channel ${result.channelId}. No message was posted.`); } catch (err) { message(err.message); } });
  $('import').addEventListener('change', async e => { try { const file = e.target.files[0]; if (!file) return; if (file.size > 2000000) throw Error('Maximum catalogue size is 2 MB.'); const value = JSON.parse(await file.text()); if (!Array.isArray(value.channels) || !value.channels.length || value.channels.some(c => !Array.isArray(c.programmes))) throw Error('A catalogue needs channels and programme arrays.'); editor.load(value,{saved:false}); message('File loaded into editor. Save programming to apply it to the station.'); } catch (err) { message(err.message); } });
  $('owner-save-catalogue').addEventListener('click', async () => { try { const next = JSON.parse($('owner-catalogue').value); await put('catalogue', next); catalogue = next; fillCatalogue(); await onCatalogue(next); message('Programming saved to the server. Viewers receive it when they reload.'); } catch (err) { message(err.message); } });
  $('export').addEventListener('click', () => { const url = URL.createObjectURL(new Blob([$('owner-catalogue').value], { type: 'application/json' })); const a = document.createElement('a'); a.href = url; a.download = 'catalogue.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); });
  $('reset').addEventListener('click', () => { fillCatalogue(); message('Unsaved catalogue edits discarded.'); });
  $('owner-upload').addEventListener('click', async () => { const file = $('owner-media-file').files[0]; if (!file) return message('Choose a file first.'); if (file.size > 4 * 1024 ** 3) return message('Maximum file size is 4 GB.'); $('owner-upload').disabled = true; message('Uploading local media…'); try { const result = await api('media?name=' + encodeURIComponent(file.name), { method: 'PUT', body: file, headers: { 'Content-Type': 'application/octet-stream' } }); await media(); message(`Uploaded. Programme URL: ${result.url}. Add its duration in seconds to your catalogue.`); } catch (err) { message(err.message); } finally { $('owner-upload').disabled = false; } });
  $('owner-logout').addEventListener('click', async () => { try { await api('logout', { method: 'POST', body: '{}' }); csrf = null; await openRefresh(); } catch (err) { message(err.message); } });
  $('owner-password-form').addEventListener('submit', async e => { e.preventDefault(); try { const result = await put('password', { current: $('owner-current-password').value, password: $('owner-new-password').value }); csrf = result.csrf; $('owner-current-password').value = ''; $('owner-new-password').value = ''; message('Owner password changed. Other owner sessions have been signed out.'); } catch (err) { message(err.message); } });
  async function openRefresh() { await open(); }
  return { open };
}
