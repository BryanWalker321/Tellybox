import { pathToFileURL } from 'node:url';

export function releaseEmbed(release) {
  if (!/^v\d+\.\d+\.\d+$/.test(release.tag_name) || release.draft || release.prerelease) throw new Error('A published stable release is required');
  const url = `https://github.com/BryanWalker321/Tellybox/releases/tag/${release.tag_name}`;
  if (release.html_url !== url) throw new Error('Unexpected release address');
  return {
    username: 'Tellybox',
    allowed_mentions: { parse: [] },
    embeds: [{
      title: 'New Tellybox update',
      url,
      color: 0xDC572B,
      description: `A new update has been released for Tellybox - version ${release.tag_name.slice(1)}. See [Github](${url}) for a full changelist. Update within your Station Control Room!`,
    }],
  };
}

export async function notifyRelease(release, webhook, fetcher = fetch) {
  const url = new URL(webhook);
  if (url.origin !== 'https://discord.com' || !/^\/api\/webhooks\/\d+\/[A-Za-z0-9_-]+$/.test(url.pathname) || url.search || url.hash) throw new Error('Invalid Discord webhook configuration');
  const response = await fetcher(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(releaseEmbed(release)),
    signal: AbortSignal.timeout(20_000),
    redirect: 'error',
  });
  // Do not print the endpoint or response body: both can contain private data.
  if (!response.ok) throw new Error(`Discord announcement failed (HTTP ${response.status})`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const { readFile } = await import('node:fs/promises');
    const event = JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH, 'utf8'));
    await notifyRelease(event.release, process.env.TELLYBOX_RELEASE_DISCORD_WEBHOOK);
    console.log('Discord release announcement delivered.');
  } catch {
    console.error('Discord release announcement failed. Check the private webhook secret and workflow configuration.');
    process.exitCode = 1;
  }
}
