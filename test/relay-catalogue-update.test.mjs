import test from 'node:test';
import assert from 'node:assert/strict';
import {RelayManager} from '../lib/relay.mjs';
test('catalogue saves preserve the running HLS session and defer programme updates to the handoff',async()=>{
 const relay=new RelayManager({mediaRoot:'.',testCard:'.'});
 const old={id:'test',status:'online',programmes:[{id:'a'}]},epoch='2026-10-20T00:00:00Z',child={kill(){throw Error('A catalogue save must not interrupt playback')}};
 const state={channel:old,epoch,signature:JSON.stringify([old,epoch,undefined]),child,lastAccess:Date.now(),ready:Promise.resolve(),dir:null};relay.states.set('test',state);
 try{const next=structuredClone(old);next.programmes.push({id:'b'});const result=await relay.ensure(next,epoch);assert.equal(result,state);assert.equal(result.child,child);assert.equal(result.channel.programmes.length,2);assert.equal(relay.states.size,1);}finally{state.child=null;await relay.close();}
});
