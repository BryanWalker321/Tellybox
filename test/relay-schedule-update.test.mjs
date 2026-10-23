import test from 'node:test';import assert from 'node:assert/strict';import {ContinuousRelay} from '../lib/continuous-relay.mjs';
function fixture(){const channel={id:'comedy',status:'online',programmes:[{id:'one',duration:10,url:'/media/one.mp4'},{id:'two',duration:10,url:'/media/two.mp4'}],schedule:{breakSeconds:5},playout:{order:'listed'}},source={key:'old'},encoder={pid:123},state={channel,epoch:'epoch',slot:{programme:channel.programmes[0]},active:source,sources:new Map([['old',source]]),child:encoder,ready:Promise.resolve()};const discarded=[];return {channel,state,encoder,discarded,relay:{states:new Map([['comedy',state]]),discard(s,source){discarded.push(source);s.sources.delete(source.key);}}};}
test('programme removal invalidates stale decoders and schedule without restarting the channel encoder',async()=>{
 const f=fixture(),next=structuredClone(f.channel);next.programmes.shift();
 await ContinuousRelay.prototype.ensure.call(f.relay,next,'epoch','');assert.equal(f.state.slot,null);assert.equal(f.state.active,null);assert.equal(f.state.sources.size,0);assert.equal(f.discarded.length,1);assert.equal(f.state.child,f.encoder);assert.equal(f.state.channel,next);
});
test('station design and channel wording changes leave programming and encoder untouched',async()=>{
 const f=fixture(),next=structuredClone(f.channel);next.name='New station name';next.description='New wording';next.logo='/new.svg';const slot=f.state.slot,active=f.state.active;
 await ContinuousRelay.prototype.ensure.call(f.relay,next,'epoch','/new-holding.jpg');assert.equal(f.state.slot,slot);assert.equal(f.state.active,active);assert.equal(f.state.child,f.encoder);assert.equal(f.discarded.length,0);
});
