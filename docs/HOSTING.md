# Put your own network on the air

For Windows, Linux and Raspberry Pi setup, read [Supported platforms](PLATFORMS.md). Mac-specific testing remains a follow-up.

Choose one of three hosting routes. Every route runs the complete Tellybox application: the website, scheduling service, shared live-video processing and persistent station data. Uploading the HTML files to ordinary static website hosting is not enough.

**Watch at home:** run Tellybox on an always-on computer and connect devices on the same network using an address such as `http://192.168.1.50:4173`. No domain, DuckDNS or router port forwarding is needed. Follow section 1 and steps 1–6 of section 2A, then the IPTV instructions. Docker users must also apply the LAN port mapping in section 2A.

**Share from home:** run the same application at home, reserve its LAN address, arrange public access through your router, then add DuckDNS or a custom domain and HTTPS. Follow sections 1, 2A, 3 or 4, and 5. Viewers connect to the domain, then your home's public IP, then the router, then your Tellybox computer. A public domain must point to your public IP, never the private `192.168…` address.

**Host on a VPS:** run the application on a VPS and point a domain at its public IP. This is the recommended route for a public station. Follow section 2B, section 4 (or DuckDNS), and section 5. Viewers connect to the domain, then the VPS, then Tellybox. No home-router forwarding is involved.

Use **one station website address** consistently. Save the final origin in Settings → Station, including `http://` or `https://` and any nonstandard port, with no page path. Website-generated IPTV links and Discord callbacks use this address. Update separately configured Discord bots or other external integrations to use the same origin. Domain settings do not move the application or open network ports.

Each self-hosted installation has its own name, logo, channels, catalogue, schedule, owner settings and media. It does not depend on our hosted station for scheduling. Its website and IPTV viewers share that installation's live feed, with normal player buffering delays. Tellybox's promotional homepage belongs only to our hosted service and is excluded from the self-hosted starter.

For local Kodi testing, open the playlist through the server's LAN address. When the configured station address is localhost, playlists requested through a LAN address use that LAN address for their streams. A configured public domain continues to take priority.

In Kodi's IPTV Simple Client, enter your LAN station address followed by `/channels.m3u` as the remote M3U URL and `/guide.xml` as the XMLTV URL. Enable/reload the client and open TV Channels or Guide. The server must stay running and its private-network firewall must allow the port. Router port forwarding is unnecessary for devices on the same home network.

Discord needs an exact registered callback. To sign in from other LAN devices, register the LAN callback in your Discord application and select that station website address. Localhost sign-in can remain in use during Kodi tests; Kodi itself needs no Discord login.

The self-hosted starter contains **one channel and two working demo transmissions**. It uses the Tellybox example name and logo. Replace those with your own identity in Settings before inviting viewers. Your station can use your local videos or direct files from an online media archive. The full British archive network belongs to the separate Tellybox edition.

