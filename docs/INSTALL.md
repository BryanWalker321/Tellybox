# Install Tellybox and put your first channel on air

The self-hosted edition is your own station, with one example channel and two generated demo videos. It does not include Telly-box.uk's programme library, channel lineup or promotional homepage. You supply your media, branding and community settings.

## 1. Choose where it will run

- **Home network:** an always-on PC, home server or supported Raspberry Pi. Viewers use its LAN address. No public domain or router forwarding is needed.
- **Public station:** an always-on server with a reachable HTTPS address. A VPS avoids home-router forwarding; a home server needs suitable Internet access and router configuration.
- **Requirements:** Node.js 22.13+ for native installs, Git for managed native updates, and FFmpeg plus ffprobe for both website and IPTV playback. The Docker image supplies its runtime and playback tools. Check [platform instructions](PLATFORMS.md) for OS-specific setup.

One encoder serves all viewers of a particular active channel, but each additional active channel uses more encoding capacity. Bandwidth also grows with viewer numbers. Test your hardware and connection before choosing a channel/viewer target; Raspberry Pi throughput and Mac compatibility are not certified by this release.

## 2A. Docker Compose

1. Install Docker Engine and Compose, or Docker Desktop using Linux containers on a supported desktop system.
2. Download the latest release source from [GitHub](https://github.com/BryanWalker321/Tellybox/releases/latest), or clone the repository into a permanent project folder.
3. Copy `.env.example` to `.env`. Set a unique `COMPOSE_PROJECT_NAME` for this station and keep it unchanged after installation. Check the supplied port mapping and persistent volumes.
4. Open a terminal in that folder and run:

```sh
docker compose pull
docker compose up -d
docker compose logs --tail=30 tellybox
```

5. Open `http://127.0.0.1:4173` on the server computer. The default loopback binding is deliberate. For other home devices, configure the LAN port mapping described in [Hosting](HOSTING.md); localhost on a TV means the TV itself, not your server.
6. Keep the first-run setup key private. Open the settings cog and use the key to claim the station with an owner password.

The supplied Compose configuration uses the official image and a separate updater service. The web service has no Docker socket mount; the updater needs host-level Docker access to replace this station's containers. Keep this installation's project name and media/data mounts intact.

## 2B. Native Node.js

1. Install Git, supported Node.js, FFmpeg and ffprobe. Verify `node --version`, `git --version`, `ffmpeg -version` and `ffprobe -version` in a new terminal.
2. Clone or extract the release into a permanent folder. No npm dependency installation is required.
3. Copy `.env.example` to `.env` if you need to configure the host, port or dependency paths. Keep passwords and provider sessions out of public files.
4. Run `npm start` from the installation folder. This uses the managed launcher required for in-app native updates. Starting `node server.mjs` directly bypasses managed installation.
5. Open `http://127.0.0.1:4173`, retrieve the setup key from the terminal and claim the station in Settings.
6. Keep the launcher running. Configure Task Scheduler or systemd to run `node --env-file-if-exists=.env scripts/launch.mjs` from the original installation folder after the machine starts. See [Hosting](HOSTING.md) for listening addresses, startup and public HTTPS.

On Windows, environment paths must point to the real executables, rather than a package manager's shim. Keep the original launcher folder even after updates: it selects the managed release while preserving the original data and media locations.

## 3. Complete Station Control Room setup

1. **Station:** save your network name, tagline, logo and final station website address. Use the exact HTTP/HTTPS origin and port, without a page path.
2. **Channels:** replace the demos, set channel numbers, add programmes and accurate durations, then choose listed/random/episodic order and back-to-back playback, timed breaks or clock alignment. Save programming to the server.
3. **Media:** upload files or import a folder the server can actually access. A folder on another PC is not accessible unless you first mount/share it with the server. Preserve Docker volume mappings when adding media storage.
4. **Design & wording:** choose colours, cabinet, font, wording and holding artwork, then save. These appearance changes do not change programming or schedules.
5. **Discord & chat:** optionally save your own Discord invite. It updates the top-menu icon and lower community button; clearing it hides the links. OAuth/bot/webhook configuration is separate and is not required to watch TV.
6. **Hosting & help:** complete Guided station setup and run its device check from another device/network. A test from the server alone does not establish public reachability.

See [Owner setup](OWNER_SETUP.md), [Scheduling](SCHEDULING.md) and [Providers](PROVIDERS.md) for detailed field and source instructions.

## 4. Test your viewing methods

- **Website:** open Live, switch on the player, change channels and test a full programme → advert → programme transition. The Guide, Channels, Teletext and TV controls are in the site; mobile navigation opens with the `=` button.
- **Kodi/IPTV:** set the remote playlist to `YOUR-STATION/channels.m3u` and XMLTV to `YOUR-STATION/guide.xml`. The player's device must be able to reach the station address. Refresh cached channels/guide after channel-number changes.
- **Chromecast/Google TV:** disabled until the owner enables it and registers their own Google Cast Custom Receiver. Configure its URL and app ID as described in [Cast setup](CAST.md). Do not reuse Telly-box.uk's receiver registration.
- **AirPlay:** enable the independent owner setting and use a compatible Safari device's native picker. Availability depends on the device/browser.
- **Anyview/Miracast:** start mirroring through your phone or computer's own controls; the website provides help. Keep the sending device running. This differs from a Google Cast receiver running the station itself.

Website and Control Room viewer counts include active browser sessions only. **External IPTV viewers are not counted**, so zero watching on the website does not prove nobody is watching in Kodi or another IPTV app.

## 5. Keep the station up to date

The Updates tab shows installed and available versions; the installed version also appears under the Settings tabs. After one-time managed installation, use **Station Control Room → Updates → Install update**. Updates retain local media, channels, programme entries, schedule configuration, artwork, settings and owner credentials. The station briefly restarts to apply application changes. There is no routine manual download/export/reimport step.

Keep a separate disaster-recovery backup for disk loss or accidental deletion. A backup is not a required manual step in each managed update. Older/unmanaged installations need the one-time setup in [Updates](UPDATES.md). Never delete volumes or replace your catalogue with the demo catalogue while updating an existing station.

## 6. Before inviting viewers

Check video **and audio**, several channel changes, advert transitions, the guide, a second device and automatic startup after a deliberate maintenance reboot. Register exact Discord callback URLs if enabling sign-in. If a remote source stops working, use [playback troubleshooting](IPTV_RELIABILITY.md); metadata or successful embedding elsewhere does not establish server playback.

The television screen on self-hosted installs is the station front door. Telly-box.uk's promotional homepage and service-specific notices are not copied into your station.
