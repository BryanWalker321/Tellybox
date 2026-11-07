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

## VBIT2 setup

Download `update.py` from the station's `/teletext/update.py` address. Python 3 uses only its standard library; no extra packages are required. Run:

```sh
python3 update.py --url https://your-station.example --directory /home/pi/teletext/tellytext
```

Use a dedicated, initially empty directory. The updater refuses a nonempty directory it does not own. It verifies every page's size and checksum before writing anything, replaces changed page files atomically and leaves unchanged pages untouched. It does not configure, restart or merge another Teletext service. Configure VBIT2's service directory to use that folder, for example:

```sh
vbit2 --dir /home/pi/teletext/tellytext
```

Use the receiver's existing VBIT2/VBIT-IV launcher and remote mapping. To refresh every five minutes, an example crontab entry is:

```cron
*/5 * * * * /usr/bin/python3 /home/pi/update.py --url https://your-station.example --directory /home/pi/teletext/tellytext >> /home/pi/teletext-update.log 2>&1
```

The updater keeps the last installed pages if a download or validation fails. Monitor the manifest timestamp to detect a stopped updater. It updates individual pages atomically; across a complete refresh there can briefly be a mix of old and new pages. Day-to-day quiz changes should be refreshed promptly. The export publishes genuine three-digit continuation pages (usually starting in the 700s), so standard Fastext colour keys can select the next/previous screen without website links or a special receiver-side subpage API. Multi-screen indices are also transmitted as ten-second carousels. Continuation numbers are internal navigation addresses and can change when the feed changes. The service has the traditional 800-page address-space limit; unusually large operator story packs may need fewer or shorter articles. Different VBIT launchers may require their own reload configuration. Physical receiver and remote compatibility must be checked on that installation.

TTI files use CRLF records, 7-bit escaped colour controls, 40 display positions, page/subpage numbers, ten-second index carousels and Fastext links. The receiver representation uses text and basic colours; it does not contain browser images, SVG artwork, outbound clickable links or links back to the station website. The standalone receiver view likewise keeps source credits as plain text. The full website may retain clickable links. A locally running VBIT2 can turn these pages into a T42 stream for VBIT-IV or an inserter. No central T42 streaming service is required.

## Browser remote controls

- Type three digits to change page, including while a colour button has focus.
- R/G/Y/B or F1/F2/F3/F4 activate red/green/yellow/blue.
- Green/yellow select previous/next screens. Left/right and Page Up/Page Down are optional keyboard equivalents.
- F requests fullscreen; Escape leaves it.
- `?keys=r,g,y,b` overrides the four letter shortcuts. For example, `?page=100&keys=F5,F6,F7,F8` suits a remote emitting those keys.

Separate arrow controls and the page-number input box are hidden. Three-digit entry from a remote or keyboard remains available. Multi-screen news, sport, channel and listings indices rotate every ten seconds; pressing a colour key resets that timer. The standalone page fits the available screen immediately. True browser fullscreen requires a gesture, or a browser started in kiosk mode. Page-number inputs retain normal typing behaviour.

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

Source research on 7 November 2026: [PA Media Content API](https://content.pamedia.io/docs/introduction) provides UK/Ireland news and sport text and is a strong candidate, subject to a contract covering these outputs. [Guardian Open Platform](https://open-platform.theguardian.com/access/) offers article text but its [terms](https://www.theguardian.com/open-platform/terms-and-conditions) require a separate review for redistribution and text-only rendering. [Wikinews](https://en.wikinews.org/wiki/Main_Page) is closed/read-only as of May 2026, so it is unsuitable for current news. [Global Voices](https://globalvoices.org/about/global-voices-attribution-policy/) permits attributed text republication under CC BY 3.0 and is supported as the free full-text option. No new publisher licence or paid subscription has been acquired by this change.

## Optional companion service for hosted stations

`scripts/teletext-service.mjs` can serve just `/api/teletext-feeds`, `/api/teletext` and `/teletext/*` on loopback port 4188. Set `DATA_DIR` to the existing catalogue directory and `TELETEXT_CACHE_DIR` to a dedicated writable cache folder. Route only those paths to it, preserving the existing player server and static routes. This allows a hosted station to add feeds without restarting broadcast encoders. Normal self-hosted installations use the same endpoints built into `server.mjs` and do not need the companion.
