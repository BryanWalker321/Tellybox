// Reuse output pictures only after the encoder has finished reading them.
// The retained last picture must also remain intact for temporary fallback.
export function acquireVideoFrame(state,size){
 const pool=state.videoFramePool??=[];
 let slot=pool.find(x=>x.pending===0&&x.buffer!==state.lastFrame);
 if(!slot&&pool.length<4){slot={buffer:Buffer.allocUnsafe(size),pending:0};pool.push(slot);}
 return slot||null;
}

export function takeVideoFrame(queue,target){
 const size=target.length;
 if(queue.length<size)return null;
 // Existing live decoders use this same parts/offset queue representation.
 if(!Array.isArray(queue.parts))return queue.take(size);
 let at=0;
 while(at<size){const part=queue.parts[0],count=Math.min(size-at,part.length-queue.offset);part.copy(target,at,queue.offset,queue.offset+count);at+=count;queue.offset+=count;if(queue.offset===part.length){queue.parts.shift();queue.offset=0;}}
 queue.length-=size;
 return target;
}

export function writeVideoFrame(state,frame){
 const slot=state.videoFramePool?.find(x=>x.buffer===frame);
 if(slot)slot.pending++;
 try{return state.child.stdio[3].write(frame,()=>{if(slot)slot.pending--;});}
 catch(error){if(slot)slot.pending--;throw error;}
}
