export function createUpdates({api}) {
  const $ = id => document.getElementById(id);
  if (!$('update-status')) return {start(){}};
  const busy = new Set(['queued','downloading','preparing','verifying','restarting']);
  let state, timer, expected;
  function render(s) {
    state=s;
    const running=busy.has(s.job?.phase);
    $('update-current').textContent=s.currentVersion;
    if($('owner-installed-version'))$('owner-installed-version').textContent=s.currentVersion;
    $('update-latest').textContent=s.latestVersion || 'Checking…';
    $('update-status').textContent=running ? s.job.message : ['failed','recovery-needed'].includes(s.job?.phase) ? s.job.message : s.job?.phase==='completed' ? `Version ${s.currentVersion} is installed.` : s.available ? 'A new update is ready to install.' : s.preparing ? 'A new release is being prepared. Check again shortly.' : s.checkError || 'You’re up to date.';
    $('update-support').hidden=s.supported;
    $('update-support').textContent=s.mode==='hosted'?'Updates for this hosted station are applied by its maintainer to preserve its custom homepage and playback services.':'This installation needs a one-time setup to enable updates here. See Hosting & help.';
    $('update-install').hidden=!s.available || !s.supported || s.job?.phase==='recovery-needed';
    $('update-install').disabled=running;
    $('update-check').disabled=running;
    $('update-progress-wrap').hidden=!running;
    $('update-progress').value=Math.max(0,Math.min(100,s.job?.percent || 0));
    $('update-percent').textContent=`${Math.round($('update-progress').value)}%`;
    $('update-notes').textContent=s.notes || 'Release notes will appear here when available.';
    const link=$('update-release');
    link.hidden=!s.releaseUrl;
    if(s.releaseUrl?.startsWith('https://github.com/BryanWalker321/Tellybox/releases/tag/v')) link.href=s.releaseUrl;
    $('update-banner').hidden=!s.available || running;
    $('update-badge').hidden=!s.available;
    $('update-checked').textContent=s.lastChecked ? `Last checked ${new Date(s.lastChecked).toLocaleString('en-GB')}` : '';
  }
  async function refresh(force=false) {
    clearTimeout(timer);
    try {
      // A restart expires the owner session. Background polling must not hide the progress screen.
      const response=await fetch('/api/owner/updates',{cache:'no-store'});
      if(response.status===401 && expected) {
        const version=await fetch('/api/version',{cache:'no-store'}).then(r=>r.json());
        if(version.version===expected){$('update-current').textContent=expected;if($('owner-installed-version'))$('owner-installed-version').textContent=expected;}
        $('update-status').textContent=version.version===expected ? `Version ${expected} is installed. Sign in again to continue.` : 'Your station has restarted. Sign in again to check the update result.';
        $('update-progress-wrap').hidden=true;
        $('update-banner').hidden=true;
        $('update-badge').hidden=true;
        $('update-install').hidden=true;
        $('update-check').disabled=true;
        $('update-sign-in').hidden=false;
        return;
      }
      if(!response.ok) throw Error('Could not check for updates. Try again shortly.');
      render(force ? await api('updates/check',{method:'POST',body:'{}'}) : await response.json());
    } catch(e) {$('update-status').textContent=expected ? 'Waiting for your station to restart…' : e.message;}
    timer=setTimeout(()=>refresh(),busy.has(state?.job?.phase)||expected?2000:60000);
  }
  $('update-check').addEventListener('click',()=>refresh(true));
  $('update-sign-in').addEventListener('click',event=>{event.preventDefault();location.reload();});
  $('update-install').addEventListener('click',async()=>{
    $('update-install').disabled=true;
    try {await api('updates/install',{method:'POST',body:JSON.stringify({version:state.latestVersion})});expected=state.latestVersion;await refresh();}
    catch(e){$('update-status').textContent=e.message;$('update-install').disabled=false;}
  });
  return {start:()=>refresh()};
}
