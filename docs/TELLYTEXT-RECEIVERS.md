# Tellytext on receivers and VBIT2

The website keeps its existing presentation. A shared page model also produces traditional Level 1 Teletext files and a public JSON feed. No account or API key is required to download the station's published pages.

## Addresses

Replace `https://your-station.example` with the station address.

| Address | Purpose |
| --- | --- |
| `/teletext.html` | Standalone, fitted browser view without the website header |
| `/teletext.html?page=123` | Open the sport index directly |
| `/api/teletext` | Station metadata and all page/subpage data, schema `tellytext-tti-v1` |
| `/api/teletext?page=102` | One physical page and its transmitted screens |
| `/teletext/manifest.json` | Page filenames, byte counts, SHA-256 hashes and revision |
| `/teletext/pages/102.tti` | One traditional page, including its subpage carousel |
| `/teletext/service.tar` | Consistent snapshot containing all `.tti` files and its manifest |
| `/teletext/update.py` | Standalone Python updater for a receiver |

TTI and JSON endpoints support GET and HEAD. JSON/TTI snapshots are cached for at most one minute on the server. ETag conditional requests are supported. A `revision` query on a page download returns HTTP 409 if the manifest has changed; refresh the manifest in that case. The complete tar snapshot avoids mixing downloads from different revisions. The public page API permits cross-origin reads and contains no owner settings, credentials, media source URLs or account data.

## Live VBIT2 setup: step by step

This is a one-time setup on the viewer's Linux or Raspberry Pi machine, with VBIT2 already installed. It downloads pages directly from **Telly-box.uk**. Python 3 and curl must be available; the updater needs no additional Python packages.

**Automatic updates must be configured by the viewer on their VBIT machine. Set the updater to run every five minutes (step 4). Without that scheduled task, downloaded pages stay unchanged. Tellybox does not remotely configure this for you.**

**You do not need the GitHub TTI ZIP for this setup.** That ZIP is a fixed offline snapshot. TTI files do not contain a live-feed connection and cannot update themselves. The scheduled updater below keeps the local VBIT pages current.

### 1. Download the updater

Run these commands as the same user who will run the scheduled updates:

```sh
mkdir -p "$HOME/tellytext"
curl -fL https://telly-box.uk/teletext/update.py -o "$HOME/tellytext/update.py"
```

### 2. Download the current pages

```sh
python3 "$HOME/tellytext/update.py" \
  --url https://telly-box.uk \
  --directory "$HOME/tellytext/pages"
```

The command should report `Installed … Teletext pages`. It creates the pages folder if needed. Use a dedicated, initially empty folder; do not unpack the GitHub ZIP there first or mix another service's pages into it. The updater refuses a nonempty folder it does not manage.

### 3. Select that folder in your existing VBIT setup

Set the page-directory argument in your existing VBIT2 launch command to:

```sh
vbit2 --dir "$HOME/tellytext/pages"
```

This shows the VBIT2 part of the command, not a complete inserter pipeline. Keep your existing output connection to VBIT-IV, raspi-teletext or your inserter, along with its other required options. If a launcher or service starts VBIT2, change its page directory there and restart that service once to select Tellytext. The updater does not configure or restart VBIT for you.

### 4. Schedule updates every five minutes

Open the current user's scheduled tasks:

```sh
crontab -e
```

Keep any existing entries and add this single line:

```cron
*/5 * * * * /usr/bin/python3 "$HOME/tellytext/update.py" --url https://telly-box.uk --directory "$HOME/tellytext/pages" >> "$HOME/tellytext/update.log" 2>&1
```

Save and close the editor. This assumes Python 3 is installed at `/usr/bin/python3`; use the path returned by `command -v python3` if different. Cron must be installed and running on the receiver machine. Use the same user's crontab as in steps 1 and 2, so `$HOME` points to the same folder.

### 5. Check the service and automatic refresh

Start your existing receiver output and select **page 100** on the television. Use three-digit page numbers and the remote's coloured buttons to navigate.

After at least five minutes, check the updater log:

```sh
tail -n 10 "$HOME/tellytext/update.log"
```

