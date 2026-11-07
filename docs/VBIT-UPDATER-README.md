# Live Tellytext for VBIT2

This package downloads current Tellytext pages directly from https://telly-box.uk.
It contains the updater software, not a fixed set of TTI pages.

## One-time setup

1. Extract update.py and this README into your own home folder's tellytext directory
   (for example /home/pi/tellytext). Python 3 is required; no extra Python packages.
2. Run:

   python3 "$HOME/tellytext/update.py" --url https://telly-box.uk --directory "$HOME/tellytext/pages"

   Use a dedicated, initially empty pages folder. The updater will manage it.
3. Point your existing VBIT2 launcher at that pages folder:

   vbit2 --dir "$HOME/tellytext/pages"

   Keep the rest of your existing VBIT-IV/inserter output pipeline and options.
4. YOU MUST SET UP AUTOMATIC UPDATES on your own VBIT machine. Run crontab -e
   as the same user, keep existing entries, and add this single line:

   */5 * * * * /usr/bin/python3 "$HOME/tellytext/update.py" --url https://telly-box.uk --directory "$HOME/tellytext/pages" >> "$HOME/tellytext/update.log" 2>&1

   Check command -v python3 and replace /usr/bin/python3 if necessary. Cron must
   be installed and running. Without this scheduled task the pages stay unchanged.
5. Start/restart your existing VBIT service once and select page 100. Check the log
   after five minutes for a successful Installed ... Teletext pages message.

## Upgrading an existing installation

Replace your old update.py with this package's copy, keeping the same paths and
scheduled task. Run the updater once, then restart VBIT once to activate the new
service header. Your five-minute schedule then continues normally.

The updater installs the live clock header in vbit.conf.override in the dedicated
pages folder. It preserves other settings and backs up an existing file before
changing its header. The date and ticking clock use the VBIT machine/server's own
clock and timezone; they do not depend on five-minute downloads. Keep the system
clock synchronised. LC_TIME=C selects English day/month abbreviations.

The live feed supplies the native artwork, colours and page links. Channel names
and start times are white; programme titles are yellow. The native banner uses
TELLYBOX: ALWAYS SOMETHING ON, centred in its blue band. Your receiver supplies
its own font and spacing.

The updater refreshes news, sport, weather, holidays, quizzes and TV guides,
and adds pages for new channels. Upstream publishers set their own refresh times.
A failed download leaves the last working pages in place. Ensure your VBIT version
or launcher reloads changed page files.

Full guide:
https://github.com/BryanWalker321/Tellybox/blob/main/docs/TELLYTEXT-RECEIVERS.md
