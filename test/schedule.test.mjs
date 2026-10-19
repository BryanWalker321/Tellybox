import test from 'node:test';
import assert from 'node:assert/strict';
import { scheduleAt, validateCatalogue, isMediaUrl } from '../lib/schedule.mjs';
const epoch = '2026-01-01T00:00:00Z';
const start = Date.parse(epoch);
const channel = { id: 'test', name: 'Test', number: 1, colour: '#123456', programmes: [{ id: 'a', title: 'First', duration: 60.25, url: '/media/a.mp4' }, { id: 'b', title: 'Second', duration: 120.5, url: 'https://example.com/b.mp4' }] };
test('independent viewers land at the same offset and programme', () => {
  const a = scheduleAt(channel, epoch, start + 75250);
  const b = scheduleAt(structuredClone(channel), epoch, start + 75250);
  assert.deepEqual(a, b); assert.equal(a[0].programme.id, 'b'); assert.equal(a[0].offset, 15); assert.equal(a[1].start, start + 180750);
});
test('exact programme boundary and loop boundary select the following programme', () => {
  assert.equal(scheduleAt(channel, epoch, start + 60250)[0].programme.id, 'b');
  const loop = scheduleAt(channel, epoch, start + 180750)[0]; assert.equal(loop.programme.id, 'a'); assert.equal(loop.offset, 0);
});
test('dates before epoch wrap into the repeating schedule', () => {
  const s = scheduleAt(channel, epoch, start - 1000)[0]; assert.equal(s.programme.id, 'b'); assert.equal(s.offset, 119.5);
});
test('schedule stays contiguous across many cycles with decimal durations', () => {
  const list = scheduleAt(channel, epoch, start + 1299999999, 25);
  list.forEach((s, i) => { assert.equal(s.end - s.start, s.programme.duration * 1000); if (i) assert.equal(s.start, list[i - 1].end); });
});
test('validation rejects duplicate channels, invalid durations and unsafe links', () => {
  const config = { brand: { name: 'Test' }, epoch, channels: [channel] };
  assert.equal(validateCatalogue(config), config);
  assert.throws(() => validateCatalogue({ ...config, channels: [channel, channel] }));
  const broken = structuredClone(config); broken.channels[0].programmes[0].duration = 0; assert.throws(() => validateCatalogue(broken));
  assert.equal(isMediaUrl('javascript:alert(1)'), false); assert.equal(isMediaUrl('/media/../secret'), false); assert.equal(isMediaUrl('file:///private.mp4'), false);
  assert.equal(isMediaUrl('/media/film.mp4'), true); assert.equal(isMediaUrl('https://archive.org/download/test/file.mp4'), true);
});
