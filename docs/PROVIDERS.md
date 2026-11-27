# Dailymotion and Vimeo sources

Remote MP4/WebM and local media are read by FFmpeg. Public Dailymotion/Vimeo video-page URLs additionally need Python/yt-dlp. The website and IPTV now use the same per-channel HLS feed, so their programmes, adverts and fallback output match.

For the shared live feed, the server can resolve an unrestricted public video URL with yt-dlp, then feed its temporary video/audio addresses into FFmpeg. The original programme is not downloaded into a permanent library. The usual rolling HLS segments are removed when the channel becomes idle. Watch pages are excluded from the source-direct M3U because IPTV clients cannot play them as files.

## Install on Windows, macOS or Linux

1. Install Python 3.10 or newer alongside Node and FFmpeg.
2. In the extracted application folder, create an environment: `python -m venv .providers` (on Linux/macOS use `python3`).
3. On Windows run `.providers\Scripts\python.exe -m pip install "yt-dlp[default]" curl-cffi`. On Linux/macOS run `.providers/bin/python -m pip install 'yt-dlp[default]' curl-cffi`.
4. In `.env`, set `PROVIDER_PYTHON` to the absolute path of that environment's Python executable, then restart the server. If omitted, the server uses `python` on Windows or `python3` elsewhere; that Python must have these packages installed.
5. Add the public watch URL as the programme's media URL in Settings. Enter the video's actual duration, original year and source credit. Save programming.
6. Test both the website player and the channel's live M3U feed. An upload may allow one method and restrict another.

The Docker image includes Python, yt-dlp and curl-cffi. Rebuild it to update those packages. With a native installation, update using the same environment's Python and `-m pip install --upgrade "yt-dlp[default]" curl-cffi`.

## Practical limits

These hosts can change their delivery, restrict embedding, block a server IP or remove uploads. Resolution is cached briefly, and fresh programme requests can take longer to warm up than a direct media file. This is an optional compatibility path, not a guarantee that every public upload works. Optional YouTube session authentication is described below. Private, members-only, premium, age-restricted and DRM sources remain unsupported. Use sources you are authorised to present and review each host's terms.

See [yt-dlp's documentation](https://github.com/yt-dlp/yt-dlp).

## Check uploads before scheduling

Copy the JSON report for your records. For a failed programme, untick **Include in live running order** in Settings and save. This retains its title and source for replacement, but removes its slot from website playback, listings, XMLTV and IPTV. Subsequent programmes still start on the configured time grid. Interval items use the same `playbackDisabled: true` field in the advanced catalogue editor. Retest a replacement URL before enabling it. Published catalogue changes reach already-open updated website clients within a minute.

For the IPTV check, run `node scripts/audit-provider-relays.mjs` in the source project. It resolves each enabled provider source, starts a temporary HLS relay, verifies that it is programme footage rather than the technical card, and decodes a video frame. It uses the saved session in `DATA_DIR/youtube-cookies.txt` when present (default `data/`). Starts are separated by at least eight seconds, with at most two temporary decoders running, and the audit pauses after three consecutive unverified results. It does not silently disable sources or mark unchecked videos as passed. Reports contain source-page URLs, never cookies or temporary signed stream addresses. The reusable script is included in the self-hosted download. For a small sample, supply the catalogue path, report path and source limit: `node scripts/audit-provider-relays.mjs data/catalogue.json docs/provider-relay-sample.json 1`. Set `PROVIDER_AUDIT_RESUME=1` to resume the same report without repeating its completed URLs; omit it for a fresh audit. A report is complete only when its `completedAt` field is present and `remaining` is zero.

## Captions

The shared browser player starts with captions/subtitles disabled. Burned-in text cannot be hidden. IPTV apps control their own subtitle preferences.


## Vimeo

Public Vimeo video pages (`https://vimeo.com/123456789`), player URLs (`https://player.vimeo.com/video/123456789`) and owner-supplied unlisted links with their privacy hash can be used as programme URLs. Keep an unlisted hash intact. Profile, showcase, review and On Demand pages are not supported programme URLs. The resolver accepts HTTPS Vimeo hosts only and rejects credentials embedded in URLs.

Vimeo follows the same server-side FFmpeg/shared HLS route as Dailymotion, including website, IPTV and Cast output. Native installations need the documented Python/yt-dlp tools; Docker includes them. No Vimeo browser SDK, account token or separate player is required. The YouTube cookie file is never supplied to Vimeo. Password-protected, paid, private, live and DRM sources are outside this public-source integration.

Store the original video page in the catalogue, not a temporary CDN URL. Stream resolution is cached briefly and refreshed after expiry/failure. Test duration, audio, video, seeking and programme transitions from the actual server before scheduling; metadata alone is not proof of playback. Remote owners can remove or restrict their videos. An accessible upload does not establish permission to rebroadcast it.

Existing catalogues may retain old YouTube URLs on disk for rollback. Those sources are excluded from playout, and new YouTube media URLs are rejected when saving programming.
