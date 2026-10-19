# Set up your station from Settings

Start the server and open the station in your browser. Open **Settings** (the cog) to enter the dedicated station control room at `/admin.html`. Sections appear in the sidebar on desktop and as a compact navigation grid on mobile; each section can be bookmarked. Use **Back to television** to return to viewing. Opening the control room leaves the player page, so television playback stops. A new server prints a **first-run owner setup key** in its console. Paste that key and choose a password of at least 12 characters to claim the station. The key is never exposed through the website and stops working once claimed. If an unclaimed server restarts, use its newly printed key.

Owner access is separate from viewer Discord accounts. Viewers can watch without signing in. Only an authenticated owner can change the installation, upload files or connect Discord.

## Station

For first-time hosting, open **Hosting & help → Guided station setup**. Choose Watch at home, Share from home or Host on a VPS; follow the route instructions; save the final station address; then run the connection checks. The check verifies this installation, its catalogue, playlist addresses and guide from the device running it. Copy the device-check link to another LAN device, or to a phone on mobile data for public hosting, and run it there too. Confirm that second test in the wizard. A check from inside your home alone does not prove Internet reachability. DNS, router forwarding, firewall rules and HTTPS must still be configured at the host/router as explained in [the hosting guide](HOSTING.md).

The wizard's final step also lets you save your own Discord invite. You can change it later in Discord & chat. The top-menu Discord icon and community links follow that setting; saving an empty invite hides them. Invite links do not require a bot, OAuth application or webhook. Tip buttons and our promotional homepage are excluded from the self-hosted starter.

Save your network name, tagline, logo and accent colour. Upload your own logo and replace the example Tellybox identity before going public. Design & wording provides the wider colour palette, cabinet finish, interface font, introduction/About/footer copy, CRT default and custom holding image; see CUSTOMISING.md. Set the exact address viewers use, including the port on localhost. This address controls Discord callbacks and IPTV links; configure public HTTPS at your hosting provider or reverse proxy. The shared website/IPTV live feed can be enabled or disabled here. FFmpeg must be installed on the host (included in the supplied Docker image).

## Channels, programming and media

Open Channels to see the station table and its Actions menus. Choose a channel, then use **Channel details**, **Programming**, **Schedule & repeat**, **fillers**, **Media library** or **Advanced**. Search programme titles/series and select a result to edit it; longer lists load 30 at a time. The save bar stays within reach and shows unsaved changes. Saving keeps your selected programme. Folder imports are under Media library. Unsaved catalogue edits trigger a warning when leaving the page; use Save or Discard before leaving. Control-room notifications fade after ten seconds.

Select or add channels, edit their names, numbers, descriptions and status, and choose back-to-back playback, clock-aligned starts or timed breaks. Add programmes with a title, original year, duration in seconds, direct media URL and optional source-credit URL. You can select an initial source offset for a reviewed file segment. Empty/offline channels show Test Card F.

Choose the UK pre-2000 policy for the archive edition, or Custom station for media from any year. New channels inherit the station’s interval filler. Embedded adverts inside a programme remain untouched. The Interval station brand matches branded idents to their service. The visual editor supports listed order, random order, or mixed series with episode order preserved; advert frequency, break length, maximum clips and interval ordering; recursive media-folder imports with measured durations; programme reordering; and a preview of the next 12 slots. See [Scheduling and intervals](SCHEDULING.md) for step-by-step instructions. The advanced editor exposes the complete JSON catalogue and shared schedule epoch. Import loads a draft; **Save programming to server** validates and applies it. **Discard unsaved edits** restores the last saved catalogue. Existing viewers reload to receive programming changes.

Upload local media here, then copy its `/media/…` URL into a programme. Uploads are limited to 4 GB per file and cannot overwrite an existing filename. Host/proxy limits may be lower; for very large libraries you can put files directly in the configured media directory. No source videos from the UK archive edition are uploaded or bundled.

## Discord & chat

Follow the steps and links in this section to create your Discord application and logging webhook. Copy the displayed callback into Discord, then save the application ID and secret. Paste a webhook for your own Discord server’s logging channel, set moderators and comment limits, and save. **Check saved webhook** reads connection details without sending a message. Use the main Sign in button to verify OAuth with your account. See [Discord details](DISCORD.md).

Saved secrets are never returned to the browser. Leaving a secret blank preserves it; explicit removal checkboxes disconnect it. Changes take effect without restarting. Creating the application/webhook itself requires the owner’s Discord account on Discord’s website.

## Owner access and storage

**YouTube / IPTV** offers optional private session upload, disconnect and a real HLS playback sample check. Follow its on-screen export steps or [provider authentication instructions](PROVIDERS.md#optional-private-youtube-authentication). Upload only from localhost or your HTTPS station address. The server never asks for your Google password; the private session file is stored separately in `data/youtube-cookies.txt`, never in the catalogue or release downloads.

Under **Owner access**, change your password using the current one. Other owner sessions are revoked. Owner sessions expire after eight hours and on server restart; **Lock owner settings** signs out the current session. Passwords are stored as salted scrypt hashes. Owner endpoints require authentication and same-origin/CSRF checks for writes.

Private settings (including Discord secrets) are in `data/owner.json`; comments are in `data/community.sqlite`. The initial bundled catalogue seeds `data/catalogue.json` on first run. Keep the data directory and uploaded media persistent and private. Owner-saved settings override environment defaults. `DATA_DIR`, `MEDIA_DIR` and `CATALOGUE_PATH` can relocate storage. The supplied Compose file uses persistent named volumes. Never share your data directory in a source release.

If the owner password is lost, stop the server and back up `owner.json`. Remove only its `password` property locally, preserving `settings`, then restart and use the newly printed first-run key. This recovery requires filesystem access to the host.

Host binding/port, HTTPS certificates and installation of Node/FFmpeg remain host-level tasks. All station configuration after the service is running is available in Settings. Television appearance is always Colour Service; the CRT filter and guide layout are viewer controls on the TV.
