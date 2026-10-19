# IPTV and shared playback

Website and IPTV viewers receive the same per-channel live HLS feed. Buffering delays vary between players. Each channel follows the server's running order; a viewer error does not choose a different programme for everyone else.

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
- **Temporary holding screen:** source retries preserve the scheduled slot. Check the original source, its availability and provider configuration.
- **Different timing between screens:** allow for normal player buffering; the server schedule remains shared.

The server produces temporary rolling HLS segments instead of retaining whole remote recordings. Live playlists continue across programme and advert boundaries. Complete interval clips finish before presentation fills the remaining gap. The shared technical/off-air screen is used when a source or channel cannot play.

Automated FFmpeg checks cover multiple programme/advert transitions, consecutive segment numbering, late joins and temporary failure recovery. They are short samples rather than a complete viewing of every programme. See [Testing](TESTING.md).
