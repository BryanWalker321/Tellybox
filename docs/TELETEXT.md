# Teletext and PagesFromCeefax

Reference: https://github.com/robsonjb1/PagesFromCeefax

Inspected the README, repository file tree, `API/Program.cs`, `API/Services/CarouselService.cs` and licence designation on 16 October 2026. The project is a tribute to in-vision Pages from Ceefax, with a .NET 8 service and browser renderer. Its README describes BBC RSS-derived cached content refreshed every twenty minutes, plus a clock-based page carousel and an OpenWeatherMap key for weather. The current source contains a `/carousel` endpoint and a page representation holding 1,000 integers (40 columns × 25 rows).

## What this pilot uses

Tellybox implements its own original DOM-based Teletext-style interface. Pages 100, 150, 601 and 602 are generated from the same station catalogue and schedule as the player. The 15-second auto carousel uses the station clock. It does not fetch news/weather or connect to the reference repository. It is not a full hardware Teletext decoder or a pixel-accurate Ceefax reconstruction.

No reference source, fonts, logos, historic BBC artwork, stock TV background or music has been bundled. The repository README distinguishes several third-party assets; a software licence alone should not be taken as permission to redistribute each asset.

## Practical integration choices

1. **Standalone companion:** deploy PagesFromCeefax separately, follow its current setup instructions, and provide a link or an explicitly configured embed. Check its embedding headers and operate only the endpoints needed. An iframe requires an explicit `frame-src` allowance in Tellybox's CSP; arbitrary third-party frames are currently blocked.
2. **Page-data adapter:** implement a renderer for the `/carousel` page matrix and a read-only integration with a configured, operator-controlled service. Confirm the live schema and cache behaviour before implementation. Design host allowlisting, timeouts, caching and fallback pages; don't create an arbitrary URL proxy. This lets the TV guide use station data while news/weather pages come from another service.
3. **Integrated fork:** intentionally choose a compatible licensing approach for combined/distributed code, preserve notices and review separate asset terms. The referenced repository is GPL-3.0. The current Tellybox implementation remains original MIT code; no GPL code has been incorporated.

The first follow-up should be a 40×25 text/mosaic renderer and explicit page-source interface. Keep it independent of the video player, so the core service still starts without weather keys or remote feeds. Authentic fonts, BBC logos, archival page dumps and interlude music each need their own provenance review. A station-owned visual identity and cleared audio are preferable for the general-purpose release.
