# Make the starter your own network

The self-hosted distribution is deliberately separate from the Tellybox UK station. It starts with one demo channel and two generated twenty-second test transmissions. Tellybox name/logo are examples, not a recommended identity for somebody else’s network. Change both before publishing so viewers do not mistake your installation for the Tellybox service.

In **Settings → Station**, change the network name, logo, tagline and accent. Upload a PNG/JPEG/WebP logo (maximum 2 MB), or supply a hosted image URL. Uploading adds the asset to a draft; save station identity to publish it. Your configured name appears in the masthead, cabinet, footer, station bug, Teletext heading, guide, page metadata, popup title strips and XMLTV generator label. Internal code/module names and Tellybox software documentation remain attribution to the engine, rather than the name of your broadcast network.

In **Design & wording**, edit the background/panel/text/highlight/link palette, wood/charcoal/ivory cabinet finish, typeface, new-viewer CRT default, introduction, About text, service bar, footer, newspaper title, guide note and off-air message. Upload your own holding image and save it; the website and IPTV relay both use it. Existing viewers retain their own CRT preference. The newspaper keeps its deliberately legible paper layout. There is one Colour Service interface; viewer controls are on the TV rather than in owner setup.

In **Programmes & media**, build your channels and running orders, categories, descriptions, source URLs, credits, years, durations and file offsets. Custom station policy accepts any year; UK archive policy requires original years before 2000. Use uploaded local videos or suitable direct remote files. The full JSON editor exposes schedules, epoch, break pools and detailed credits. A source website’s watch-page URL is not automatically a playable media-file URL.

Set the channel’s **Interval station brand** to match a branded clip’s `stationBrand`. Example: channel `stationBrand: "Bravo"`, interval `stationBrand: "Bravo"`. Unbranded clips can appear anywhere. A station-branded ident/continuity clip is valid only on a matching channel. All media clips play whole; an unfilled remainder uses station presentation. Existing original ad breaks in programmes remain untouched. New generic channels inherit only unbranded fillers.

In **Discord & chat**, use your own application, server logging webhook, moderator IDs and daily allowance. These credentials remain private to your installation. In **Station / Hosting & help**, configure the reachable website origin and IPTV, and follow the home/VPS/DNS/HTTPS instructions. Localhost is only reachable on the machine itself.

For changes beyond the provided forms, the application code is MIT licensed: edit the HTML/CSS/modules in your copy. This includes adding languages, layouts, additional source adapters or different community features. Preserve the software license and third-party asset notices. Customisation does not grant rights to somebody else’s videos or broadcaster logos.

## Mix series while keeping episodes in order

In the full catalogue editor, a channel can opt into `"playout": {"shuffleSeries": true, "seed": "my-network"}`. Give each programme a `"series"` name and numeric `"episodeOrder"`. Different series are shuffled each complete cycle while their episodes stay in numeric order. Items without a series act as standalone recordings. Disabled items stay out of the schedule. The seed makes the order identical for all viewers and the guide. Without this option, the channel keeps its catalogue order. Programme mixing works with aligned schedules and with back-to-back channels. The curated edition includes a worked example in its channel documentation.

## Programme descriptions

A programme may have a plain-text `description` in the catalogue. Otherwise the viewer requests available source text from Internet Archive, YouTube or Dailymotion. The server uses cached public metadata first, then a bounded source lookup. It returns only description text, never private sessions or temporary media addresses. Long descriptions have a Read more control on the channel page; missing or title-only descriptions are hidden. The original source link remains available. Rights metadata remains in the owner catalogue. A curated description cache is separate from the catalogue so descriptions do not inflate the settings editor.


## Main programmes and short clips

This curated network sets `editorial.minimumProgrammeSeconds` to `300`. Every catalogue load and owner save classifies shorter records as interval content. Exactly five minutes remains eligible as a main programme. Short records retain their source credits, playback status and origin channel in `intervalLibrary`; suitable adult-channel clips also enter that channel’s break pool. No Test Card F footage is inserted as ordinary filler. The Little Box has no breaks or clock alignment, so its shorter clips remain in the library outside its running order. Failed/unchecked clips remain disabled. Imports save the normalised catalogue so reviewed short clips cannot reappear in main guides.
