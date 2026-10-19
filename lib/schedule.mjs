import {applyProgrammeDurationPolicy} from './content-policy.mjs';
export function validateCatalogue(config) {
  if (!config?.brand?.name || !Array.isArray(config.channels) || !config.channels.length) throw Error('A brand name and at least one channel are required.');
  if (!Number.isFinite(Date.parse(config.epoch))) throw Error('epoch must be an ISO date.');
  if(config.editorial?.minimumProgrammeSeconds !== undefined && config.editorial.minimumProgrammeSeconds !== 300)throw Error('The minimum main programme duration must be 300 seconds.');
  if(config.intervalLibrary !== undefined && !Array.isArray(config.intervalLibrary))throw Error('Interval library must be an array.');
  applyProgrammeDurationPolicy(config);
  const approved = config.editorial?.approvedSources;
  if (approved !== undefined && (!Array.isArray(approved) || approved.some(url => !isMediaUrl(url)))) throw Error('Editorial source exceptions must be an array of explicit media URLs.');
  const approvedSources = new Set(approved || []);
  if (config.brand.logo && !(config.brand.logo === '/icon.svg' || isMediaUrl(config.brand.logo))) throw Error('Logo must be /icon.svg, /media/… or an HTTP(S) image URL.');
  if (config.brand.holdingImage && !(config.brand.holdingImage === '/test-card-f.jpg' || /^\/media\/[a-zA-Z0-9._ -]+\.(png|jpg|jpeg|webp)$/i.test(config.brand.holdingImage))) throw Error('Holding screen must be an uploaded /media/ image or /test-card-f.jpg.');
  const ids = new Set(), numbers = new Set();
  for (const channel of config.channels) {
    if (!/^[a-z0-9-]+$/.test(channel.id) || ids.has(channel.id)) throw Error('Channel IDs must be unique lowercase slugs.');
    if (!Number.isInteger(channel.number) || channel.number < 1 || numbers.has(channel.number)) throw Error('Channel numbers must be unique positive integers.');
    if (!channel.name || !Array.isArray(channel.programmes)) throw Error(`Channel ${channel.id} needs a name and a programmes array (which may be empty).`);
    if (channel.status && !['online', 'offline', 'technical'].includes(channel.status)) throw Error('Channel status must be online, offline or technical.');
    if (!/^#[0-9a-f]{6}$/i.test(channel.colour)) throw Error(`Channel ${channel.id} needs a six-digit hex colour.`);
    ids.add(channel.id); numbers.add(channel.number);
    const breaks = channel.schedule?.breaks || [];
    if (channel.playout !== undefined && (!channel.playout || typeof channel.playout !== 'object' || Array.isArray(channel.playout))) throw Error('Channel playout must be an object.');
    if (channel.playout?.shuffleSeries !== undefined && typeof channel.playout.shuffleSeries !== 'boolean') throw Error('shuffleSeries must be true or false.');
    if(channel.playout?.order!==undefined&&!['listed','shuffle','episodic'].includes(channel.playout.order))throw Error('Choose listed, shuffle or episodic programme order.');
    if(channel.playout?.repeat!==undefined&&!['same','shuffle','episodic'].includes(channel.playout.repeat))throw Error('Choose repeat in the same order, reshuffle all programmes, or remix series.');
    if (channel.playout?.programmesOnly !== undefined && typeof channel.playout.programmesOnly !== 'boolean') throw Error('programmesOnly must be true or false.');
    if (channel.playout?.seed !== undefined && (typeof channel.playout.seed !== 'string' || channel.playout.seed.length > 200)) throw Error('Playout seed must be a string of at most 200 characters.');
    if (channel.schedule?.alignMinutes !== undefined && (!Number.isInteger(channel.schedule.alignMinutes) || channel.schedule.alignMinutes < 1 || 60 % channel.schedule.alignMinutes !== 0)) throw Error('Schedule alignment must divide an hour into whole minutes.');
    if (channel.schedule?.alignMinutes && Date.parse(config.epoch) % (channel.schedule.alignMinutes * 60000) !== 0) throw Error('The station epoch must align to its programme start grid.');
    if (!Array.isArray(breaks)) throw Error('Schedule breaks must be an array.');
    if(channel.intervalPool!==undefined&&!Array.isArray(channel.intervalPool))throw Error('Interval pool must be an array.');
    for(const [key,min,max] of [['breakEvery',1,50],['breakSeconds',1,1800],['maxClips',1,50]])if(channel.schedule?.[key]!==undefined&&(!Number.isInteger(channel.schedule[key])||channel.schedule[key]<min||channel.schedule[key]>max))throw Error(`${key} must be a whole number between ${min} and ${max}.`);
    if(channel.schedule?.alignMinutes&&channel.schedule?.breakSeconds)throw Error('Choose clock-aligned gaps or timed breaks, rather than combining them.');
    if (channel.schedule?.transitionReserveSeconds !== undefined && (!Number.isFinite(channel.schedule.transitionReserveSeconds) || channel.schedule.transitionReserveSeconds < 0 || channel.schedule.transitionReserveSeconds > 60)) throw Error('Interval transition reserve must be between zero and sixty seconds.');
    if (breaks.some(p => p.stationBrand && p.stationBrand.toLowerCase() !== String(channel.stationBrand || '').toLowerCase())) throw Error(`Branded interval media must match the station brand on ${channel.id}.`);
    for (const item of [...channel.programmes, ...breaks, ...(channel.intervalPool||[]), ...(channel === config.channels[0] ? config.intervalLibrary || [] : [])]) {
      if (item.series !== undefined && (typeof item.series !== 'string' || !item.series.trim() || item.series.length > 200)) throw Error('Programme series must be a non-empty name of at most 200 characters.');
      if (item.episodeOrder !== undefined && (!Number.isFinite(item.episodeOrder) || item.episodeOrder < 0)) throw Error('Episode order must be a non-negative number.');
      if (item.playbackDisabled !== undefined && typeof item.playbackDisabled !== 'boolean') throw Error('playbackDisabled must be true or false.');
      if (!item.id || !item.title || !Number.isFinite(item.duration) || item.duration <= 0) throw Error(`Invalid programme on ${channel.id}: title, ID and positive duration required.`);
      if (!isMediaUrl(item.url)) throw Error(`Invalid media URL for ${item.title}. Use HTTP(S) or /media/.`);
      if (item.sourceUrl && !/^https?:\/\//i.test(item.sourceUrl)) throw Error('Source links must use HTTP(S).');
      if (item.sourceOffset !== undefined && (!Number.isFinite(item.sourceOffset) || item.sourceOffset < 0)) throw Error('Source offsets must be non-negative seconds.');
      const range = item.originalYearRange;
      if (range !== undefined && (!Array.isArray(range) || range.length !== 2 || !range.every(Number.isInteger) || range[0] > range[1])) throw Error('Original year ranges must contain two ordered whole years.');
      if (range && item.originalYear !== undefined && (item.originalYear < range[0] || item.originalYear > range[1])) throw Error('The original year must fall inside its date range.');
      const latestYear = range ? range[1] : item.originalYear;
      if (config.editorial?.beforeYear && !approvedSources.has(item.url) && (!Number.isInteger(latestYear) || latestYear >= config.editorial.beforeYear)) throw Error(`${item.title} needs an original production/broadcast year or established date range before ${config.editorial.beforeYear}. Upload dates do not establish this.`);
    }
  }
  if (config.channelAliases !== undefined) {
    if (!config.channelAliases || typeof config.channelAliases !== 'object' || Array.isArray(config.channelAliases)) throw Error('Channel aliases must map old IDs to current channel IDs.');
    for (const [old, target] of Object.entries(config.channelAliases)) if (!/^[a-z0-9-]+$/.test(old) || ids.has(old) || !ids.has(target)) throw Error('Channel aliases must point from a retired slug to an existing service.');
  }
  return config;
}
const compiled = new WeakMap();
function breakRepetitions(channel,count){if(!channel.schedule?.breakSeconds||channel.playout?.programmesOnly)return 1;let a=count,b=channel.schedule.breakEvery||1;while(b){[a,b]=[b,a%b];}return (channel.schedule.breakEvery||1)/(a||1);}
function randomFor(text) {
  let state = 2166136261;
  for (const c of String(text)) { state ^= c.charCodeAt(0); state = Math.imul(state, 16777619); }
  return () => { state += 0x6D2B79F5; let n = state; n = Math.imul(n ^ n >>> 15, n | 1); n ^= n + Math.imul(n ^ n >>> 7, n | 61); return ((n ^ n >>> 14) >>> 0) / 4294967296; };
}
function shuffled(values, random) { const copy = [...values]; for (let i = copy.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [copy[i], copy[j]] = [copy[j], copy[i]]; } return copy; }
export function programmeOrder(channel, cycle = 0) {
  const active = channel.programmes.filter(p => !p.playbackDisabled);
  const initial=channel.playout?.order||(channel.playout?.shuffleSeries?'episodic':'listed');
  const repeat=channel.playout?.repeat;
  const mode=cycle===0||!repeat||repeat==='same'?initial:repeat;
  const orderCycle=repeat==='same'?0:cycle;
  if(mode==='shuffle')return shuffled(active,randomFor(`${channel.playout.seed||channel.id}:random:${orderCycle}`));
  if(mode!=='episodic')return active;
  const groups = new Map();
  active.forEach((programme,index) => {
    const key = programme.series?.trim().toLowerCase() || `single:${index}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({programme,index});
  });
  for (const queue of groups.values()) queue.sort((a,b) => (a.programme.episodeOrder ?? a.index) - (b.programme.episodeOrder ?? b.index) || a.index-b.index);
  const random = randomFor(`${channel.playout.seed || channel.id}:programmes:${orderCycle}`), result=[];
  let previous;
  // Weight series by their remaining episodes so smaller collections are
  // spread throughout the cycle instead of all being exhausted at its start.
  // Avoid consecutive episodes of one series while another is available.
  // Only a series' next episode can be chosen; all viewers share the seed.
  while (groups.size) {
    let choices=[...groups.keys()].filter(key=>groups.size===1||key!==previous);
    const remaining=[...groups.values()].reduce((sum,queue)=>sum+queue.length,0);
    const largest=choices.reduce((best,key)=>groups.get(key).length>groups.get(best).length?key:best,choices[0]);
    if(groups.get(largest).length*2>=remaining)choices=[largest];
    let weight=random()*choices.reduce((sum,key)=>sum+groups.get(key).length,0);
    const key=choices.find(key=>(weight-=groups.get(key).length)<0)||choices.at(-1);
    const queue=groups.get(key);result.push(queue.shift().programme);previous=key;
    if (!queue.length) groups.delete(key);
  }
  return result;
}
export function channelTimeline(channel, cycle = 0) {
  if (channel.playout?.programmesOnly||!channel.schedule?.alignMinutes&&!channel.schedule?.breakSeconds) return programmeOrder(channel,cycle);
  let cache = compiled.get(channel); if (!cache) { cache = new Map(); compiled.set(channel, cache); }
  if (cache.has(cycle)) return cache.get(cycle);
  const quantum = (channel.schedule.alignMinutes||0) * 60000;
  const reserve = Math.round((channel.schedule.transitionReserveSeconds ?? 5) * 1000);
  const pool = (channel.schedule.breaks || []).filter(p => !p.playbackDisabled && (!p.stationBrand || p.stationBrand.toLowerCase() === String(channel.stationBrand || '').toLowerCase()));
  const result = []; let previous = '';
  const activeCount=channel.programmes.filter(p=>!p.playbackDisabled).length,repetitions=breakRepetitions(channel,activeCount);
  const order=Array.from({length:repetitions},(_,i)=>programmeOrder(channel,cycle*repetitions+i)).flat();
  order.forEach((programme, index) => {
    const programmeMillis = Math.max(1, Math.round(programme.duration * 1000));
    result.push({ ...programme, duration: programmeMillis / 1000 });
    const eligible=(cycle*activeCount*repetitions+index+1)%(channel.schedule.breakEvery||1)===0;
    let remaining = quantum?(quantum - programmeMillis % quantum) % quantum:eligible?channel.schedule.breakSeconds*1000:0, count = 0;
    const random = randomFor(`${channel.schedule.seed || channel.id}:${cycle}:${index}`), usedIds = new Set();
    while (remaining > 0) {
      const fitting = eligible&&count<(channel.schedule.maxClips||50)?pool.filter(p => Math.max(1, Math.round(p.duration * 1000)) + reserve <= remaining):[];
      const fresh = fitting.filter(p => !usedIds.has(p.id) && p.id !== previous);
      const choices = fresh.length ? fresh : fitting.filter(p => p.id !== previous);
      const ordered = channel.schedule.shuffleBreaks === false ? (choices.length ? choices : fitting) : shuffled(choices.length ? choices : fitting, random);
      let clip = ordered[0], used;
      if (clip) { used = Math.max(1, Math.round(clip.duration * 1000)); usedIds.add(clip.id); previous = clip.id; }
      else { used = remaining; clip = { id: 'station-presentation', title: 'Coming up next', duration: remaining / 1000, isPresentation: true, source: 'Live station presentation' }; }
      result.push({ ...clip, id: `${clip.id}-break-${cycle}-${index}-${count++}`, duration: used / 1000, isInterstitial: true, kind: clip.kind || 'presentation' });
      remaining -= used;
    }
  });
  if (cache.size >= 12) cache.delete(cache.keys().next().value);
  cache.set(cycle, result); return result;
}
export function isMediaUrl(url) {
  if (typeof url !== 'string') return false;
  if (url.startsWith('/media/') && !url.includes('..') && !url.includes('\\')) return true;
  try { return ['http:', 'https:'].includes(new URL(url).protocol); } catch { return false; }
}
export function scheduleAt(channel, epoch, now = Date.now(), count = 4) {
  const activeProgrammes = channel.programmes.filter(p => !p.playbackDisabled);
  if (!activeProgrammes.length || ['offline', 'technical'].includes(channel.status)) {
    const duration = 86400;
    const start = Math.floor(now / (duration * 1000)) * duration * 1000;
    return Array.from({ length: count }, (_, i) => ({ programme: { id: 'test-card', title: channel.status === 'technical' ? 'Test Card F · Technical difficulties' : 'Test Card F · Off air', duration, url: '/test-card-f.jpg', isTestCard: true, source: 'Station holding screen' }, start: start + i * duration * 1000, end: start + (i + 1) * duration * 1000, offset: i ? 0 : (now - start) / 1000 }));
  }
  const repetitions=breakRepetitions(channel,activeProgrammes.length);
  const total = !channel.playout?.programmesOnly&&channel.schedule?.alignMinutes
    ? activeProgrammes.reduce((sum, p) => sum + Math.ceil(Math.max(1, Math.round(p.duration * 1000)) / (channel.schedule.alignMinutes * 60000)) * channel.schedule.alignMinutes * 60, 0)
    : activeProgrammes.reduce((sum, p) => sum + p.duration, 0)*repetitions+(!channel.playout?.programmesOnly&&channel.schedule?.breakSeconds?activeProgrammes.length*repetitions/(channel.schedule.breakEvery||1)*channel.schedule.breakSeconds:0);
  const elapsed = (now - Date.parse(epoch)) / 1000;
  let cycle = Math.floor(elapsed / total), offset = ((elapsed % total) + total) % total;
  let programmes = channelTimeline(channel, cycle), index = 0;
  while (index < programmes.length - 1 && offset >= programmes[index].duration) offset -= programmes[index++].duration;
  const result = []; let cursor = now - offset * 1000;
  for (let i = 0; i < count; i++) {
    if (index >= programmes.length) { index = 0; programmes = channelTimeline(channel, ++cycle); }
    const programme = programmes[index++];
    result.push({ programme, start: cursor, end: cursor + programme.duration * 1000, offset: i ? 0 : offset });
    cursor += programme.duration * 1000;
  }
  return result;
}
export function scheduleWindow(channel, epoch, start, end, limit = 5000) {
  const result = [];
  let cursor = start;
  while (cursor < end && result.length < limit) {
    const entry = scheduleAt(channel, epoch, cursor, 1)[0];
    result.push(entry);
    cursor = Math.round(entry.end) + 1;
  }
  return result;
}
export function listingsWindow(channel, epoch, start, end) {
  return scheduleWindow(channel, epoch, start, end).filter(entry => !entry.programme.isInterstitial);
}
// During an interval the first listing is the next real programme. Playback
// continues to use scheduleAt, so hiding break entries never removes the break.
export function programmesAt(channel, epoch, now = Date.now(), count = 4) {
  for (let amount = Math.max(64, count * 16); amount <= 32768; amount *= 2) {
    const programmes = scheduleAt(channel, epoch, now, amount).filter(s => !s.programme.isInterstitial);
    if (programmes.length >= count) return programmes.slice(0, count);
  }
  throw Error('Interval contains too many clips to find the next programme.');
}
