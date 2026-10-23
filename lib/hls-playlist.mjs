// Keep a segment's discontinuity identity stable when FFmpeg appends a new
// source and removes old segments from its rolling HLS playlist (RFC 8216).
export function livePlaylist(state, bytes) {
  const lines=bytes.toString().trim().split(/\r?\n/);
  const first=Number(lines.find(line=>line.startsWith('#EXT-X-MEDIA-SEQUENCE:'))?.split(':')[1]);
  if(!Number.isSafeInteger(first))throw Error('Invalid live playlist sequence.');
  const lastMatch=lines.filter(line=>/^segment\d+\.ts$/.test(line)).at(-1);
  const last=lastMatch?Number(lastMatch.match(/\d+/)[0]):-1;
  if(state.servedPlaylist && (first<state.servedSequence || last<state.servedLastSequence))return state.servedPlaylist;
  state.hlsBoundaries ||= new Set();
  state.discontinuityBase ||= 0;
  // Once a segment has left the current window, its boundary becomes part
  // of the running counter. The sequence guard also rejects stale reads.
  for(const boundary of state.hlsBoundaries)if(boundary<first){state.discontinuityBase++;state.hlsBoundaries.delete(boundary);}
  const header=[],body=[];let pending=[],sequence=first;
  for(const line of lines){
    if(!line || line==='#EXT-X-DISCONTINUITY' || line.startsWith('#EXT-X-DISCONTINUITY-SEQUENCE:') || line==='#EXT-X-ENDLIST')continue;
    if(line.startsWith('#EXT-X-TARGETDURATION:')){header.push('#EXT-X-TARGETDURATION:2');continue;}
    if(line.startsWith('#EXTINF:')){pending.push(line);continue;}
    if(pending.length){
      pending.push(line);
      if(!line.startsWith('#')){
        if(state.hlsBoundaries.has(sequence))body.push('#EXT-X-DISCONTINUITY');
        body.push(...pending);pending=[];sequence++;
      }
    }else header.push(line);
  }
  if(!body.length)return bytes;
  const media=header.findIndex(line=>line.startsWith('#EXT-X-MEDIA-SEQUENCE:'));
  header.splice(media+1,0,'#EXT-X-DISCONTINUITY-SEQUENCE:'+state.discontinuityBase);
  state.servedSequence=first;
  state.servedLastSequence=last;
  state.servedPlaylist=Buffer.from([...header,...body,''].join('\n'));
  return state.servedPlaylist;
}
