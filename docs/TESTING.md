# Testing Tellybox

Use Node.js 22.13+ and install FFmpeg/ffprobe on PATH.

```sh
npm test
npm run validate
```

The suite covers owner authentication/settings, media-folder confinement, scheduling and repeats, adverts/fillers, continuous HLS playback and transitions, source-failure recovery, guides and private provider-session handling. Playback checks use the bundled demos. Two curated-station checks are skipped in the generic edition.

## Release checks — 19 October 2026

Windows (Node 24) and Linux Docker (Node 22): 81 tests each, 79 passed, zero failed and two curated-edition skips. Catalogue validation confirms one channel and two demos.

A fresh Docker installation was checked for owner protection/setup, live HLS decoding, settings/media persistence after restart and the bundled Test Card F. Desktop screenshots use a 1920-pixel-wide browser. Owner sign-in and programme navigation also passed browser checks with no page errors; a 390-pixel mobile layout was inspected. GitHub CI checks Node 22 and 24.

These checks do not guarantee every codec, player, router or remote provider. Before inviting viewers, use Guided station setup, verify playback and transitions in the browser/IPTV player, test another device/network and check startup after reboot. Check online sources from the actual server.

For interface changes, check desktop/mobile layouts, owner login/logout, save/discard behaviour, folder browsing and keyboard menu dismissal. Keep live station data out of fixtures.


## Release checks — 23 October 2026 (v0.1.9)

Local Windows / Node 24: 134 tests, 132 passed, zero failed and two curated-edition skips. Catalogue validation confirms one channel and two demos. The native managed-update test installs a candidate, restarts the launcher and deliberately rejects the next candidate, verifying rollback to the last working release and unchanged owner media and station data.

Continuous IPTV tests decode video and audio across mixed-frame-rate adverts, countdowns and programme boundaries. Additional coverage checks decoder recovery, later replacement advert candidates, stale schedule invalidation without encoder restart, HLS retention, source crop geometry and catalogue caching.

Browser checks cover owner-configured Discord invites (including clearing them), channel/hour totals, a station-neutral countdown, Cast sender/receiver controls with simulated device APIs, owner viewing switches and mobile menu dismissal/focus. The expanded in-site hosting guide was checked at 1440, 390 and 320 pixels without horizontal overflow. Physical Google Cast, AirPlay and Anyview/Miracast devices remain unverified. Cross-platform CI results are recorded against the release commit in GitHub Actions.


## Vimeo verification — 25 October 2026

Local self-hosted suite: 138 tests, 136 passed, zero failed, two expected curated-edition skips. Tests cover Vimeo URL/host validation, unlisted privacy hashes, YouTube cookie isolation, private/live/DRM rejection, header filtering, cache invalidation, duplicate footage identities and omission of Vimeo watch pages from direct-file playlists.

On the hosted Linux VPS, City Bound and Morning Paper resolved and produced HLS with decodable H.264 video and AAC audio. A continuous 38-second IPTV client sample crossed Vimeo programme, advert and countdown boundaries with one encoder timeline and no decoder/timestamp errors. A separate sample through the running station's activated Vimeo path passed video/audio decoding while the existing 11 channel encoder identities stayed unchanged. These are short samples, not a complete viewing of every film or a physical Kodi/Cast hardware test.


## Release checks — 25 October 2026 (v0.1.10)

Local Windows / Node 24: 141 tests, 139 passed, zero failed and two expected curated-edition skips. The full suite includes native update/rollback and station-data preservation checks. Catalogue validation confirms one demo channel and two demo programmes. Public-release scope and documentation-link audits passed.

New magazine-guide checks cover compact am/pm times, programme synopsis cleanup, HTML escaping and unchanged shared-schedule rendering without images. The guide was inspected at desktop, tablet and 390/320-pixel mobile sizes without horizontal overflow. Vimeo coverage and the limits of the live source samples are recorded above. Cross-platform and container results are available in GitHub Actions for the release commit.
