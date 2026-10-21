export function viewerCounts(payload) {
  if (!payload?.counts || typeof payload.counts !== 'object' || Array.isArray(payload.counts)) throw Error('Viewer counts unavailable');
  const counts=Object.create(null);
  for(const [channel,count] of Object.entries(payload.counts)) {
    if(!Number.isSafeInteger(count)||count<0)throw Error('Invalid viewer count');
    counts[channel]=count;
  }
  return counts;
}

export function createChannelViewers(root) {
  let counts=null,busy=false;
  function paint(){
    for(const cell of root.querySelectorAll('[data-viewer-channel]')) {
      cell.textContent=counts===null?'—':String(counts[cell.dataset.viewerChannel]??0);
      cell.title=counts===null?'Viewer counts are temporarily unavailable.':'Active website viewers. IPTV players do not report viewer presence.';
    }
  }
  async function refresh(){
    if(busy)return;busy=true;
    try {
      const response=await fetch('/api/community/presence',{cache:'no-store',signal:AbortSignal.timeout(8000)});
      if(!response.ok)throw Error('Viewer counts unavailable');
      counts=viewerCounts(await response.json());
    } catch {counts=null;}
    finally {busy=false;paint();}
  }
  const visible=()=>document.visibilityState!=='hidden'&&!root.closest('[hidden]');
  const changed=()=>{if(visible())void refresh();};
  setInterval(changed,15000);
  document.addEventListener('visibilitychange',changed);
  window.addEventListener('hashchange',changed);
  void refresh();
  return {paint};
}
