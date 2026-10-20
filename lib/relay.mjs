import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, readFile, stat, rm, realpath, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { scheduleAt, programmesAt } from './schedule.mjs';
import { ProviderResolver, providerOf } from './providers.mjs';
import { canPlayWholeClip, clipPlaybackSeconds } from '../public/interval-playback.mjs';
const execute = promisify(execFile);

const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
export function countdownText(deadline,now=Date.now()) {
  const total=Math.max(0,Math.ceil((deadline-now)/1000)),seconds=String(total%60).padStart(2,'0'),minutes=String(Math.floor(total/60)%60).padStart(2,'0');
  return 'STARTS IN '+(total>=3600?Math.floor(total/3600)+':':'')+minutes+':'+seconds;
}
const filterPath = file => file.replace(/\\/g,'/').replace(/:/g,'\\:').replace(/'/g,"'\\''");
const presentationFont = (process.env.RELAY_FONT || (process.platform === 'win32'
  ? path.join(process.env.WINDIR || 'C:/Windows', 'Fonts', 'consola.ttf')
  : process.platform === 'darwin' ? '/System/Library/Fonts/Monaco.ttf'
  : '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'))
  .replace(/\\/g, '/').replace(/:/g, '\\:').replace(/'/g, "'\\''");
export class RelayManager {
  constructor({ mediaRoot, testCard, ffmpeg = process.env.FFMPEG_PATH || 'ffmpeg', idleMs = 90000, sourceRetryMs = 15000, resolver = new ProviderResolver(), probe = async source => { const {stdout} = await execute(process.env.FFPROBE_PATH || 'ffprobe', ['-v','error','-rw_timeout','15000000','-show_entries','format=duration','-of','json',source], {timeout:20000,maxBuffer:65536,windowsHide:true}); return Number(JSON.parse(stdout).format.duration); } }) {
    this.resolver = resolver;
    this.mediaRoot = mediaRoot; this.testCard = testCard; this.ffmpeg = ffmpeg; this.idleMs = idleMs; this.states = new Map();
    this.probe = probe; this.durations = new Map(); this.audioSources = new Map();
    this.sourceRetryMs = sourceRetryMs;
    this.sweeper = setInterval(() => { for (const [id, state] of this.states) if (Date.now() - state.lastAccess > this.idleMs) this.stop(id); }, 15000); this.sweeper.unref();
  }
  async source(url) {
    if (!url.startsWith('/media/')) return url;
    const root = await realpath(this.mediaRoot), file = await realpath(path.resolve(root, decodeURIComponent(url.slice(7))));
    if (!file.startsWith(root + path.sep)) throw Error('Media path is outside the media directory.');
    return file;
  }
  async hasAudio(source) {
    if (!this.audioSources.has(source)) {
      const {stdout} = await execute(process.env.FFPROBE_PATH || 'ffprobe', ['-v','error','-rw_timeout','15000000','-select_streams','a:0','-show_entries','stream=index','-of','json',source], {timeout:20000,maxBuffer:65536,windowsHide:true});
      if(this.audioSources.size >= 200)this.audioSources.delete(this.audioSources.keys().next().value);
      this.audioSources.set(source, JSON.parse(stdout).streams?.length > 0);
    }
    return this.audioSources.get(source);
  }
  async intervalDuration(programme,source) {
    if(programme.sourceOffset!==undefined)return programme.duration;
    let cached=this.durations.get(source);
    if(!cached||cached.until<Date.now()){
      const duration=await this.probe(source);
      if(!Number.isFinite(duration)||duration<=0)throw Error('Interval duration could not be established.');
      cached={duration,until:Date.now()+3600000};
      if(this.durations.size>=200)this.durations.delete(this.durations.keys().next().value);
      this.durations.set(source,cached);
    }
    return cached.duration;
  }
  prefetch(state,end) {
    clearTimeout(state.prefetchTimer);
    const next=scheduleAt(state.channel,state.epoch,end+50,1)[0];
    if(next.programme.isTestCard||next.programme.isPresentation)return;
    state.prefetchTimer=setTimeout(async()=>{
      if(state.stopped)return;
      try{
        if(providerOf(next.programme.url))await this.resolver.resolve(next.programme.url);
        else if(next.programme.isInterstitial)await this.intervalDuration(next.programme,await this.source(next.programme.url));
      }catch{/* A warm-up failure never changes the shared running order. */}
    },Math.max(0,next.start-Date.now()-60000));
  }
  async ensure(channel, epoch, holdingImage) {
    const signature = JSON.stringify([channel, epoch, holdingImage]);
    let state = this.states.get(channel.id);
    if (state && state.signature !== signature) {
      const interrupt = state.channel.status !== channel.status || state.epoch !== epoch;
      state.channel = channel; state.epoch = epoch; state.holdingImage = holdingImage; state.signature = signature;
      if(interrupt && state.child){state.reconfigure = true;state.child.kill();}
    }
    if (!state) {
      state = { channel, epoch, holdingImage, signature, lastAccess: Date.now(), stopped: false, child: null, error: '', transitions: 0, hlsStartNumber: Math.floor(Date.now()/1000), outputEpoch: Date.now() };
      this.states.set(channel.id, state);
      state.ready = (async () => { state.dir = await mkdtemp(path.join(tmpdir(), 'tellybox-hls-')); if (!state.stopped) await this.launch(state); })();
    }
    state.lastAccess = Date.now(); await state.ready;
    return state;
  }
  async launch(state, holdingUntil = null, presentationUntil = null) {
    if (state.stopped) return;
    clearInterval(state.clockTimer);state.clockTimer=null;state.clockGeneration=(state.clockGeneration||0)+1;
    const entry = scheduleAt(state.channel, state.epoch, Date.now(), 1)[0];
    const holding = Boolean(holdingUntil || entry.programme.isTestCard), presentation = !holding && Boolean(presentationUntil || entry.programme.isPresentation);
    const interval = !holding && !presentation && Boolean(entry.programme.isInterstitial);
    const deadline = interval ? programmesAt(state.channel, state.epoch, Date.now(), 1)[0].start : 0;
    let clipSeconds = entry.programme.duration;
    state.playbackKind = holding ? 'holding' : presentation ? 'presentation' : 'programme';
    // A temporary source error gets two fresh attempts within the same slot.
    // Keep a live holding feed between attempts, rather than staying offline
    // for the entire programme after one failed request.
    const recoverSource = holdingUntil && state.failedSlot === `${entry.programme.id}:${entry.start}` && state.sourceFailures <= 2;
    const end = recoverSource ? Math.min(holdingUntil, Date.now() + this.sourceRetryMs) : holdingUntil || presentationUntil || entry.end;
    let seconds = Math.max(.05, (end - Date.now()) / 1000);
    const args = ['-hide_banner', '-loglevel', 'warning', '-nostdin', '-y'];
    let videoInput = 0, audioInput = holding || presentation ? 1 : 0, inputCount = holding || presentation ? 2 : 1;
    try {
      if (holding) {
        let card = this.testCard;
        if (state.holdingImage && state.holdingImage !== '/test-card-f.jpg') { try { card = await this.source(state.holdingImage); } catch {} }
        args.push('-re', '-loop', '1', '-framerate', '25', '-i', card, '-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=48000');
      }
      else if (presentation) {
        const next=programmesAt(state.channel,state.epoch,Date.now(),2).find(item=>item.start>Date.now());
        await this.startCountdown(state,next?.start||end);
        args.push('-re', '-f', 'lavfi', '-i', 'color=c=0x102c46:s=720x576:r=25', '-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=48000');
      } else if (providerOf(entry.programme.url)) {
        const source = await this.resolver.resolve(entry.programme.url);
        if (interval) {
          clipSeconds = clipPlaybackSeconds(entry.programme, source.duration);
          if (!canPlayWholeClip(clipSeconds, deadline, Date.now())) return this.launch(state, null, Math.max(deadline, Date.now() + 50));
        }
        const providerOffset = (interval ? 0 : Math.max(0, (Date.now() - entry.start) / 1000)) + (entry.programme.sourceOffset || 0);
        videoInput = source.streams.findIndex(s => s.video); audioInput = source.streams.findIndex(s => s.audio);
        inputCount = source.streams.length;
        for (const stream of source.streams) {
          const headers = Object.entries(stream.headers || {}).map(([k, v]) => `${k}: ${String(v).replace(/[\r\n]/g, '')}\r\n`).join('');
          args.push('-rw_timeout', '15000000');
          if(/^https?:/.test(stream.url))args.push('-reconnect','1','-reconnect_streamed','1','-reconnect_on_network_error','1','-reconnect_on_http_error','429,5xx','-reconnect_delay_max','2');
          if (headers) args.push('-headers', headers);
          args.push('-re', '-ss', String(providerOffset), '-i', stream.url);
        }
      } else {
        const source = await this.source(entry.programme.url);
        if (interval) {
          clipSeconds = await this.intervalDuration(entry.programme,source);
          if (!canPlayWholeClip(clipSeconds, deadline, Date.now())) return this.launch(state, null, Math.max(deadline, Date.now() + 50));
        }
        audioInput = await this.hasAudio(source) ? 0 : -1;
        if (/^https?:/.test(source)) args.push('-rw_timeout', '15000000', '-reconnect', '1', '-reconnect_streamed', '1','-reconnect_on_network_error','1','-reconnect_on_http_error','429,5xx', '-reconnect_delay_max', '2');
        args.push('-re', '-ss', String((interval ? 0 : entry.offset) + (entry.programme.sourceOffset || 0)), '-i', source);
      }
    } catch (err) { this.sourceFailed(state,entry,err.code||'source-preparation-failed');state.error = err.message; return interval ? this.launch(state, null, entry.end) : this.launch(state, entry.end); }
    seconds = Math.max(.05, (end - Date.now()) / 1000);
    if(audioInput < 0){audioInput=inputCount;args.push('-f','lavfi','-i','anullsrc=channel_layout=stereo:sample_rate=48000');}
    args.push('-map', `${videoInput}:v:0`, '-map', `${audioInput}:a:0`);
    if(interval)args.push('-shortest');
    // Whole-file intervals end at the source EOF. Only reviewed cue segments
    // have a media-length cut; never use the remaining wall-clock slot length.
    if (!interval || entry.programme.sourceOffset !== undefined) args.push('-t', String(interval ? clipSeconds : seconds));
    args.push('-vf', 'setpts=PTS-STARTPTS,scale=720:576:force_original_aspect_ratio=decrease:force_divisible_by=2,pad=720:576:(ow-iw)/2:(oh-ih)/2,setsar=16/15' + (presentation ? `,drawtext=fontfile='${presentationFont}':text='NEXT PROGRAMME FOLLOWS':fontcolor=0xffda43:fontsize=30:x=(w-tw)/2:y=h/2-70,drawtext=fontfile='${presentationFont}':textfile='${filterPath(state.countdownFile)}':reload=1:expansion=none:fontcolor=0xffda43:fontsize=34:x=(w-tw)/2:y=h/2-10,drawtext=fontfile='${presentationFont}':text='COLOUR SERVICE':fontcolor=white:fontsize=21:x=(w-tw)/2:y=h/2+55` : ''), '-r', '25', '-af', 'aresample=48000:async=1:first_pts=0,asetpts=PTS-STARTPTS,apad', '-output_ts_offset', String(Math.max(0,(Date.now()-state.outputEpoch)/1000)), '-c:v', 'libx264', '-preset', 'veryfast', '-threads', '2', '-pix_fmt', 'yuv420p', '-profile:v', 'main', '-level:v', '3.1', '-b:v', '1400k', '-maxrate', '1800k', '-bufsize', '2800k', '-g', '50', '-keyint_min', '50', '-sc_threshold', '0', '-c:a', 'aac', '-b:a', '128k', '-ar', '48000', '-ac', '2', '-f', 'hls', '-hls_time', '2', '-hls_list_size', '6', '-hls_delete_threshold', '2', '-hls_flags', 'delete_segments+append_list+omit_endlist+program_date_time+discont_start+independent_segments+temp_file', '-hls_start_number_source', 'generic', '-start_number', String(state.hlsStartNumber), '-hls_segment_filename', path.join(state.dir, 'segment%d.ts'), path.join(state.dir, 'index.m3u8'));
    if (state.stopped) return;
    state.error = '';
    state.diagnostic = '';
    state.transitions++;
    state.currentEntry = {id:entry.programme.id,title:entry.programme.title,start:entry.start,end:entry.end,kind:state.playbackKind};
    this.prefetch(state,end);
    const child = spawn(this.ffmpeg, args, { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] }); state.child = child;
    child.stderr.on('data', data => { state.diagnostic = ((state.diagnostic || '') + data).slice(-3000); });
    child.on('error', err => { state.error = `FFmpeg could not start: ${err.message}. Install FFmpeg or configure FFMPEG_PATH.`; });
    child.on('close', code => {
      if (state.child === child) state.child = null;
      if (state.stopped || state.error) return;
      if(state.reconfigure){state.reconfigure=false;this.launch(state).catch(err=>{state.error=err.message;});return;}
      // FFmpeg may echo signed source URLs. Never copy its raw diagnostics
      // into persistent logs, including when a subsequent holding card fails.
      if (code !== 0 && (holding || presentation)) { state.error = `The ${presentation ? 'station presentation' : 'test card'} relay could not start. Check FFmpeg and the holding-screen configuration.`; console.error(state.error); return; }
      const retryHolding = Date.now() < end - 1000; if (code !== 0 && providerOf(entry.programme.url)) this.resolver.invalidate?.(entry.programme.url);
      if(code!==0&&!holding&&!presentation)this.sourceFailed(state,entry,/\b403\b/.test(state.diagnostic||'')?'source-http-403':/\b404\b/.test(state.diagnostic||'')?'source-http-404':/timed? out|timeout/i.test(state.diagnostic||'')?'source-timeout':'source-read-or-decode-failed');
      // A failed source holds its scheduled slot instead of jumping to another programme.
      // EOF can arrive just before the nominal slot boundary. Wait for that
      // boundary instead of selecting the same advert again from its start.
      if(code===0&&end-Date.now()>1500){state.timer=setTimeout(()=>this.launch(state,null,end).catch(err=>{state.error=err.message;}),100);return;}
      const waitForBoundary=code===0?Math.max(100,end-Date.now()+30):100;
      state.timer = setTimeout(() => (interval ? this.launch(state, null, code!==0&&retryHolding ? end : null) : this.launch(state, code!==0&&retryHolding ? end : null)).catch(err => { state.error = err.message; }), waitForBoundary);
    });
  }
  sourceFailed(state,entry,reason) {
    const slot = `${entry.programme.id}:${entry.start}`;
    state.sourceFailures = state.failedSlot === slot ? state.sourceFailures + 1 : 1;
    state.failedSlot = slot;
    state.lastFailure = {id:entry.programme.id,title:entry.programme.title,at:new Date().toISOString(),reason};
  }
  async startCountdown(state,deadline) {
    const generation=state.clockGeneration;
    state.countdownFile=path.join(state.dir,'countdown.txt');
    await writeFile(state.countdownFile,countdownText(deadline),'utf8');
    state.clockTimer=setInterval(async()=>{
      if(state.stopped||state.clockWriting)return;
      state.clockWriting=true;
      try{const temporary=state.countdownFile+'.'+generation+'.tmp';await writeFile(temporary,countdownText(deadline),'utf8');if(!state.stopped&&state.clockGeneration===generation)await rename(temporary,state.countdownFile);}catch{/* Keep the last readable clock during a temporary file lock. */}
      finally{state.clockWriting=false;}
    },1000);state.clockTimer.unref();
  }
  async file(channel, epoch, filename, holdingImage) {
    const state = await this.ensure(channel, epoch, holdingImage);
    const target = path.join(state.dir, filename);
    const deadline = Date.now() + (filename === 'index.m3u8' ? 25000 : 1000);
    do {
      if (state.error) throw Error(state.error);
      try {
        const info = await stat(target);
        if (info.size) {
          const data = await readFile(target);
          if (filename !== 'index.m3u8' || data.toString().includes('#EXTINF:')) return data;
        }
      } catch (err) { if (err.code !== 'ENOENT') throw err; }
      await pause(200);
    } while (Date.now() < deadline && !state.stopped);
    throw Error('Channel is warming up. Retry shortly.');
  }
  async stop(id) {
    const state = this.states.get(id); if (!state) return;
    this.states.delete(id); state.stopped = true; clearTimeout(state.timer);clearTimeout(state.prefetchTimer);clearInterval(state.clockTimer);
    if (state.child) { const child = state.child; const closed = new Promise(resolve => child.once('close', resolve)); child.kill(); await Promise.race([closed, pause(3000)]); }
    await state.ready?.catch(() => {});
    if (state.dir?.startsWith(path.join(tmpdir(), 'tellybox-hls-'))) await rm(state.dir, { recursive: true, force: true }).catch(() => {});
  }
  async close() { clearInterval(this.sweeper); await Promise.all([...this.states.keys()].map(id => this.stop(id))); }
}
