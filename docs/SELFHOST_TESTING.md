# Self-hosted release checks — 19 October 2026

The clean starter was extracted separately from the live UK catalogue and tested on Windows (Node 24) and the Linux VPS (Node 22, FFmpeg). Both full runs: **76 tests, 74 passed, 0 failed, 2 skipped**. The two skipped checks apply only to the separate curated UK catalogue. Catalogue validation confirms one channel and two demo programmes.

The supplied Dockerfile built successfully and ran an isolated HTTPS station on the VPS. Browser checks covered owner sign-in, folder scan and duplicate rescan, measured durations, a draft schedule preview, saving timed breaks after two programmes, live video decoding, the guided address checks, checkbox layout, and saving/showing/hiding the Discord invite. The QA wizard confirmation was exercised as a UI test; it does not certify arbitrary owners' home routers or mobile-network access.

Automated coverage includes listed/random/episodic schedules, episode order, break frequency across collection loops, clock grids, complete interval clips, maximum clip counts, countdown presentation, continuous HLS through programme/advert transitions, byte-range video, path traversal rejection, owner authentication/CSRF, settings persistence, source failure handling and private provider authentication. A timed-break test decodes a real video segment and observes advert, presentation and following programme without an HLS end marker.

Distribution checks require exactly one channel/two generated demo shows, no promotional homepage or Tip buttons, BBC Test Card F plus its separate third-party notice, and no private station data, credentials, cookies or archive programme pack. GitHub CI is configured for Node 22 and 24 with FFmpeg; its first hosted run occurs after the first push.

This is tested release-candidate evidence, not a guarantee of every device, codec, third-party provider, home router or IPTV application. Owners should follow the live-video, other-device and restart checks in the setup guide before inviting viewers.

The full-page owner control room was additionally checked on the VPS at desktop and 390px mobile widths. Verified cog navigation, return to television, session reuse, section links, programming save and browser console. Four targeted owner/HTTP/shared-player checks passed after this change.

Programme-workspace follow-up: seven targeted owner/server/scheduling checks passed. VPS browser verification used 65 test programmes to exercise search, filtered selection, 30/60/65 pagination, selected-programme preservation after save, empty-channel display, draft/discard indicators, media-folder import and duplicate rescan, and notification expiry.
