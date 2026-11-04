import test from 'node:test';
import assert from 'node:assert/strict';
import {acquireVideoFrame,takeVideoFrame,writeVideoFrame} from '../lib/video-frame-pool.mjs';

test('copying a fragmented picture reuses its destination and preserves remaining bytes',()=>{
 const queue={parts:[Buffer.from([0,1,2]),Buffer.from([3,4]),Buffer.from([5,6,7,8])],offset:1,length:8},target=Buffer.alloc(5);
 assert.equal(takeVideoFrame(queue,target),target);assert.deepEqual([...target],[1,2,3,4,5]);assert.equal(queue.length,3);assert.equal(queue.offset,1);
 const rest=Buffer.alloc(3);takeVideoFrame(queue,rest);assert.deepEqual([...rest],[6,7,8]);assert.equal(queue.length,0);assert.deepEqual(queue.parts,[]);
});

test('pictures cannot be recycled while queued by the encoder or retained as the last picture',()=>{
 const callbacks=[],state={child:{stdio:[null,null,null,{write(_frame,callback){callbacks.push(callback);}}]}};
 const first=acquireVideoFrame(state,8);first.buffer.fill(1);state.lastFrame=first.buffer;writeVideoFrame(state,first.buffer);writeVideoFrame(state,first.buffer);
 const second=acquireVideoFrame(state,8);second.buffer.fill(2);state.lastFrame=second.buffer;writeVideoFrame(state,second.buffer);
 const third=acquireVideoFrame(state,8);state.lastFrame=third.buffer;writeVideoFrame(state,third.buffer);
 const fourth=acquireVideoFrame(state,8);state.lastFrame=fourth.buffer;writeVideoFrame(state,fourth.buffer);
 assert.equal(acquireVideoFrame(state,8),null);assert.equal(state.videoFramePool.length,4);
 callbacks.shift()();assert.equal(acquireVideoFrame(state,8),null,'First picture is still referenced by its repeated fallback write');assert.deepEqual([...first.buffer],Array(8).fill(1));
 callbacks.shift()();assert.equal(acquireVideoFrame(state,8),first);assert.deepEqual([...second.buffer],Array(8).fill(2));
 callbacks.pop()();assert.notEqual(acquireVideoFrame(state,8),fourth,'Last picture is retained even after its encoder write completes');
});

test('a failed synchronous write releases its pool reference',()=>{
 const state={child:{stdio:[null,null,null,{write(){throw Error('closed');}}]}},slot=acquireVideoFrame(state,8);
 assert.throws(()=>writeVideoFrame(state,slot.buffer),/closed/);assert.equal(slot.pending,0);
});

test('steady playback reuses bounded storage while delivering each new picture intact',()=>{
 let expected=0;const state={child:{stdio:[null,null,null,{write(frame,callback){assert.deepEqual([...frame],Array(8).fill(expected));callback();}}]}};
 for(expected=0;expected<200;expected++){
  const slot=acquireVideoFrame(state,8),queue={parts:[Buffer.alloc(3,expected),Buffer.alloc(5,expected)],offset:0,length:8};
  const frame=takeVideoFrame(queue,slot.buffer);state.lastFrame=frame;writeVideoFrame(state,frame);
 }
 assert.equal(state.videoFramePool.length,2);
});
