import { browserId } from './browser-id.mjs';
const $ = id => document.getElementById(id);
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function createCommunity({ video }) {
  let externalPlayback = false;
  let channel, account = null, settings = null, csrf = null, counts = {}, commentsKey = '', busy = false, currentView = 'watch';
  let viewerId;
  try { viewerId = sessionStorage.getItem('tellybox-viewer'); if (!viewerId) { viewerId = browserId(); sessionStorage.setItem('tellybox-viewer', viewerId); } } catch { viewerId = browserId(); }
  const chat = $('channel-chat'), home = chat.parentElement, anchor = chat.nextElementSibling;
  async function api(url, options = {}) {
    const response = await fetch(url, { ...options, headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(csrf ? { 'X-CSRF-Token': csrf } : {}), ...options.headers }, signal: AbortSignal.timeout(12000) });
    const result = await response.json();
    if (!response.ok) { if (response.status === 401 && account) { account = null; csrf = null; paintAccount(); } throw Error(result.error || 'The station could not complete that request.'); }
    return result;
  }
  function login() {
    const link = $('discord-sign-in');
    link.href = `/auth/discord?return=${encodeURIComponent(location.pathname + location.search + location.hash)}`;
    $('sign-in-dialog').showModal();
  }
  $('account-button').addEventListener('click', () => { session(); login(); }); $('chat-sign-in').addEventListener('click', login);
  document.addEventListener('community-settings-changed', session);
  function paintAccount() {
    $('account-button').textContent = account ? account.name : 'Sign in';
    $('chat-locked').hidden = Boolean(account); $('chat-unlocked').hidden = !account;
    $('discord-sign-in').hidden = Boolean(account) || !settings?.configured;
    $('sign-out').hidden = !account;
    $('sign-in-user').textContent = account ? `Signed in as ${account.name}.` : '';
    $('sign-in-config').textContent = settings?.configured ? '' : 'The station owner hasn’t configured Discord sign-in yet. Watching and viewer counts are still available.';
    $('sign-in-privacy').textContent = 'We save your Discord user ID, display name and profile-picture link for your chat profile and moderation. Your Discord display name (or username) and profile picture will be public beside your chat messages. We do not request your email.' + (settings?.logsToDiscord ? ' Comments and moderation reports are also logged to this station’s Discord server.' : '');
    const joining = `By continuing, you authorise us to add you to the ${settings?.serverName || 'station'} Discord server if you are not already a member. Discord will ask for this permission. You may also need to accept the server’s rules in Discord.`;
    for (const id of ['sign-in-join-notice', 'chat-join-notice']) { $(id).hidden = !settings?.autoJoin; $(id).textContent = joining; }
    $('discord-sign-in').lastChild.textContent = settings?.autoJoin ? 'Sign in & join Discord ↗' : 'Continue with Discord ↗';
    for (const link of document.querySelectorAll('[data-discord-invite]')) {
      link.hidden = !settings?.inviteUrl;
      if (settings?.inviteUrl) link.href = settings.inviteUrl; else link.removeAttribute('href');
    }
    $('discord-community-promo').hidden = !settings?.inviteUrl;
    $('chat-policy').textContent = `${settings?.dailyLimit || 20} comments per UTC day · 1,000 characters maximum${settings?.logsToDiscord ? ' · Logged to station Discord' : ''}`;
  }
  async function session() { try { settings = await api('/api/community/session'); account = settings.user; csrf = settings.csrf; paintAccount(); await loadComments(); } catch { $('chat-status').textContent = 'Channel chat is temporarily unavailable. Television remains on air.'; } }
  $('sign-out').addEventListener('click', async () => { try { await api('/auth/logout', { method: 'POST' }); account = null; csrf = null; commentsKey = ''; $('chat-comments').replaceChildren(); paintAccount(); $('sign-in-dialog').close(); } catch (err) { $('sign-in-config').textContent = err.message; } });
  function paintCounts() {
    $('viewer-count').textContent = `${counts[channel?.id] || 0} watching`;
    for (const el of document.querySelectorAll('.channel[data-channel], .epg-channel[data-epg-channel]')) {
      const id = el.dataset.channel || el.dataset.epgChannel;
      let badge = el.querySelector('.viewer-badge');
      if (!badge) { badge = document.createElement('span'); badge.className = 'viewer-badge'; (el.querySelector('.channel-copy') || el.lastElementChild).append(badge); }
      badge.textContent = `${counts[id] || 0} watching`;
      badge.title = 'Active browser viewers; external IPTV viewers are not counted';
    }
  }
  async function heartbeat() {
    if (!channel) return;
    try { const result = await api('/api/community/presence', { method: 'POST', body: JSON.stringify({ viewerId, channel: channel.id, active: externalPlayback || (!video.paused && !video.ended && video.readyState >= 2) }) }); counts = result.counts; paintCounts(); }
    catch { $('viewer-count').textContent = 'Viewer count unavailable'; }
  }
  async function loadComments() {
    if (!account || !channel || !['watch', 'guide'].includes(currentView)) return;
    const id = channel.id;
    try {
      const result = await api(`/api/comments?channel=${encodeURIComponent(id)}`);
      if (channel.id !== id || !account) return;
      const key = JSON.stringify([id, result.comments]); if (key === commentsKey) return; commentsKey = key;
      const area = $('chat-comments'); const bottom = area.scrollHeight - area.scrollTop - area.clientHeight < 70;
      area.innerHTML = result.comments.length ? result.comments.map(c => `<article class="chat-comment"><span class="chat-avatar" aria-hidden="true">${c.avatar ? `<img src="${escape(c.avatar)}" alt="" loading="lazy">` : escape(c.name.slice(0, 1).toUpperCase())}</span><div><header><strong>${escape(c.name)}</strong><time datetime="${new Date(c.created).toISOString()}">${new Date(c.created).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</time></header><p>${escape(c.text)}</p><button type="button" data-comment="${c.id}" data-action="${c.canDelete ? 'delete' : 'report'}">${c.canDelete ? 'Remove' : 'Report'}</button></div></article>`).join('') : '<p class="chat-empty">The room is quiet. Be the first to say hello.</p>';
      if (bottom) area.scrollTop = area.scrollHeight;
    } catch (err) { $('chat-status').textContent = err.message; }
  }
  $('chat-form').addEventListener('submit', async e => {
    e.preventDefault(); if (busy || !channel) return;
    busy = true; $('chat-post').disabled = true; const id = channel.id; const text = $('chat-text').value;
    try { await api('/api/comments', { method: 'POST', body: JSON.stringify({ channel: id, text }) }); if (channel.id === id && $('chat-text').value === text) $('chat-text').value = ''; $('chat-status').textContent = 'Comment posted.'; await loadComments(); }
    catch (err) { $('chat-status').textContent = err.message; }
    finally { busy = false; $('chat-post').disabled = false; }
  });
  $('chat-comments').addEventListener('click', async e => {
    const button = e.target.closest('[data-comment]'); if (!button) return;
    button.disabled = true;
    try { await api(`/api/comments/${button.dataset.comment}${button.dataset.action === 'report' ? '/report' : ''}`, { method: button.dataset.action === 'report' ? 'POST' : 'DELETE' }); $('chat-status').textContent = button.dataset.action === 'report' ? 'Reported to the station moderators.' : 'Comment removed.'; await loadComments(); }
    catch (err) { $('chat-status').textContent = err.message; } finally { button.disabled = false; }
  });
  for (const event of ['playing', 'pause', 'ended']) video.addEventListener(event, heartbeat);
  window.addEventListener('pagehide', () => { fetch('/api/community/presence', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ viewerId, active: false }), keepalive: true }).catch(() => {}); });
  setInterval(() => { heartbeat(); loadComments(); }, 5000);
  session();
  return {
    setExternalPlayback(value) { externalPlayback = value; heartbeat(); },
    setChannel(value) { channel = value; commentsKey = ''; $('chat-channel-name').textContent = `CH ${String(channel.number).padStart(2, '0')} · ${channel.name}`; $('chat-text').value = ''; $('chat-status').textContent = ''; $('chat-comments').replaceChildren(); heartbeat(); loadComments(); },
    setView(value) { currentView = value; const target = value === 'guide' ? $('guide-chat-slot') : home; if (chat.parentElement !== target) { if (target === home) home.insertBefore(chat, anchor); else target.append(chat); } loadComments(); },
    refresh: paintCounts
  };
}
