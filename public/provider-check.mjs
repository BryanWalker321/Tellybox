import { providerOf } from '/external-player.mjs';
const $ = id => document.getElementById(id);
let ready;
function api() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  return ready ||= new Promise((resolve, reject) => {
    window.onYouTubeIframeAPIReady = () => resolve(window.YT);
    const script = document.createElement('script'); script.src = 'https://www.youtube.com/iframe_api'; script.onerror = () => reject(Error('YouTube API unavailable')); document.head.append(script);
    setTimeout(() => { if (!window.YT?.Player) reject(Error('YouTube API timed out')); }, 20000);
  });
}
async function check(item, root) {
  const provider = providerOf(item.url);
  if (provider.name !== 'youtube') return { ...item, result: 'unverified', reason: 'Dailymotion iframe load does not prove playback; review with its official player SDK.' };
  const YT = await api();
  return new Promise(resolve => {
    let player, done = false, firstTime, started = false;
    const finish = result => { if (done) return; done = true; clearInterval(poll); clearTimeout(timeout); try { player?.destroy(); } catch {} resolve({ ...item, ...result, checkedAt: new Date().toISOString() }); };
    const timeout = setTimeout(() => finish({ result: 'unverified', reason: 'No sustained playback within 35 seconds' }), 35000);
    const poll = setInterval(() => {
      if (player?.getPlayerState?.() !== 1) return;
      const seconds = player.getCurrentTime();
      firstTime ??= seconds;
      if (seconds - firstTime >= Math.min(4, item.duration / 2)) finish({ result: 'passed', advancedSeconds: seconds - firstTime });
    }, 1000);
    const mount = document.createElement('div'); root.replaceChildren(mount);
    player = new YT.Player(mount, { host: 'https://www.youtube-nocookie.com', videoId: provider.id, width: '480', height: '270', playerVars: { autoplay: 1, mute: 1, playsinline: 1, cc_load_policy: 0, origin: location.origin, start: Math.floor(item.sourceOffset || 0) }, events: {
      onReady: e => { e.target.mute(); e.target.playVideo(); },
      onStateChange: e => {
        if (e.data === YT.PlayerState.PLAYING) { started = true; firstTime ??= e.target.getCurrentTime(); }
        // Very short idents can finish between polling ticks. Require an
        // observed play event followed by an actual completed playback clock.
        if (e.data === YT.PlayerState.ENDED && started && item.duration <= 5 && e.target.getCurrentTime() >= item.duration * .75) finish({result:'passed', advancedSeconds:e.target.getCurrentTime() - (item.sourceOffset || 0), completedShortClip:true});
      },
      onError: e => finish({ result: [100,101,150].includes(e.data) ? 'failed' : 'unverified', code: e.data, reason: ({100:'Upload removed or private',101:'Embedding disabled',150:'Embedding disabled',153:'Missing website player identity',5:'Browser playback error',2:'Invalid video ID'})[e.data] || 'Provider error' })
    } });
  });
}
$('run').onclick = async () => {
  $('run').disabled = true; $('results').replaceChildren(); const results = [];
  try {
    const candidateMode = new URLSearchParams(location.search).get('source') === 'candidates';
    const response = await fetch(candidateMode ? '/provider-candidates.json' : '/api/catalogue', {cache:'no-store'});
    if (!response.ok) throw Error('Candidate catalogue is unavailable. Use the regular check page for the live catalogue.');
    const config = await response.json(), sources = new Map();
    for (const channel of config.channels) for (const p of [...channel.programmes, ...(channel.schedule?.breaks || [])]) if (providerOf(p.url) && !sources.has(p.url)) sources.set(p.url, {url:p.url, title:p.title, duration:p.duration, sourceOffset:p.sourceOffset || 0});
    // Local batch preparation can carry forward already observed results when
    // the owner extends a queue. Normal catalogue checks always start fresh.
    if(candidateMode) {
      const seen=new Set();
      for(const r of config.previousResults||[])if(sources.has(r.url)&&!seen.has(r.url)&&['passed','failed','unverified'].includes(r.result)) {results.push(r);seen.add(r.url);}
    }
    const completed=new Set(results.map(r=>r.url));
    const queue = [...sources.values()].filter(p=>!completed.has(p.url)); let cursor = 0, nextStart = Date.now();
    const pace = async () => { const stamp=Math.max(nextStart,Date.now());nextStart=stamp+(candidateMode?3000:5000);const wait=stamp-Date.now();if(wait>0)await new Promise(resolve=>setTimeout(resolve,wait)); };
    const publish = () => { $('report').value = JSON.stringify({origin:location.origin, checkedAt:new Date().toISOString(), total:sources.size, completed:results.length, results}, null, 2); $('status').textContent = `${results.length}/${sources.size} checked · ${results.filter(r=>r.result==='passed').length} passed · ${results.filter(r=>r.result==='failed').length} failed · ${results.filter(r=>r.result==='unverified').length} unverified`; };
    publish();
    await Promise.all(Array.from({length:candidateMode?3:2}, async () => {
      const root = document.createElement('div'); $('players').append(root);
      while (cursor < queue.length) {
        const item = queue[cursor++];
        await pace();
        let result; try { result = await check(item, root); } catch(e) { result = {...item,result:'unverified',reason:e.message}; }
        results.push(result); const li = document.createElement('li'); li.textContent = `${result.result.toUpperCase()} · ${item.title}${result.reason ? ' · '+result.reason : ''}`; li.className = result.result === 'passed' ? '' : 'failed'; $('results').append(li); publish();
      }
      root.remove();
    }));
    $('status').textContent += ' · Complete';
  } catch(e) { $('status').textContent = e.message; }
  finally { $('run').disabled = false; }
};
