# Changelog

## Unreleased

- Add a native VBIT live date/time header using the receiver server clock and timezone. The updated receiver updater installs the service header configuration while preserving other settings.
- Match the native page frame to the website with a three-row masthead, strapline, section/page counter and slogan. Add a two-column main index and native TV/quiz-host mosaics; retain fixed column spacing.
- Rebuild native artwork from the original host asset, retain multi-colour details, and centre the owner-approved shorter native slogan.
- Document the one-time updater refresh and VBIT restart needed by existing installations to enable the new live header.

## 0.1.16 - 7 November 2026

- Add Tonight on Tellybox, daily Channel Spotlight, yesterday's quiz answers and a page-linked Daily Word Challenge.
- Add BBC finance and entertainment summaries, UK regional weather with native Teletext mosaic map, and real Hays Travel holiday offers with a mosaic beach cover.
- Refresh the GitHub television-guide screenshot from the current live design.
- Hold stock/index prices pending a suitable source, as requested.
- Rename the public guide to Tellytext and update its page map, colour navigation, index rotation, quiz, BBC summaries and receiver update instructions.
- Remove research notes from the receiver setup guide and update documentation/website help links.

## 0.1.15 - 7 November 2026

- Restore the visible page-number input on the main website alongside colour-key navigation. Keep the standalone receiver view controlled by number/colour keys without the extra input box.

## 0.1.14 - 7 November 2026

- Use green/yellow for previous/next screens throughout Teletext, including real Fastext continuation addresses for ordinary receivers.
- Rotate multi-screen news, sport, channel and listing indices every ten seconds, resetting the timer after a manual turn.
- Remove separate arrow and page-number controls while retaining three-digit remote/keyboard entry.
- Keep receiver views free of outbound clickable links; retain website source links.
- Add optional free Global Voices full-text news with author/source/licence attribution and text-only formatting.
- Align the yellow masthead and slogan text vertically in their blue banners.
- Use the same validated catalogue and source-health holds for companion listings as the station player.

## 0.1.13 - 7 November 2026

- Expand Box Baffler to 1,200 questions and use the same colour-linked question, success and wrong-answer pages on web and receivers.
- Add numbered news, football and other-sport stories with readable text, indices, subpages, source attribution and stable story slots. Move weather to page 145.
- Add a fitted standalone Teletext view, configurable keyboard colour keys and focused-button page-number entry.
- Export traditional TTI/Fastext pages, a verified service archive, a receiver updater and a public JSON page API.
- Support attributed operator-supplied licensed full-text story packs; default BBC feeds remain explicitly labelled RSS summaries.
- Add an optional hosted companion service so feed endpoints can be deployed independently of broadcast playback.

## 0.1.12 - 4 November 2026

- Refill source buffers before either picture or sound runs dry.
- Reuse bounded video frame buffers without overwriting frames still being encoded.
- Cache catalogue responses and use conditional browser refreshes to avoid repeatedly transferring and parsing unchanged large libraries.
- Preserve the shared source timeline so audio/video track offsets survive decoding and seeking.
- Keep a bounded four-second source reserve and prewarm two upcoming clips to absorb delivery jitter.
- Resume stalled programmes from the footage actually consumed and finish partial final audio blocks without freezing the last picture.
- Reconnect interrupted provider connections rather than silently padding the rest of an advert after audio truncation.
- Replace an advert promptly when it has not loaded by its scheduled playback time.
- Preserve the active programme during advert-pool edits and support a channel schedule anchor for library maintenance.
- Add regression checks for buffer starvation, frame ownership, catalogue caching, track timing, truncated audio requests and schedule-preserving removals.

## 0.1.11 - 3 November 2026

- Add programme search with a dedicated page, Watch sidebar popup, channel details and next-showing times across the complete active library.
- Offer a programme suggestion link using the station owner's Discord settings when search finds no matches.
- Add a yellow search icon beside Settings and align navigation button backgrounds and heights.
- Preserve playback clock debt after brief delays so channels catch up instead of permanently falling behind.
- Let delayed programme closing footage finish within the existing advert gap, without moving the next programme's scheduled start.
- Pin full Linux release checks to Ubuntu 24.04 LTS and separately check the current broadcast engine on Ubuntu 26.04.
- Avoid an encoder startup deadlock on FFmpeg 8 by allowing bounded paired input buffering.
- Add regression checks for programme tails, clock catch-up, schedule parity and search HTTP integration.

