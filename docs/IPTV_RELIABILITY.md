# IPTV and shared playback

Website and IPTV viewers receive the same per-channel live HLS feed. Buffering delays vary between players. Each channel follows the server's running order; a viewer error does not choose a different programme for everyone else.

## Viewer counts

The website and Station Control Room count active website/browser sessions only. **External IPTV viewers are not counted**, including viewers using Kodi, VLC or another IPTV app. A channel can therefore have IPTV viewers while the website shows zero watching. The displayed count is not the total audience across all devices.

## Connect a player

1. Complete Guided station setup and use the exact address reachable by the player.
2. Set the remote M3U playlist to `YOUR_STATION/channels.m3u`.
3. Set XMLTV to `YOUR_STATION/guide.xml`.
4. Reload the player and tune into a channel. Test a programme transition as well as initial playback.

For a local server, replace YOUR_STATION with its LAN origin, for example `http://192.168.1.50:4173`. For a public server, use its HTTPS origin. Localhost works only on the server computer. See [Hosting](HOSTING.md) for listening addresses, Docker port mappings, DNS and firewalls.

## Playback troubleshooting

- **No picture:** check that FFmpeg and ffprobe are installed, and try the bundled demo before adding remote providers. The Docker image supplies them.
- **Another device cannot connect:** check the server's listening interface and firewall; use a LAN/public address rather than localhost.
- **Guide loads but streams fail:** verify the station website address and that stream URLs inside the playlist are reachable from that device.
- **Remote source fails:** follow [Providers](PROVIDERS.md). Metadata or a working original-host embed does not prove VPS relay playback.
- **Temporary recovery countdown:** the server searches for a playable replacement advert or retries the programme source. Check the original source, its availability and provider configuration. Source failures use the countdown rather than the test card.
- **Different timing between screens:** allow for normal player buffering; the server schedule remains shared.

The server produces temporary rolling HLS segments instead of retaining whole remote recordings. One continuous encoder keeps the IPTV timeline intact across programme and advert boundaries. Complete replacement adverts must fit before the next programme; several shorter adverts can fill a failed slot. Source recovery uses a countdown. The off-air screen is reserved for channels explicitly marked offline or technical.

Source preparation starts up to two minutes ahead. Slow provider lookups are allowed up to 90 seconds; a new decoder gets a longer start-up allowance than a decoder that has already been playing. Stalled source decoders can recover without restarting the channel encoder. Programme/catalogue changes refresh the affected channel's running order, while design and wording changes leave programming alone.

Automated FFmpeg checks cover multiple programme/advert transitions, consecutive segment numbering, late joins and temporary failure recovery. They are short samples rather than a complete viewing of every programme. See [Testing](TESTING.md).
