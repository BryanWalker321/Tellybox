# Programme order and interval media

Open Settings → Programmes & media and select a channel. All changes remain a draft until **Save programming to server**. Download the catalogue before large changes; **Discard unsaved edits** restores the last saved catalogue.

## Initial plan and repeats

1. Choose **Listed order** to repeat the displayed running order. Select a programme and use Move programme up/down to reorder it.
2. Choose **Randomise the initial plan** to randomise the first plan. Episodes may play out of sequence in this mode.
3. Choose **Mix series** to mix different series while preserving the order of episodes within each series. Enter the same Series name on related episodes and set Episode order (1, 2, 3…). The series restart after the collection completes.

Every channel loops automatically; it does not stop when its plan ends. Under **When the plan ends**, choose **Repeat the same plan**, **Reshuffle all programmes and repeat**, or **Remix series, keeping episode order**. The same-plan setting repeats the first generated order, even if that initial order was random. Reshuffle-all mixes individual episodes too. The series option preserves episode order. **Use this repeat setting for every channel** applies that choice station-wide in the draft; save to activate it. Empty/offline channels still show their holding screen.

**Channels** opens the station overview, including programme counts, runtime and repeat policy. Use a channel's Actions menu to edit, duplicate or delete it, watch it, or copy its stream URL. Changes are drafts until saved. In Programming, drag rows or use arrows to reorder; Tools & sort offers one-off random, title and series sorting and duplicate removal. Manual sorting/reordering changes the initial plan to listed order while keeping the repeat policy. Media library reuses programme and fillers recordings across channels without duplicating their media references. Held/disabled sources cannot be added through the picker. fillers has a searchable table and clip editor; the schedule preview shows striped fillers rows.

All viewers share the same schedule and random seed, including website and IPTV viewers. This is live television, not independent on-demand playlists. Disabled programmes do not air. Programme start offsets let you use reviewed segments of a longer file. Accurate durations matter.

## When adverts and intervals play

1. Choose **Back-to-back** for uninterrupted programmes with no inserted media. The interval pool is retained for later, but does not play.
2. Choose **Clock-aligned starts** to start programmes on a 5, 10, 15, 20, 30 or 60 minute grid. Complete interval clips fill the gaps; unused time shows the station presentation/countdown. The station schedule date must align with the chosen grid; the supplied epoch does.
3. Choose **Timed breaks** for a fixed-length break after every N programmes. Set the break length in seconds. Frequency continues across running-order loop boundaries.
4. Set **after every N programmes** and **maximum clips per break**. Choose random or listed interval order. Clock gaps still exist after programmes without adverts: they show presentation until the next clock slot.
5. Choose **This channel’s pool** or **All station adverts and fillers**. The station-wide option includes enabled library clips regardless of their station-brand label. Choose random order to draw from all eligible clips. **Repeat cooldown (seconds)** defaults to 120 when saving settings: after a clip ends, that channel cannot use the same media again until the cooldown expires. Set 0 to disable it. Existing catalogue files retain their saved behaviour until edited. Turning the shared pool off restores the channel’s own pool.
6. Add clips to the selected channel's pool using title, media URL, duration and type (advert, filler, intermission, ident or continuity). Use a matching station brand for branded clips. Removing a pool entry removes its scheduling reference, not the media file.
7. A clip must fit in full, including a five-second transition allowance. A 30-second clip therefore needs at least 35 seconds of available space with the default reserve. Clips are never shortened to fill a slot. Large clips may never fit a short break; preview the result.

These are between-programme breaks. Tellybox does not cut a programme open or detect/remove adverts already recorded inside it. To arrange reviewed segments with original breaks, add each segment with its accurate duration and source offset. Guide/now-next listings omit inserted interval media.

## Import folders of programmes or adverts

1. Put files under this installation's media directory: for example `media/programmes/comedy` or `media/adverts/1980s`. Docker users can copy files into the media volume, or bind-mount a dedicated media directory at `/app/media`; keep existing media when changing mounts. Native installations can set MEDIA_DIR in the launcher.
2. External disks/folders must be copied or mounted below the media directory first. The browser cannot access arbitrary paths on your computer or other server projects.
3. Enter `programmes/comedy` or `adverts/1980s` in **Folder relative to media directory**. Choose programmes or intervals, select an interval type, and optionally enter a programme series name.
4. Press **Scan folder and add to draft**. FFprobe reads actual durations. Supported video extensions are MP4, WebM and M4V. Audio-only files are reported rather than imported as television programmes. Unreadable files are reported; existing media URLs are not added twice. Symlinks and paths outside the media directory are not followed.
5. Files are scanned in filename order; name episodes `001`, `002`, etc. Review imported episode order before saving. Archives using the original-year policy also need original production years entered.
6. A scan is limited to 200 files and about one minute. Use smaller subfolders when a limit is reported. This is a manual import, not an automatic folder watcher; rescan to add new files. Files removed from disk are not silently removed from the catalogue.
7. Use **Preview next 12 items**, inspect complete programme/interval slots, then save. Finally test real video and a programme transition on the website and an IPTV player. A schedule preview does not verify codecs or remote-provider availability.

The self-hosted starter uses Custom station, so owners can schedule short programmes too (including its two 20-second demos). The separately hosted Tellybox archive network applies its own under-five-minute interval policy. Programme policy changes can move short recordings to the interval library; check before saving.

## IPTV handoffs

The relay uses consistent stereo 48 kHz audio, including silence for video without an audio track, and advancing media timestamps across programme/interval changes. Saving catalogue changes preserves the running HLS playlist; the updated plan is used at the next handoff. Explicit channel status or station epoch changes can interrupt immediately. A source failure can still require a holding screen, and a gap with no eligible complete clip still uses presentation.
