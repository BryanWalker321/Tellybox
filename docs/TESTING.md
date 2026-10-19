# Testing Tellybox

Use Node.js 22.13+ and install FFmpeg/ffprobe on PATH.

```sh
npm test
npm run validate
```

The suite covers owner authentication/settings, media-folder confinement, scheduling and repeats, adverts/fillers, continuous HLS playback and transitions, source-failure recovery, guides and private provider-session handling. Playback checks use the bundled demos. Two curated-station checks are skipped in the generic edition.

## Release checks — 19 October 2026

Windows: 81 tests, 79 passed, zero failed, two curated-edition skips. Linux, Docker and browser results are recorded in the release notes after verification.

These checks do not guarantee every codec, player, router or remote provider. Before inviting viewers, use Guided station setup, verify playback and transitions in the browser/IPTV player, test another device/network and check startup after reboot. Check online sources from the actual server.

For interface changes, check desktop/mobile layouts, owner login/logout, save/discard behaviour, folder browsing and keyboard menu dismissal. Keep live station data out of fixtures.
