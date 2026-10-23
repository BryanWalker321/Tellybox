import {spawn} from 'node:child_process';
import {mkdtemp,readFile} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {RelayManager,presentationFont,presentationFilter} from './relay.mjs';
import {scheduleAt,programmesAt} from './schedule.mjs';
import {providerOf} from './providers.mjs';
import {canPlayWholeClip,clipPlaybackSeconds} from '../public/interval-playback.mjs';
const FRAME=720*576*3/2,AUDIO=48000*2*2/25;
const black=Buffer.concat([Buffer.alloc(720*576,16),Buffer.alloc(720*576/2,128)]);
const silence=Buffer.alloc(AUDIO);
export function channelPlayoutSignature(channel){return JSON.stringify([channel.programmes,channel.schedule,channel.playout,channel.stationBrand]);}
class Bytes {
 constructor(){this.parts=[];this.length=0;this.offset=0;}
 push(b){this.parts.push(b);this.length+=b.length;}
 take(n){if(this.length<n)return null;const out=Buffer.allocUnsafe(n);let at=0;while(at<n){const b=this.parts[0],count=Math.min(n-at,b.length-this.offset);b.copy(out,at,this.offset,this.offset+count);at+=count;this.offset+=count;if(this.offset===b.length){this.parts.shift();this.offset=0;}}this.length-=n;return out;}
}
// Raw, fixed-format frames cross source boundaries; the H.264/AAC encoder,
// MPEG-TS muxer, timestamps and HLS playlist never restart at those boundaries.
export class ContinuousRelay extends RelayManager {
 async ensure(channel,epoch,holdingImage){
  let state=this.states.get(channel.id);
  if(!state){state={channel,epoch,holdingImage,lastAccess:Date.now(),stopped:false,error:'',transitions:0,hlsStartNumber:Math.floor(Date.now()/1000),sources:new Map(),lastFrame:black,clockGeneration:0};this.states.set(channel.id,state);state.ready=(async()=>{state.dir=await mkdtemp(path.join(tmpdir(),'tellybox-hls-'));if(!state.stopped)await this.launch(state);})();}
  else {
   const changed=state.channel.status!==channel.status||state.epoch!==epoch||(state.channel!==channel&&channelPlayoutSignature(state.channel)!==channelPlayoutSignature(channel));
   if(changed){for(const source of [...state.sources.values()])this.discard(state,source);state.active=null;state.slot=null;}
   state.channel=channel;state.epoch=epoch;state.holdingImage=holdingImage;
  }
  state.lastAccess=Date.now();await state.ready;return state;
 }
 async launch(state){
  const args=['-hide_banner','-loglevel','warning','-nostdin','-y','-thread_queue_size','64','-probesize','32','-analyzeduration','1','-f','rawvideo','-pixel_format','yuv420p','-video_size','720x576','-framerate','25','-i','pipe:3','-thread_queue_size','256','-probesize','32','-analyzeduration','1','-f','s16le','-ar','48000','-ac','2','-i','pipe:4','-map','0:v:0','-map','1:a:0','-vf','setsar=16/15','-c:v','libx264','-preset','veryfast','-threads','2','-pix_fmt','yuv420p','-profile:v','main','-bf','0','-level:v','3.1','-b:v','1400k','-maxrate','1800k','-bufsize','2800k','-g','50','-keyint_min','50','-sc_threshold','0','-c:a','aac','-b:a','128k','-ar','48000','-ac','2','-f','hls','-hls_time','2','-hls_list_size','12','-hls_delete_threshold','30','-hls_flags','delete_segments+omit_endlist+program_date_time+independent_segments+temp_file','-start_number',String(state.hlsStartNumber),'-hls_segment_filename',path.join(state.dir,'segment%d.ts'),path.join(state.dir,'index.m3u8')];
  const encoder=spawn(this.ffmpeg,args,{windowsHide:true,stdio:['ignore','ignore','pipe','pipe','pipe']});state.child=encoder;state.encoderStarts=1;state.outputFrames=0;state.fallbackFrames=0;state.sourceFrameCounts={presentation:0,holding:0,programme:0};
  for(const stream of [encoder.stdio[3],encoder.stdio[4]])stream.on('error',()=>{});
  encoder.stderr.on('data',b=>{state.diagnostic=((state.diagnostic||'')+b).slice(-3000);});
  encoder.on('error',()=>{state.error='The continuous IPTV encoder could not start.';});
  encoder.on('close',()=>{if(!state.stopped)state.error='The continuous IPTV encoder stopped unexpectedly.';});
  state.nextFrame=Date.now();
  state.frameTimer=setInterval(()=>this.tick(state),10);state.frameTimer.unref();this.tick(state);
 }
 key(entry){return `${entry.programme.id}:${entry.start}`;}
 tick(state){
  if(state.stopped||state.error)return;
  const now=Date.now();
  if(!state.slot||now>=state.slot.end){
   const desired=scheduleAt(state.channel,state.epoch,now,1)[0];
   const current=state.active;
   const finishing=current?.entry.programme.isInterstitial&&!current.entry.programme.isPresentation&&!current.entry.programme.isTestCard&&!current.failed&&!(current.videoEnded&&current.video.length<FRAME)&&now<current.deadline;
   if(finishing&&desired.programme.isInterstitial)state.slot={...state.slot,end:Math.min(current.deadline,now+200)};
   else {
    if(current&&current.key!==this.key(desired))this.discard(state,current);
    state.slot=desired;state.active=null;state.transitions++;state.currentEntry={id:desired.programme.id,title:desired.programme.title,start:desired.start,end:desired.end,kind:desired.programme.isTestCard?'holding':desired.programme.isPresentation?'presentation':'programme'};state.playbackKind=state.currentEntry.kind;
   }
  }
  const key=this.key(state.slot);let source=state.sources.get(key);
  if(source?.failed&&now>=source.retryAt&&!source.replacing&&!(source.fallback?.ready&&!source.fallback.failed&&!source.fallback.entry.programme.isTestCard&&!source.fallback.entry.programme.isPresentation)){if(source.fallback)this.discard(state,source.fallback);this.discard(state,source);source=null;}
  if(!source){this.prepare(state,state.slot).catch(()=>{});source=state.sources.get(key);}
  // New and prewarmed decoders need the same pipe handling before their
  // first frame; otherwise a channel can remain stuck at initial loading.
  for(const pending of state.sources.values())this.drainSource(pending);
  if(source&&!source.ready&&!source.failed){this.checkSourceProgress(state,source,now);source=state.sources.get(key);}
  if(source?.ready&&!source.failed){state.active=source;}
  if(source?.failed&&source.entry.programme.isInterstitial)this.advanceReplacement(state,source,now);
  if(source?.failed&&source.fallback?.ready&&!source.fallback.failed)state.active=source.fallback;
  if(now>=(state.nextPrepareCheck||0)){
   state.nextPrepareCheck=now+500;
   const candidates=[scheduleAt(state.channel,state.epoch,state.slot.end+1,1)[0]];
   const nextProgramme=programmesAt(state.channel,state.epoch,now,2).find(item=>item.start>now);
   if(nextProgramme)candidates.push(nextProgramme);
   for(const next of candidates)if(next.start>now&&next.start-now<=120000&&!next.programme.isPresentation&&!next.programme.isTestCard&&!state.sources.has(this.key(next)))this.prepare(state,next).catch(()=>{});
   for(const s of state.sources.values())if(!s.owner&&s!==state.active&&s.fallback!==state.active&&s.entry.end<now)this.discard(state,s);
  }
  if(now<state.nextFrame||state.child.stdio[3].writableNeedDrain||state.child.stdio[4].writableNeedDrain)return;
  state.nextFrame=Math.max(state.nextFrame+40,now-40);
  const s=state.active;let frame,audio;
  this.drainSource(s);
  this.checkSourceProgress(state,s,now);
  if(s&&s.video.length>=FRAME&&s.audio.length>=AUDIO){frame=s.video.take(FRAME);audio=s.audio.take(AUDIO);state.lastFrame=frame;s.sentFrames++;state.sourceFrameCounts[s.entry.programme.isTestCard?'holding':s.entry.programme.isPresentation?'presentation':'programme']++;
   if(s.video.length<FRAME*6)s.child?.stdio[3].resume();if(s.audio.length<AUDIO*12)s.child?.stdio[4].resume();
  }else {frame=state.lastFrame;audio=silence;state.fallbackFrames++;}
  state.child.stdio[3].write(frame);state.child.stdio[4].write(audio);state.outputFrames++;
 }
 drainSource(s){
  if(!s?.child)return;
  // FFmpeg writes both pipes from one decoder. A paused, fuller pipe can
  // prevent it producing the other stream; reopen it when its partner starves.
  if(s.video.length<FRAME*6||(s.audio.length<AUDIO&&s.video.length<FRAME*100))s.child.stdio[3].resume();
  if(s.audio.length<AUDIO*12||(s.video.length<FRAME&&s.audio.length<AUDIO*250))s.child.stdio[4].resume();
 }
 checkSourceProgress(state,s,now){
  if(!s?.child||s.failed||s.entry.programme.isTestCard||s.entry.programme.isPresentation)return;
  if(s.video.length>=FRAME&&s.audio.length>=AUDIO){s.stalledSince=null;return;}
  s.stalledSince??=now;
  const timeout=s.sentFrames>0?5000:30000;
  if(now-s.stalledSince<timeout||now-(state.lastDecoderRecovery||0)<15000)return;
  state.lastDecoderRecovery=now;state.decoderRecoveries=(state.decoderRecoveries||0)+1;
  if(s.entry.programme.isInterstitial){this.failedSource(state,s,'source-buffer-stalled');s.child?.kill();return;}
  // Restart only this source decoder at the current programme position. The
  // channel encoder, HLS sequence and other channels continue unchanged.
  this.sourceFailed(state,s.entry,'source-buffer-stalled');
  if(providerOf(s.entry.programme.url))this.resolver.invalidate?.(s.entry.programme.url);
  this.discard(state,s);state.active=null;this.prepare(state,state.slot).catch(()=>{});
 }
 async prepare(state,entry){
  const key=this.key(entry);if(state.stopped||state.sources.has(key))return;
  const s={key,entry,video:new Bytes(),audio:new Bytes(),sentFrames:0,ready:false,failed:false,deadline:entry.programme.isInterstitial?programmesAt(state.channel,state.epoch,Math.max(entry.start,Date.now()),1)[0].start:entry.end};state.sources.set(key,s);
  try {
   const p=entry.programme,holding=p.isTestCard,presentation=p.isPresentation,interval=p.isInterstitial&&!presentation;
   const args=['-hide_banner','-loglevel','error','-nostdin'];let video=0,audio=0,inputCount=1;let duration=(entry.end-Math.max(Date.now(),entry.start))/1000;
   if(holding||presentation){
    if(presentation){clearInterval(state.clockTimer);state.clockGeneration++;await this.startCountdown(state,entry.end);args.push('-re','-f','lavfi','-i','color=c=0x102c46:s=720x576:r=25');}
    else {let card=this.testCard;if(state.holdingImage&&state.holdingImage!=='/test-card-f.jpg'){try{card=await this.source(state.holdingImage);}catch{}}args.push('-re','-loop','1','-framerate','25','-i',card);}
    args.push('-f','lavfi','-i','anullsrc=channel_layout=stereo:sample_rate=48000');audio=1;inputCount=2;
   }else if(providerOf(p.url)){
    const media=await this.resolver.resolve(p.url);inputCount=media.streams.length;video=media.streams.findIndex(x=>x.video);audio=media.streams.findIndex(x=>x.audio);
    if(interval){duration=clipPlaybackSeconds(p,media.duration);if(!canPlayWholeClip(duration,s.deadline,Math.max(Date.now(),entry.start)))throw Error('Whole interval no longer fits.');}
    const offset=(interval?0:Math.max(0,(Date.now()-entry.start)/1000))+(p.sourceOffset||0);
    for(const stream of media.streams){args.push('-rw_timeout','15000000');const headers=Object.entries(stream.headers||{}).map(([k,v])=>`${k}: ${String(v).replace(/[\r\n]/g,'')}\r\n`).join('');if(headers)args.push('-headers',headers);args.push('-ss',String(offset),'-i',stream.url);}
   }else {
    const url=await this.source(p.url);
    const [hasAudio,intervalSeconds]=await Promise.all([this.hasAudio(url),interval&&p.sourceOffset===undefined?this.intervalDuration(p,url):Promise.resolve(p.duration)]);audio=hasAudio?0:-1;
    if(interval){duration=intervalSeconds;if(!canPlayWholeClip(duration,s.deadline,Math.max(Date.now(),entry.start)))throw Error('Whole interval no longer fits.');}
    if(/^https?:/.test(url))args.push('-rw_timeout','15000000','-reconnect','1','-reconnect_streamed','1','-reconnect_on_network_error','1','-reconnect_on_http_error','429,5xx','-reconnect_delay_max','2');
    args.push('-ss',String((interval?0:Math.max(0,(Date.now()-entry.start)/1000))+(p.sourceOffset||0)),'-i',url);
   }
   if(state.stopped||state.sources.get(key)!==s)return;
   if(audio<0){audio=inputCount;args.push('-f','lavfi','-i','anullsrc=channel_layout=stereo:sample_rate=48000');}
   const crop=p.videoCrop;const picture=crop?`crop=${crop.width}:${crop.height}:${crop.x}:${crop.y},scale=w='trunc(min(720,576*dar*15/16)/2)*2':h='trunc(min(576,720/dar*16/15)/2)*2'`:'scale=720:576:force_original_aspect_ratio=decrease:force_divisible_by=2';
   let filter=`setpts=PTS-STARTPTS,fps=25,${picture},pad=720:576:(ow-iw)/2:(oh-ih)/2`;
   if(presentation)filter+=presentationFilter(state.countdownFile,this.presentationWebsite);
   duration=Math.max(.08,interval?duration:(entry.end-Math.max(Date.now(),entry.start))/1000);s.playbackDuration=duration;
   args.push('-map',`${video}:v:0`,'-t',String(duration),'-vf',filter,'-an','-c:v','rawvideo','-threads','1','-pix_fmt','yuv420p','-f','rawvideo','pipe:3','-map',`${audio}:a:0`,'-t',String(duration),'-af','asetpts=PTS-STARTPTS,aresample=48000:async=1:first_pts=0,apad','-vn','-c:a','pcm_s16le','-ar','48000','-ac','2','-f','s16le','pipe:4');
   const child=spawn(this.ffmpeg,args,{windowsHide:true,stdio:['ignore','ignore','pipe','pipe','pipe']});s.child=child;
   const update=()=>{s.ready=s.video.length>=FRAME&&s.audio.length>=AUDIO;};
   child.stdio[3].on('data',b=>{s.video.push(b);if(s.video.length>=FRAME*12)child.stdio[3].pause();update();});child.stdio[4].on('data',b=>{s.audio.push(b);if(s.audio.length>=AUDIO*24)child.stdio[4].pause();update();});
   child.stdio[3].on('end',()=>{s.videoEnded=true;});child.stderr.on('data',()=>{});
   child.on('error',()=>{this.failedSource(state,s,'source-decoder-start');});child.on('close',code=>{s.closed=true;if(code&&!state.stopped&&state.sources.get(key)===s){this.failedSource(state,s,'source-decode-failed');}});
  } catch(error){this.failedSource(state,s,'source-preparation-failed');}
 }
 failedSource(state,s,reason){
  if(s.failed||state.stopped)return;if(providerOf(s.entry.programme.url))this.resolver.invalidate?.(s.entry.programme.url);s.failed=true;s.retryAt=Date.now()+this.sourceRetryMs;this.sourceFailed(state,s.entry,reason);
  if(s.entry.programme.isTestCard||s.entry.programme.isPresentation||s.entry.programme.isReplacementAdvert)return;
  if(s.entry.programme.isInterstitial){this.holdingFallback(state,s);this.replaceFailedAdvert(state,s).catch(()=>this.holdingFallback(state,s));return;}
  this.holdingFallback(state,s);
 }
 async replaceFailedAdvert(state,s){
  if(s.replacing||state.stopped)return;s.replacing=true;
  s.rejectedUrls??=new Set([s.entry.programme.url]);state.replacementHistory??=[];
  const playing=s.fallback&&!s.fallback.entry.programme.isTestCard&&!s.fallback.entry.programme.isPresentation?s.fallback:null;
  const remaining=playing?Math.max(0,(playing.playbackDuration||playing.entry.programme.duration)-playing.sentFrames/25):0;
  const startAt=Math.max(Date.now(),s.entry.start)+remaining*1000;
  const candidates=(state.channel.schedule?.breaks||[]).filter(p=>p.kind==='advert'&&!p.playbackDisabled&&!s.rejectedUrls.has(p.url)&&canPlayWholeClip(p.duration,s.deadline,startAt))
   .sort((a,b)=>Number(Boolean(providerOf(a.url)))-Number(Boolean(providerOf(b.url)))||state.replacementHistory.lastIndexOf(a.url)-state.replacementHistory.lastIndexOf(b.url)||a.duration-b.duration).slice(0,3);
  if(!candidates.length){s.replacing=false;s.nextReplacementCheck=Date.now()+2000;if(!playing)this.holdingFallback(state,s);return;}
  const replacements=[];let retry=false;
  try{
   const winner=await Promise.any(candidates.map(async(p,index)=>{
    const start=startAt,entry={...s.entry,start,end:start+p.duration*1000,programme:{...p,id:p.id+'-replacement-'+index,isInterstitial:true,isReplacementAdvert:true}};
    const key=this.key(entry);replacements.push(key);
    // Preparation is speculative; a failed candidate must not display a card.
    const pending=this.prepare(state,entry);pending.catch(()=>{});const prepared=state.sources.get(key);if(prepared)prepared.owner=s;const until=Date.now()+45000;
    while(!state.stopped&&state.sources.get(s.key)===s&&Date.now()<until){const source=state.sources.get(key);if(source?.ready&&!source.failed)return source;if(source?.failed){s.rejectedUrls.add(p.url);throw Error('Replacement advert unavailable');}await new Promise(r=>setTimeout(r,40));}
    s.rejectedUrls.add(p.url);throw Error('Replacement advert warm-up timed out');
   }));
   if(state.stopped||state.sources.get(s.key)!==s){this.discard(state,winner);return;}
   if(playing)s.nextFallback=winner;else {if(s.fallback)this.discard(state,s.fallback);s.fallback=winner;}
   state.replacementHistory.push(winner.entry.programme.url);state.replacementHistory=state.replacementHistory.slice(-20);
  }catch{
   if(!state.stopped&&state.sources.get(s.key)===s){
    retry=(state.channel.schedule?.breaks||[]).some(p=>p.kind==='advert'&&!p.playbackDisabled&&!s.rejectedUrls.has(p.url)&&canPlayWholeClip(p.duration,s.deadline,Math.max(Date.now(),s.entry.start)+remaining*1000));
    if(!retry&&!playing)this.holdingFallback(state,s);
   }
  }
  finally{s.replacing=false;s.nextReplacementCheck=Date.now()+500;for(const key of replacements){const source=state.sources.get(key);if(source&&source!==s.fallback&&source!==s.nextFallback)this.discard(state,source);}}
  if(retry)await this.replaceFailedAdvert(state,s);
 }
 advanceReplacement(state,s,now){
  const current=s.fallback;if(!current||current.entry.programme.isTestCard||current.entry.programme.isPresentation)return;
  if(s.nextFallback?.failed){s.rejectedUrls.add(s.nextFallback.entry.programme.url);this.discard(state,s.nextFallback);s.nextFallback=null;}
  const ended=current.failed||(current.videoEnded&&current.video.length<FRAME);
  if(ended&&s.nextFallback?.ready&&!s.nextFallback.failed){
   this.discard(state,current);s.fallback=s.nextFallback;s.nextFallback=null;
  }
  const active=s.fallback;
  const remaining=Math.max(0,(active.playbackDuration||active.entry.programme.duration)-active.sentFrames/25);
  if(!s.nextFallback&&!s.replacing&&now>=(s.nextReplacementCheck||0)&&remaining<=3&&now+remaining*1000<s.entry.end)this.replaceFailedAdvert(state,s).catch(()=>{});
 }
 holdingFallback(state,s){
  if(state.stopped||state.sources.get(s.key)!==s)return;
  if(s.fallback)return;
  const end=Math.max(s.entry.end,s.deadline),p={id:s.entry.programme.id+'-recovery-countdown',title:'Programming is coming up!',duration:Math.max(1,(end-Date.now())/1000),isInterstitial:true,isPresentation:true};
  const entry={...s.entry,end,programme:p};this.prepare(state,entry).catch(()=>{});s.fallback=state.sources.get(this.key(entry));if(s.fallback)s.fallback.owner=s;
 }
 discard(state,s){state.sources.delete(s.key);for(const child of state.sources.values())if(child.owner===s)this.discard(state,child);s.child?.stdio[3].destroy();s.child?.stdio[4].destroy();s.child?.kill();if(s.child){const timer=setTimeout(()=>{if(s.child.exitCode===null&&s.child.signalCode===null)s.child.kill('SIGKILL');},1000);timer.unref();}}
 async stop(id){const state=this.states.get(id);if(state){state.stopped=true;clearInterval(state.frameTimer);for(const s of state.sources.values())this.discard(state,s);state.child?.stdio[3].destroy();state.child?.stdio[4].destroy();if(state.child){const child=state.child;const timer=setTimeout(()=>{if(child.exitCode===null&&child.signalCode===null)child.kill('SIGKILL');},1000);timer.unref();}}await super.stop(id);}
}
