import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';

export async function checkProviderPlayback(relay, url, ffmpeg = process.env.FFMPEG_PATH || 'ffmpeg') {
  const channel = {id: 'owner-check-' + randomUUID(), name: 'Owner IPTV check', programmes: [{id: 'sample', title: 'IPTV sample', duration: 3600, url}]};
  try {
    const epoch = new Date(Date.now() - 2000).toISOString();
    const playlist = (await relay.file(channel, epoch, 'index.m3u8')).toString();
    const state = relay.states.get(channel.id), segment = playlist.match(/segment\d+\.ts/)?.[0];
    if (state?.playbackKind !== 'programme' || !segment) throw Error('Programme footage unavailable.');
    const bytes = await relay.file(channel, epoch, segment);
    const decoded = await new Promise(resolve => {
      const child = spawn(ffmpeg, ['-v','error','-i','pipe:0','-frames:v','1','-f','null','-'], {windowsHide: true, stdio: ['pipe','ignore','ignore']});
      const timer = setTimeout(() => {child.kill(); resolve(false);}, 15000);
      child.on('error', () => {clearTimeout(timer); resolve(false);});
      child.on('close', code => {clearTimeout(timer); resolve(code === 0);});
      child.stdin.on('error', () => {}); child.stdin.end(bytes);
    });
    if (!decoded || state.playbackKind !== 'programme') throw Error('Programme footage did not decode.');
    return {result: 'passed', checkedAt: new Date().toISOString(), reason: 'Original programme footage was relayed as HLS and a video frame decoded. This is a short sample, not an end-to-end programme check.'};
  } finally { await relay.stop(channel.id); }
}
