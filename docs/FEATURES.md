# Feature and viewing guide

This guide describes the self-hosted application. Telly-box.uk's selected programmes, channel names and promotional pages belong to that separate hosted service.

## Shared live television

Website and external IPTV players use the same continuous per-channel HLS feed. The server follows the shared schedule rather than starting a private episode for each viewer. Small differences between screens are normal player buffering. FFmpeg runs on the server for browser viewing too.

The TV panel includes channel down/up, Back to live, Guide, CRT on/off, picture/guide controls, IPTV help, supported casting controls and fullscreen. The Guide button matches the other panel buttons. Main navigation uses an `=` popup on phones, with selection, outside-click and Escape dismissal.

## Channels and programming totals

Channels replaces the former Directory label and lists channels in number order. Open a channel for its collection or tune straight into its broadcast. The page shows the channel total and estimated unique programming hours. Hours exclude adverts/filler, disabled footage and overlapping duplicates; this is a library estimate, not the total duration of a repeating schedule.

The Control Room Channels table includes browser viewer counts. **Neither that table nor the website counts external IPTV viewers.** Kodi, VLC and other IPTV apps can be watching while the displayed browser count is zero.

## Programming and appearance are separate

Owners can add or remove programmes, change their order, import local folders, configure repeat/shuffle behaviour and select intervals. Saved programming changes refresh the affected channel's running order so the broadcast and guide use the same catalogue. Existing players can have a short buffer of earlier footage.

Saving station colours, logos, wording, cabinet finish or fonts does not change programming. See [Customising](CUSTOMISING.md) and [Owner setup](OWNER_SETUP.md).

## Adverts, countdowns and recovery

Programme/ad/countdown changes keep the same H.264/AAC encoder and HLS timeline. Replacement adverts must be enabled and fit in full before the next programme. Several shorter adverts may cover a failed longer slot. The server searches beyond the first three candidates rather than giving up after a single batch.

The countdown says **PROGRAMMING IS COMING UP!** above the clock. Self-hosted installs do not include Telly-box.uk's web address. Source failures use recovery countdown presentation, not a test card. Explicit offline/technical channel status remains an off-air state.

Source preparation starts ahead of scheduled boundaries. Running decoders have stall detection; newly starting decoders get extra loading time. Source recovery keeps the channel encoder running. Remote-host availability, router conditions and server capacity can still affect playback; see [IPTV troubleshooting](IPTV_RELIABILITY.md).

## Chromecast, Google TV, AirPlay and mirroring

Google Cast is an optional custom receiver with channel controls, a guide, phone/computer remote and Normal/Stretched/Centred CRT output. The owner registers a receiver for their own station and enables it in Settings. Compatible-device discovery controls whether Cast appears.

AirPlay controls and screen-mirroring guidance are separate owner switches. Supported Safari devices use native AirPlay; Anyview/Miracast connections start through operating-system controls. Mirroring keeps the source device responsible for playback. These methods do not promise the same controls or compatibility. Automated sender/receiver tests pass; physical-device compatibility still requires testing. See [Cast setup and supported behaviour](CAST.md).

## Teletext and daily quiz

Teletext uses the owner's station name, coloured keys, page/subpage navigation and a fullscreen view that fits the available screen. The daily twelve-question Box Baffler! quiz starts at page 400, draws from a 144-question bank, resets after a wrong answer and changes at midnight UK time. Dates use UK formatting.

BBC News, BBC Sport and London weather have dedicated pages with attribution, source links, pagination and cached/stale labels. See [Teletext pages and controls](TELETEXT.md).

## Community and managed updates

The owner-configured Discord invite is used by the top-menu icon and community button. Clearing it hides those links. Watching and IPTV do not require Discord membership or sign-in. Optional OAuth, chat, logging and server joining have their own configuration and consent; see [Discord](DISCORD.md).

Managed updates are installed from the Updates tab after the installation has adopted the managed Node launcher or Docker updater. Media and station data remain in their persistent locations; application startup failure has a rollback path. A release is offered for installation after its verified image and update manifest are ready. See [Updates and data retention](UPDATES.md).
