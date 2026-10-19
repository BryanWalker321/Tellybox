import test from 'node:test';
import assert from 'node:assert/strict';
import { directM3u, liveM3u, xmltv } from '../lib/iptv.mjs';
import { scheduleAt, scheduleWindow, validateCatalogue } from '../lib/schedule.mjs';
const epoch = '2026-01-01T00:00:00Z';
const config = { brand: { name: 'Test station' }, epoch, channels: [{ id: 'one', number: 1, name: 'News & drama', colour: '#123456', programmes: [{ id: 'a', title: 'Tea & television <special>', duration: 3600, url: 'https://example.com/film.mp4' }] }, { id: 'off', number: 2, name: 'Off air', colour: '#123456', status: 'offline', programmes: [] }] };
test('offline and empty channels use a shared Test Card F slot', () => {
  validateCatalogue(config);
  assert.equal(scheduleAt(config.channels[1], epoch)[0].programme.isTestCard, true);
  assert.equal(scheduleAt({ ...config.channels[0], programmes: [] }, epoch)[0].programme.isTestCard, true);
});
test('live M3U points at stable channel feeds and uses matching XMLTV IDs', () => {
  const m3u = liveM3u(config, 'https://tv.example.com');
  assert.ok(m3u.startsWith('#EXTM3U')); assert.ok(m3u.includes('tvg-id="one"')); assert.ok(m3u.includes('https://tv.example.com/iptv/one/index.m3u8')); assert.ok(m3u.includes('/iptv/off/index.m3u8'));
});
test('direct M3U links to original files and excludes image-only off-air channels', () => {
  const m3u = directM3u(config, 'https://tv.example.com');
  assert.ok(m3u.includes('https://example.com/film.mp4')); assert.ok(!m3u.includes('/iptv/')); assert.ok(!m3u.includes('tvg-id="off"'));
});
test('XMLTV escapes metadata and includes two days with consistent channel IDs', () => {
  const xml = xmltv(config, Date.parse(epoch));
  assert.ok(xml.includes('Tea &amp; television &lt;special&gt;')); assert.ok(xml.includes('News &amp; drama')); assert.ok(xml.includes('20260101000000 +0000')); assert.ok(xml.includes('channel="off"')); assert.equal((xml.match(/<programme /g) || []).length, 50);
});

test('XMLTV lists full programmes on the grid and omits adverts and presentation', () => {
  const aligned = structuredClone(config);
  aligned.channels = [aligned.channels[0]];
  aligned.channels[0].programmes[0].duration = 620;
  aligned.channels[0].schedule = {alignMinutes: 10, breaks: [{id: 'ad', title: 'DO NOT LIST THIS ADVERT', duration: 20, url: '/media/ad.mp4'}]};
  const xml = xmltv(aligned, Date.parse(epoch));
  assert.ok(!xml.includes('DO NOT LIST'));
  assert.ok(!xml.includes('Coming up next'));
  assert.equal((xml.match(/<programme /g) || []).length, 144);
  for (const start of xml.matchAll(/<programme start="(\d{14})/g)) assert.equal(Number(start[1].slice(10)) % 1000, 0);
});
test('newspaper schedule includes a programme already in progress and contiguous later slots', () => {
  const start = Date.parse(epoch) + 1800000;
  const entries = scheduleWindow(config.channels[0], epoch, start, start + 6 * 3600000);
  assert.equal(entries.length, 7); assert.equal(entries[0].start, Date.parse(epoch));
  assert.ok(entries.at(-1).end > start + 6 * 3600000); for (let i = 1; i < entries.length; i++) assert.equal(entries[i].start, entries[i - 1].end);
});
