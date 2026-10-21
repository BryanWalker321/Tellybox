import test from 'node:test';
import assert from 'node:assert/strict';
import { releaseEmbed, notifyRelease } from '../scripts/notify-release.mjs';

const release = { tag_name: 'v0.1.6', html_url: 'https://github.com/BryanWalker321/Tellybox/releases/tag/v0.1.6', draft: false, prerelease: false };
test('release announcement uses brand orange, requested wording and safe changelist link', () => {
  const payload = releaseEmbed(release);
  assert.equal(payload.embeds[0].color, 0xDC572B);
  assert.match(payload.embeds[0].description, /version 0\.1\.6/);
  assert.match(payload.embeds[0].description, /Update within your Station Control Room!/);
  assert.deepEqual(payload.allowed_mentions, { parse: [] });
  assert.throws(() => releaseEmbed({ ...release, draft: true }));
  assert.throws(() => releaseEmbed({ ...release, html_url: 'https://example.com' }));
});
test('delivery is a single Discord POST and failures do not leak credentials', async () => {
  let calls = 0;
  await notifyRelease(release, 'https://discord.com/api/webhooks/123/private-token', async (url, options) => {
    calls++;
    assert.equal(options.method, 'POST');
    assert.equal(JSON.parse(options.body).embeds[0].url, release.html_url);
    return { ok: true };
  });
  assert.equal(calls, 1);
  await assert.rejects(notifyRelease(release, 'https://example.com/api/webhooks/123/private-token'), /Invalid Discord/);
  await assert.rejects(notifyRelease(release, 'https://discord.com/api/webhooks/123/private-token', async () => ({ ok: false, status: 403 })), /^Error: Discord announcement failed \(HTTP 403\)$/);
});