Download the starter from [GitHub Releases](https://github.com/BryanWalker321/Tellybox/releases/latest), or clone [the repository](https://github.com/BryanWalker321/Tellybox). Do not share the station’s private data directory, passwords or Discord secrets.

## 1. Start locally first

1. Install Git and run `git clone https://github.com/BryanWalker321/Tellybox.git`, then `cd Tellybox`. Keep this checkout in a permanent folder.
2. Install a supported Node.js release (22.13 or newer; 24 recommended) from [Node.js](https://nodejs.org/en/download). For website and IPTV playback, also install FFmpeg from [FFmpeg’s download page](https://ffmpeg.org/download.html) and make sure `ffmpeg -version` works in a new terminal. The Docker image includes FFmpeg.
3. Open a terminal in the extracted folder. On Windows you can open the folder, type `powershell` in Explorer’s address bar and press Enter.
4. Run `npm start`. No package installation is needed. Keep the server running.
5. Open `http://127.0.0.1:4173`. The two demo patterns are generated examples supplied with the starter; there are no archive programme videos to download.
6. Open Settings. Copy the first-run setup key from the terminal and choose an owner password of at least 12 characters. The key changes if an unclaimed server restarts.
7. In Station, enter your own network name, tagline, colour and logo. Upload a PNG/JPEG/WebP logo, then **Save station identity**. The displayed network name, TV cabinet label, guide, Teletext, browser title and popup title bars update together.
8. In Programmes & media, replace the demo programmes. Upload local files or enter direct video URLs, accurate durations in seconds and source credits. Add channels as required, then **Save programming to server**. Saved programming refreshes the affected channel and guide; appearance changes do not change the running order.
9. The UK pre-2000 filter is optional for your own station. The starter uses Custom station, so your own recent media works too. A watch-page link is not an MP4 file. Supported public YouTube, Dailymotion and Vimeo URLs need the optional Python provider tools below for the shared website/IPTV feed. Vevo watch pages are not supported as media files.

## 2A. Use an always-on home PC or home server

For **home-network viewing only**, stop after step 6 and use the IPTV instructions. Steps 7–10 are for owners who choose to share their station over the Internet.

For **Docker LAN access**, change the supplied Compose mapping from `127.0.0.1:4173:4173` to `192.168.1.50:4173:4173`, replacing the example with your reserved LAN address, then recreate the service with `docker compose up -d`. The container already listens on all its internal interfaces; changing a host `.env` HOST value does not change the Docker port mapping. Restrict port 4173 to your LAN in the applicable host/provider firewall. For public HTTPS with host-installed Caddy, restore the default loopback mapping and follow section 5.

1. Keep the machine awake while plugged in. Arrange for the server to start after a reboot: on Windows, create a Task Scheduler task at logon using `node.exe` as the program, `--env-file-if-exists=.env scripts/launch.mjs` as arguments, and your extracted folder as **Start in**. Select **Hidden**, and use the account that owns the station folder. On Linux, use the service instructions below. A user-logon task starts only after that user signs in.
2. Find the computer’s private IPv4 address. On Windows run `ipconfig` and look for the active adapter’s IPv4 Address and Default Gateway. On Linux run `ip -4 address` and `ip route`. Example: server `192.168.1.50`, router `192.168.1.1`. These examples must be replaced with your actual values.
3. Sign in to the router’s local admin page using the Default Gateway address. Find LAN/DHCP/Address reservation and reserve the server’s address using its network adapter’s MAC address. This prevents a future restart from changing the forwarding destination.
4. For a direct network test, create a `.env` file beside `server.mjs` containing the following. Restart the server afterwards. These are launcher settings; the website cannot change its own listening interface.

```text
HOST=0.0.0.0
PORT=4173
```

5. In Windows Defender Firewall with Advanced Security, create an **Inbound Rule → Port → TCP → 4173 → Allow connection**, on the active network profile. Name it after your station. Linux/UFW users can run `sudo ufw allow 4173/tcp` if UFW is enabled. Do not disable the firewall.
6. From another device on the same home Wi-Fi, open `http://192.168.1.50:4173` using your reserved LAN address. If that fails, fix the listening address and firewall before changing the router.
7. In the router look for **Port Forwarding**, **NAT Forwarding**, **Virtual Servers** or **Applications & Gaming**. Add an enabled rule: service name = your station; protocol = **TCP**; external/WAN port = **4173**; internal/LAN port = **4173**; destination IP = your reserved server address. Leave source IP unrestricted for public viewers. Do not select DMZ or forward the router’s management page.
8. Find the router’s **public WAN IPv4 address** on its Internet/Status page. If it is private (`10.x.x.x`, `192.168.x.x`, `172.16.x.x`–`172.31.x.x`) or CGNAT (`100.64.x.x`–`100.127.x.x`), you cannot normally accept inbound connections through that address. With a second router/modem, forward through both or put the upstream device in a suitable bridge configuration. For ISP CGNAT, ask for a public IPv4 address, use a VPS, or use the alternative route below.
9. On a phone, **turn Wi-Fi off** and open `http://YOUR_PUBLIC_IP:4173`. A device still on your Wi-Fi may hit a router loopback limitation. Do not use `127.0.0.1`, `0.0.0.0` or a `192.168…` address for external viewers.
10. Direct HTTP is useful for checking reachability. Add a hostname and HTTPS before sending owner passwords or enabling public Discord sign-in. Configure the final station website address in Settings after HTTPS works.

Your ISP may block inbound ports, change your public IP, or prohibit server operation on a particular plan. Router labels differ; use the manual for your exact model. [TP-Link’s forwarding guide](https://www.tp-link.com/us/support/faq/1379/) shows an example of the same required fields.

## 2B. Use a VPS

1. Create an Ubuntu VPS with a public IPv4 address and a persistent disk. Use an SSH key to access it. Allow SSH from your management address in the provider firewall before applying restrictive rules. Choose enough CPU/bandwidth for IPTV: each active relay channel encodes video and consumes the server’s outbound traffic.
2. Install Docker Engine and the Compose plugin using [Docker’s Ubuntu installation steps](https://docs.docker.com/engine/install/ubuntu/). The supplied Compose file downloads the official image, including Node, FFmpeg and provider tools.
3. Transfer the extracted starter folder to the VPS, for example with an SFTP client. Keep projects separate: use a dedicated folder such as `/srv/my-station/app`, keep its persistent data/media in its own volumes, and use a separate hostname. Open a shell in the application folder. If another project already uses port 4173, change only the host side of the mapping to an unused port, for example `127.0.0.1:4174:4173`, and point Caddy at `127.0.0.1:4174`.
4. Copy `.env.example` to `.env`. Set a unique `COMPOSE_PROJECT_NAME` for this new station before first startup, especially on a shared server. Keep that name unchanged after installation. Start it and read its first-run console key:

```sh
sudo docker compose pull
sudo docker compose up -d
sudo docker compose logs --tail=30 tellybox
```

5. The default Compose port mapping is `127.0.0.1:4173:4173`. This deliberately keeps the application behind a local reverse proxy. Install Caddy on the VPS using [Caddy’s official installation instructions](https://caddyserver.com/docs/install), then follow the hostname/HTTPS section below.
6. If you specifically need a temporary direct-IP test, change the mapping in `compose.yaml` to `4173:4173`, recreate the service with `sudo docker compose up -d`, and allow TCP 4173 in the **VPS provider firewall**. Docker-published ports may bypass ordinary UFW rules, so enforce public restrictions in the provider firewall and restore the loopback binding when using Caddy. Visit `http://YOUR_VPS_IP:4173` from another network. VPS hosting needs no home-router forwarding.
7. After HTTPS is set up, claim the station through its HTTPS address. In Settings → Station, save that exact address; then follow Discord & chat if you want comments. Never paste the console key into a public chat or issue.
8. Keep the Compose named volumes. They store your catalogue, owner settings, chat database and uploaded media. Updating the application must preserve them. `docker compose down` keeps the volumes; do not add `-v` unless deliberately destroying station data.

For a native Linux install instead of Docker: install supported Node and FFmpeg, place the starter in a folder owned by a dedicated station user, and create a systemd service with that user, the folder as `WorkingDirectory`, `ExecStart=/usr/bin/node --env-file-if-exists=.env /opt/tellybox/scripts/launch.mjs`, `Restart=on-failure` and `WantedBy=multi-user.target`. Adjust the actual Node/folder paths, then run `sudo systemctl daemon-reload` and `sudo systemctl enable --now tellybox`. Leave the default loopback binding when Caddy runs on the same host.

## IPTV addresses: localhost, home network and Internet

A `.m3u` or `.xml` link on `127.0.0.1`/`localhost` works only on the machine running the server. On a Firestick, TV or another PC, localhost means that device itself. XMLTV contains programme information; it also must be fetched from an address that the receiving device can reach.

For home-network viewing, listen on `HOST=0.0.0.0` (or the LAN interface), allow TCP 4173 and save the real LAN origin in Settings, for example `http://192.168.0.50:4173`. Use `http://192.168.0.50:4173/channels.m3u` and `http://192.168.0.50:4173/guide.xml` in the IPTV software. The .m3u must contain that reachable base too; downloading an old localhost playlist and moving the file to a TV does not fix its embedded stream addresses. Download it again after correcting Settings.

For Internet viewers, use the reachable public origin, such as `https://tv.example.co.uk`, for both links and the station website address. A `192.168…` address is only usable inside the home network; it cannot serve external viewers. Domain/IP settings alone do not configure listening, firewall rules or port forwarding. If you serve home and external viewers with one public origin, your router needs NAT loopback or your LAN DNS should resolve that hostname to the internal server. Test both paths.

## 3. Give it a DuckDNS address

DuckDNS supplies a stable hostname that follows your changing public IP. **It does not hide that IP**: DNS lookups reveal the address, and viewers connect to it. It does not open ports, bypass CGNAT or provide HTTPS by itself.

1. Open [DuckDNS](https://www.duckdns.org), sign in, choose an unused subdomain (for example `myretrotv`) and add it. Your hostname becomes `myretrotv.duckdns.org`.
2. Check that its IPv4 address is your server’s public address. Use the dashboard’s update control if necessary. The dashboard token is a secret; keep it in your updater only, never in the website catalogue or a shared screenshot.
3. On Windows, create `Update-DuckDNS.ps1` in a private folder. Insert your subdomain (without `.duckdns.org`) and dashboard token into the placeholders below. The empty `ip=` tells DuckDNS to use the updater’s public IPv4 address.

```powershell
$stationDuckName = 'YOUR_SUBDOMAIN'
$stationDuckToken = 'YOUR_PRIVATE_DUCKDNS_TOKEN'
$stationDuckUrl = 'https://www.duckdns.org/update?domains=' + $stationDuckName + '&token=' + $stationDuckToken + '&ip='
$stationDuckResult = Invoke-RestMethod -Uri $stationDuckUrl
if ($stationDuckResult.Trim() -ne 'OK') { throw 'DuckDNS update failed' }
```

4. Run that script once in PowerShell. A successful update ends without error. Check the DuckDNS dashboard and run `nslookup myretrotv.duckdns.org` in a terminal to confirm the address. Keep the script outside your served media folder and source repository.
5. In Windows Task Scheduler, create a task named DuckDNS. Add a startup trigger and a daily trigger repeating every **5 minutes**, indefinitely. Choose **Run whether user is logged on or not** if that suits your account, and select **Hidden**. Use program `powershell.exe`, arguments `-NoProfile -WindowStyle Hidden -File "C:\YOUR_PRIVATE_FOLDER\Update-DuckDNS.ps1"`. Set **Start in** to that private folder. Run the task once and check Last Run Result. If script execution is blocked, use a signed script or your administrator’s normal script policy; do not disable system security policies globally.
6. Linux users can use the Linux cron instructions on [DuckDNS’s install page](https://www.duckdns.org/install.jsp). Select your domain and platform, keep the generated token-bearing file private (`chmod 700` for its folder and script), run it once, then use the provided five-minute schedule. Check for an `OK` response. Run the updater on the network whose public IP should receive traffic; do not run it on an unrelated laptop/VPN.
7. With direct HTTP forwarding already working, `http://myretrotv.duckdns.org:4173` reaches the same server. Continue to HTTPS for normal use. For a VPS with a stable IP, automatic updates are optional; the hostname simply needs to point at the VPS.

DuckDNS’s [update API specification](https://www.duckdns.org/spec.jsp) explains its IPv4/IPv6 parameters. Do not add an AAAA record unless the server’s IPv6 path and firewall are actually working.

## 4. Use your own .co.uk, .com or other domain

1. Register the name with a domain registrar if you do not already own it. Open its DNS management area. A domain name and website hosting are separate things.
2. For a VPS/static public IPv4, add an **A record**: name `tv`, value = your public server IP. This makes `tv.example.co.uk` or `tv.example.com`. Remove an old conflicting A/AAAA/CNAME for the same name. Leave TTL at the provider’s default or automatic value.
3. For a home connection with changing IP, add a **CNAME record**: name `tv`, target = `myretrotv.duckdns.org`. Keep DuckDNS updating. Enter no `http://`, slash or `:4173` in a DNS record. DNS does not specify a web port and a CNAME does not hide your IP.
4. Use a `tv` or `www` subdomain for the CNAME route. The bare root/apex domain cannot normally be a standard CNAME; use the provider’s supported ALIAS/flattening feature or an automatically updated A record if you need the bare domain.
5. Wait for DNS propagation, then use `nslookup tv.example.co.uk` to confirm it resolves to your public address. Ensure stale AAAA records do not send some viewers to a broken IPv6 address.
6. Use the final hostname in Caddy and in Settings → Station website address. Register that exact HTTPS origin plus `/auth/discord/callback` in your Discord application.

## 5. Add HTTPS with Caddy

1. Install Caddy on the same host using its official installation page. Check that your hostname resolves correctly first.
2. On a home router, forward external TCP **80 → server port 80** and **443 → server port 443**. Allow those ports through the server firewall. On a VPS, allow TCP 80/443 in the provider firewall. These replace the public 4173 test route; keep application port 4173 private when Caddy proxies it. Do not expose admin/router management ports.
3. Keep the Node application listening at `127.0.0.1:4173`. For native home installs, change `.env` back to `HOST=127.0.0.1` and restart. Docker users restore `127.0.0.1:4173:4173` and recreate the container. Caddy in this example runs on the host, not inside the application container.
4. Create a Caddyfile (on Ubuntu package installs, normally `/etc/caddy/Caddyfile`). Replace the hostname below with your DuckDNS name or custom hostname:

```text
tv.example.co.uk {
    reverse_proxy 127.0.0.1:4173
}
```

5. On an Ubuntu package install run `sudo caddy validate --config /etc/caddy/Caddyfile`, then `sudo systemctl reload caddy`. For a manual Windows install, start `caddy run --config C:\PATH\Caddyfile` from a terminal and arrange for it to run at startup using your normal service/task setup. Keep Caddy’s certificate storage persistent.
6. Visit `https://tv.example.co.uk`. Caddy obtains/renews the certificate and redirects HTTP to HTTPS when the hostname and inbound ports are correct. [Caddy’s HTTPS quick-start](https://caddyserver.com/docs/quick-starts/https) explains these prerequisites.
7. In Settings, save `https://tv.example.co.uk` as the station website address (no trailing path). Update Discord’s callback to `https://tv.example.co.uk/auth/discord/callback`. Sign in again if changing the station address invalidated your session. Use this final address consistently.
8. Test from mobile data: live TV, guide, a Discord sign-in if configured, and the IPTV playlist. IPTV software should use `https://tv.example.co.uk/channels.m3u` and `https://tv.example.co.uk/guide.xml`. Mixed HTTP media sources may be blocked by HTTPS browsers; choose HTTPS remote video URLs.

## 6. If you want to keep your home IP private

Use a VPS: viewers see the VPS address, while your home address is not their destination. Alternatively, a properly configured reverse tunnel/proxy can keep the home origin out of public DNS and accept inbound web traffic without router forwarding. A hostname alone cannot do this.

[Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/) is one option for website traffic: add a domain you control to Cloudflare, create a tunnel in its dashboard, install its connector on the station host, and map a public hostname to `http://localhost:4173`. Keep the connector’s token private and follow the current dashboard instructions. It uses outbound connections. Do not add direct public DNS/port forwarding to the same home origin if hiding that origin is the goal.

Check the chosen service’s current streaming, bandwidth and acceptable-use terms before enabling public IPTV through it. A general website tunnel is not automatically a suitable video CDN. A VPS or a video-capable reverse proxy is the clearer route for serving live HLS at scale.

## 7. Check and maintain your network

1. Confirm the two demo programmes were replaced, your logo/name are distinct, source durations are accurate, and interval media carries only the matching channel’s brand. Complete replacement adverts must fit before the next programme; several shorter adverts can fill a longer gap. Source failures use a recovery countdown rather than a test card. Explicit offline status remains an off-air state.
2. Confirm Settings is owner-protected and Discord secrets are absent from downloaded catalogues. Do not copy `data/` into a public GitHub repository or ZIP.
3. Back up the catalogue, private data and local media. For SQLite, stop the station while taking a filesystem backup, including any journal files. Keep backup access private.
4. Restart the machine and verify that the station and reverse proxy return automatically. Keep the OS, Node, FFmpeg and proxy updated.
5. Monitor upload speed, CPU and bandwidth. Both website and IPTV traffic leave your server through the shared live relay. One encoder runs per active channel, while bandwidth grows with the number of viewers.

If local access works but public access does not, check the listener, destination LAN reservation, OS firewall, router rule, upstream/double NAT, provider firewall and ISP CGNAT in that order. If the IP works but hostname does not, check DNS/updater/AAAA. If HTTPS fails, check hostname resolution, ports 80/443 and Caddy logs. If video fails while pages load, check the direct source URL, source availability, HTTPS and FFmpeg logs.

## Before inviting viewers: step-by-step connection check

1. Choose Watch at home, Share from home or Host on a VPS using the routes above. Keep the machine running; sleep, power loss or a stopped application stops the station.
2. Open the website from a second device on the home network for a LAN station, or from mobile data for a public station. Confirm live video and the guide load, not just the front page. Public stations must have working HTTPS before owner sign-in.
3. Save the final Station website address. Reopen the station using that exact address and download a fresh playlist. Check that its stream URLs use the same reachable address, rather than an old localhost or LAN address. For a public station used at home too, test router NAT loopback or configure local DNS for the same hostname.
4. Open the Watch On IPTV instructions, select the viewer's player, and use the station's `/channels.m3u` playlist and `/guide.xml` programme guide. Verify channel changes, a programme transition, and matching footage on the website and IPTV. A small buffering delay is normal.
5. If using Discord sign-in, register the exact final origin followed by `/auth/discord/callback`, then test it. Update the website/guide URLs in any separately installed Discord updater. A LAN-only station remains private to the LAN even if a link is posted on Discord.
6. Test several channels and simultaneous viewers while monitoring CPU and outbound bandwidth. An encoder is shared by viewers of the same active channel; additional active channels need additional encoding capacity. At an illustrative 3 Mb/s per viewer, ten viewers need about 30 Mb/s of upload bandwidth plus overhead. Home upload speed, VPS traffic allowances and competing projects all matter; benchmark rather than promising a viewer count from RAM alone.
7. Restart the host and confirm the station, proxy and DuckDNS updater return automatically where applicable. Verify a backup and keep each project's settings, media and credentials separate.

Open **Settings → Hosting & help → Guided station setup** for the four-step assistant: choose hosting, save the station address, run connection checks, then configure the community invite and finish. The connection check verifies that the responding installation is yours, its catalogue loads, the IPTV playlist uses the current address, and its programme guide responds. Copy its device-check link to the second device/network and press **Check this connection** there. Confirm that second test in the wizard. The automatic checks establish access from the device running them; Internet access is not inferred from a successful home-network check. Video decoding and reboot tests remain separate checks.

Choosing a route or saving an address in Settings does not automatically configure the router, DNS, firewall or HTTPS. Change the top-menu Discord invite in the wizard's final step or Discord & chat; saving it blank hides the invite links. The self-hosted starter contains no Tip buttons.

## Optional YouTube/Dailymotion/Vimeo IPTV setup

Website and IPTV use the same temporary live feed. To resolve public watch URLs on a native installation, install Python 3.10+, create a virtual environment with `python -m venv .providers`, then use its Python to run `-m pip install "yt-dlp[default]" curl-cffi`. Set `PROVIDER_PYTHON` in `.env` to that environment’s absolute Python executable path and restart. On Windows the executable is `.providers\Scripts\python.exe`; on Linux/macOS it is `.providers/bin/python`. The Docker image includes these tools.

Add the public watch URL as the programme media URL, set its accurate duration and test real live-feed playback before scheduling it. Check each YouTube, Dailymotion or Vimeo source individually: provider restrictions and changes mean availability is not guaranteed. Private owner-supplied YouTube sessions are optional; follow the provider guide. No DRM or paywall bypass is supported. Direct media files remain the most predictable choice. See docs/PROVIDERS.md in your download for full instructions.


## Viewing controls, casting and accessibility

The TV control panel contains Guide, IPTV and available casting controls alongside channel and fullscreen buttons. On phones, open the top navigation with the `=` button. Channels lists the station's channels and estimated unique programming hours, excluding adverts and duplicate footage.

In Settings, owners can enable Google Cast, AirPlay and screen-mirroring help separately. Google Cast needs a custom receiver application registered for your station's HTTPS receiver URL and its application ID entered in Settings. The TV runs the receiver; a compatible phone or computer becomes its remote. The receiver supports channel selection, a guide and Normal/Stretched/Centred picture options for CRT adapters. Do not use another station's application ID. Follow [Cast setup](CAST.md) for registration, discovery and testing.

AirPlay uses the native picker on compatible Apple browsers/devices. Anyview/Miracast uses the phone or computer's operating-system mirroring controls; a website cannot silently initiate it. The sending device remains responsible for playback with mirroring. Support varies by device, browser and television. Automated interface checks do not establish physical-device compatibility.

Teletext includes news, sport, London weather and a daily quiz, with UK dates, coloured-key controls and fullscreen viewing. Online feeds show their source and cached/stale status. See [Teletext](TELETEXT.md) and the [feature guide](FEATURES.md).

## Viewer counts and Discord links

Website viewer counts and the Control Room's per-channel viewers count active browser sessions only. **External IPTV viewers, including Kodi and VLC users, are not counted.** A zero browser count does not mean nobody is watching IPTV.

Save the station owner's Discord invite in Settings. Both the navigation icon and community button use that invite; clearing it hides them. Optional Discord authentication and chat are configured separately. Watching TV does not require joining Discord.

## Updates, retained media and recovery

Open Settings → Updates to check the installed version and ready releases, read the changelist and install. Managed updates download and verify application code and briefly restart the station. No manual backup/export/reimport is required for that process. Existing media, channels, schedules, uploads and owner settings stay in their persistent storage. A failed candidate startup triggers application rollback. Keep independent disaster-recovery backups for disk loss or accidental deletion.

Native installations must start through `npm start` or `scripts/launch.mjs`; Docker installations need the supplied updater service. Older installations need the one-time adoption described in [Updates](UPDATES.md). Keep the same data/media paths, Compose project name and volumes. Never delete volumes as an update step. Custom deployments require their own update procedure unless they adopt the managed configuration.

## If playback stalls

Check another channel and a fresh browser window. If a fresh window works, fully reload the affected tab before changing server settings. A stuck browser session is different from a server-wide source failure. Compare the website and IPTV, check source availability and FFmpeg/provider logs, and monitor server CPU and outbound bandwidth. Do not restart every station on a shared host to troubleshoot one tab.

For Kodi, use the current station playlist and XMLTV addresses. After changing saved channel numbering or guide mappings, refresh the IPTV client's stored channel/guide data. Test programme-to-advert-to-programme transitions and audio. See [IPTV reliability](IPTV_RELIABILITY.md) for detailed checks.
