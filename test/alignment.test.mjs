import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { channelTimeline, scheduleAt, listingsWindow, programmesAt, validateCatalogue } from '../lib/schedule.mjs';
const epoch = '2026-01-01T00:00:00Z';
const channel = { id: 'test', name: 'Test', number: 1, colour: '#123456', programmes: [{ id: 'first', title: 'First', duration: 625.5, url: '/media/first.mp4', originalYear: 1980 }, { id: 'second', title: 'Second', duration: 900, url: '/media/second.mp4', originalYear: 1999 }], schedule: { alignMinutes: 10, breaks: [{ id: 'advert', title: 'Advert', duration: 120, url: '/media/ad.mp4', kind: 'advert', originalYear: 1990 }, { id: 'ident', title: 'Ident', duration: 70, url: '/media/ident.mp4', kind: 'continuity', originalYear: 1990 }] } };
test('programmes start on ten-minute boundaries across cycles, with exact shared breaks', () => {
  const entries = channelTimeline(channel); let elapsed = 0;
  for (const p of entries) { if (!p.isInterstitial) assert.ok(Math.abs(elapsed % 600) < .001); elapsed += p.duration; }
  assert.equal(elapsed, 2400);
  for (let cycle = 0; cycle < 10; cycle++) { const selected = scheduleAt(channel, epoch, Date.parse(epoch) + cycle * 2400000 + 1200000)[0]; assert.equal(selected.programme.id, 'second'); assert.equal(selected.offset, 0); }
  assert.ok(entries.filter(p => p.kind === 'advert').every(p => p.duration === 120), 'adverts should not be truncated');
  assert.ok(entries.filter(p => p.kind === 'continuity' && !p.isTestCard).every(p => p.duration === 70), 'continuity must play whole too');
  assert.ok(entries.some(p => p.isPresentation), 'unfillable remainder uses live station presentation');
  assert.ok(entries.every(p => !p.isTestCard), 'Test Card F is never a regular interval');
});
test('guides hide interval media while playback retains whole clips and presentation', () => {
  const emptyBreaks = { ...channel, schedule: { alignMinutes: 10, breaks: [] } };
  assert.equal(channelTimeline(emptyBreaks)[1].isPresentation, true);
  const entries = listingsWindow(channel, epoch, Date.parse(epoch), Date.parse(epoch) + 2400000);
  assert.deepEqual(entries.map(e => e.programme.title), ['First', 'Second']);
  const duringBreak = Date.parse(epoch) + 700000;
  assert.equal(scheduleAt(channel, epoch, duringBreak)[0].programme.isInterstitial, true);
  const next = programmesAt(channel, epoch, duringBreak, 3);
  assert.equal(next[0].programme.id, 'second');
  assert.equal(next[0].start, Date.parse(epoch) + 1200000);
  assert.ok(next.every(e => !e.programme.isInterstitial));
});
test('pre-2000 policy is enforced for the UK pack and optional for self-hosted stations', () => {
  const config = { brand: { name: 'Test' }, epoch, channels: [channel], editorial: { beforeYear: 2000 } };
  validateCatalogue(config);
  const modern = structuredClone(config); modern.channels[0].programmes[0].originalYear = 2000; assert.throws(() => validateCatalogue(modern));
  delete modern.editorial; assert.equal(validateCatalogue(modern), modern);
  const badBreak = structuredClone(config); badBreak.channels[0].schedule.breaks[0].originalYear = 2004; assert.throws(() => validateCatalogue(badBreak));
});

