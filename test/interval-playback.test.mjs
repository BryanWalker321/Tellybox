import test from 'node:test';
import assert from 'node:assert/strict';
import {canPlayWholeClip, clipPlaybackSeconds, protectInterval} from '../public/interval-playback.mjs';

test('late joins reject clips that cannot finish before the next programme', () => {
  assert.equal(canPlayWholeClip(120, 30000, 0), false);
  assert.equal(canPlayWholeClip(29, 30000, 0), true);
  assert.equal(canPlayWholeClip(30, 30000, 0), false);
  assert.equal(canPlayWholeClip(Infinity, 30000, 0), false);
  assert.equal(clipPlaybackSeconds({duration: 30}, 31.25), 31.25);
  assert.equal(clipPlaybackSeconds({duration: 30, sourceOffset: 10}, 500), 30);
});

test('started intervals survive clock boundaries and buffering without seeking or switching', () => {
  const clip = {programme: {isInterstitial: true}, end: 10000};
  assert.equal(protectInterval(clip, true, 20000, 15000), true);
  assert.equal(protectInterval(clip, true, 20000, 25000), true);
  assert.equal(protectInterval(clip, false, 20000, 15000), true);
  assert.equal(protectInterval(clip, false, 20000, 25000), false);
  assert.equal(protectInterval({programme: {isInterstitial: true, isPresentation: true}}, true, 20000, 15000), false);
  assert.equal(protectInterval({programme: {}}, true, 20000, 15000), false);
});
