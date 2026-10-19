# YouTube and Dailymotion sources

Remote MP4/WebM and local media are read by FFmpeg. Public YouTube/Dailymotion watch URLs additionally need Python/yt-dlp. The website and IPTV now use the same per-channel HLS feed, so their programmes, adverts and fallback output match. The supplied Vintage Tv UK account now contributes 21 enabled Dailymotion recordings; two additional decoded uploads remain disabled pending series identification. See [the import report](VINTAGETVUK.md).

For the shared live feed, the server can resolve an unrestricted public video URL with yt-dlp, then feed its temporary video/audio addresses into FFmpeg. The original programme is not downloaded into a permanent library. The usual rolling HLS segments are removed when the channel becomes idle. Watch pages are excluded from the source-direct M3U because IPTV clients cannot play them as files.

YouTube resolution uses yt-dlp's default clients plus `web_safari`, preferring HLS formats up to 576 lines when available. This follows the [maintainer's guidance about intermittent Safari HLS availability](https://github.com/yt-dlp/yt-dlp/issues/17143). YouTube can omit those formats, and a direct HTTPS format can have valid metadata while its media server refuses playback with HTTP 403. Metadata is never treated as a playback pass. See also [yt-dlp's client guidance](https://github.com/yt-dlp/yt-dlp/wiki/PO-Token-Guide#current-po-token-enforcement). Dailymotion's format selection is unchanged. Cookie files remain scoped to YouTube; no YouTube cookies are blindly forwarded to the media CDN.

## Install on Windows, macOS or Linux

1. Install Python 3.10 or newer alongside Node and FFmpeg.
2. In the extracted application folder, create an environment: `python -m venv .providers` (on Linux/macOS use `python3`).
3. On Windows run `.providers\Scripts\python.exe -m pip install "yt-dlp[default]" curl-cffi`. On Linux/macOS run `.providers/bin/python -m pip install 'yt-dlp[default]' curl-cffi`.
4. In `.env`, set `PROVIDER_PYTHON` to the absolute path of that environment's Python executable, then restart the server. If omitted, the server uses `python` on Windows or `python3` elsewhere; that Python must have these packages installed.
5. Add the public watch URL as the programme's media URL in Settings. Enter the video's actual duration, original year and source credit. Save programming.
6. Test both the website player and the channel's live M3U feed. An upload may allow one method and restrict another.

The Docker image includes Python, yt-dlp and curl-cffi. Rebuild it to update those packages. With a native installation, update using the same environment's Python and `-m pip install --upgrade "yt-dlp[default]" curl-cffi`.

## Practical limits

Evening check, 17 October 2026: the supplied YouTube batch has 650 of 843 distinct videos reviewed, with 291 earlier short relay/frame-decode passes. The batch paused after a previously working control also failed. A fresh Bullseye control still resolves public video metadata with the saved, unexpired session, but media playback falls back to holding output with `source-http-403`. Do not treat the earlier passes as a current availability guarantee. Reports: `youtube-control-20261017-evening.json` and `youtube-relay-diagnosis-20261017.json`. Separately, all 23 publicly described Vintage Tv UK Dailymotion uploads passed a short shared-feed sample; 21 are enabled, two remain held for identification, and one additional account entry returns no public metadata.

These hosts can change their delivery, restrict embedding, block a server IP or remove uploads. Resolution is cached briefly, and fresh programme requests can take longer to warm up than a direct media file. This is an optional compatibility path, not a guarantee that every public upload works. Optional YouTube session authentication is described below. Private, members-only, premium, age-restricted and DRM sources remain unsupported. Use sources you are authorised to present and review each host's terms.

On 16 October 2026, all three supplied Alright on the Night YouTube uploads produced HLS programme segments that FFmpeg decoded. A Dailymotion advert compilation passed metadata discovery but failed stream resolution and reached the technical fallback; it was excluded from the curated schedule. Metadata success alone is not playback verification. Complete programmes have not been watched end-to-end during these checks.

See [yt-dlp's documentation](https://github.com/yt-dlp/yt-dlp) and [YouTube's player API](https://developers.google.com/youtube/iframe_api_reference).

## Check uploads before scheduling

In Settings → Channels & programmes, open **Test all YouTube and Dailymotion sources**. The check page also opens directly at `/provider-check.html`. It reads all distinct provider URLs, including interval clips and disabled entries. YouTube passes only after its official embedded player reports playing and its playback clock advances for several seconds. Errors 100, 101 and 150 fail; timeouts, browser/identity problems and unsupported Dailymotion iframe checks remain unverified. Loading an iframe alone never counts as a pass. The current basic Dailymotion integration cannot prove playback through its iframe; review it manually using the official player and test IPTV separately before scheduling any Dailymotion item.

Copy the JSON report for your records. For a failed programme, untick **Include in live running order** in Settings and save. This retains its title and source for replacement, but removes its slot from website playback, listings, XMLTV and IPTV. Subsequent programmes still start on the configured time grid. Interval items use the same `playbackDisabled: true` field in the advanced catalogue editor. Retest a replacement URL before enabling it. Published catalogue changes reach already-open updated website clients within a minute.

For the IPTV check, run `node scripts/audit-provider-relays.mjs` in the source project. It resolves each enabled provider source, starts a temporary HLS relay, verifies that it is programme footage rather than the technical card, and decodes a video frame. It uses the saved session in `DATA_DIR/youtube-cookies.txt` when present (default `data/`). Starts are separated by at least eight seconds, with at most two temporary decoders running, and the audit pauses after three consecutive unverified results. It does not silently disable sources or mark unchecked videos as passed. Reports contain source-page URLs, never cookies or temporary signed stream addresses. The reusable script is included in the self-hosted download. For a small sample, supply the catalogue path, report path and source limit: `node scripts/audit-provider-relays.mjs data/catalogue.json docs/provider-relay-sample.json 1`. Set `PROVIDER_AUDIT_RESUME=1` to resume the same report without repeating its completed URLs; omit it for a fresh audit. A report is complete only when its `completedAt` field is present and `remaining` is zero.

## Optional private YouTube authentication

Open **Settings → YouTube / IPTV** and unlock owner settings. The server can use a YouTube-only Netscape session export to answer sign-in challenges during IPTV resolution. It never asks for a Google password. The browser receives only the shared broadcast feed; it never receives the server's session or temporary provider addresses.

1. Prefer a separate YouTube account. Sign in yourself in a private/incognito browser window on the server computer. The [yt-dlp YouTube guidance](https://github.com/yt-dlp/yt-dlp/wiki/Extractors#exporting-youtube-cookies) warns of temporary or permanent account suspension when an account is used with automation. Authentication cannot guarantee that YouTube will accept a request from this server or remove an upload's restrictions.
2. Use a YouTube-only Netscape cookie export. The [official FAQ](https://github.com/yt-dlp/yt-dlp/wiki/FAQ#how-do-i-pass-cookies-to-yt-dlp) links compatible Chrome and Firefox exporters. If using an extension, enable it in that private window. Do not export your whole browser profile. This application rejects files containing cookies for any domain outside youtube.com and its subdomains.
3. In the same private YouTube tab, navigate to `https://www.youtube.com/robots.txt`, export there, then close the private window. This follows yt-dlp's guidance to reduce session-cookie rotation. Do not reopen that exported session in the browser.
4. On the server computer open `http://127.0.0.1:4173` (or your configured port). Unlock Settings, select **YouTube / IPTV**, choose the file and press **Save private YouTube session**. Remote owners must use their configured HTTPS origin; plain HTTP LAN uploads are rejected. The page clears its file input after upload and returns only configured/expiry status.
5. Press **Test IPTV sample** for one public video. A pass requires real HLS footage and frame decoding, not just metadata or a technical fallback card. Then run the gradual catalogue audit above. A saved session alone is not a verification pass.

Cookies are stored only in `DATA_DIR/youtube-cookies.txt`, outside the media/public directories, with restrictive file mode where supported. Keep the data folder accessible only to the service account and authorised administrators; Windows uses the folder's access permissions. The resolver reads a snapshot into memory and does not rewrite the session on exit. Cookies are offered only to YouTube resolution, not Dailymotion. Settings responses, catalogues, generated releases, normal logs and audit reports do not contain them. Source ZIPs exclude the entire data folder; do not publish a manual backup of that folder.

**Disconnect saved YouTube session** deletes the server's copy and clears future resolution caches. Already resolved streams/in-flight requests may finish; it does not sign the account out on Google or revoke other copies of its session. Delete the exported copy when no longer needed. Replace the file when it expires, and disconnect when authentication is no longer wanted. No browser profile scanning, password storage, OAuth login or automatic account creation is implemented.

These are short playback checks, not a complete viewing of every programme. Repeat them from the actual public deployment address: browser, geographic and hosting-IP restrictions can change, and successful checks today do not guarantee future availability. Checks do not silently alter the catalogue or accept anonymous viewer reports as authority to disable programming.

The official embedded-player checker remains a diagnostic tool. Its result describes embedding at the original host, not playback in the shared broadcast player. Scheduling requires an actual relay/frame-decode pass; an embed pass alone is insufficient.

## Captions

The shared browser player starts with captions/subtitles disabled. Burned-in text cannot be hidden. IPTV apps control their own subtitle preferences.
