# Your own retro television network

One channel, two working demo transmissions, and Tellybox example branding. Change the network name and logo in Settings before inviting viewers.

Install Node.js 22.13+ (24 recommended), extract this ZIP and run `npm start` in its folder. Open http://127.0.0.1:4173. The terminal prints your first-run owner setup key; enter it in Settings and choose your owner password. FFmpeg is needed for website and IPTV playback and is included in the Docker image. Public YouTube/Dailymotion IPTV sources also need Python/yt-dlp; see docs/PROVIDERS.md. Those provider tools are included in Docker.

Settings includes station identity/logo, design/wording, channels/programmes/local media, Discord and hosting help. The public Host your own page contains the full hosting walkthrough. [Read the hosting instructions](docs/HOSTING.md) for VPS, home server, firewall/port forwarding, DuckDNS, custom domains and HTTPS. [Customise your network](docs/CUSTOMISING.md).

Choose listed order, random order or mixed series with episodes in order. Configure back-to-back playback, clock-aligned starts or timed breaks after a chosen number of programmes. Import programme and advert folders, preview the running order, then save. [Scheduling and media folders](docs/SCHEDULING.md).

Open Settings → Hosting & help → Guided station setup. Choose Watch at home, Share from home or Host on a VPS. Save your station address, run the connection checks, and copy the device-check link to another device (mobile data for a public station). Set your own Discord invite in the final step; saving it blank hides the icon and community links. No bot is required for an invite. The starter excludes Tip buttons and Tellybox's promotional homepage. It runs a complete application with persistent data and shared website/IPTV video processing; ordinary static website hosting is insufficient.

127.0.0.1/localhost links work only on the server computer. Other devices need a reachable LAN or public address, including the stream addresses embedded inside M3U playlists. DuckDNS names your IP; it does not hide it.

The catalogue seeds private data/catalogue.json on first startup. data/ also contains owner settings and the chat database. Keep it persistent and private; never publish it. The starter has no UK archive programme pack, no personal credentials and no GitHub repository hardcoded. The two supplied test patterns were generated for this project and are CC0. Original application code is MIT licensed. See LICENSE and THIRD_PARTY_NOTICES.md.

To use Docker: `docker compose up -d --build`, then `docker compose logs --tail=30 tellybox` for the setup key. Port 4173 is bound to loopback by default; use a reverse proxy or follow the LAN instructions before connecting another device. Preserve the data/media volumes.
