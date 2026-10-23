import test from 'node:test';
import assert from 'node:assert/strict';
import {channelFeed,createBroadcastPlayer} from '../public/broadcast-player.mjs';

function fixture(native=false){
 const listeners=new Map(),events=new Map();let current;
 const video={src:'',canPlayType:()=>native?'maybe':'',pause(){},load(){},removeAttribute(){this.src='';},play:async()=>{},addEventListener(name,fn){listeners.set(name,fn);}};
 class FakeHls{
  static isSupported=()=>!native;
  static Events={MANIFEST_PARSED:'manifest',ERROR:'error'};
  static ErrorTypes={NETWORK_ERROR:'network',MEDIA_ERROR:'media'};
  constructor(){current=this;this.recoveries=0;}
  on(name,fn){events.set(name,fn);}
  loadSource(url){this.url=url;}
  attachMedia(v){this.video=v;}
  destroy(){this.destroyed=true;}
  recoverMediaError(){this.recoveries++;}
 }
 const player=createBroadcastPlayer({video,HlsClass:FakeHls});
 return{video,listeners,events,player,get engine(){return current;}};
}

test('website uses the identical channel endpoint as IPTV and keeps it through playback events',()=>{
 const f=fixture();f.player.tune('saturday-night');const engine=f.engine;
 assert.equal(engine.url,'/iptv/saturday-night/index.m3u8');
 f.events.get('manifest')();assert.equal(engine.subtitleDisplay,false);assert.equal(engine.subtitleTrack,-1);
 f.listeners.get('playing')();assert.equal(f.engine,engine);assert.equal(engine.destroyed,undefined);
 f.events.get('error')('error',{fatal:true,type:'media'});assert.equal(engine.recoveries,1);assert.equal(engine.url,channelFeed('saturday-night'));
 f.player.tune('prize-time');assert.equal(engine.destroyed,true);assert.equal(f.engine.url,'/iptv/prize-time/index.m3u8');
 f.player.destroy();assert.equal(f.player.active,false);
 assert.doesNotThrow(()=>f.events.get('manifest')());
 assert.doesNotThrow(()=>f.events.get('error')('error',{fatal:true,type:'media'}));
 assert.throws(()=>channelFeed('../media'),/Invalid channel/);
});

test('native HLS browsers watch the same feed and teardown cancels recovery',()=>{
 const f=fixture(true);f.player.tune('little-box');assert.equal(f.video.src,'/iptv/little-box/index.m3u8');assert.equal(f.engine,undefined);
 f.listeners.get('ended')();f.player.destroy();assert.equal(f.video.src,'');assert.equal(f.player.active,false);
});

test('AirPlay-capable browsers use a native channel URL even when MediaSource is supported',()=>{
 let engines=0;const video={src:'',webkitShowPlaybackTargetPicker(){},canPlayType:()=> 'maybe',pause(){},load(){},play:async()=>{},removeAttribute(){this.src='';},addEventListener(){}};
 class MseHls{static isSupported(){return true;}constructor(){engines++;}}
 const player=createBroadcastPlayer({video,HlsClass:MseHls});player.tune('one');assert.equal(engines,0);assert.equal(video.src,'/iptv/one/index.m3u8');player.tune('two');assert.equal(video.src,'/iptv/two/index.m3u8');player.destroy();assert.equal(video.src,'');
});
