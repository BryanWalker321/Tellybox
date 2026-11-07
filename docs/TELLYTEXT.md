# Tellytext

Tellytext is Tellybox's Teletext service: station information, BBC news and sport summaries, London weather, TV guides and the daily Box Baffler! quiz. The website and traditional receiver feed share the same page information and colour-key destinations.

The screen uses a black background, period colours, Teletext50 typography and original mosaic artwork. Station owners retain their configured name and branding.

## Choosing pages

On the main website, enter three digits in the visible **Page number** box or type them on your keyboard. You can also select an index entry or use the four coloured buttons.

The labels beneath the screen show each colour's current action:

- **Green / Previous:** go back through the current index or story, then to the preceding story where applicable.
- **Yellow / Next:** advance through the current index or story, then to the following story where applicable.
- **Red:** normally return to the section or main index.
- **Blue:** open the destination shown on its label.

The main index has direct colour shortcuts to News, Sport, TV now and TV next. During the quiz, the four colours select answers A-D instead.

Multi-screen news, sport, channel and listings indices rotate automatically every **ten seconds**. Pressing a colour button changes screen immediately and restarts the timer. Separate arrow controls are hidden.

On a conventional receiver, use its number buttons for three-digit page entry and its colour buttons for Fastext navigation. The exported feed includes real continuation-page addresses so ordinary colour keys can select the next or previous screen.

## Page index

| Page | Contents |
| --- | --- |
| 100 | Main index |
| 101 | News index |
| 102-121 | Up to twenty news stories |
| 122 | Reserved news space |
| 123 | Sport index |
| 124-138 | Up to fifteen football stories |
| 139-144 | Up to six other-sport stories |
| 145 | London three-day weather |
| 150 | Station information |
| 160 | How To Watch, including TELLY-BOX.UK |
| 199 | Help and index |
| 200 | Channel directory |
| 300 | TV listings index |
| 301 onwards | Channel running orders |
| 400 | Box Baffler! introduction |
| 401-412 | Quiz questions |
| 413 | Quiz completed |
| 414 | Wrong-answer page |
| 601 | Television now |
| 602 | Television next |

Longer pages have continuation screens, generally using additional addresses in the 700s first. Follow the colour labels to move between them. These internal continuation addresses can change; use the main page numbers above as starting points.

## News, sport and weather

The hosted Telly-box.uk service uses **BBC News summaries**, BBC football and other-sport summaries, and BBC Weather's three-day London forecast. BBC summaries are also the default for self-hosted installations.

Each story has its own page, with the headline, supplied summary, publication time and source displayed inside Tellytext. BBC RSS summaries are labelled **RSS SUMMARY**; they are not full BBC articles. Sources and update times remain visible, and cached information is identified when upstream updates fail.

Multi-screen indices list story page numbers. Story slots are retained while those stories remain in the current selection. Fewer stories may be available than the maximum allocation. Guide and feed times use Europe/London.

Source links may be clicked on the regular website. The standalone receiver view and TTI output retain credits as plain text, without outbound clickable links. Optional alternative source configuration is documented in the [receiver and feed guide](TELLYTEXT-RECEIVERS.md).

## Box Baffler! daily quiz

Start at **400** and press red. Each answer is a genuine internal page link: a correct answer opens the next question; a wrong answer opens **414**, where red returns to **401**. Complete all twelve questions to reach **413**.

This behaviour is the same on the website and traditional receivers. There is no browser-only progress lock or saved score; entering a question's page number opens that question.

The bank has **1,200 independently worded questions across twelve subjects**, with 100 questions per subject. Everyone receives the same daily selection and shuffled answer positions. The quiz changes at midnight in Europe/London, including daylight-saving changes. Each 100-day block uses the full pool.

Questions are stored in `public/quiz-questions.mjs`. Each needs a unique ID, category, question and four distinct answers. The first source answer is correct before the daily shuffle. Keep subjects balanced and review factual edits before publication.

Box Baffler! is an original quiz inspired by historical colour-key games, including Bamboozle. The owner-supplied Bamber Boozler artwork preserves its original pixels. See [third-party notices](../THIRD_PARTY_NOTICES.md).

## Fullscreen and standalone viewing

Select **Fullscreen** beneath the coloured keys to fit the website screen to the display. Escape exits fullscreen. Where native fullscreen is unavailable, the website uses a fitted expanded view.

`/teletext.html` opens the fitted standalone receiver view without the rest of the website. It supports keyboard number entry and colour shortcuts; its extra number-input box remains hidden. R/G/Y/B or F1-F4 select the colours, and F requests fullscreen. True automatic fullscreen requires a browser launched in kiosk mode or a user gesture.

## Traditional receiver feed

The station publishes TTI/Fastext files, a complete snapshot at `/teletext/service.tar`, a manifest, a public JSON page API and an updater at `/teletext/update.py`.

A one-off TTI import is a **snapshot**. To keep news, sport, weather and TV guides current, run the updater regularly against the same dedicated folder VBIT reads. A five-minute interval is recommended. The updater also adds pages for new channels and removes obsolete generated pages; a manual re-import is unnecessary when that arrangement is running.

The external feed contains plain text, page numbers and internal colour-key links. TELLY-BOX.UK appears as plain text on How To Watch. The regular website can retain clickable links.

See [VBIT setup, downloads and update instructions](TELLYTEXT-RECEIVERS.md).

## Credits

[PagesFromCeefax](https://github.com/robsonjb1/PagesFromCeefax) and historical Teletext screens were visual references. No source code, logos or artwork from that GPL project are included. The renderer and mosaic artwork are original Tellybox code. Teletext50 fonts are CC0/public domain; see [third-party notices](../THIRD_PARTY_NOTICES.md) and the [font licence](../public/fonts/Teletext50-LICENSE.txt).
