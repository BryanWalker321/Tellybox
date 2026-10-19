import { DatabaseSync } from 'node:sqlite';
import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { isLanAlias } from './network.mjs';

const token = () => randomBytes(32).toString('hex');
const hash = value => createHash('sha256').update(value).digest('hex');
const equal = (a, b) => typeof a === 'string' && typeof b === 'string' && Buffer.byteLength(a) === Buffer.byteLength(b) && timingSafeEqual(Buffer.from(a), Buffer.from(b));
const fail = (status, message) => Object.assign(Error(message), { status });
const cookies = req => Object.fromEntries((req.headers.cookie || '').split(';').map(p => p.trim().split('=')).filter(p => p.length === 2));
const json = (res, status, body) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(body)); };
async function body(req) {
  if (!req.headers['content-type']?.startsWith('application/json')) throw fail(415, 'Use application/json.');
  let data = '', size = 0;
  for await (const chunk of req) { size += chunk.length; if (size > 8192) throw fail(413, 'Request too large.'); data += chunk; }
  try { return JSON.parse(data); } catch { throw fail(400, 'Invalid JSON.'); }
}

export class Community {
  constructor({ directory, getConfig, env = process.env, fetchImpl = fetch }) {
    mkdirSync(directory, { recursive: true });
    this.db = new DatabaseSync(path.join(directory, 'community.sqlite'));
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
      CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY, name TEXT NOT NULL, avatar TEXT);
      CREATE TABLE IF NOT EXISTS sessions(hash TEXT PRIMARY KEY, user_id TEXT NOT NULL, csrf TEXT NOT NULL, expires INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS oauth(state TEXT PRIMARY KEY, return_to TEXT NOT NULL, expires INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS comments(id INTEGER PRIMARY KEY AUTOINCREMENT, channel TEXT NOT NULL, user_id TEXT NOT NULL, text TEXT NOT NULL, created INTEGER NOT NULL, deleted INTEGER NOT NULL DEFAULT 0);
      CREATE INDEX IF NOT EXISTS comments_channel ON comments(channel,id);
      CREATE INDEX IF NOT EXISTS comments_daily ON comments(user_id,created);
      CREATE TABLE IF NOT EXISTS reports(comment_id INTEGER NOT NULL, user_id TEXT NOT NULL, PRIMARY KEY(comment_id,user_id));
      CREATE TABLE IF NOT EXISTS outbox(id INTEGER PRIMARY KEY AUTOINCREMENT, payload TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, next_try INTEGER NOT NULL DEFAULT 0);`);
    this.env = env; this.getConfig = getConfig; this.fetch = fetchImpl; this.presence = new Map();
    this.configure(env);
    this.timer = setInterval(() => { this.cleanup(); this.flush().catch(() => {}); }, 5000); this.timer.unref();
    this.cleanup();
  }
  configure(env) {
    const previous = this.env;
    this.env = env;
    this.enabled = Boolean(env.DISCORD_CLIENT_ID && env.DISCORD_CLIENT_SECRET && env.PUBLIC_BASE_URL);
    this.autoJoin = Boolean(this.enabled && env.DISCORD_AUTO_JOIN === '1' && env.DISCORD_GUILD_ID && env.DISCORD_BOT_TOKEN);
    this.dailyLimit = Math.max(1, Math.min(1000, Number(env.CHAT_DAILY_LIMIT) || 20));
    this.moderators = new Set((env.DISCORD_MODERATOR_IDS || '').split(',').map(s => s.trim()).filter(Boolean));
    if (env.DISCORD_WEBHOOK_URL && !/^https:\/\/(?:canary\.|ptb\.)?discord(?:app)?\.com\/api(?:\/v\d+)?\/webhooks\/\d+\/[\w-]+(?:\?.*)?$/.test(env.DISCORD_WEBHOOK_URL)) throw Error('DISCORD_WEBHOOK_URL must be an official Discord webhook URL.');
    if (previous && (previous.DISCORD_CLIENT_ID !== env.DISCORD_CLIENT_ID || previous.DISCORD_CLIENT_SECRET !== env.DISCORD_CLIENT_SECRET || previous.PUBLIC_BASE_URL !== env.PUBLIC_BASE_URL)) this.db.exec('DELETE FROM oauth; DELETE FROM sessions;');
    if (previous && ['DISCORD_AUTO_JOIN', 'DISCORD_GUILD_ID', 'DISCORD_BOT_TOKEN', 'DISCORD_JOIN_ROLE_ID'].some(key => previous[key] !== env[key])) this.db.exec('DELETE FROM oauth;');
    if (previous && previous.DISCORD_WEBHOOK_URL !== env.DISCORD_WEBHOOK_URL) this.db.exec('DELETE FROM outbox;');
  }
  cleanup() {
    const stamp = Date.now();
    this.db.prepare('DELETE FROM sessions WHERE expires < ?').run(stamp);
    this.db.prepare('DELETE FROM oauth WHERE expires < ?').run(stamp);
    for (const [id, row] of this.presence) if (stamp - row.at > 55000) this.presence.delete(id);
  }
  counts() { this.cleanup(); const result = {}; for (const row of this.presence.values()) result[row.channel] = (result[row.channel] || 0) + 1; return result; }
  origin(req) { return (this.env.PUBLIC_BASE_URL || `http://${req.headers.host}`).replace(/\/$/, ''); }
  cookie(req, name, value, age) { return `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${age}${this.origin(req).startsWith('https:') ? '; Secure' : ''}`; }
  session(req) {
    const value = cookies(req).tb_session;
    if (!value || !/^[a-f0-9]{64}$/.test(value)) return null;
    return this.db.prepare('SELECT sessions.*, users.name, users.avatar FROM sessions JOIN users ON users.id=sessions.user_id WHERE hash=? AND expires>?').get(hash(value), Date.now()) || null;
  }
  checkOrigin(req) { if (req.headers.origin !== this.origin(req) && !isLanAlias(req, this.origin(req))) throw fail(403, 'Request origin not allowed.'); }
  writeAccess(req) { this.checkOrigin(req); const session = this.session(req); if (!session) throw fail(401, 'Sign in with Discord to join the conversation.'); if (!equal(req.headers['x-csrf-token'], session.csrf)) throw fail(403, 'Refresh the page and try again.'); return session; }
  publicUser(row) { return row ? { id: row.user_id, name: row.name, avatar: row.avatar, moderator: this.moderators.has(row.user_id) } : null; }
  queue(payload) { if (this.env.DISCORD_WEBHOOK_URL) this.db.prepare('INSERT INTO outbox(payload) VALUES (?)').run(JSON.stringify({ ...payload, allowed_mentions: { parse: [] } })); }
  async flush() {
    if (this.flushing || !this.env.DISCORD_WEBHOOK_URL) return;
    this.flushing = true;
    try {
      const row = this.db.prepare('SELECT * FROM outbox WHERE next_try<=? ORDER BY id LIMIT 1').get(Date.now());
      if (!row) return;
      const response = await this.fetch(this.env.DISCORD_WEBHOOK_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: row.payload, signal: AbortSignal.timeout(10000) });
      if (response.ok) this.db.prepare('DELETE FROM outbox WHERE id=?').run(row.id);
      else {
        let delay = Math.min(3600000, 5000 * 2 ** Math.min(row.attempts, 9));
        if (response.status === 429) { const data = await response.json().catch(() => ({})); delay = Math.max(delay, Number(data.retry_after || 0) * 1000); }
        this.db.prepare('UPDATE outbox SET attempts=attempts+1,next_try=? WHERE id=?').run(Date.now() + delay, row.id);
      }
    } catch { const row = this.db.prepare('SELECT id FROM outbox WHERE next_try<=? ORDER BY id LIMIT 1').get(Date.now()); if (row) this.db.prepare('UPDATE outbox SET attempts=attempts+1,next_try=? WHERE id=?').run(Date.now() + 60000, row.id); }
    finally { this.flushing = false; }
  }
  async handle(req, res, url) {
    const p = url.pathname;
    if (!(p.startsWith('/auth/') || p.startsWith('/api/community/') || p.startsWith('/api/comments'))) return false;
    try {
      if (p === '/api/community/session' && req.method === 'GET') {
        const session = this.session(req);
        const config = await this.getConfig();
        const invite = this.env.DISCORD_INVITE_URL ?? config.brand?.discordInvite ?? '';
        json(res, 200, { configured: this.enabled, user: this.publicUser(session), csrf: session?.csrf || null, dailyLimit: this.dailyLimit, logsToDiscord: Boolean(this.env.DISCORD_WEBHOOK_URL), autoJoin: this.autoJoin, inviteUrl: /^https:\/\/(?:discord\.gg\/|discord\.com\/invite\/)[\w-]+$/.test(invite) ? invite : '', serverName: config.brand?.name || 'this station' }); return true;
      }
      if (p === '/api/community/presence') {
        if (req.method === 'POST') {
          this.checkOrigin(req);
          const data = await body(req);
          if (!/^[\w-]{16,80}$/.test(data.viewerId || '')) throw fail(400, 'Invalid viewer ID.');
          if (data.active) { const config = await this.getConfig(); if (!config.channels.some(c => c.id === data.channel)) throw fail(404, 'Unknown channel.'); if (this.presence.size >= 100000 && !this.presence.has(data.viewerId)) throw fail(503, 'Presence is busy.'); this.presence.set(data.viewerId, { channel: data.channel, at: Date.now() }); }
          else this.presence.delete(data.viewerId);
        } else if (req.method !== 'GET') throw fail(405, 'Method not allowed.');
        json(res, 200, { counts: this.counts(), label: 'Active browser viewers' }); return true;
      }
      if (p === '/auth/discord' && req.method === 'GET') {
        if (!this.enabled) throw fail(503, 'Discord sign-in is not configured by this station owner yet.');
        const state = token(); const requested = url.searchParams.get('return') || '/#watch';
        const returnTo = /^\/(?!\/)[^\r\n\\]*$/.test(requested) ? requested : '/#watch';
        this.db.prepare('INSERT INTO oauth VALUES (?,?,?)').run(state, returnTo, Date.now() + 600000);
        const destination = new URL('https://discord.com/oauth2/authorize');
        destination.search = new URLSearchParams({ client_id: this.env.DISCORD_CLIENT_ID, response_type: 'code', scope: this.autoJoin ? 'identify guilds.join' : 'identify', state, redirect_uri: this.origin(req) + '/auth/discord/callback' });
        res.writeHead(302, { Location: destination.href, 'Set-Cookie': this.cookie(req, 'tb_oauth', state, 600), 'Cache-Control': 'no-store' }); res.end(); return true;
      }
      if (p === '/auth/discord/callback' && req.method === 'GET') {
        if (!this.enabled) throw fail(503, 'Discord sign-in is not configured.');
        const state = url.searchParams.get('state');
        if (!state || !equal(state, cookies(req).tb_oauth)) throw fail(400, 'The sign-in request expired or could not be verified. Please try again.');
        const flow = this.db.prepare('SELECT * FROM oauth WHERE state=? AND expires>?').get(state, Date.now());
        this.db.prepare('DELETE FROM oauth WHERE state=?').run(state);
        if (!flow || !url.searchParams.get('code')) throw fail(400, 'Sign-in was cancelled or expired.');
        const response = await this.fetch('https://discord.com/api/oauth2/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: this.env.DISCORD_CLIENT_ID, client_secret: this.env.DISCORD_CLIENT_SECRET, grant_type: 'authorization_code', code: url.searchParams.get('code'), redirect_uri: this.origin(req) + '/auth/discord/callback' }), signal: AbortSignal.timeout(15000) });
        if (!response.ok) throw fail(502, 'Discord sign-in failed. Please try again.');
        const access = await response.json();
        const profileResponse = await this.fetch('https://discord.com/api/v10/users/@me', { headers: { Authorization: `Bearer ${access.access_token}` }, signal: AbortSignal.timeout(15000) });
        if (!profileResponse.ok) throw fail(502, 'Could not read your Discord profile.');
        const profile = await profileResponse.json();
        if (!/^\d+$/.test(profile.id)) throw fail(502, 'Invalid Discord profile.');
        if (this.autoJoin) {
          if (!(access.scope || '').split(/\s+/).includes('guilds.join')) throw fail(403, 'Discord did not authorise server joining. Please sign in again and approve joining the station server.');
          const joined = await this.fetch(`https://discord.com/api/v10/guilds/${this.env.DISCORD_GUILD_ID}/members/${profile.id}`, { method: 'PUT', headers: { Authorization: `Bot ${this.env.DISCORD_BOT_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ access_token: access.access_token }), signal: AbortSignal.timeout(15000) });
          if (![201, 204].includes(joined.status)) throw fail(502, 'Discord could not add you to the station server. Please try again or contact the station owner.');
          if (this.env.DISCORD_JOIN_ROLE_ID) {
            // The single-role endpoint preserves existing roles and also handles
            // members already in the server (the join endpoint returns 204).
            const assigned = await this.fetch(`https://discord.com/api/v10/guilds/${this.env.DISCORD_GUILD_ID}/members/${profile.id}/roles/${this.env.DISCORD_JOIN_ROLE_ID}`, { method: 'PUT', headers: { Authorization: `Bot ${this.env.DISCORD_BOT_TOKEN}` }, signal: AbortSignal.timeout(15000) });
            if (assigned.status !== 204) throw fail(502, 'Your Discord membership role could not be assigned. Please retry or contact the station owner.');
          }
        }
        const avatar = /^[a-f0-9_]+$/i.test(profile.avatar || '') ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png?size=64` : null;
        this.db.prepare('INSERT INTO users VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,avatar=excluded.avatar').run(profile.id, String(profile.global_name || profile.username || 'Viewer').slice(0, 80), avatar);
        const sessionToken = token();
        const previous = cookies(req).tb_session; if (previous) this.db.prepare('DELETE FROM sessions WHERE hash=?').run(hash(previous));
        this.db.prepare('INSERT INTO sessions VALUES (?,?,?,?)').run(hash(sessionToken), profile.id, token(), Date.now() + 7 * 86400000);
        res.writeHead(302, { Location: flow.return_to, 'Set-Cookie': [this.cookie(req, 'tb_session', sessionToken, 604800), this.cookie(req, 'tb_oauth', '', 0)], 'Cache-Control': 'no-store' }); res.end(); return true;
      }
      if (p === '/auth/logout' && req.method === 'POST') { const s = this.writeAccess(req); this.db.prepare('DELETE FROM sessions WHERE hash=?').run(s.hash); res.setHeader('Set-Cookie', this.cookie(req, 'tb_session', '', 0)); json(res, 200, { ok: true }); return true; }
      if (p === '/api/comments' && req.method === 'GET') {
        const session = this.session(req); if (!session) throw fail(401, 'Sign in with Discord to read and post channel comments.');
        const channel = url.searchParams.get('channel'); const config = await this.getConfig(); if (!config.channels.some(c => c.id === channel)) throw fail(404, 'Unknown channel.');
        const rows = this.db.prepare('SELECT comments.id,channel,user_id,text,created,users.name,users.avatar FROM comments JOIN users ON users.id=comments.user_id WHERE channel=? AND deleted=0 ORDER BY comments.id DESC LIMIT 100').all(channel).reverse();
        json(res, 200, { comments: rows.map(row => ({ ...row, canDelete: row.user_id === session.user_id || this.moderators.has(session.user_id) })) }); return true;
      }
      if (p === '/api/comments' && req.method === 'POST') {
        const session = this.writeAccess(req); const data = await body(req); const config = await this.getConfig(); const channel = config.channels.find(c => c.id === data.channel);
        if (!channel) throw fail(404, 'Unknown channel.');
        const text = typeof data.text === 'string' ? data.text.trim() : '';
        if (!text || text.length > 1000) throw fail(400, 'Comments must be 1–1000 characters.');
        const today = Math.floor(Date.now() / 86400000) * 86400000;
        const count = this.db.prepare('SELECT COUNT(*) AS n FROM comments WHERE user_id=? AND created>=?').get(session.user_id, today).n;
        if (count >= this.dailyLimit) throw fail(429, `The station allows ${this.dailyLimit} comments per person per UTC day.`);
        const latest = this.db.prepare('SELECT created FROM comments WHERE user_id=? ORDER BY id DESC LIMIT 1').get(session.user_id);
        if (latest && Date.now() - latest.created < 3000) throw fail(429, 'Please wait a few seconds before posting again.');
        this.db.exec('BEGIN');
        try {
          const inserted = this.db.prepare('INSERT INTO comments(channel,user_id,text,created) VALUES (?,?,?,?)').run(channel.id, session.user_id, text, Date.now());
          this.queue({ embeds: [{ title: `CH ${channel.number} · ${channel.name}`, description: text, author: { name: `${session.name} (${session.user_id})` }, footer: { text: `Comment #${inserted.lastInsertRowid} · ${config.brand.name}` }, timestamp: new Date().toISOString() }] });
          this.db.exec('COMMIT'); json(res, 201, { ok: true, id: Number(inserted.lastInsertRowid) });
        } catch (err) { this.db.exec('ROLLBACK'); throw err; }
        return true;
      }
      const action = /^\/api\/comments\/(\d+)(\/report)?$/.exec(p);
      if (action) {
        const session = this.writeAccess(req); const comment = this.db.prepare('SELECT * FROM comments WHERE id=? AND deleted=0').get(Number(action[1]));
        if (!comment) throw fail(404, 'Comment not found.');
        if (req.method === 'DELETE' && !action[2]) {
          if (comment.user_id !== session.user_id && !this.moderators.has(session.user_id)) throw fail(403, 'Only the author or a station moderator can delete this comment.');
          this.db.prepare('UPDATE comments SET deleted=1 WHERE id=?').run(comment.id);
          this.queue({ content: `Comment #${comment.id} on ${comment.channel} was removed by ${session.name} (${session.user_id}).` });
        } else if (req.method === 'POST' && action[2]) {
          const result = this.db.prepare('INSERT OR IGNORE INTO reports VALUES (?,?)').run(comment.id, session.user_id);
          if (result.changes) this.queue({ embeds: [{ title: `Reported comment #${comment.id} · ${comment.channel}`, description: comment.text, footer: { text: `Reported by ${session.name} (${session.user_id})` } }] });
        } else throw fail(405, 'Method not allowed.');
        json(res, 200, { ok: true }); return true;
      }
      throw fail(404, 'Community endpoint not found.');
    } catch (err) { json(res, err.status || 500, { error: err.status ? err.message : 'Community service is temporarily unavailable.' }); return true; }
  }
  close() { clearInterval(this.timer); this.db.close(); }
}
