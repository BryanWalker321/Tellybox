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