## 0.1.10 — 25 October 2026

- Redesign newspaper listings as a text-only 1990s British TV magazine, with responsive columns and compact am/pm times, channel accents, on-air labels and cleaned programme synopses.
- Add Vimeo video-page and player URL support to the shared website/IPTV broadcast, preserving unlisted privacy hashes and isolating YouTube credentials.
- Resolve Vimeo through its public embedded player without requiring a viewer account or browser SDK.
- Exclude Vimeo watch pages from direct-file playlists and count alternate Vimeo URL forms as the same footage.
- Document Vimeo setup and limitations, with provider validation and regression coverage.

## 0.1.9

- Expand installation, hosting, owner setup and in-site help for current features and managed updates.
- Allow native shutdown handles to finish closing so a failed candidate restores the last working release on Windows.

- Keep one continuous HLS encoder timeline across programmes, adverts and countdowns, with automatic source-decoder recovery.
- Search further through available replacement adverts, allow multiple shorter clips and show a recovery countdown instead of a test card on source failure.
- Prepare sources earlier and accommodate slower provider lookups; cache catalogue validation to keep HLS requests responsive.
- Refresh affected channel playback when programming changes, without changing programming for design/wording edits.
- Add optional Chromecast/Google TV receiver and remote controls, AirPlay controls and Anyview/Miracast guidance. Real-device compatibility remains subject to testing.
- Move Cast and IPTV controls into the TV panel, style the Guide button consistently, add mobile popup navigation and rename Directory to Channels.
- Show total channels and estimated unique programming hours on Channels; update the countdown heading with station-neutral wording.
- Clarify that website and Control Room viewer counts exclude external IPTV viewers, including Kodi users.
- Add regression coverage for continuous IPTV playback, source failures, schedule changes, presentation and cast configuration.

## 0.1.5

- Add BBC News (101), BBC Sport (110) and London weather (120) to Teletext.
- Include BBC attribution, source links, UK update times and paginated headlines/forecasts.
- Cache feeds server-side, share concurrent requests and label stale/unavailable data.

## 0.1.4

- Add Box Baffler!, an original daily twelve-question Teletext quiz starting on page 400.
- Include 144 questions across 12 subjects, rotated at midnight UK time with shuffled answer positions.
- Support coloured keys, tappable answers, wrong-answer resets, same-day saved progress and fullscreen.
- Use the supplied Bamber host artwork, show dates in UK format, and add quiz screenshots and documentation.

## 0.1.3

- Add Teletext fullscreen with automatic fit, resize handling and an exit button.
- Keep all Teletext controls available in fullscreen; support an expanded view when browser fullscreen is unavailable.
- Add full-size screenshots of the hosted station and update the project About text.

## 0.1.2

- Rebuild Teletext with period colours, pixel typography, station branding and channel listings.
- Enlarge the desktop screen and keep mobile layouts responsive.
- Retain coloured keys and page number entry; add subpage navigation.
- Use the owner-configured station name in the Teletext masthead.
- Publish updates through GitHub Releases, incrementing the patch version for every release.

## 0.1.1

- Add station-wide advert/filler selection and an adjustable repeat cooldown, defaulting to two minutes in the scheduling editor.
- Keep channel-owned pools separate when toggling station-wide selection; exclude disabled clips and deduplicate media references.
- Normalise live audio and keep timestamps advancing through programme/advert handoffs, including silent sources.
- Preserve active HLS sessions when catalogue changes are saved.
- Limit programme descriptions to four visible lines, ending at a complete word with an ellipsis; remove expansion.
- Document Windows, Linux and Raspberry Pi ARM64 installation and add ARM64 container checks. Physical Pi performance and Mac testing remain follow-ups.

## 0.1.0

Initial self-hosted release with one demo channel, two demo programmes, the control room and setup guides.
