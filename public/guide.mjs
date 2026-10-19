import { programmesAt, listingsWindow } from '/lib/schedule.mjs';
import { createProgrammeDescription } from '/programme-description.mjs';

const $ = id => document.getElementById(id);
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const time = value => new Date(value).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
const dateValue = value => { const d = new Date(value); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const length = seconds => `${Math.floor(seconds / 60)}m ${Math.floor(seconds % 60)}s`;
const span = 3 * 3600000;

export function createTelevisionGuide({ now, onTune, readPreference, savePreference }) {
  const programmeDescription=createProgrammeDescription({element:$('epg-detail-description')});
  let config, tuned, selection = null, visible = false;
  let layout = readPreference('tellybox-guide-layout') === 'television' ? 'television' : 'newspaper';
  let windowStart = Math.floor(now() / 1800000) * 1800000;
  const receiver = document.querySelector('.receiver');
  const receiverHome = receiver.parentElement;
  function mount() {
    const television = layout === 'television';
    $('newspaper-guide').hidden = television;
    $('television-guide').hidden = !television;
    $('newspaper-mode').setAttribute('aria-pressed', String(!television));
    $('television-mode').setAttribute('aria-pressed', String(television));
    const target = visible && television ? $('guide-player-slot') : receiverHome;
    if (receiver.parentElement !== target) target.prepend(receiver);
  }
  function chooseLayout(value) { layout = value; savePreference('tellybox-guide-layout', value); $('tv-guide-layout').value = value; mount(); render(); }
  $('tv-guide-layout').value = layout;
  $('tv-guide-layout').addEventListener('change', e => chooseLayout(e.target.value));
  $('newspaper-mode').addEventListener('click', () => chooseLayout('newspaper'));
  $('television-mode').addEventListener('click', () => chooseLayout('television'));
  $('epg-back').addEventListener('click', () => { windowStart -= span; render(); });
  $('epg-forward').addEventListener('click', () => { windowStart += span; render(); });
  $('epg-now').addEventListener('click', () => { windowStart = Math.floor(now() / 1800000) * 1800000; selection = null; render(); });
  $('epg-date').addEventListener('change', e => {
    const day = new Date(e.target.value + 'T00:00:00');
    if (!Number.isFinite(day.getTime())) return;
    const previous = new Date(windowStart); day.setHours(previous.getHours(), previous.getMinutes()); windowStart = day.getTime(); render();
  });
  function selectedChannel() { return config?.channels.find(c => c.id === selection?.channelId) || tuned || config?.channels[0]; }
  $('epg-watch').addEventListener('click', () => { const c = selectedChannel(); selection = null; onTune(c); render(); });
  $('epg-grid').addEventListener('click', e => {
    const channelButton = e.target.closest('[data-epg-channel]');
    if (channelButton) { selection = null; onTune(config.channels.find(c => c.id === channelButton.dataset.epgChannel)); render(); return; }
    const cell = e.target.closest('[data-epg-start]');
    if (!cell) return;
    selection = { channelId: cell.dataset.channel, start: Number(cell.dataset.epgStart) };
    updateDetail(); markSelection();
  });
  function markSelection() {
    $('epg-grid').querySelectorAll('[data-epg-start]').forEach(el => {
      const selected = selection ? el.dataset.channel === selection.channelId && Number(el.dataset.epgStart) === selection.start : el.dataset.channel === tuned?.id && el.classList.contains('is-live');
      el.classList.toggle('is-selected', selected); el.setAttribute('aria-pressed', String(selected));
    });
  }
  function updateDetail() {
    if (!config) return;
    const c = selectedChannel();
    const list = programmesAt(c, config.epoch, selection ? selection.start + 2 : now(), 1);
    const entry = list[0], p = entry.programme;
    const live = entry.start <= now() && entry.end > now();
    $('epg-detail-number').textContent = String(c.number).padStart(2, '0');
    $('epg-detail-channel').textContent = c.name;
    $('epg-detail-category').textContent = c.category || 'Independent television';
    programmeDescription.show(p,c.id,c.description||'');
    $('epg-detail-title').textContent = p.title;
    $('epg-detail-state').textContent = p.isTestCard ? 'OFF AIR' : live ? 'ON NOW' : entry.start > now() ? 'LATER' : 'EARLIER';
    $('epg-programme-label').textContent = live ? 'NOW SHOWING' : !selection && entry.start > now() ? 'UP NEXT' : 'SELECTED PROGRAMME';
    $('epg-detail-meta').textContent = `${p.year || 'Archive'} · ${length(p.duration)} · ${p.source || 'Station media'}`;
    $('epg-detail-progress').style.width = `${live ? Math.max(0, Math.min(100, (now() - entry.start) / (entry.end - entry.start) * 100)) : entry.end <= now() ? 100 : 0}%`;
    $('epg-detail-timing').textContent = `${time(entry.start)} – ${time(entry.end)}${live ? ` · ${length(Math.max(0, (entry.end - now()) / 1000))} remaining` : ' · Scheduled transmission'}`;
    const upcoming = listingsWindow(c, config.epoch, entry.end + 2, entry.end + 48 * 3600000)
      .filter(s => !s.programme.isInterstitial && !s.programme.isTestCard).slice(0, 8);
    $('epg-detail-next').innerHTML = upcoming.length ? upcoming.map(s => {
      const day = dateValue(s.start) !== dateValue(entry.start)
        ? `<small>${new Date(s.start).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</small>` : '';
      return `<p><time datetime="${new Date(s.start).toISOString()}">${time(s.start)}${day}</time><span>${escape(s.programme.title)}</span></p>`;
    }).join('') : '<p class="epg-no-programmes">No further programmes are scheduled.</p>';
    $('epg-source').hidden = !p.sourceUrl;
    if (p.sourceUrl) $('epg-source').href = p.sourceUrl;
    $('epg-watch').textContent = `${c.id === tuned?.id ? '▶ Watch live' : '▶ Tune in live'} · CH ${String(c.number).padStart(2, '0')}`;
  }
  function render() {
    if (!config) return;
    $('epg-date').value = dateValue(windowStart);
    $('epg-brand').textContent = `${config.brand.name} TV Guide`;
    $('epg-range').textContent = `${new Date(windowStart).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} · ${time(windowStart)} – ${time(windowStart + span)}`;
    $('epg-channel-total').textContent = `${config.channels.length} CHANNEL${config.channels.length === 1 ? '' : 'S'} ON YOUR DIAL`;
    if (visible && layout === 'television') {
      const focused = document.activeElement?.closest('[data-epg-start]');
      const focusKey = focused && [focused.dataset.channel, focused.dataset.epgStart];
      const stamp = now();
      const markers = Array.from({ length: 6 }, (_, i) => `<div class="epg-time">${time(windowStart + i * 1800000)}</div>`).join('');
      const rows = config.channels.map(c => {
        const slots = listingsWindow(c, config.epoch, windowStart, windowStart + span);
        return `<div class="epg-row"><button class="epg-channel ${c.id === tuned?.id ? 'is-tuned' : ''}" data-epg-channel="${c.id}" aria-label="Tune into ${escape(c.name)} live"><span class="epg-channel-number">${String(c.number).padStart(2, '0')}</span><span><strong>${escape(c.name)}</strong><small>${escape(c.category || 'ARCHIVE TV')}</small></span></button><div class="epg-track">${slots.map(s => {
          const left = (Math.max(windowStart, s.start) - windowStart) / span * 100;
          const width = (Math.min(windowStart + span, s.end) - Math.max(windowStart, s.start)) / span * 100;
          const live = s.start <= stamp && s.end > stamp;
          const label = `${c.name}: ${s.programme.title}, ${time(s.start)} to ${time(s.end)}${live ? ', on now' : ''}. Select for details.`;
          return `<button class="epg-cell ${live ? 'is-live' : ''} ${width < 2.5 ? 'is-short' : ''} ${s.programme.isInterstitial ? 'is-break' : ''}" style="left:${left}%;width:${width}%" data-epg-start="${Math.round(s.start)}" data-channel="${c.id}" title="${escape(label)}" aria-label="${escape(label)}"><strong>${escape(s.programme.title)}</strong><span>${time(s.start)} · ${length(s.programme.duration)}</span></button>`;
        }).join('')}</div></div>`;
      }).join('');
      const position = (stamp - windowStart) / span * 100;
      $('epg-grid').innerHTML = `<div class="epg-times-row"><div class="epg-corner">CHANNEL / SERVICE</div><div class="epg-times">${markers}</div></div><div class="epg-rows">${rows}${position >= 0 && position < 100 ? `<div class="epg-now-line" style="--now:${position / 100}" aria-hidden="true"><span>NOW</span></div>` : ''}</div>`;
      markSelection();
      if (focusKey) [...$('epg-grid').querySelectorAll('[data-epg-start]')].find(el => el.dataset.channel === focusKey[0] && el.dataset.epgStart === focusKey[1])?.focus({ preventScroll: true });
    }
    updateDetail();
  }
  mount();
  return {
    install(value, currentChannel) { config = value; tuned = currentChannel; selection = null; render(); },
    setChannel(value) { tuned = value; selection = null; render(); },
    setVisible(value) { visible = value; mount(); render(); },
    render,
    tick(message) { if (visible && layout === 'television') { updateDetail(); $('epg-feedback').textContent = message; } }
  };
}
