import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import { Community } from '../lib/community.mjs';

test('Discord sign-in, channel chat, CSRF, moderation, webhook retry and presence', async t => {
  t.mock.method(Date,'now',()=>Date.UTC(2026,0,15,12));
  const directory = await mkdtemp(path.join(tmpdir(), 'tellybox-community-test-'));
  const config = { brand: { name: 'Test station' }, channels: [{ id: 'one', number: 1, name: 'Channel One' }, { id: 'two', number: 2, name: 'Channel Two' }] };
  const deliveries = []; let webhookOk = false;
  const env = { PUBLIC_BASE_URL: 'http://127.0.0.1', DISCORD_CLIENT_ID: 'test-client', DISCORD_CLIENT_SECRET: 'test-secret', DISCORD_WEBHOOK_URL: 'https://discord.com/api/webhooks/123/test-webhook', DISCORD_MODERATOR_IDS: '3', CHAT_DAILY_LIMIT: '2' };
  const fetchImpl = async (url, options) => {
    if (url.includes('/oauth2/token')) { assert.ok(options.body instanceof URLSearchParams); return Response.json({ access_token: 'access-' + options.body.get('code') }); }
    if (url.endsWith('/users/@me')) { const id = options.headers.Authorization.slice(-1); return Response.json({ id, username: `Viewer ${id}`, global_name: `Viewer ${id}`, avatar: null }); }
    deliveries.push(JSON.parse(options.body)); return webhookOk ? new Response(null, { status: 204 }) : Response.json({ retry_after: 1 }, { status: 429 });
  };
  const community = new Community({ directory, getConfig: async () => config, env, fetchImpl });
  clearInterval(community.timer); // Explicitly exercise delivery and retries below.
  const server = http.createServer((req, res) => { community.handle(req, res, new URL(req.url, env.PUBLIC_BASE_URL)); });
  server.listen(0, '127.0.0.1'); await once(server, 'listening'); env.PUBLIC_BASE_URL = `http://127.0.0.1:${server.address().port}`;
  const base = env.PUBLIC_BASE_URL;
  async function call(route, { method = 'GET', cookie = '', csrf, body, origin = base } = {}) {
    return fetch(base + route, { method, redirect: 'manual', headers: { Cookie: cookie, Origin: origin, ...(csrf ? { 'X-CSRF-Token': csrf } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  }
  async function login(id) {
    const begun = await call('/auth/discord?return=%2F%3Fchannel%3Done%23guide'); assert.equal(begun.status, 302);
    const destination = new URL(begun.headers.get('location')); assert.equal(destination.searchParams.get('scope'), 'identify');
    const state = destination.searchParams.get('state'); const flowCookie = begun.headers.getSetCookie()[0].split(';')[0];
    assert.equal((await call(`/auth/discord/callback?state=${state}&code=${id}`, { cookie: 'tb_oauth=wrong' })).status, 400);
    const response = await call(`/auth/discord/callback?state=${state}&code=${id}`, { cookie: flowCookie }); assert.equal(response.status, 302);
    assert.equal(response.headers.get('location'), '/?channel=one#guide');
    const cookie = response.headers.getSetCookie().find(c => c.startsWith('tb_session=')).split(';')[0]; assert.ok(response.headers.getSetCookie()[0].includes('HttpOnly'));
    assert.equal((await call(`/auth/discord/callback?state=${state}&code=${id}`, { cookie: flowCookie })).status, 400);
    const session = await (await call('/api/community/session', { cookie })).json(); assert.equal(session.user.id, id); return { cookie, csrf: session.csrf };
  }
  try {
    assert.equal((await call('/api/comments?channel=one')).status, 401);
    assert.equal((await call('/api/comments', { method: 'POST', body: { channel: 'one', text: 'No login' } })).status, 401);
    const a = await login('1'), b = await login('2'), mod = await login('3');
    assert.equal((await call('/api/comments', { method: 'POST', cookie: a.cookie, body: { channel: 'one', text: 'No CSRF' } })).status, 403);
    assert.equal((await call('/api/comments', { method: 'POST', ...a, origin: 'https://evil.example', body: { channel: 'one', text: 'Cross origin' } })).status, 403);
    const post = await call('/api/comments', { method: 'POST', ...a, body: { channel: 'one', text: '<script>raw text</script> @everyone' } }); assert.equal(post.status, 201); const { id } = await post.json();
    assert.equal((await call('/api/comments', { method: 'POST', ...a, body: { channel: 'one', text: 'Too quickly' } })).status, 429);
    const messages = await (await call('/api/comments?channel=one', a)).json(); assert.equal(messages.comments[0].text, '<script>raw text</script> @everyone');
    assert.equal((await (await call('/api/comments?channel=two', a)).json()).comments.length, 0);
    assert.equal((await call(`/api/comments/${id}`, { method: 'DELETE', ...b })).status, 403);
    assert.equal((await call(`/api/comments/${id}/report`, { method: 'POST', ...b })).status, 200);
    assert.equal((await call(`/api/comments/${id}`, { method: 'DELETE', ...mod })).status, 200);
    assert.equal((await (await call('/api/comments?channel=one', a)).json()).comments.length, 0);
    await community.flush(); assert.ok(community.db.prepare('SELECT attempts FROM outbox ORDER BY id LIMIT 1').get().attempts > 0);
    assert.deepEqual(deliveries[0].allowed_mentions, { parse: [] }); assert.ok(deliveries[0].embeds[0].title.includes('Channel One'));
    webhookOk = true; community.db.prepare('UPDATE outbox SET next_try=0').run();
    await community.flush(); assert.equal(community.db.prepare('SELECT COUNT(*) n FROM outbox').get().n, 2);
    community.db.prepare('UPDATE comments SET created=created-4000').run();
    assert.equal((await call('/api/comments', { method: 'POST', ...a, body: { channel: 'two', text: 'Second comment' } })).status, 201);
    community.db.prepare('UPDATE comments SET created=created-4000').run();
    assert.equal((await call('/api/comments', { method: 'POST', ...a, body: { channel: 'two', text: 'Daily limit' } })).status, 429);
    const viewerId = 'test-viewer-123456789';
    const presence = await (await call('/api/community/presence', { method: 'POST', body: { viewerId, channel: 'one', active: true } })).json(); assert.equal(presence.counts.one, 1);
    await call('/api/community/presence', { method: 'POST', body: { viewerId, channel: 'two', active: true } });
    assert.deepEqual(community.counts(), { two: 1 });
    community.presence.get(viewerId).at -= 60000; assert.deepEqual(community.counts(), {});
    const savedHash = community.db.prepare('SELECT hash FROM sessions WHERE user_id=?').get('1').hash; assert.notEqual(savedHash, a.cookie.slice('tb_session='.length));
    assert.equal((await call('/auth/logout', { method: 'POST', ...a })).status, 200);
    assert.equal((await call('/api/comments?channel=one', a)).status, 401);
    assert.ok(!(await readFile(path.join(directory, 'community.sqlite'))).includes(Buffer.from('test-secret')));
  } finally { server.close(); server.closeAllConnections(); community.close(); if (directory.startsWith(path.join(tmpdir(), 'tellybox-community-test-'))) await rm(directory, { recursive: true, force: true }); }
});

test('unconfigured Discord leaves anonymous viewing and presence available', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'tellybox-community-test-'));
  const community = new Community({ directory, getConfig: async () => ({ channels: [] }), env: {} });
  try { assert.equal(community.enabled, false); assert.deepEqual(community.counts(), {}); }
  finally { community.close(); if (directory.startsWith(path.join(tmpdir(), 'tellybox-community-test-'))) await rm(directory, { recursive: true, force: true }); }
});

test('automatic Discord joining requires consent, handles existing members, and never persists bot or viewer tokens', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'tellybox-community-test-'));
  const env = { PUBLIC_BASE_URL: 'http://127.0.0.1', DISCORD_CLIENT_ID: '123456', DISCORD_CLIENT_SECRET: 'private-client-secret', DISCORD_GUILD_ID: '987654', DISCORD_BOT_TOKEN: 'private-bot-token', DISCORD_AUTO_JOIN: '1', DISCORD_INVITE_URL: 'https://discord.gg/test' };
  let memberStatus = 201, roleStatus = 204, scope = 'identify guilds.join'; const additions = [], roleAssignments = [];
  const community = new Community({ directory, env, getConfig: async () => ({ brand: { name: 'Example station' }, channels: [] }), fetchImpl: async (url, options) => {
    if (url.endsWith('/oauth2/token')) return Response.json({ access_token: 'temporary-viewer-token', scope });
    if (url.endsWith('/users/@me')) return Response.json({ id: '123', username: 'Viewer' });
    if (url.endsWith('/roles/555555')) {
      assert.equal(options.method, 'PUT'); assert.equal(options.headers.Authorization, 'Bot private-bot-token');
      assert.equal(options.body, undefined); roleAssignments.push(url);
      return new Response(null, { status: roleStatus });
    }
    assert.equal(url, 'https://discord.com/api/v10/guilds/987654/members/123');
    assert.equal(options.method, 'PUT'); assert.equal(options.headers.Authorization, 'Bot private-bot-token');
    assert.deepEqual(JSON.parse(options.body), { access_token: 'temporary-viewer-token' });
    additions.push(url); return new Response(null, { status: memberStatus });
  } });
  const server = http.createServer((req, res) => community.handle(req, res, new URL(req.url, env.PUBLIC_BASE_URL)));
  server.listen(0, '127.0.0.1'); await once(server, 'listening'); env.PUBLIC_BASE_URL = `http://127.0.0.1:${server.address().port}`;
  async function login() {
    const start = await fetch(env.PUBLIC_BASE_URL + '/auth/discord', { redirect: 'manual' });
    const auth = new URL(start.headers.get('location')); assert.equal(auth.searchParams.get('scope'), 'identify guilds.join');
    return fetch(env.PUBLIC_BASE_URL + '/auth/discord/callback?state=' + auth.searchParams.get('state') + '&code=example', { redirect: 'manual', headers: { Cookie: start.headers.getSetCookie()[0].split(';')[0] } });
  }
  try {
    const publicSettings = await (await fetch(env.PUBLIC_BASE_URL + '/api/community/session')).json();
    assert.equal(publicSettings.autoJoin, true); assert.equal(publicSettings.inviteUrl, 'https://discord.gg/test');
    assert.ok(!JSON.stringify(publicSettings).includes('private-bot-token'));
    assert.equal((await login()).status, 302); memberStatus = 204; assert.equal((await login()).status, 302);
    assert.equal(roleAssignments.length, 0);
    community.configure({ ...env, DISCORD_JOIN_ROLE_ID: '555555' });
    memberStatus = 201; assert.equal((await login()).status, 302); assert.equal(roleAssignments.length, 1);
    memberStatus = 204; assert.equal((await login()).status, 302); assert.equal(roleAssignments.length, 2);
    roleStatus = 403; const roleFailure = await login(); assert.equal(roleFailure.status, 502);
    assert.match((await roleFailure.json()).error, /role could not be assigned/); assert.ok(!roleFailure.headers.get('set-cookie')?.includes('tb_session='));
    roleStatus = 204;
    memberStatus = 403; const failed = await login(); assert.equal(failed.status, 502); assert.ok(!failed.headers.get('set-cookie')?.includes('tb_session='));
    const count = additions.length; scope = 'identify'; assert.equal((await login()).status, 403); assert.equal(additions.length, count);
    for (const secret of ['private-bot-token', 'temporary-viewer-token', 'private-client-secret']) {
      assert.ok(!(await readFile(path.join(directory, 'community.sqlite'))).includes(Buffer.from(secret)));
    }
  } finally { server.close(); server.closeAllConnections(); community.close(); if (directory.startsWith(path.join(tmpdir(), 'tellybox-community-test-'))) await rm(directory, { recursive: true, force: true }); }
});
