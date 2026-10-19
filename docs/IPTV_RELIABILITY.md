# IPTV playback fixes — 17 October 2026

Website and IPTV now consume the identical per-channel live HLS feed. The website no longer plays a separate original-host stream. It resolves remote sources and produces temporary HLS segments; it does not keep programme recordings.

## Faults reproduced and corrected

- Starting a new FFmpeg process for each scheduled item previously reset the HLS start number from the current clock. Existing segments remained in the playlist, so programme changes produced jumps in segment numbering. The relay now chooses the initial number once per channel session and continues consecutive numbering across programme and advert changes.
- Successful source EOF could arrive slightly before the declared slot ended. Selecting the schedule again immediately could restart the same advert. Successful playback now waits for the boundary, using station presentation if a substantial remainder needs filling. Started adverts still play through EOF.
- Upcoming provider streams and interval durations are prepared ahead of the next boundary. HTTP inputs retry temporary connection failures and HTTP 429/5xx responses. Failed provider resolutions are invalidated.
- A failed programme now has two additional source attempts, with approximately fifteen seconds of live holding output between attempts when enough time remains. Recovery rejoins that programme at the shared station position. Persistent failures retain technical holding output for the rest of the slot. Failed adverts use interval presentation and do not restart midway through an advert or alter the shared running order.
- Diagnostic state retains the item title and a classified failure reason. Raw FFmpeg diagnostics and temporary signed source addresses are not copied into persistent error logs.

## Evidence and limits

Real FFmpeg tests consume the live HTTP HLS playlist across several programme handoffs, check consecutive segment numbers and the absence of an end marker, and decode at least sixteen seconds of footage. Additional tests cover several advert handoffs without repeated slots, complete late-join adverts, and recovery from a temporary provider failure within the same programme.

The source checks in `current-iptv-audit.json` decoded channel 12 and channel 14 at their actual on-air positions. Six additional interval sources from those channels passed short HLS/frame-decode samples; results are in `interval-iptv-audit.json`. These are short samples, not complete programme/clip viewing. Bulk provider results are recorded separately in the supplied-playlist reports. A successful browser embed does not establish that the source can be relayed to IPTV.

Website and IPTV clients buffer the same HLS segments. A small timing difference is expected, but a late join no longer makes a separate advert choice in the browser. Source failures and fallback output are shared. Exact frame synchronisation across different clients is not guaranteed.

After a server restart, stop the old Kodi stream and tune to the channel again. The playlist and XMLTV addresses have not changed. Actual Kodi/device playback remains the final compatibility check; the automated client is FFmpeg, not Kodi.
