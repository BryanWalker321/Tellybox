// A clip is admitted using the actual time left before the next programme,
// then protected from clock corrections and nominal clip-boundary changes.
export function canPlayWholeClip(seconds, deadline, now, reserveSeconds = 1) {
  return Number.isFinite(seconds) && seconds > 0 && now + (seconds + reserveSeconds) * 1000 <= deadline;
}
export function clipPlaybackSeconds(programme, mediaDuration) {
  if (programme.sourceOffset !== undefined) return programme.duration;
  return Number.isFinite(mediaDuration) && mediaDuration > 0 ? mediaDuration : programme.duration;
}
export function protectInterval(entry, started, deadline, now) {
  return Boolean(entry?.programme.isInterstitial && !entry.programme.isPresentation && (started || now < deadline));
}
