let youtubeReady;
function youtubeAPI() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (!youtubeReady) youtubeReady = new Promise((resolve, reject) => {
    const script = document.createElement('script'); script.src = 'https://www.youtube.com/iframe_api'; script.onerror = () => reject(Error('YouTube player unavailable.'));
    window.onYouTubeIframeAPIReady = () => resolve(window.YT); document.head.append(script);
    setTimeout(() => { if (!window.YT?.Player) { youtubeReady = null; reject(Error('YouTube player timed out.')); } }, 15000);
  });
  return youtubeReady;
}
export function providerOf(url) {
  try { const u = new URL(url); if (['www.youtube.com', 'youtube.com', 'youtu.be'].includes(u.hostname)) return { name: 'youtube', id: u.hostname === 'youtu.be' ? u.pathname.slice(1) : u.searchParams.get('v') || u.pathname.split('/').at(-1) }; if (['www.dailymotion.com', 'dailymotion.com', 'dai.ly'].includes(u.hostname)) return { name: 'dailymotion', id: u.pathname.split('/').at(-1).split('_')[0] }; } catch {} return null;
}
export function createExternalPlayer({ root, onState, onError, offset, canStartInterval = () => true, onSkip = () => {}, onEnded = () => {} }) {
  let player, generation = 0, active = false, url = '', interval = false, intervalTimer;
  function destroy() { generation++; active = false; url = ''; clearInterval(intervalTimer); try { player?.destroy(); } catch {} player = null; root.replaceChildren(); root.hidden = true; onState(false); }
  async function load(programme) {
    destroy(); const ticket = generation, provider = providerOf(programme.url); if (!provider) return;
    active = true; url = programme.url; interval = Boolean(programme.isInterstitial); root.hidden = false;
    const start = () => interval ? programme.sourceOffset || 0 : offset();
    try {
      if (provider.name === 'youtube') {
        const YT = await youtubeAPI(); if (ticket !== generation) return;
        let captionsInitialised = false;
        const initialiseCaptions = target => {
          if (ticket !== generation || captionsInitialised) return;
          // The captions module can arrive after onReady. Apply the initial
          // preference once, so later viewer choices remain untouched.
          try {
            if (!target.getOptions?.().includes('captions')) return;
            target.setOption('captions', 'track', {});
            captionsInitialised = true;
          } catch { /* Provider versions may not expose caption selection. */ }
        };
        const mount = document.createElement('div'); root.replaceChildren(mount);
        player = new YT.Player(mount, { host: 'https://www.youtube-nocookie.com', videoId: provider.id, width: '100%', height: '100%', playerVars: { autoplay: interval ? 0 : 1, start: Math.floor(start()), playsinline: 1, rel: 0, cc_load_policy: 0, origin: location.origin }, events: {
          onReady: e => { if (ticket !== generation) return;
            initialiseCaptions(e.target);
            const seconds = programme.sourceOffset !== undefined ? programme.duration : e.target.getDuration() || programme.duration;
            if (interval && !canStartInterval(seconds)) { onSkip(); return; }
            e.target.seekTo(start(), true); e.target.playVideo();
            if (interval && programme.sourceOffset !== undefined) intervalTimer = setInterval(() => { if (ticket === generation && e.target.getCurrentTime() >= programme.sourceOffset + programme.duration) onEnded(); }, 100);
          },
          onApiChange: e => initialiseCaptions(e.target),
          onStateChange: e => { if (ticket !== generation) return; if (!interval && e.data === YT.PlayerState.PLAYING) { const target = offset(); if (Math.abs(e.target.getCurrentTime() - target) > 4) e.target.seekTo(target, true); } onState(e.data === YT.PlayerState.PLAYING); if (e.data === YT.PlayerState.ENDED) onEnded(); },
          onError: e => { if (ticket === generation) {
            onState(false);
            const messages = {
              2: 'YouTube could not recognise this programme’s video address.',
              5: 'YouTube could not play this upload in the browser. Please retry the channel.',
              100: 'This YouTube upload is unavailable or has been made private.',
              101: 'YouTube has blocked this upload from playing on other websites.',
              150: 'YouTube has blocked this upload from playing on other websites.',
              153: 'YouTube could not verify this website’s player address. Please reload the page.'
            };
            onError(messages[e.data] || 'This YouTube upload cannot currently play here.');
          } }
        } });
      } else {
        // This basic iframe has no reliable ended event. Do not start interval
        // media that we cannot protect from truncation at the next boundary.
        if (interval) { onSkip(); return; }
        const frame = document.createElement('iframe'); frame.src = `https://www.dailymotion.com/embed/video/${encodeURIComponent(provider.id)}?autoplay=1&subtitles=off&start=${Math.floor(start())}`; frame.title = programme.title; frame.allow = 'autoplay; fullscreen; picture-in-picture'; frame.allowFullscreen = true; frame.referrerPolicy = 'strict-origin-when-cross-origin'; frame.addEventListener('load', () => { if (ticket === generation) onState(true); }); root.replaceChildren(frame);
      }
    } catch { if (ticket === generation) onError('The external player is unavailable. Please try this channel again.'); }
  }
  return { load, destroy, get active() { return active; }, get url() { return url; }, sync() { if (!interval && active && player?.getPlayerState?.() === 1 && Math.abs(player.getCurrentTime() - offset()) > 4) player.seekTo(offset(), true); } };
}