Look for a successful `Installed … Teletext pages` message. Check the latest downloaded snapshot time with:

```sh
python3 -c 'import json, pathlib; p = pathlib.Path.home() / "tellytext/pages/manifest.json"; print(json.loads(p.read_text())["generatedAt"])'
```

VBIT must pick up changed files in that folder. If downloads succeed but the television still shows old content, check your VBIT version/launcher's file-reload behaviour. Updating the files alone is not proof that a particular receiver pipeline has reloaded them.

Once configured, the scheduled task refreshes news, sport, weather, holidays, quizzes and TV guides from the same page service used by the website. It also downloads pages for new channels automatically. The five-minute interval is the download schedule; upstream publishers have their own refresh times, so it does not guarantee a new story every five minutes.

For another self-hosted station, replace `https://telly-box.uk` in both the initial download command and the scheduled task with that station's address.

### Live date and clock

If you installed the updater before live-clock support, repeat step 1 to download the updated script, run step 2 once, then restart your existing VBIT service once. The updater installs the header in the dedicated service folder’s `vbit.conf.override`, preserving other settings and saving an existing file before changing its header. Older updater copies still refresh pages but do not install this header configuration.

The exported header uses a green station name and white date/time, matching the website's header layout. Its date and `HH:MM:SS` clock are VBIT substitution tokens, not the time when the pages were downloaded. VBIT generates them during transmission from the receiver machine/server's own clock and timezone. They continue advancing between scheduled page downloads, including when the updater is offline.

Set the machine clock and timezone to the viewer's desired local time and keep its system time synchronised. A launcher may override the timezone with `TZ`; the timezone of the VBIT process is what matters. VBIT uses its local date-name locale; `LC_TIME=C` selects English day/month abbreviations like the website. No five-minute clock updater is required.

The native output includes a blue/yellow two-row mosaic masthead with a bordered T B mark, cyan strapline, yellow section heading, page counter, blue/yellow slogan and four-colour footer. Traditional Teletext is a 40-column, 25-row character display: its receiver supplies the font and selected-page field. Browser fonts, pixel spacing and the outlined browser logo cannot be reproduced pixel-for-pixel on every physical decoder. The page content, colours, navigation and local live date/time follow the same design.

### Update behaviour and receiver format

The updater keeps the last installed pages if a download or validation fails. Monitor the manifest timestamp to detect a stopped updater. It updates individual pages atomically; across a complete refresh there can briefly be a mix of old and new pages. Day-to-day quiz changes should be refreshed promptly. The export publishes genuine three-digit continuation pages (usually starting in the 700s), so standard Fastext colour keys can select the next/previous screen without website links or a special receiver-side subpage API. Multi-screen indices are also transmitted as ten-second carousels. Continuation numbers are internal navigation addresses and can change when the feed changes. The service has the traditional 800-page address-space limit; unusually large operator story packs may need fewer or shorter articles. Different VBIT launchers may require their own reload configuration. Physical receiver and remote compatibility must be checked on that installation.

TTI files use CRLF records, 7-bit escaped colour controls, 40 display positions, page/subpage numbers, ten-second index carousels and Fastext links. The receiver representation uses text and basic colours; it does not contain browser images, SVG artwork, outbound clickable links or links back to the station website. The standalone receiver view likewise keeps source credits as plain text. The full website may retain clickable links. A locally running VBIT2 can turn these pages into a T42 stream for VBIT-IV or an inserter. No central T42 streaming service is required.

## Browser remote controls

- Type three digits to change page, including while a colour button has focus.
- R/G/Y/B or F1/F2/F3/F4 activate red/green/yellow/blue.
- Green/yellow select previous/next screens. Left/right and Page Up/Page Down are optional keyboard equivalents.
- F requests fullscreen; Escape leaves it.
- `?keys=r,g,y,b` overrides the four letter shortcuts. For example, `?page=100&keys=F5,F6,F7,F8` suits a remote emitting those keys.

Separate arrow controls remain hidden. The main website has a visible page-number input alongside the colour keys. The standalone receiver view hides that input box; three-digit entry from its remote or keyboard remains available. Multi-screen news, sport, channel and listings indices rotate every ten seconds; pressing a colour key resets that timer. The standalone page fits the available screen immediately. True browser fullscreen requires a gesture, or a browser started in kiosk mode. Page-number inputs retain normal typing behaviour.