test('breaks vary by cycle but match across viewers and retain the same programme grid', () => {
  const c = structuredClone(channel);
  c.schedule.breaks.push({ id: 'short', title: 'Short advert', duration: 30, url: '/media/short.mp4', kind: 'advert' });
  const order = cycle => channelTimeline(c, cycle).filter(p => p.isInterstitial && !p.isPresentation).map(p => p.title).join('|');
  assert.ok(new Set(Array.from({ length: 8 }, (_, i) => order(i))).size > 1);
  for (const n of [-4, 0, 1, 9]) {
    const stamp = Date.parse(epoch) + n * 2400000 + 850000;
    assert.deepEqual(scheduleAt(c, epoch, stamp, 30), scheduleAt(structuredClone(c), epoch, stamp, 30));
    const list = scheduleAt(c, epoch, stamp, 30);
    for (let i = 1; i < list.length; i++) assert.equal(list[i].start, list[i - 1].end);
    for (const entry of list.filter(e => !e.programme.isInterstitial)) assert.equal(entry.start % 600000, 0);
  }
});
test('UK channels use the ten-minute grid except The Little Box, which plays back to back without intervals', async t => {
  const config = validateCatalogue(JSON.parse(await readFile('catalogue.json', 'utf8')));
  if (!config.editorial?.beforeYear) { t.skip('The generic starter does not contain the UK edition.'); return; }
  assert.equal(config.editorial.beforeYear, 2000); assert.ok(!config.channels.some(c => c.id === 'regional'));
  for (const c of config.channels) {
    if(c.id==='little-box') {
      assert.ok(!c.schedule?.alignMinutes);
      assert.equal(c.schedule?.breaks?.length||0,0);
      const entries=channelTimeline(c);
      assert.ok(entries.every(p=>!p.isInterstitial&&!p.isPresentation&&!p.isTestCard));
      assert.deepEqual(entries.map(p=>p.id).sort(),c.programmes.filter(p=>!p.playbackDisabled).map(p=>p.id).sort());
      const next=scheduleAt(c,config.epoch,Math.ceil(Date.parse(config.epoch)+entries[0].duration*1000)+1,1)[0];
      assert.equal(next.programme.id,entries[1].id);assert.ok(Math.abs(next.offset)<.003);
      continue;
    }
    let elapsed = 0;
    for (const p of channelTimeline(c)) { if (!p.isInterstitial) { assert.ok(Math.abs(elapsed % 600) < .001 || Math.abs(elapsed % 600 - 600) < .001, `${c.id}: ${p.title}`); assert.ok(config.editorial.approvedSources?.includes(p.url) || (p.originalYearRange?.[1] ?? p.originalYear) < 2000); } elapsed += p.duration; }
    assert.ok(Math.abs(elapsed % 600) < .001 || Math.abs(elapsed % 600 - 600) < .001);
  }
  const shorts = [...new Map(config.channels.flatMap(c => c.schedule?.breaks || []).filter(p => p.kind === 'filler').map(p => [p.id,p])).values()];
  assert.equal(shorts.filter(p => p.id.startsWith('twitter-')).length, 2);
  const uses = config.channels.flatMap(channelTimeline).filter(p => p.kind === 'filler');
  assert.ok(uses.length > 0, 'Tomorrow’s World shorts should actually be scheduled in intervals');
  for (const p of uses) assert.equal(p.duration, shorts.find(s => p.id.startsWith(s.id)).duration, 'archive shorts must play whole');
  assert.ok(config.channels.every(c => c.programmes.every(p => !p.id.startsWith('twitter-'))));
});

test('branded interval clips stay on matching services and every media clip plays whole', async () => {
  const config = JSON.parse(await readFile('catalogue.json', 'utf8'));
  for (const c of config.channels) {
    const pool = c.schedule?.breaks || [];
    for (const clip of channelTimeline(c).filter(p => p.isInterstitial && !p.isTestCard && !p.isPresentation)) {
      const source = pool.find(p => clip.id.startsWith(p.id + '-break-'));
      assert.ok(source); assert.equal(clip.duration, Math.round(source.duration * 1000) / 1000);
      if (source.stationBrand) assert.equal(source.stationBrand.toLowerCase(), c.stationBrand.toLowerCase());
    }
  }
  const bad = { brand: { name: 'Test' }, epoch, channels: [{ ...channel, schedule: { alignMinutes: 10, breaks: [{ ...channel.schedule.breaks[0], stationBrand: 'Bravo' }] } }] };
  assert.throws(() => validateCatalogue(bad), /Branded interval/);
  assert.ok(channelTimeline(bad.channels[0]).filter(p => p.isInterstitial).every(p => p.isPresentation));
});
