# Programme search

Viewers can open `/search.html`, or use the search card below the channel list to open a popup. Search matches programme and episode titles across active library recordings and shows the channel and next scheduled showing, including matches beyond the visible guide window. Times use the viewer's local timezone.

Results follow the current catalogue and schedule. Off-air channels show that no showing is scheduled. Unmatched searches offer a Discord suggestion link when the station owner has configured `DISCORD_INVITE_URL`; no Tellybox community invite is hardcoded.

The read-only GET endpoint is `/api/programme-search?q=programme&offset=0`. It groups recordings by series and channel, supports pagination, and does not change schedules or playback. The public assets and server modules are included in the existing Docker distribution.