## Page map and quiz

101 is the news index; 102-121 hold up to twenty news stories; 122 is reserved; 123 is the sport index; 124-138 hold up to fifteen football stories; 139-144 hold up to six other-sport stories; 145 is London weather. The index may span subpages. Each story keeps its slot while it remains in the selected feed items. Missing stories show an unavailable page; they are never invented to fill the allocation.

News and sport colour keys select section index, previous screen, next screen and a section/main index. Previous/next first traverse the current story screens, then the neighbouring stories. Index previous/next wraps through that index. The indices link directly to each story. Continuation screens have internal Teletext page addresses, making manual colour navigation work on conventional Fastext receivers. Weather retains the three-day forecast text.

Box Baffler has 1,200 original question wordings, balanced across twelve subjects. Its 100-day blocks use each subject's questions once before the next block. All viewers share the daily selection and shuffled answers, with a Europe/London midnight rollover. Page 400 introduces the quiz, 401-412 are actual question pages, 413 is success and 414 is the wrong-answer page. Each answer is a page link: correct advances, wrong goes to 414, and red on 414 restarts at 401. This applies to both browser and receiver versions. There is no browser-only progress lock or score storage; typing a question number opens that question.

## Story text and licensed feeds

BBC RSS supplies short descriptions, not complete articles. Default story pages display the supplied descriptions as **RSS SUMMARY**, retaining BBC attribution and an original-source link in the browser. Exporting these descriptions does not create new republication rights; operators must check source terms for their distribution.

Set `TELETEXT_NEWS_SOURCE=globalvoices` to use the free full-text feed at `https://globalvoices.org/feed/`. It supplies international reporting rather than a UK rolling newswire. Only recent stories with a named author and supplied full text are included; clearly restricted partner material and media are excluded. Text is credited to the author and Global Voices, with the CC BY 3.0 licence URL, original article URL and a text-only formatting notice retained. Feed coverage can be fewer than twenty articles. Football/other sport continue using BBC RSS summaries. The default `TELETEXT_NEWS_SOURCE=bbc` preserves the existing BBC feed for operators who prefer it.

An optional operator-controlled full-text story pack can replace news, football and/or other-sport sections. Set `TELETEXT_STORIES_FILE` to an absolute JSON file path accessible to the server. This is a local file interface for a licensed feed adapter, not a URL proxy. The application does not scrape article websites. Example:

```json
{
  "generatedAt": "2026-11-07T12:00:00Z",
  "expiresAt": "2026-11-08T11:59:00Z",
  "source": {"name": "Your licensed provider", "url": "https://provider.example", "licence": "Your agreed attribution notice"},
  "sections": {
    "news": [{"title": "Headline", "text": "The full supplied article text.", "url": "https://provider.example/story", "publishedAt": "2026-11-07T11:30:00Z", "byline": "Author", "copyright": "Provider copyright notice"}]
  }
}
```

Sections are `news` (20 maximum), `football` (15) and `otherSport` (6). An omitted section retains BBC RSS. Each story requires title, text, HTTPS source URL and publication date. Byline and copyright are retained, and the source/permission notice is displayed. Stories over 20,000 characters are rejected rather than silently cut. Packs require source/licence metadata and a validity interval of at most 24 hours; expired or invalid packs fall back to RSS. The adapter must only supply material licensed for both the website and downloadable receiver redistribution. A licence label in JSON is metadata, not a grant of permission.

## Optional companion service for hosted stations

`scripts/teletext-service.mjs` can serve just `/api/teletext-feeds`, `/api/teletext` and `/teletext/*` on loopback port 4188. Set `DATA_DIR` to the existing catalogue directory and `TELETEXT_CACHE_DIR` to a dedicated writable cache folder. Route only those paths to it, preserving the existing player server and static routes. This allows a hosted station to add feeds without restarting broadcast encoders. Normal self-hosted installations use the same endpoints built into `server.mjs` and do not need the companion.
