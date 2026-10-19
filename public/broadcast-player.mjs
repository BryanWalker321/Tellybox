import Hls from './vendor/hls.mjs';

export function channelFeed(id) {
  if (!/^[a-z0-9-]+$/.test(id)) throw Error('Invalid channel');
  return `/iptv/${id}/index.m3u8`;
}

// One channel URL is kept open across every programme and advert boundary.
// Never fall back to a separate source player: that would split the broadcast.
export function createBroadcastPlayer({video, HlsClass=Hls, onStatus=()=>{}, onPlaying=()=>{}}) {
  let engine, channel, generation=0, retryTimer, retries=0, mediaRecoveries=0;
  function destroy() {
    generation++;clearTimeout(retryTimer);engine?.destroy();engine=null;channel=null;
    video.pause();video.removeAttribute('src');video.load();
  }
  function play() { video.play().catch(()=>onStatus('Press play on the picture to join the live broadcast.')); }
  function reconnect() {
    if(!channel)return;
    clearTimeout(retryTimer);
    onStatus('Reconnecting to the live broadcast…');
    const ticket=generation;
    retryTimer=setTimeout(()=>{if(ticket!==generation)return;if(engine)engine.startLoad(-1);else{video.load();play();}},Math.min(10000,1500*++retries));
  }
  function tune(id) {
    const url=channelFeed(id);destroy();channel=id;retries=0;mediaRecoveries=0;const ticket=generation;
    onStatus('Tuning in to the live broadcast…');
    if(!HlsClass.isSupported()&&video.canPlayType('application/vnd.apple.mpegurl')){video.src=url;video.load();play();return;}
    if(!HlsClass.isSupported()){onStatus('This browser cannot play the live feed. Use an up-to-date browser or the IPTV link below.');return;}
    engine=new HlsClass({enableWorker:false,lowLatencyMode:false,liveSyncDurationCount:3,liveMaxLatencyDurationCount:6,maxBufferLength:12,backBufferLength:12,manifestLoadingTimeOut:35000,manifestLoadingMaxRetry:6,levelLoadingTimeOut:35000,levelLoadingMaxRetry:6});
    engine.on(HlsClass.Events.MANIFEST_PARSED,()=>{if(ticket!==generation||!channel)return;engine.subtitleDisplay=false;engine.subtitleTrack=-1;play();});
    engine.on(HlsClass.Events.ERROR,(_event,data)=>{
      if(ticket!==generation||!channel)return;
      if(!data.fatal)return;
      if(data.type===HlsClass.ErrorTypes.NETWORK_ERROR)reconnect();
      else if(data.type===HlsClass.ErrorTypes.MEDIA_ERROR&&mediaRecoveries++<2)engine.recoverMediaError();
      else onStatus('The live broadcast could not be decoded. Press Back to live to reconnect.');
    });
    engine.loadSource(url);engine.attachMedia(video);
  }
  video.addEventListener('playing',()=>{if(!channel){video.pause();return;}retries=0;onPlaying();});
  video.addEventListener('ended',reconnect);
  video.addEventListener('error',()=>{if(channel&&!engine)reconnect();});
  return {tune,destroy,reconnect,get active(){return Boolean(channel);}};
}
